from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.worker import Worker
from app.schemas.order import CreateOrderRequest, OrderOut, SpendingSummary
from app.core.deps import get_current_worker

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    body: CreateOrderRequest,
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    if not body.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    order = Order(worker_id=worker.id, status="pending", total=0.0)
    db.add(order)
    db.flush()

    order_total = 0.0
    for req in body.items:
        if req.quantity <= 0:
            raise HTTPException(status_code=400, detail=f"Quantity must be positive for product {req.product_id}")

        # Lock the row to prevent race conditions on stock
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

        # Decrement stock atomically
        product.stock -= req.quantity

    order.total = order_total
    db.commit()
    db.refresh(order)
    return order


@router.get("/my", response_model=list[OrderOut])
def my_orders(
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    return (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.worker_id == worker.id)
        .order_by(Order.created_at.desc())
        .all()
    )


@router.get("/my/spending", response_model=SpendingSummary)
def my_spending(
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    orders = (
        db.query(Order)
        .filter(
            Order.worker_id == worker.id,
            Order.status != "cancelled",
            Order.created_at >= month_start,
        )
        .all()
    )

    total = sum(float(o.total) for o in orders)
    return SpendingSummary(
        month=now.strftime("%Y-%m"),
        total_spend=round(total, 2),
        order_count=len(orders),
    )
