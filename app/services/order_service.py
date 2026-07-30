from datetime import date
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.core.pickup import validate_pickup_choice


class OrderItemInput:
    def __init__(self, product_id: int, quantity: int):
        self.product_id = product_id
        self.quantity = quantity


def create_order_for_worker(
    db: Session,
    worker_id: int,
    items: list,
    pickup_date: date,
    pickup_slot: str,
    client_record_id: str | None = None,
) -> Order:
    """Creates an order with stock validation. Reused by the web order
    endpoint and the mobile offline-sync endpoint so both paths share
    identical pricing/stock logic.

    If client_record_id is set and an order with that id already exists,
    the existing order is returned unchanged (idempotent replay).
    """
    if client_record_id:
        existing = db.query(Order).filter(Order.client_record_id == client_record_id).first()
        if existing:
            return existing

    if not items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    error = validate_pickup_choice(pickup_date, pickup_slot)
    if error:
        raise HTTPException(status_code=400, detail=error)

    order = Order(
        worker_id=worker_id,
        client_record_id=client_record_id,
        status="pending",
        total=0.0,
        pickup_date=pickup_date,
        pickup_slot=pickup_slot,
    )
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

    order.total = order_total
    db.commit()
    db.refresh(order)
    return order
