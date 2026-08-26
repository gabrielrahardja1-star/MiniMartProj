"""One-time replacement of the products catalog with the real MMI inventory
(mmi_minimart_seed.sql, 93 items). Wipes the existing products/catalog_issues
tables and replaces them; does not attempt to preserve or remap existing
order_items/invoice_items referencing the old catalog.

Run inside the backend container, after `alembic upgrade head` has applied
migration 009 (adds products.source_no/flagged/flag_reason + catalog_issues):

    docker compose exec backend python scripts/seed_mmi_catalog.py
"""
import sqlite3
from app.config import settings

SEED_PATH = "mmi_minimart_seed.sql"


def main():
    db_path = settings.DATABASE_URL.removeprefix("sqlite:///")

    mem = sqlite3.connect(":memory:")
    mem.executescript(open(SEED_PATH, encoding="utf-8").read())
    mem.row_factory = sqlite3.Row
    seed_products = mem.execute("SELECT * FROM products ORDER BY id").fetchall()
    seed_issues = mem.execute("SELECT * FROM catalog_issues ORDER BY id").fetchall()
    assert len(seed_products) == 93, f"expected 93 products, got {len(seed_products)}"
    mem.close()

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute("BEGIN")
        cur.execute("DELETE FROM catalog_issues")
        cur.execute("DELETE FROM products")

        for row in seed_products:
            name = row["name_latin"] or row["name_chinese"]
            flagged = bool(row["flagged"])
            price = row["selling_price_idr"]
            if row["image_path"]:
                ext = row["image_path"].rsplit(".", 1)[-1]
                image_url = f"/uploads/products/product_{row['id']}.{ext}"
            else:
                image_url = None
            cur.execute(
                """
                INSERT INTO products (
                    id, name, name_zh, sku, price, stock, unit,
                    category, sub_category, brand, size, image_url,
                    is_active, created_at, updated_at,
                    source_no, flagged, flag_reason
                ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL, NULL, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?)
                """,
                (
                    row["id"], name, row["name_chinese"], f"MMI-{row['id']:03d}",
                    price if price is not None else 0, row["unit"],
                    row["category_latin"], row["size"], image_url,
                    not flagged, row["source_no"], flagged, row["flag_reason"],
                ),
            )

        for row in seed_issues:
            cur.execute(
                "INSERT INTO catalog_issues (product_id, source_no, sheet_row, issue) VALUES (?, ?, ?, ?)",
                (row["product_id"], row["source_no"], row["sheet_row"], row["issue"]),
            )

        conn.commit()
        print(f"OK: {len(seed_products)} products, {len(seed_issues)} catalog_issues rows written.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
