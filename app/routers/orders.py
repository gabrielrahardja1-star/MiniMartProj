from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.order import Order, OrderItem
from app.models.worker import Worker
from app.schemas.order import CreateOrderRequest, OrderOut, SpendingSummary, PickupSlotOut
from app.core.deps import get_current_worker
from app.core.pickup import SLOTS, is_slot_available
from app.services.order_service import create_order_for_worker

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("/", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    body: CreateOrderRequest,
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    return create_order_for_worker(
        db,
        worker_id=worker.id,
        items=body.items,
        pickup_date=body.pickup_date,
        pickup_slot=body.pickup_slot,
    )


@router.get("/pickup-slots", response_model=list[PickupSlotOut])
def pickup_slots(
    date: date,
    worker: Worker = Depends(get_current_worker),
):
    labels = {"12:00": "12:00 PM", "17:00": "5:00 PM"}
    return [
        PickupSlotOut(
            slot=s,
            label=labels[s],
            available=is_slot_available(date, s),
        )
        for s in SLOTS
    ]


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
