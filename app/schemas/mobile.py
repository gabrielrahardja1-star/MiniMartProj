from datetime import date
from pydantic import BaseModel
from app.schemas.order import PickupSlot, OrderItemRequest
from app.schemas.product import ProductOut


class MasterDataOut(BaseModel):
    products: list[ProductOut]
    pickup_slot_options: list[str]
    server_time: str


class SyncOrderRequest(BaseModel):
    client_record_id: str
    items: list[OrderItemRequest]
    pickup_date: date
    pickup_slot: PickupSlot


class SyncOrdersRequest(BaseModel):
    orders: list[SyncOrderRequest]


class SyncOrderResult(BaseModel):
    client_record_id: str
    status: str  # "synced" | "failed"
    server_order_id: int | None = None
    error: str | None = None


class SyncOrdersResponse(BaseModel):
    results: list[SyncOrderResult]


class SyncStatusOut(BaseModel):
    client_record_id: str
    server_order_id: int
    order_status: str
