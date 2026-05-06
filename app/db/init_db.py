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
        _seed_products(db)
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


SEED_PRODUCTS = [
    {"name": "Palmia Margarine Serbaguna", "sku": "PALMIA-200G",   "price": 6400,  "stock": 50, "unit": "200 g"},
    {"name": "Bu Krim Detergent Oxy Klin Powder Violet Scent", "sku": "OXYKLIN-700G", "price": 24000, "stock": 50, "unit": "700 g"},
    {"name": "Pino Ice Cup",               "sku": "PINO-ICE-6",    "price": 10900, "stock": 50, "unit": "6 pcs"},
    {"name": "So Fresh Minyak Angin Aromatherapy", "sku": "SOFRESH-10ML", "price": 15000, "stock": 50, "unit": "10 mL x2"},
    {"name": "Genki Moko Moko Pants Medium", "sku": "GENKI-MD-32",  "price": 57900, "stock": 50, "unit": "32 pcs"},
    {"name": "Pepsodent Pasta Gigi White",  "sku": "PEPSODENT-225", "price": 18900, "stock": 50, "unit": "225 mL"},
    {"name": "Bear Brand Susu Steril",      "sku": "BEARBRAND-189", "price": 10900, "stock": 50, "unit": "189 mL"},
    {"name": "Favour Character Facial Tissue", "sku": "FAVOUR-TISSUE-200", "price": 15200, "stock": 50, "unit": "200 pcs"},
    {"name": "Chitato Lite Snack Potato Nori", "sku": "CHITATO-NORI-65", "price": 11900, "stock": 50, "unit": "65 g"},
]


def _seed_products(db: Session):
    for p in SEED_PRODUCTS:
        existing = db.query(Product).filter(Product.sku == p["sku"]).first()
        if existing:
            continue
        db.add(Product(
            name=p["name"],
            sku=p["sku"],
            price=p["price"],
            stock=p["stock"],
            unit=p["unit"],
            is_active=True,
        ))
    db.commit()
    print(f"Products seeded.")


if __name__ == "__main__":
    init_db()
    print("Database initialised.")
