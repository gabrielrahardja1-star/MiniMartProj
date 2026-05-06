"""
Invoice PDF parser.
Strategy:
  1. Try pdfplumber — works on digital/text PDFs.
  2. If no usable text is found, fall back to Tesseract OCR on page images.
  3. Parse extracted text to find line items: product name, quantity, unit price.
"""
import re
import io
from dataclasses import dataclass

import pdfplumber


@dataclass
class ParsedLineItem:
    raw_product_name: str
    quantity: int
    unit_price: float


@dataclass
class ParsedInvoice:
    supplier_name: str | None
    line_items: list[ParsedLineItem]
    parse_method: str  # "pdfplumber" or "ocr"


# Regex patterns for line item detection
# Matches lines like: "Product Name   5   12.50" or "Product Name x5 @ $12.50"
_LINE_ITEM_PATTERN = re.compile(
    r"^(?P<name>.+?)\s+"
    r"(?P<qty>\d+(?:\.\d+)?)\s*(?:x|pcs|units?|bags?|boxes?)?\s*"
    r"[@]?\s*\$?\s*(?P<price>\d+(?:[.,]\d{1,2})?)\s*$",
    re.IGNORECASE,
)

# Simpler fallback: anything with two numbers at the end
_FALLBACK_PATTERN = re.compile(
    r"^(?P<name>[A-Za-z][^\d]+?)\s+"
    r"(?P<qty>\d+(?:\.\d+)?)\s+"
    r"\$?\s*(?P<price>\d+(?:[.,]\d{1,2})?)$"
)

_SUPPLIER_PATTERN = re.compile(
    r"(?:from|supplier|vendor|bill\s+(?:from|to)|issued\s+by)[:\s]+(?P<name>[A-Za-z0-9 &.,'-]+)",
    re.IGNORECASE,
)


def _extract_text_pdfplumber(pdf_bytes: bytes) -> tuple[str, list]:
    """Return (full_text, tables) from a PDF using pdfplumber."""
    text_parts = []
    tables = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
            page_tables = page.extract_tables() or []
            tables.extend(page_tables)
    return "\n".join(text_parts), tables


def _extract_text_ocr(pdf_bytes: bytes) -> str:
    """Rasterise PDF pages and run Tesseract OCR."""
    try:
        import pytesseract
        from PIL import Image
        import pdf2image  # optional dependency
        images = pdf2image.convert_from_bytes(pdf_bytes, dpi=200)
        parts = []
        for img in images:
            parts.append(pytesseract.image_to_string(img))
        return "\n".join(parts)
    except ImportError:
        # pdf2image not available — try pytesseract directly on bytes via PIL
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(io.BytesIO(pdf_bytes))
            return pytesseract.image_to_string(img)
        except Exception:
            return ""


def _parse_line_items_from_table(tables: list) -> list[ParsedLineItem]:
    """Extract line items from structured pdfplumber tables."""
    items = []
    for table in tables:
        for row in table:
            if not row:
                continue
            cells = [str(c).strip() if c else "" for c in row]
            # Skip header rows
            if any(h in " ".join(cells).lower() for h in ["product", "item", "description", "qty", "price"]):
                continue
            # Need at least 3 cells: name, qty, price
            if len(cells) < 3:
                continue
            name = cells[0]
            # Find qty and price — scan right-to-left for numeric values
            numbers = []
            for cell in reversed(cells[1:]):
                clean = re.sub(r"[,$\s]", "", cell)
                try:
                    numbers.append(float(clean))
                except ValueError:
                    if numbers:
                        break
            if len(numbers) >= 2:
                price = numbers[0]
                qty = int(numbers[1])
                if name and qty > 0 and price > 0:
                    items.append(ParsedLineItem(raw_product_name=name, quantity=qty, unit_price=price))
    return items


def _parse_line_items_from_text(text: str) -> list[ParsedLineItem]:
    """Extract line items from raw text using regex."""
    items = []
    for line in text.splitlines():
        line = line.strip()
        if len(line) < 5:
            continue
        for pattern in (_LINE_ITEM_PATTERN, _FALLBACK_PATTERN):
            m = pattern.match(line)
            if m:
                name = m.group("name").strip()
                try:
                    qty = int(float(m.group("qty")))
                    price = float(m.group("price").replace(",", "."))
                except ValueError:
                    continue
                if qty > 0 and price > 0:
                    items.append(ParsedLineItem(raw_product_name=name, quantity=qty, unit_price=price))
                break
    return items


def _extract_supplier(text: str) -> str | None:
    m = _SUPPLIER_PATTERN.search(text)
    if m:
        return m.group("name").strip()
    # Heuristic: first non-empty line often contains supplier name
    for line in text.splitlines():
        line = line.strip()
        if line and not re.search(r"\d", line) and len(line) > 3:
            return line
    return None


def parse_invoice(pdf_bytes: bytes) -> ParsedInvoice:
    """
    Main entry point. Returns a ParsedInvoice with whatever line items
    could be extracted.
    """
    # Step 1: try pdfplumber
    text, tables = _extract_text_pdfplumber(pdf_bytes)
    parse_method = "pdfplumber"

    # Step 2: if no usable text, fall back to OCR
    if not text or len(text.strip()) < 20:
        text = _extract_text_ocr(pdf_bytes)
        parse_method = "ocr"
        tables = []

    supplier = _extract_supplier(text)

    # Prefer structured table data; fall back to text parsing
    line_items = _parse_line_items_from_table(tables)
    if not line_items:
        line_items = _parse_line_items_from_text(text)

    return ParsedInvoice(
        supplier_name=supplier,
        line_items=line_items,
        parse_method=parse_method,
    )
