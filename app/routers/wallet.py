from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_current_worker
from app.db.session import get_db
from app.models.order import Order
from app.models.wallet import WalletTransaction
from app.models.worker import Worker
from app.schemas.order import OrderOut
from app.schemas.wallet import WalletBalanceOut, WalletTransactionOut

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("/me", response_model=WalletBalanceOut)
def my_wallet_balance(worker: Worker = Depends(get_current_worker)):
    return WalletBalanceOut(worker_id=worker.id, balance=float(worker.balance))


@router.get("/me/transactions", response_model=list[WalletTransactionOut])
def my_wallet_transactions(
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    return (
        db.query(WalletTransaction)
        .filter(WalletTransaction.worker_id == worker.id)
        .order_by(WalletTransaction.created_at.desc(), WalletTransaction.id.desc())
        .all()
    )


@router.post("/pay/{order_id}", response_model=OrderOut)
def pay_order_with_wallet(
    order_id: int,
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    order = (
        db.query(Order)
        .filter(Order.id == order_id)
        .with_for_update()
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.worker_id != worker.id:
        raise HTTPException(status_code=403, detail="Not your order")
    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Order is cancelled")
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")

    locked_worker = (
        db.query(Worker)
        .filter(Worker.id == worker.id)
        .with_for_update()
        .first()
    )
    if not locked_worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    db.refresh(order)
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Order is already paid")

    order_total = float(order.total)
    current_balance = float(locked_worker.balance)
    if current_balance < order_total:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient wallet balance")

    locked_worker.balance = round(current_balance - order_total, 2)
    order.payment_status = "paid"
    order.payment_method = "wallet"
    order.updated_at = datetime.now(timezone.utc)
    db.add(WalletTransaction(
        worker_id=locked_worker.id,
        type="payment",
        amount=order_total,
        balance_after=locked_worker.balance,
        order_id=order.id,
        performed_by_worker_id=locked_worker.id,
    ))
    db.commit()
    db.refresh(order)
    return order
