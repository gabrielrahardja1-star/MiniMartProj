from datetime import datetime
from pydantic import BaseModel, model_validator


class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int


class CreateOrderRequest(BaseModel):
    items: list[OrderItemRequest]


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


class OrderOut(BaseModel):
    id: int
    worker_id: int
    status: str
    payment_status: str
    total: float
    created_at: datetime
    items: list[OrderItemOut]

    model_config = {"from_attributes": True}


class SpendingSummary(BaseModel):
    month: str
    total_spend: float
    order_count: int
