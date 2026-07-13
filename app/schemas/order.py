from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, model_validator


class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int


PickupSlot = Literal["12:00", "17:00"]


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest]
    pickup_date: date
    pickup_slot: PickupSlot


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str = ""
    quantity: int
    unit_price: float
    subtotal: float

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def pull_product_name(cls, data):
        if hasattr(data, "product") and data.product:
            data.__dict__["product_name"] = data.product.name
        return data


class PickupSlotOut(BaseModel):
    slot: PickupSlot
    label: str
    available: bool


class OrderOut(BaseModel):
    id: int
    worker_id: int
    status: str
    payment_status: str
    payment_method: str | None = None
    pickup_date: date | None = None
    pickup_slot: str | None = None
    total: float
    created_at: datetime
    items: list[OrderItemOut]

    model_config = {"from_attributes": True}


class SpendingSummary(BaseModel):
    month: str
    total_spend: float
    order_count: int
