import csv
import io
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session, joinedload
from app.db.session import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.wallet import WalletTransaction
from app.models.worker import Worker
from app.schemas.admin import (
    ProductAdminOut,
    ProductCreateRequest,
    ProductUpdateRequest,
    OrderAdminOut,
    OrderItemAdminOut,
    OrderRefundResult,
    WorkerOut,
    WorkerCreateRequest,
    WorkerUpdateRequest,
    WorkerSpending,
    WalletTopUpResult,
    WalletReversalResult,
)
from app.schemas.wallet import WalletTopUpRequest, WalletAdjustRequest, WalletTransactionOut
from app.core.security import hash_pin
from app.core.deps import require_admin
from app.services.storage import save_product_image, ALLOWED_IMAGE_EXTENSIONS

LOW_STOCK_THRESHOLD = 5
MAX_IMAGE_BYTES = 5 * 1024 * 1024
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


def _generate_sku(db: Session) -> str:
    """Auto-assigns the next MM-NNN SKU for products created without one
    (e.g. from the desktop till's inventory tab, which doesn't ask for a
    SKU)."""
    existing = [row[0] for row in db.query(Product.sku).filter(Product.sku.like("MM-%")).all()]
    max_n = 0
    for sku in existing:
        suffix = sku[3:]
        if suffix.isdigit():
            max_n = max(max_n, int(suffix))
    return f"MM-{max_n + 1:03d}"


@router.post("/products/", response_model=ProductAdminOut, status_code=status.HTTP_201_CREATED)
def admin_create_product(
    body: ProductCreateRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    data = body.model_dump()
    sku = data.pop("sku") or _generate_sku(db)
    if db.query(Product).filter(Product.sku == sku).first():
        raise HTTPException(status_code=409, detail=f"SKU '{sku}' already exists")
    product = Product(sku=sku, **data)
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


@router.post("/products/{product_id}/image", response_model=ProductAdminOut)
def admin_upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PNG, JPEG, or WEBP images are accepted")

    contents = file.file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")
    try:
        Image.open(io.BytesIO(contents)).verify()
    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="File is not a valid image")

    product.image_url = save_product_image(product_id, ext, contents)
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
        payment_status=order.payment_status,
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


