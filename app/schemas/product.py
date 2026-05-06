from pydantic import BaseModel


class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    price: float
    stock: int
    unit: str

    model_config = {"from_attributes": True}
