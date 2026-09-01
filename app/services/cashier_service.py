from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.wallet import WalletTransaction
from app.models.worker import Worker


def normalize_occurred_at(dt: datetime | None) -> datetime | None:
    """Coerce a client-supplied timestamp to the app's naive-UTC convention
    and reject future dates. Used for backdating sales / ledger entries."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    if dt > datetime.utcnow():
        raise HTTPException(status_code=400, detail="Date cannot be in the future")
    return dt


def create_cashier_sale(
    db: Session,
    cashier_id: int,
    worker_employee_id: str,
    items: list,
    client_record_id: str,
    occurred_at: datetime | None = None,
) -> Order:
    """Walk-up sale rung up by a cashier on a tablet: creates an order for
    the purchasing worker and immediately settles it from that worker's
    wallet balance, in one transaction. No pickup date/slot - the goods
    leave with the worker on the spot.

    Mirrors create_order_for_worker's stock-locking, but skips pickup
    validation and folds the wallet debit (normally a separate call in
    pay_order_with_wallet) into the same commit so a sale is never left
    half-done: either stock + balance both move, or neither does.

    Idempotent on client_record_id, same as the field-order sync path.
    """
    existing = db.query(Order).filter(Order.client_record_id == client_record_id).first()
    if existing:
        return existing

    if not items:
        raise HTTPException(status_code=400, detail="Sale must contain at least one item")

    occurred_at = normalize_occurred_at(occurred_at)

    worker = (
        db.query(Worker)
        .filter(Worker.employee_id == worker_employee_id, Worker.is_active == True)
        .with_for_update()
        .first()
    )
    if not worker:
        raise HTTPException(status_code=404, detail=f"Worker '{worker_employee_id}' not found")

    order = Order(
        worker_id=worker.id,
        client_record_id=client_record_id,
        status="fulfilled",
        payment_status="unpaid",
        total=0.0,
        pickup_date=None,
        pickup_slot=None,
    )
    if occurred_at is not None:
        order.created_at = occurred_at
    db.add(order)
    db.flush()

    order_total = 0.0
    for req in items:
        if req.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Quantity must be positive for product {req.product_id}")

        product = (
            db.query(Product)
            .filter(Product.id == req.product_id, Product.is_active == True)
            .with_for_update()
            .first()
        )
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {req.product_id} not found")
        if product.stock < req.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"'{product.name}' only has {product.stock} in stock, requested {req.quantity}",
            )

        unit_price = float(product.price)
        subtotal = unit_price * req.quantity
        order_total += subtotal

        db.add(OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=req.quantity,
            unit_price=unit_price,
            subtotal=subtotal,
        ))
        product.stock -= req.quantity

    current_balance = float(worker.balance)
    if current_balance < order_total:
        raise HTTPException(status_code=409, detail=f"Insufficient balance for {worker.name}")

    worker.balance = round(current_balance - order_total, 2)
    order.total = order_total
    order.payment_status = "paid"
    order.payment_method = "wallet"
    order.updated_at = datetime.now(timezone.utc)

    tx = WalletTransaction(
        worker_id=worker.id,
        type="payment",
        amount=order_total,
        balance_after=worker.balance,
        order_id=order.id,
        performed_by_worker_id=cashier_id,
        note="Cashier sale",
    )
    if occurred_at is not None:
        tx.created_at = occurred_at
    db.add(tx)

    db.commit()
    db.refresh(order)
    return order