@router.put("/orders/{order_id}/ready", response_model=OrderAdminOut)
def mark_order_ready(
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
    if order.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Order has not been paid yet")
    order.status = "ready"
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _build_order_out(order)


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
    if order.status != "ready":
        raise HTTPException(status_code=400, detail=f"Order must be 'ready' before fulfilling (current: '{order.status}')")
    order.status = "fulfilled"
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _build_order_out(order)


@router.put("/orders/{order_id}/cancel", response_model=OrderAdminOut)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin: Worker = Depends(require_admin),
):
    order = db.query(Order).options(
        joinedload(Order.worker),
        joinedload(Order.items).joinedload(OrderItem.product),
    ).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in ("pending", "ready"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel an order with status '{order.status}'")
    # Restore stock
    for item in order.items:
        product = db.get(Product, item.product_id)
        if product:
            product.stock += item.quantity

    wallet_payment = (
        db.query(WalletTransaction)
        .filter(
            WalletTransaction.order_id == order.id,
            WalletTransaction.type == "payment",
        )
        .first()
    )
    if wallet_payment:
        worker = (
            db.query(Worker)
            .filter(Worker.id == order.worker_id)
            .with_for_update()
            .first()
        )
        if worker:
            refund_amount = float(wallet_payment.amount)
            worker.balance = round(float(worker.balance) + refund_amount, 2)
            db.add(WalletTransaction(
                worker_id=worker.id,
                type="refund",
                amount=refund_amount,
                balance_after=worker.balance,
                order_id=order.id,
                performed_by_worker_id=admin.id,
                note="Order cancelled",
            ))

    order.status = "cancelled"
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _build_order_out(order)


@router.post("/orders/{order_id}/refund", response_model=OrderRefundResult)
def refund_order(
    order_id: int,
    db: Session = Depends(get_db),
    admin: Worker = Depends(require_admin),
):
    """Reverses a cashier-till sale: restores stock, refunds the worker's
    wallet, and logs it. This is the "undo" for a synced till sale — the
    precise inverse of create_cashier_sale. Only wallet-paid orders (i.e.
    cashier-till sales) are eligible; QRIS-paid web pre-orders use a
    different flow (cancel_order above)."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .with_for_update()
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == "cancelled":
        raise HTTPException(status_code=400, detail="Order already refunded")
    if order.payment_method != "wallet":
        raise HTTPException(status_code=400, detail="Only wallet-paid orders can be refunded this way")

    for item in order.items:
        product = (
            db.query(Product)
            .filter(Product.id == item.product_id)
            .with_for_update()
            .first()
        )
        if product:
            product.stock += item.quantity

    worker = (
        db.query(Worker)
        .filter(Worker.id == order.worker_id)
        .with_for_update()
        .first()
    )
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    worker.balance = round(float(worker.balance) + float(order.total), 2)
    db.add(WalletTransaction(
        worker_id=worker.id,
        type="refund",
        amount=float(order.total),
        balance_after=worker.balance,
        order_id=order.id,
        performed_by_worker_id=admin.id,
        note="Cashier sale refund",
    ))

    order.status = "cancelled"
    order.payment_status = "refunded"
    order.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(worker)
    return OrderRefundResult(
        order_id=order.id,
        worker_id=worker.id,
        worker_employee_id=worker.employee_id,
        worker_balance=float(worker.balance),
        refunded_amount=float(order.total),
    )


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
        hr_employee_id=body.hr_employee_id,
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
    if body.hr_employee_id is not None:
        worker.hr_employee_id = body.hr_employee_id
    if body.pin is not None:
        worker.pin_hash = hash_pin(body.pin)
    if body.is_active is not None:
        worker.is_active = body.is_active
    db.commit()
    db.refresh(worker)
    return worker


@router.post("/workers/{worker_id}/topup", response_model=WalletTopUpResult)
def admin_top_up_worker(
    worker_id: int,
    body: WalletTopUpRequest,
    db: Session = Depends(get_db),
    admin: Worker = Depends(require_admin),
):
    worker = (
        db.query(Worker)
        .filter(Worker.id == worker_id)
        .with_for_update()
        .first()
    )
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    if not worker.is_active:
        raise HTTPException(status_code=400, detail="Cannot top up an inactive worker")

    amount = round(float(body.amount), 2)
    worker.balance = round(float(worker.balance) + amount, 2)
    tx = WalletTransaction(
        worker_id=worker.id,
        type="topup",
        amount=amount,
        balance_after=worker.balance,
        performed_by_worker_id=admin.id,
        note=body.note,
    )
    db.add(tx)
    db.commit()
    db.refresh(worker)
    db.refresh(tx)
    return WalletTopUpResult(worker=worker, transaction=tx)


@router.post("/workers/{worker_id}/adjust-balance", response_model=WalletTopUpResult)
def admin_adjust_worker_balance(
    worker_id: int,
    body: WalletAdjustRequest,
    db: Session = Depends(get_db),
    admin: Worker = Depends(require_admin),
):
    """Directly corrects a worker's balance to a specific value (e.g. fixing
    a data-entry mistake), rather than adding a top-up. Still logged as a
    wallet_transaction — type adjustment_credit/adjustment_debit, amount
    stored as the positive size of the change — so the ledger always
    reconciles with the balance."""
    worker = (
        db.query(Worker)
        .filter(Worker.id == worker_id)
        .with_for_update()
        .first()
    )
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    new_balance = round(float(body.new_balance), 2)
    delta = round(new_balance - float(worker.balance), 2)
    if delta == 0:
        raise HTTPException(status_code=400, detail="New balance matches the current balance")

    worker.balance = new_balance
    tx = WalletTransaction(
        worker_id=worker.id,
        type="adjustment_credit" if delta > 0 else "adjustment_debit",
        amount=abs(delta),
        balance_after=worker.balance,
        performed_by_worker_id=admin.id,
        note=body.note,
    )
    db.add(tx)
    db.commit()
    db.refresh(worker)
    db.refresh(tx)
    return WalletTopUpResult(worker=worker, transaction=tx)


@router.get("/workers/{worker_id}/transactions", response_model=list[WalletTransactionOut])
def admin_worker_transactions(
    worker_id: int,
    db: Session = Depends(get_db),
    _admin: Worker = Depends(require_admin),
):
    worker = db.get(Worker, worker_id)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    return (
        db.query(WalletTransaction)
        .filter(WalletTransaction.worker_id == worker.id)
        .order_by(WalletTransaction.created_at.desc(), WalletTransaction.id.desc())
        .all()
    )


@router.post("/wallet-transactions/{tx_id}/reverse", response_model=WalletReversalResult)
def reverse_wallet_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    admin: Worker = Depends(require_admin),
):
    """Reverses a top-up: this is the "undo" for a wallet top-up. Debits
    back the credited amount (deliberately allowed to go negative — this is
    an administrative correction undoing a mistaken credit, not a purchase,
    so there is no floor check here on purpose) and logs a 'reversal'
    transaction. Guarded by tx.reversed so the same top-up can't be
    reversed twice."""
    tx = (
        db.query(WalletTransaction)
        .filter(WalletTransaction.id == tx_id)
        .with_for_update()
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if tx.type != "topup":
        raise HTTPException(status_code=400, detail="Only top-ups can be reversed this way")
    if tx.reversed:
        raise HTTPException(status_code=400, detail="This top-up has already been reversed")

    worker = (
        db.query(Worker)
        .filter(Worker.id == tx.worker_id)
        .with_for_update()
        .first()
    )
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    worker.balance = round(float(worker.balance) - float(tx.amount), 2)
    tx.reversed = True
    db.add(WalletTransaction(
        worker_id=worker.id,
        type="reversal",
        amount=float(tx.amount),
        balance_after=worker.balance,
        order_id=None,
        performed_by_worker_id=admin.id,
        note=f"Reversal of top-up #{tx.id}",
    ))

    db.commit()
    db.refresh(worker)
    return WalletReversalResult(
        transaction_id=tx.id,
        worker_id=worker.id,
        worker_employee_id=worker.employee_id,
        worker_balance=float(worker.balance),
        reversed_amount=float(tx.amount),
    )


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
                hr_employee_id=worker.hr_employee_id,
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
                "hr_employee_id": worker.hr_employee_id or "",
                "total_deduction": 0.0,
                "month": month or (date_from.strftime("%Y-%m") if date_from else "all"),
            }
        totals[worker.id]["total_deduction"] += float(order.total)

    buf = io.StringIO()
    writer = csv.DictWriter(
        buf,
        fieldnames=["worker_name", "employee_id", "hr_employee_id", "total_deduction", "month"],
    )
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
