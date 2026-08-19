from pydantic import BaseModel
from app.schemas.order import OrderItemRequest
from app.schemas.product import ProductOut


class WorkerLookupOut(BaseModel):
    id: int
    employee_id: str
    name: str
    balance: float

    model_config = {"from_attributes": True}


class CashierMasterDataOut(BaseModel):
    products: list[ProductOut]
    workers: list[WorkerLookupOut]
    server_time: str


class CashierSaleRequest(BaseModel):
    client_record_id: str
    worker_employee_id: str
    items: list[OrderItemRequest]


class CashierSalesRequest(BaseModel):
    sales: list[CashierSaleRequest]


class CashierSaleResult(BaseModel):
    client_record_id: str
    status: str  # "synced" | "failed"
    server_order_id: int | None = None
    worker_balance_after: float | None = None
    error: str | None = None


class CashierSalesResponse(BaseModel):
    results: list[CashierSaleResult]
