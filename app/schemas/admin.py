from datetime import datetime
from pydantic import BaseModel, field_validator
from app.schemas.wallet import WalletTransactionOut


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


class ProductAdminOut(BaseModel):
    id: int
    name: str
    name_zh: str | None = None
    sku: str
    price: float
    stock: int
    unit: str
    category: str | None = None
    category_zh: str | None = None
    sub_category: str | None = None
    brand: str | None = None
    size: str | None = None
    image_url: str | None = None
    is_active: bool
    low_stock: bool = False
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductCreateRequest(BaseModel):
    name: str
    name_zh: str | None = None
    sku: str | None = None
    price: float
    stock: int = 0
    unit: str = "unit"
    category: str | None = None
    sub_category: str | None = None

    _clean = field_validator("name_zh", "category", "sub_category")(_blank_to_none)


class ProductUpdateRequest(BaseModel):
    name: str | None = None
    name_zh: str | None = None
    price: float | None = None
    stock: int | None = None
    unit: str | None = None
    category: str | None = None
    sub_category: str | None = None
    is_active: bool | None = None

    _clean = field_validator("name_zh", "category", "sub_category")(_blank_to_none)


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
    payment_status: str
    total: float
    created_at: datetime
    items: list[OrderItemAdminOut] = []

    model_config = {"from_attributes": True}


class WorkerOut(BaseModel):
    id: int
    employee_id: str
    hr_employee_id: str | None = None
    name: str
    role: str
    is_active: bool
    balance: float

    model_config = {"from_attributes": True}


class WorkerCreateRequest(BaseModel):
    employee_id: str
    hr_employee_id: str | None = None
    name: str
    pin: str


class WorkerUpdateRequest(BaseModel):
    name: str | None = None
    hr_employee_id: str | None = None
    pin: str | None = None
    is_active: bool | None = None


class WorkerSpending(BaseModel):
    employee_id: str
    hr_employee_id: str | None = None
    name: str
    total_deduction: float
    order_count: int


class WalletTopUpResult(BaseModel):
    worker: WorkerOut
    transaction: WalletTransactionOut


class OrderRefundResult(BaseModel):
    order_id: int
    worker_id: int
    worker_employee_id: str
    worker_balance: float
    refunded_amount: float


class WalletReversalResult(BaseModel):
    transaction_id: int
    worker_id: int
    worker_employee_id: str
    worker_balance: float
    reversed_amount: float
