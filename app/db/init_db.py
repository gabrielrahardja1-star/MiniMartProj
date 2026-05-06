import bcrypt
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.worker import Worker
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.invoice import Invoice, InvoiceItem


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def init_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        _seed_admin(db)
    finally:
        db.close()


def _seed_admin(db: Session):
    existing = db.query(Worker).filter(Worker.employee_id == "ADMIN001").first()
    if existing:
        print("Admin account already exists.")
        return
    admin = Worker(
        employee_id="ADMIN001",
        name="Administrator",
        pin_hash=hash_pin("0000"),
        role="admin",
    )
    db.add(admin)
    db.commit()
    print("Default admin created: ADMIN001 / PIN 0000 — change this PIN after first login.")


if __name__ == "__main__":
    init_db()
    print("Database initialised.")
