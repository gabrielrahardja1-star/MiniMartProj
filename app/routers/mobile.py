from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.order import Order
from app.models.product import Product
from app.models.worker import Worker
from app.core.deps import get_current_worker, require_cashier
from app.core.pickup import SLOTS
from app.schemas.cashier import (
    CashierMasterDataOut,
    CashierSalesRequest,
    CashierSalesResponse,
    CashierSaleResult,
)
from app.schemas.mobile import (
    MasterDataOut,
    SyncOrdersRequest,
    SyncOrdersResponse,
    SyncOrderResult,
    SyncStatusOut,
)
from app.services.cashier_service import create_cashier_sale
from app.services.order_service import create_order_for_worker

router = APIRouter(prefix="/api/mobile/v1", tags=["mobile"])


@router.get("/master-data", response_model=MasterDataOut)
def master_data(
    db: Session = Depends(get_db),
    _worker: Worker = Depends(get_current_worker),
):
    """Bundles the reference data the Android app must cache locally to
    build the order form while offline."""
    products = (
        db.query(Product)
        .filter(Product.stock > 0, Product.is_active == True)
        .order_by(Product.name)
        .all()
    )
    return MasterDataOut(
        products=products,
        pickup_slot_options=list(SLOTS),
        server_time=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/orders/sync", response_model=SyncOrdersResponse)
def sync_orders(
    body: SyncOrdersRequest,
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    """Uploads a batch of locally-queued orders created while offline.

    Each order carries a device-generated client_record_id. Resubmitting an
    id that already exists on the server (e.g. after a dropped connection
    on a prior sync attempt) is idempotent: the existing order is returned
    rather than creating a duplicate.
    """
    results: list[SyncOrderResult] = []
    for req in body.orders:
        try:
            order = create_order_for_worker(
                db,
                worker_id=worker.id,
                items=req.items,
                pickup_date=req.pickup_date,
                pickup_slot=req.pickup_slot,
                client_record_id=req.client_record_id,
            )
            results.append(SyncOrderResult(
                client_record_id=req.client_record_id,
                status="synced",
                server_order_id=order.id,
            ))
        except HTTPException as exc:
            db.rollback()
            results.append(SyncOrderResult(
                client_record_id=req.client_record_id,
                status="failed",
                error=str(exc.detail),
            ))
    return SyncOrdersResponse(results=results)


@router.get("/sync/status", response_model=list[SyncStatusOut])
def sync_status(
    client_record_ids: str,
    db: Session = Depends(get_db),
    worker: Worker = Depends(get_current_worker),
):
    """Given a comma-separated list of client_record_ids, reports which ones
    the server already has. Lets the app reconcile its local queue after a
    reinstall or an extended period offline."""
    ids = [i for i in client_record_ids.split(",") if i]
    if not ids:
        return []
    orders = (
        db.query(Order)
        .filter(Order.worker_id == worker.id, Order.client_record_id.in_(ids))
        .all()
    )
    return [
        SyncStatusOut(
            client_record_id=o.client_record_id,
            server_order_id=o.id,
            order_status=o.status,
        )
        for o in orders
    ]


@router.get("/cashier/master-data", response_model=CashierMasterDataOut)
def cashier_master_data(
    db: Session = Depends(get_db),
    _cashier: Worker = Depends(require_cashier),
):
    """Everything the cashier tablet caches locally: the product catalog
    plus the worker directory (with balances) needed to look someone up by
    employee ID while offline."""
    products = (
        db.query(Product)
        .filter(Product.stock > 0, Product.is_active == True)
        .order_by(Product.name)
        .all()
    )
    workers = (
        db.query(Worker)
        .filter(Worker.is_active == True, Worker.role == "worker")
        .order_by(Worker.name)
        .all()
    )
    return CashierMasterDataOut(
        products=products,
        workers=workers,
        server_time=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/cashier/sales/sync", response_model=CashierSalesResponse)
def sync_cashier_sales(
    body: CashierSalesRequest,
    db: Session = Depends(get_db),
    cashier: Worker = Depends(require_cashier),
):
    """Uploads a batch of locally-queued cashier sales. Each sale creates an
    order for the named worker and settles it from that worker's wallet in
    one transaction. Idempotent per client_record_id, same contract as
    /orders/sync."""
    results: list[CashierSaleResult] = []
    for req in body.sales:
        try:
            order = create_cashier_sale(
                db,
                cashier_id=cashier.id,
                worker_employee_id=req.worker_employee_id,
                items=req.items,
                client_record_id=req.client_record_id,
                occurred_at=req.occurred_at,
            )
            results.append(CashierSaleResult(
                client_record_id=req.client_record_id,
                status="synced",
                server_order_id=order.id,
                worker_balance_after=float(order.worker.balance),
            ))
        except HTTPException as exc:
            db.rollback()
            results.append(CashierSaleResult(
                client_record_id=req.client_record_id,
                status="failed",
                error=str(exc.detail),
            ))
    return CashierSalesResponse(results=results)
