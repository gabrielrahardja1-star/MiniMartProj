from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ProductOut(BaseModel):
    id: int
    name: str
    name_zh: Optional[str] = None
    sku: str
    price: float
    stock: int
    unit: str
    category: Optional[str] = None
    sub_category: Optional[str] = None
    brand: Optional[str] = None
    size: Optional[str] = None
    image_url: Optional[str] = None
    updated_at: datetime

    model_config = {"from_attributes": True}
