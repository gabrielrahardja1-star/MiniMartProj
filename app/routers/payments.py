import hashlib
import time
import midtransclient
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.order import Order
from app.config import settings
from app.core.deps import get_current_worker
from app.models.worker import Worker

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _core_api():
    return midtransclient.CoreApi(
        is_production=settings.MIDTRANS_IS_PRODUCTION,
        server_key=settings.MIDTRANS_SERVER_KEY,
        client_key=settings.MIDTRANS_CLIENT_KEY,
    )


# ── Generate QRIS for an order ────────────────────────────────────────────────
@router.post("/qris/{order_id}")
def generate_qris(
    order_id: int,
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.worker_id != worker.id and worker.role != "admin":
        raise HTTPException(status_code=403, detail="Not your order")
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")
    if not settings.MIDTRANS_SERVER_KEY:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")

    midtrans_order_id = f"MM-{order.id}-{int(time.time())}"

    payload = {
        "payment_type": "qris",
        "transaction_details": {
            "order_id": midtrans_order_id,
            "gross_amount": int(order.total),
        },
    }

    try:
        data = _core_api().charge(payload)
        print(f"MIDTRANS_RESPONSE: {data}", flush=True)
    except Exception as e:
        print(f"MIDTRANS_EXCEPTION: {e}", flush=True)
        raise HTTPException(status_code=502, detail=f"Payment gateway error: {str(e)}")

    status_code = str(data.get("status_code", ""))
    if status_code not in ("200", "201"):
        raise HTTPException(
            status_code=502,
            detail=data.get("status_message", "Failed to create QRIS"),
        )

    qr_string = data.get("qr_string") or ""
    qr_image_url = next(
        (a["url"] for a in data.get("actions", []) if a.get("name") == "generate-qr-code"),
        None,
    )

    # Mark payment as pending
    order.payment_status = "pending"
    db.commit()

    return {
        "order_id": order.id,
        "midtrans_order_id": midtrans_order_id,
        "qr_string": qr_string,
        "qr_image_url": qr_image_url,
        "amount": int(order.total),
        "payment_status": order.payment_status,
    }


# ── Midtrans webhook (notification URL) ──────────────────────────────────────
# Set this URL in Midtrans dashboard → Settings → Configuration → Payment Notification URL
# e.g. https://yourdomain.com/api/payments/webhook
@router.post("/webhook")
async def midtrans_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.json()

    order_id_str    = body.get("order_id", "")
    status_code     = body.get("status_code", "")
    gross_amount    = body.get("gross_amount", "")
    signature_key   = body.get("signature_key", "")
    transaction_status = body.get("transaction_status", "")
    fraud_status    = body.get("fraud_status", "accept")

    # Verify signature: SHA512(order_id + status_code + gross_amount + server_key)
    if settings.MIDTRANS_SERVER_KEY:
        raw = f"{order_id_str}{status_code}{gross_amount}{settings.MIDTRANS_SERVER_KEY}"
        expected = hashlib.sha512(raw.encode()).hexdigest()
        if signature_key != expected:
            raise HTTPException(status_code=403, detail="Invalid signature")

    # Parse our order_id from format "MM-{id}-{timestamp}"
    try:
        order_id = int(order_id_str.split("-")[1])
    except (IndexError, ValueError):
        return {"status": "ignored"}

    order = db.get(Order, order_id)
    if not order:
        return {"status": "order_not_found"}

    # Map Midtrans status → our payment_status
    if transaction_status == "settlement" or (
        transaction_status == "capture" and fraud_status == "accept"
    ):
        order.payment_status = "paid"
    elif transaction_status in ("deny", "cancel", "failure"):
        order.payment_status = "failed"
    elif transaction_status == "expire":
        order.payment_status = "expired"
    elif transaction_status == "pending":
        order.payment_status = "pending"

    db.commit()
    return {"status": "ok"}


# ── Poll payment status (worker polls this while QR is shown) ─────────────────
@router.get("/status/{order_id}")
def payment_status(
    order_id: int,
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.worker_id != worker.id and worker.role != "admin":
        raise HTTPException(status_code=403, detail="Not your order")
    return {"order_id": order.id, "payment_status": order.payment_status}
