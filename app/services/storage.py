"""Product image storage: Cloudflare R2 (S3-compatible) when configured,
falling back to local disk (uploads/products/) otherwise. Local disk is
NOT persisted across container rebuilds in production (no volume mount
for it in docker-compose.yml) — R2 is the real production path; the
local fallback exists purely so local dev needs no R2 account.
"""
import os
from app.config import settings

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
LOCAL_IMAGE_DIR = "uploads/products"

_CONTENT_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


def r2_configured() -> bool:
    return bool(
        settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
        and settings.R2_BUCKET_NAME
        and settings.R2_PUBLIC_URL
    )


def _r2_client():
    import boto3
    from botocore.client import Config as BotoConfig

    return boto3.client(
        "s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )


def upload_to_r2(product_id: int, ext: str, contents: bytes) -> str:
    """Uploads a product photo to R2 (removing any stale object under a
    different extension) and returns its public URL. Requires R2 to be
    configured — callers should check r2_configured() first."""
    client = _r2_client()
    key = f"product_{product_id}{ext}"
    for other_ext in ALLOWED_IMAGE_EXTENSIONS - {ext}:
        try:
            client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=f"product_{product_id}{other_ext}")
        except Exception:
            pass
    client.put_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        Body=contents,
        ContentType=_CONTENT_TYPES.get(ext, "application/octet-stream"),
    )
    return f"{settings.R2_PUBLIC_URL.rstrip('/')}/{key}"


def save_to_disk(product_id: int, ext: str, contents: bytes) -> str:
    os.makedirs(LOCAL_IMAGE_DIR, exist_ok=True)
    for other_ext in ALLOWED_IMAGE_EXTENSIONS - {ext}:
        stale = os.path.join(LOCAL_IMAGE_DIR, f"product_{product_id}{other_ext}")
        if os.path.exists(stale):
            os.remove(stale)
    path = os.path.join(LOCAL_IMAGE_DIR, f"product_{product_id}{ext}")
    with open(path, "wb") as f:
        f.write(contents)
    return f"/uploads/products/product_{product_id}{ext}"


def save_product_image(product_id: int, ext: str, contents: bytes) -> str:
    """Runtime entry point: R2 if configured, else local disk."""
    if r2_configured():
        return upload_to_r2(product_id, ext, contents)
    return save_to_disk(product_id, ext, contents)
