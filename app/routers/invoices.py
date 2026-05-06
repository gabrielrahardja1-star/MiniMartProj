import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.invoice import Invoice, InvoiceItem
from app.models.product import Product
from app.schemas.invoice import InvoiceOut, InvoiceDetailOut, MapItemRequest
from app.core.deps import require_admin
from app.services.invoice_parser import parse_invoice

UPLOAD_DIR = "uploads"
router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.post("/upload", response_model=InvoiceDetailOut, status_code=status.HTTP_201_CREATED)
def upload_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = file.file.read()

    # Save file to disk
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        f.write(pdf_bytes)

    # Parse
    parsed = parse_invoice(pdf_bytes)

    invoice = Invoice(
        supplier_name=parsed.supplier_name,
        filename=file.filename,
        status="pending_review",
    )
    db.add(invoice)
    db.flush()

    for item in parsed.line_items:
        db.add(InvoiceItem(
            invoice_id=invoice.id,
            raw_product_name=item.raw_product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
        ))

    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/", response_model=list[InvoiceOut])
def list_invoices(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return db.query(Invoice).order_by(Invoice.uploaded_at.desc()).all()


@router.get("/{invoice_id}", response_model=InvoiceDetailOut)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.put("/{invoice_id}/items/{item_id}", response_model=InvoiceDetailOut)
def map_item(
    invoice_id: int,
    item_id: int,
    body: MapItemRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != "pending_review":
        raise HTTPException(status_code=400, detail="Invoice is not pending review")

    item = db.get(InvoiceItem, item_id)
    if not item or item.invoice_id != invoice_id:
        raise HTTPException(status_code=404, detail="Item not found")

    product = db.get(Product, body.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    item.product_id = body.product_id
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/approve", response_model=InvoiceDetailOut)
def approve_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != "pending_review":
        raise HTTPException(status_code=400, detail="Invoice is not pending review")

    unmapped = [i for i in invoice.items if i.product_id is None]
    if unmapped:
        raise HTTPException(
            status_code=400,
            detail=f"{len(unmapped)} item(s) not yet mapped to a product",
        )

    # Commit stock changes
    for item in invoice.items:
        product = db.get(Product, item.product_id)
        product.stock += item.quantity

    invoice.status = "approved"
    invoice.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/reject", response_model=InvoiceDetailOut)
def reject_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != "pending_review":
        raise HTTPException(status_code=400, detail="Invoice is not pending review")

    invoice.status = "rejected"
    invoice.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(invoice)
    return invoice
