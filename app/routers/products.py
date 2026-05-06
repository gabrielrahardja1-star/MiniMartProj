from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.product import Product
from app.models.worker import Worker
from app.schemas.product import ProductOut
from app.core.deps import get_current_worker

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("/", response_model=list[ProductOut])
def list_products(
    db: Session = Depends(get_db),
    _worker: Worker = Depends(get_current_worker),
):
    return (
        db.query(Product)
        .filter(Product.stock > 0, Product.is_active == True)
        .order_by(Product.name)
        .all()
    )
