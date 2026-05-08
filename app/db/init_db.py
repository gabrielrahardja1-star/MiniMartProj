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
    # Makanan & Minuman
    {"sku": "MKN-001", "name": "Vsoy Soymilk Original",          "price": 42250, "unit": "1L",        "stock": 50},
    {"sku": "MKN-002", "name": "Belfoods Nugget Ayam Crunchy",    "price": 60000, "unit": "500gr",     "stock": 50},
    {"sku": "MKN-003", "name": "Kanzler Chicken Nugget Crispy",   "price": 66900, "unit": "450gr",     "stock": 50},
    {"sku": "MKN-004", "name": "Hanzel Smoked Beef",              "price": 42250, "unit": "200gr",     "stock": 50},
    {"sku": "MKN-005", "name": "Kapal Api Coffee Special",        "price": 40110, "unit": "380gr",     "stock": 50},
    {"sku": "MKN-006", "name": "Collagena Milk Steril",           "price": 15900, "unit": "189ml",     "stock": 50},
    {"sku": "MKN-007", "name": "Sunpride Juice",                  "price": 12000, "unit": "220ml",     "stock": 50},
    {"sku": "MKN-008", "name": "Sari Roti Tawar Kupas",           "price": 18000, "unit": "200gr",     "stock": 50},
    {"sku": "MKN-009", "name": "5 Days Croissant",                "price": 9000,  "unit": "60gr",      "stock": 50},
    {"sku": "MKN-010", "name": "Sania Beras Premium",             "price": 74500, "unit": "5kg",       "stock": 50},
    {"sku": "MKN-011", "name": "Kellogg's Coco Fills",            "price": 30000, "unit": "150gr",     "stock": 50},
    {"sku": "MKN-012", "name": "Quaker Oats",                     "price": 29000, "unit": "8x28gr",    "stock": 50},
    {"sku": "MKN-013", "name": "Kopi Tubruk Gadjah Manis",        "price": 20000, "unit": "10x23gr",   "stock": 50},
    {"sku": "MKN-014", "name": "Bango Kecap Manis",               "price": 27000, "unit": "700gr",     "stock": 50},
    {"sku": "MKN-015", "name": "Royco Kaldu Sapi & Ayam",         "price": 13000, "unit": "220gr",     "stock": 50},
    {"sku": "MKN-016", "name": "Delmonte Barbeque Sauce",         "price": 12000, "unit": "250gr",     "stock": 50},
    {"sku": "MKN-017", "name": "ABC Sambal Extra Pedas",          "price": 18000, "unit": "270ml",     "stock": 50},
    {"sku": "MKN-018", "name": "Saori Saus Tiram",                "price": 14000, "unit": "133ml",     "stock": 50},
    {"sku": "MKN-019", "name": "Ajinomoto MSG",                   "price": 16000, "unit": "250gr",     "stock": 50},
    {"sku": "MKN-020", "name": "Indomie",                         "price": 3200,  "unit": "70gr",      "stock": 50},
    {"sku": "MKN-021", "name": "Bogasari Terigu Kunci Biru",      "price": 17500, "unit": "1kg",       "stock": 50},
    {"sku": "MKN-022", "name": "Blue Band Serbaguna",             "price": 10500, "unit": "200gr",     "stock": 50},
    {"sku": "MKN-023", "name": "Ceres Hagelslag",                 "price": 16000, "unit": "80gr",      "stock": 50},
    {"sku": "MKN-024", "name": "Imperial Waffle Sandwich",        "price": 10000, "unit": "108gr",     "stock": 50},
    {"sku": "MKN-025", "name": "Luwak White Koffie",              "price": 19000, "unit": "9x19gr",    "stock": 50},
    {"sku": "MKN-026", "name": "Good Day Latte",                  "price": 18000, "unit": "10x22gr",   "stock": 50},
    {"sku": "MKN-027", "name": "Sariwangi Teh Asli",              "price": 9000,  "unit": "30x1.85gr", "stock": 50},
    {"sku": "MKN-028", "name": "Tujuh Kurma Susu Steril",         "price": 11800, "unit": "189ml",     "stock": 50},
    {"sku": "MKN-029", "name": "Ultra Milk UHT",                  "price": 9000,  "unit": "250ml",     "stock": 50},
    {"sku": "MKN-030", "name": "Pronas Beef",                     "price": 30000, "unit": "198gr",     "stock": 50},
    {"sku": "MKN-031", "name": "Larutan Cap Badak",               "price": 8000,  "unit": "350ml",     "stock": 50},
    {"sku": "MKN-032", "name": "Greenfields Fresh Milk",          "price": 32000, "unit": "950ml",     "stock": 50},
    {"sku": "MKN-033", "name": "Cimory Drink Yogurt",             "price": 10000, "unit": "240ml",     "stock": 50},
    {"sku": "MKN-035", "name": "Fiesta Chicken Sausage",          "price": 60000, "unit": "400gr",     "stock": 50},
    {"sku": "MKN-038", "name": "Campina Ice Cream",               "price": 30900, "unit": "350ml",     "stock": 50},
    {"sku": "MKN-039", "name": "Just Fry French Fries",           "price": 60000, "unit": "900gr",     "stock": 50},
    {"sku": "ALT-001", "name": "Filma Minyak Goreng",             "price": 45000, "unit": "2L",        "stock": 50},
    # Perawatan Diri
    {"sku": "PRD-001", "name": "Pepsodent Pasta Gigi White",      "price": 19000, "unit": "225gr",     "stock": 50},
    {"sku": "PRD-002", "name": "Sunsilk Shampoo Silky Smooth",    "price": 20000, "unit": "110ml",     "stock": 50},
    {"sku": "PRD-003", "name": "Lifebuoy Shampoo Anti Dandruff",  "price": 16000, "unit": "70ml",      "stock": 50},
    {"sku": "PRD-004", "name": "Head & Shoulders Shampoo",        "price": 36000, "unit": "160ml",     "stock": 50},
    {"sku": "PRD-005", "name": "Lux Body Wash",                   "price": 30000, "unit": "400ml",     "stock": 50},
    {"sku": "PRD-006", "name": "Lifebuoy Sabun Mandi",            "price": 25000, "unit": "4x100gr",   "stock": 50},
    {"sku": "PRD-007", "name": "Lifebuoy Body Wash",              "price": 25000, "unit": "400ml",     "stock": 50},
    {"sku": "PRD-008", "name": "Rexona Deodorant",                "price": 25000, "unit": "45ml",      "stock": 50},
    {"sku": "PRD-009", "name": "Amaterasun Sunscreen",            "price": 80000, "unit": "SPF50",     "stock": 50},
    # Kebersihan
    {"sku": "KBR-001", "name": "Rinso Detergen",                  "price": 12000, "unit": "380gr",     "stock": 50},
    {"sku": "KBR-002", "name": "Soklin Liquid Detergen",          "price": 14000, "unit": "525ml",     "stock": 50},
    {"sku": "KBR-003", "name": "Molto Pewangi",                   "price": 14000, "unit": "765ml",     "stock": 50},
    {"sku": "KBR-004", "name": "Sunlight Lime Pouch",             "price": 10000, "unit": "400ml",     "stock": 50},
    {"sku": "KBR-005", "name": "Vixal Pembersih Porselen",        "price": 14000, "unit": "600ml",     "stock": 50},
    {"sku": "KBR-006", "name": "Wipol Karbol",                    "price": 19000, "unit": "750ml",     "stock": 50},
    {"sku": "KBR-007", "name": "Hit Insektisida",                 "price": 37900, "unit": "600ml",     "stock": 50},
    {"sku": "KBR-008", "name": "Downy Fabric Softener",           "price": 34000, "unit": "500ml",     "stock": 50},
    # Peralatan Rumah
    {"sku": "ALT-002", "name": "Multi Facial Tissue",             "price": 18000, "unit": "260 lbr",   "stock": 50},
    {"sku": "ALT-003", "name": "Montiss Facial Tissue 2Ply",      "price": 23000, "unit": "200 lbr",   "stock": 50},
    {"sku": "ALT-004", "name": "Sandal Swallow",                  "price": 35000, "unit": "1 pcs",     "stock": 50},
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
