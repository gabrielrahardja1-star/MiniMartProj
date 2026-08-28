"""Canonical product categories.

Single source of truth for:
  * the category dropdown in the admin Add/Edit product sheets
  * the category filter chips on the admin Inventory page
  * the Indonesian <-> Chinese label for a product's category

`key` is the exact string stored in `products.category`. When a product's
category is set (create/update), the backend copies the matching `name_zh`
into `products.category_zh` so API responses are self-contained.

To add a category: append an entry here. To rename its Chinese label: edit
`name_zh` here, then re-run `scripts/backfill_product_i18n.py --commit` to
refresh `products.category_zh` on existing rows.
"""

PRODUCT_CATEGORIES: list[dict[str, str]] = [
    {"key": "Minuman",          "name_id": "Minuman",          "name_zh": "饮料"},
    {"key": "Snack & Biskuit",  "name_id": "Snack & Biskuit",  "name_zh": "零食与饼干"},
    {"key": "Es Krim",          "name_id": "Es Krim",          "name_zh": "冰淇淋"},
    {"key": "Susu",             "name_id": "Susu",             "name_zh": "牛奶"},
    {"key": "Kopi & Teh",       "name_id": "Kopi & Teh",       "name_zh": "咖啡与茶"},
    {"key": "Mie & Pasta",      "name_id": "Mie & Pasta",      "name_zh": "面食"},
    {"key": "Perawatan Mulut",  "name_id": "Perawatan Mulut",  "name_zh": "口腔护理"},
    {"key": "Perawatan Kulit",  "name_id": "Perawatan Kulit",  "name_zh": "皮肤护理"},
    {"key": "Perawatan Rambut", "name_id": "Perawatan Rambut", "name_zh": "头发护理"},
    {"key": "Detergen",         "name_id": "Detergen",         "name_zh": "洗涤剂"},
    {"key": "Coklat Bubuk",     "name_id": "Coklat Bubuk",     "name_zh": "巧克力粉"},
    {"key": "Permen",           "name_id": "Permen",           "name_zh": "糖果"},
    {"key": "Insektisida",      "name_id": "Insektisida",      "name_zh": "杀虫剂"},
    {"key": "Tisu",             "name_id": "Tisu",             "name_zh": "纸巾"},
    {"key": "Peralatan Bersih", "name_id": "Peralatan Bersih", "name_zh": "清洁用具"},
    {"key": "Herbal",           "name_id": "Herbal",           "name_zh": "草本保健"},
]

CATEGORY_KEYS: set[str] = {c["key"] for c in PRODUCT_CATEGORIES}
CATEGORY_ZH: dict[str, str] = {c["key"]: c["name_zh"] for c in PRODUCT_CATEGORIES}


def category_zh_for(category: str | None) -> str | None:
    """Chinese label for a category key, or None if unknown/blank."""
    if not category:
        return None
    return CATEGORY_ZH.get(category)
