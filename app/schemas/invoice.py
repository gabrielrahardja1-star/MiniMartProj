from datetime import datetime
from pydantic import BaseModel


class InvoiceItemOut(BaseModel):
    id: int
    raw_product_name: str
    quantity: int
    unit_price: float
    product_id: int | None

    model_config = {"from_attributes": True}


class InvoiceOut(BaseModel):
    id: int
    supplier_name: str | None
    filename: str
    status: str
    uploaded_at: datetime
    reviewed_at: datetime | None

    model_config = {"from_attributes": True}


class InvoiceDetailOut(InvoiceOut):
    items: list[InvoiceItemOut]


class MapItemRequest(BaseModel):
    product_id: int
