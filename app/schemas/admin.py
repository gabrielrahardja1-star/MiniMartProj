from datetime import datetime
from pydantic import BaseModel


class ProductAdminOut(BaseModel):
    id: int
    name: str
    sku: str
    price: float
    stock: int
    unit: str
    is_active: bool
    low_stock: bool = False

    model_config = {"from_attributes": True}


class ProductCreateRequest(BaseModel):
    name: str
    sku: str
    price: float
    stock: int = 0
    unit: str = "unit"


class ProductUpdateRequest(BaseModel):
    name: str | None = None
    price: float | None = None
    stock: int | None = None
    unit: str | None = None
    is_active: bool | None = None


class OrderItemAdminOut(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    unit_price: float

    model_config = {"from_attributes": True}


class OrderAdminOut(BaseModel):
    id: int
    worker_id: int
    worker_employee_id: str
    worker_name: str
    status: str
    total: float
    created_at: datetime
    items: list[OrderItemAdminOut] = []

    model_config = {"from_attributes": True}


class WorkerSpending(BaseModel):
    employee_id: str
    name: str
    total_deduction: float
    order_count: int
