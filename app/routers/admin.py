import csv
import io
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.order import Order
from app.models.product import Product
from app.models.worker import Worker
from app.schemas.admin import (
    ProductAdminOut,
    ProductCreateRequest,
    ProductUpdateRequest,
    OrderAdminOut,
    OrderItemAdminOut,
    WorkerOut,
    WorkerCreateRequest,
    WorkerUpdateRequest,
    WorkerSpending,
)
from app.core.security import hash_pin
from app.core.deps import require_admin

LOW_STOCK_THRESHOLD = 5
router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Products ─────────────────────────────────────────────────────────────────

@router.get("/products/", response_model=list[ProductAdminOut])
def admin_list_products(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    products = db.query(Product).order_by(Product.name).all()
    result = []
    for p in products:
        out = ProductAdminOut.model_validate(p)
        out.low_stock = p.stock <= LOW_STOCK_THRESHOLD
        result.append(out)
    return result


@router.post("/products/", response_model=ProductAdminOut, status_code=status.HTTP_201_CREATED)
def admin_create_product(
    body: ProductCreateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    if db.query(Product).filter(Product.sku == body.sku).first():
        raise HTTPException(status_code=409, detail=f"SKU '{body.sku}' already exists")
    product = Product(**body.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    out = ProductAdminOut.model_validate(product)
    out.low_stock = product.stock <= LOW_STOCK_THRESHOLD
    return out


@router.put("/products/{product_id}", response_model=ProductAdminOut)
def admin_update_product(
    product_id: int,
    body: ProductUpdateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    out = ProductAdminOut.model_validate(product)
    out.low_stock = product.stock <= LOW_STOCK_THRESHOLD
    return out


# ── Orders ────────────────────────────────────────────────────────────────────

def _build_order_out(order: Order) -> OrderAdminOut:
    return OrderAdminOut(
        id=order.id,
        worker_id=order.worker_id,
        worker_employee_id=order.worker.employee_id,
        worker_name=order.worker.name,
        status=order.status,
        total=float(order.total),
        created_at=order.created_at,
        items=[
            OrderItemAdminOut(
                product_id=item.product_id,
                product_name=item.product.name if item.product else f"Product #{item.product_id}",
                quantity=item.quantity,
                unit_price=float(item.unit_price),
            )
            for item in order.items
        ],
    )


@router.get("/orders/", response_model=list[OrderAdminOut])
def admin_list_orders(
    status_filter: str | None = Query(None, alias="status"),
    worker_id: int | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    q = db.query(Order).options(
        joinedload(Order.worker),
        joinedload(Order.items).joinedload(OrderItem.product),
    )
    if status_filter:
        q = q.filter(Order.status == status_filter)
    if worker_id:
        q = q.filter(Order.worker_id == worker_id)
    if date_from:
        q = q.filter(Order.created_at >= date_from)
    if date_to:
        q = q.filter(Order.created_at <= date_to)
    orders = q.order_by(Order.created_at.desc()).all()
    return [_build_order_out(o) for o in orders]


@router.put("/orders/{order_id}/fulfill", response_model=OrderAdminOut)
def fulfill_order(
    order_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    order = db.query(Order).options(
        joinedload(Order.worker),
        joinedload(Order.items).joinedload(OrderItem.product),
    ).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail=f"Order is already '{order.status}'")
    order.status = "fulfilled"
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _build_order_out(order)


@router.put("/orders/{order_id}/cancel", response_model=OrderAdminOut)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    order = db.query(Order).options(
        joinedload(Order.worker),
        joinedload(Order.items).joinedload(OrderItem.product),
    ).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("pending",):
        raise HTTPException(status_code=400, detail=f"Cannot cancel an order with status '{order.status}'")
    # Restore stock
    for item in order.items:
        product = db.get(Product, item.product_id)
        if product:
            product.stock += item.quantity
    order.status = "cancelled"
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _build_order_out(order)


# ── Workers ───────────────────────────────────────────────────────────────────

@router.get("/workers/", response_model=list[WorkerOut])
def admin_list_workers(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    return db.query(Worker).order_by(Worker.employee_id).all()


@router.post("/workers/", response_model=WorkerOut, status_code=status.HTTP_201_CREATED)
def admin_create_worker(
    body: WorkerCreateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    if db.query(Worker).filter(Worker.employee_id == body.employee_id).first():
        raise HTTPException(status_code=409, detail=f"Employee ID '{body.employee_id}' already exists")
    worker = Worker(
        employee_id=body.employee_id,
        name=body.name,
        pin_hash=hash_pin(body.pin),
        role="worker",
        is_active=True,
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker


@router.patch("/workers/{worker_id}", response_model=WorkerOut)
def admin_update_worker(
    worker_id: int,
    body: WorkerUpdateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    worker = db.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    if body.name is not None:
        worker.name = body.name
    if body.pin is not None:
        worker.pin_hash = hash_pin(body.pin)
    if body.is_active is not None:
        worker.is_active = body.is_active
    db.commit()
    db.refresh(worker)
    return worker


# ── Reports ───────────────────────────────────────────────────────────────────

def _spending_query(db: Session, date_from: datetime | None, date_to: datetime | None):
    q = (
        db.query(Worker, Order)
        .join(Order, Order.worker_id == Worker.id)
        .filter(Order.status != "cancelled")
    )
    if date_from:
        q = q.filter(Order.created_at >= date_from)
    if date_to:
        q = q.filter(Order.created_at <= date_to)
    return q.all()


@router.get("/reports/spending", response_model=list[WorkerSpending])
def spending_report(
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    rows = _spending_query(db, date_from, date_to)
    totals: dict[int, WorkerSpending] = {}
    for worker, order in rows:
        if worker.id not in totals:
            totals[worker.id] = WorkerSpending(
                employee_id=worker.employee_id,
                name=worker.name,
                total_deduction=0.0,
                order_count=0,
            )
        totals[worker.id].total_deduction += float(order.total)
        totals[worker.id].order_count += 1
    for s in totals.values():
        s.total_deduction = round(s.total_deduction, 2)
    return sorted(totals.values(), key=lambda s: s.employee_id)


@router.get("/reports/spending.csv")
def spending_report_csv(
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    month: str | None = Query(None, description="e.g. 2026-03"),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    # Allow ?month=2026-03 as a shortcut
    if month and not date_from and not date_to:
        try:
            year, mon = map(int, month.split("-"))
            date_from = datetime(year, mon, 1, tzinfo=timezone.utc)
            next_mon = mon % 12 + 1
            next_year = year + (1 if mon == 12 else 0)
            date_to = datetime(next_year, next_mon, 1, tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid month format, use YYYY-MM")

    rows = _spending_query(db, date_from, date_to)
    totals: dict[int, dict] = {}
    for worker, order in rows:
        if worker.id not in totals:
            totals[worker.id] = {
                "worker_name": worker.name,
                "employee_id": worker.employee_id,
                "total_deduction": 0.0,
                "month": month or (date_from.strftime("%Y-%m") if date_from else "all"),
            }
        totals[worker.id]["total_deduction"] += float(order.total)

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=["worker_name", "employee_id", "total_deduction", "month"])
    writer.writeheader()
    for row in sorted(totals.values(), key=lambda r: r["employee_id"]):
        row["total_deduction"] = round(row["total_deduction"], 2)
        writer.writerow(row)

    buf.seek(0)
    filename = f"spending_{month or 'report'}.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
