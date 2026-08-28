"""One-time migration: upload existing local product photos to Cloudflare
R2 and repoint products.image_url from the local /uploads/ path to the
bucket's public URL. Requires R2_* env vars to already be set (see
.env.example) — this is what makes photo uploads survive a redeploy,
since the container's local filesystem isn't persisted.

Run inside the backend container, after the R2 env vars are set and the
container has been restarted to pick them up:

    docker compose exec backend python scripts/migrate_images_to_r2.py
"""
import os
import sys
import sqlite3

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from app.config import settings  # noqa: E402
from app.services.storage import r2_configured, upload_to_r2  # noqa: E402


def main():
    if not r2_configured():
        print("R2 is not configured (missing R2_* env vars) — nothing to do.")
        return

    db_path = settings.DATABASE_URL.removeprefix("sqlite:///")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT id, image_url FROM products WHERE image_url LIKE '/uploads/%'"
    ).fetchall()

    if not rows:
        print("No products with a local image_url — nothing to migrate.")
        return

    migrated, skipped = 0, 0
    for product_id, image_url in rows:
        local_path = os.path.join(REPO_ROOT, image_url.lstrip("/"))
        if not os.path.exists(local_path):
            print(f"SKIP product {product_id}: {local_path} not found on disk")
            skipped += 1
            continue
        ext = os.path.splitext(local_path)[1]
        with open(local_path, "rb") as f:
            contents = f.read()
        new_url = upload_to_r2(product_id, ext, contents)
        cur.execute("UPDATE products SET image_url = ? WHERE id = ?", (new_url, product_id))
        migrated += 1
        print(f"product {product_id}: {image_url} -> {new_url}")

    conn.commit()
    conn.close()
    print(f"Done: {migrated} migrated, {skipped} skipped (out of {len(rows)}).")


if __name__ == "__main__":
    main()
