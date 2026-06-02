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


OLD_SKUS = [
    "PALMIA-200G", "OXYKLIN-700G", "PINO-ICE-6", "SOFRESH-10ML",
    "GENKI-MD-32", "PEPSODENT-225", "BEARBRAND-189", "FAVOUR-TISSUE-200",
    "CHITATO-NORI-65",
    # Legacy seed SKUs replaced by V5 inventory
    "MKN-001", "MKN-002", "MKN-003", "MKN-004", "MKN-005", "MKN-006",
    "MKN-007", "MKN-008", "MKN-009", "MKN-010", "MKN-011", "MKN-012",
    "MKN-013", "MKN-014", "MKN-015", "MKN-016", "MKN-017", "MKN-018",
    "MKN-019", "MKN-020", "MKN-021", "MKN-022", "MKN-023", "MKN-024",
    "MKN-025", "MKN-026", "MKN-027", "MKN-028", "MKN-029", "MKN-030",
    "MKN-031", "MKN-032", "MKN-033", "MKN-035", "MKN-038", "MKN-039",
    "ALT-001", "ALT-002", "ALT-003", "ALT-004",
    "PRD-001", "PRD-002", "PRD-003", "PRD-004", "PRD-005", "PRD-006",
    "PRD-007", "PRD-008", "PRD-009",
    "KBR-001", "KBR-002", "KBR-003", "KBR-004", "KBR-005", "KBR-006",
    "KBR-007", "KBR-008",
    "WG-001", "SH-001", "WB-001", "EB-001", "PB-001",
]


def init_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        _seed_admin(db)
        _remove_old_products(db)
        _seed_products(db)
    finally:
        db.close()


def _remove_old_products(db: Session):
    from app.models.order import OrderItem
    products = db.query(Product).filter(Product.sku.in_(OLD_SKUS)).all()
    for p in products:
        db.query(OrderItem).filter(OrderItem.product_id == p.id).delete()
        db.delete(p)
    if products:
        db.commit()
        print(f"Removed {len(products)} old dummy products.")


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
    # Inventaris Mini Market V5 — 86 items
    {"sku": "MM-001", "name": "Vsoy Soymilk Original",          "name_zh": "原味豆奶",      "price": 12400,  "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Susu",            "brand": "Vsoy",           "size": "300ml",   "image_url": "/uploads/products/product_1.jpg"},
    {"sku": "MM-002", "name": "Collagena Milk Steril",           "name_zh": "胶原蛋白牛奶",  "price": 12900,  "unit": "kaleng","stock": 50, "category": "Makanan & Minuman", "sub_category": "Susu",            "brand": "Collagena",      "size": "189ml",   "image_url": "/uploads/products/product_2.jpg"},
    {"sku": "MM-003", "name": "Tujuh Kurma Susu Steril",         "name_zh": "椰枣牛奶",      "price": 9600,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Susu",            "brand": "Tujuh Kurma",    "size": "189ml",   "image_url": "/uploads/products/product_3.jpg"},
    {"sku": "MM-004", "name": "Ultra Milk UHT",                  "name_zh": "超高温灭菌奶",  "price": 7200,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Susu",            "brand": "Ultra",          "size": "250ml",   "image_url": "/uploads/products/product_4.jpg"},
    {"sku": "MM-005", "name": "Greenfields UHT Fullcream",       "name_zh": "新鲜牛奶",      "price": 7200,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Susu",            "brand": "Greenfields",    "size": "250ml",   "image_url": "/uploads/products/product_5.jpg"},
    {"sku": "MM-006", "name": "Cimory Drink Yogurt",             "name_zh": "优格饮料",      "price": 9100,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Susu",            "brand": "Cimory",         "size": "240ml",   "image_url": "/uploads/products/product_6.jpg"},
    {"sku": "MM-007", "name": "Milo Healty Drink",               "name_zh": "奶粉",          "price": 9600,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Susu",            "brand": "Milo",           "size": "220ml",   "image_url": "/uploads/products/product_7.jpg"},
    {"sku": "MM-008", "name": "Mizone Minuman Isotonik",         "name_zh": "运动饮料",      "price": 4700,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Minuman",         "brand": "Danone",         "size": "500ml",   "image_url": "/uploads/products/product_8.jpg"},
    {"sku": "MM-009", "name": "Sari Kacang Hijau",               "name_zh": "绿豆汁",        "price": 3200,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Minuman",         "brand": "Ultra",          "size": "150ml",   "image_url": "/uploads/products/product_9.jpg"},
    {"sku": "MM-010", "name": "Buavita Juice",                   "name_zh": "果汁",          "price": 7800,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Minuman",         "brand": "Buavita",        "size": "245ml",   "image_url": "/uploads/products/product_10.jpg"},
    {"sku": "MM-011", "name": "Tebs Minuman Soda",               "name_zh": "碳酸饮料",      "price": 7500,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Minuman",         "brand": "Tebs",           "size": "500ml",   "image_url": "/uploads/products/product_11.jpg"},
    {"sku": "MM-012", "name": "Panda Grass Jelly",               "name_zh": "熊猫牌饮料",    "price": 6200,   "unit": "kaleng","stock": 50, "category": "Makanan & Minuman", "sub_category": "Minuman",         "brand": "Cap Panda",      "size": "310ml",   "image_url": "/uploads/products/product_12.jpg"},
    {"sku": "MM-013", "name": "Larutan Cap Badak",               "name_zh": "犀牛牌饮料",    "price": 7900,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Minuman",         "brand": "Cap Badak",      "size": "500ml",   "image_url": "/uploads/products/product_13.jpg"},
    {"sku": "MM-014", "name": "Floridina Juice",                 "name_zh": "佛罗里达果汁",  "price": 3200,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Minuman",         "brand": "Wings",          "size": "350ml",   "image_url": "/uploads/products/product_14.jpg"},
    {"sku": "MM-015", "name": "Coca Cola",                       "name_zh": "可口可乐",      "price": 6800,   "unit": "kaleng","stock": 50, "category": "Makanan & Minuman", "sub_category": "Minuman",         "brand": "Coca-Cola",      "size": "330ml",   "image_url": "/uploads/products/product_15.jpg"},
    {"sku": "MM-016", "name": "Le Minerale 5000ml",              "name_zh": "大瓶矿泉水",    "price": 15200,  "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Air Mineral",     "brand": "Le Minerale",    "size": "5000ml",  "image_url": "/uploads/products/product_16.jpg"},
    {"sku": "MM-017", "name": "Le Minerale 1500ml",              "name_zh": "大瓶矿泉水",    "price": 5400,   "unit": "btl",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Air Mineral",     "brand": "Le Minerale",    "size": "1500ml",  "image_url": "/uploads/products/product_17.jpg"},
    {"sku": "MM-018", "name": "Indocafe Coffee Mix 3 in 1",      "name_zh": "拿铁咖啡",      "price": 16500,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Kopi & Teh",      "brand": "Indocafe",       "size": "10x20gr", "image_url": "/uploads/products/product_18.jpg"},
    {"sku": "MM-019", "name": "Luwak White Koffie Less Sugar",   "name_zh": "拿铁咖啡",      "price": 15900,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Kopi & Teh",      "brand": "Luwak",          "size": "10x20gr", "image_url": "/uploads/products/product_19.jpg"},
    {"sku": "MM-020", "name": "Good Day",                        "name_zh": "拿铁咖啡",      "price": 15500,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Kopi & Teh",      "brand": "Good Day",       "size": "10x22gr", "image_url": "/uploads/products/product_20.jpg"},
    {"sku": "MM-021", "name": "Max Tea Teh Tarik",               "name_zh": "拉茶",          "price": 13000,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Kopi & Teh",      "brand": "Max Tea",        "size": "5x25gr",  "image_url": "/uploads/products/product_21.jpg"},
    {"sku": "MM-022", "name": "Energen",                         "name_zh": "营养麦片",      "price": 12900,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Beras & Gandum",  "brand": "Energen",        "size": "5x34g",   "image_url": "/uploads/products/product_22.jpg"},
    {"sku": "MM-023", "name": "Telur Ayam Negeri",               "name_zh": "蛋",            "price": 0,      "unit": "pack",  "stock": 50, "category": "Makanan & Minuman", "sub_category": "Sembako",         "brand": "Telur Ayam Negeri","size": "10 Kg", "image_url": "/uploads/products/product_23.jpg"},
    {"sku": "MM-024", "name": "Indomie",                         "name_zh": "味精",          "price": 3100,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Mie & Pasta",     "brand": "Indomie",        "size": "80gr",    "image_url": "/uploads/products/product_24.jpg"},
    {"sku": "MM-025", "name": "Pop Mie",                         "name_zh": "杯面",          "price": 5300,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Mie & Pasta",     "brand": "Indomie",        "size": "77gr",    "image_url": "/uploads/products/product_25.jpg"},
    {"sku": "MM-026", "name": "Samyang Goreng Pedas Ayam",       "name_zh": "火鸡面",        "price": 19900,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Mie & Pasta",     "brand": "Samyang",        "size": "140gr",   "image_url": "/uploads/products/product_26.jpg"},
    {"sku": "MM-027", "name": "Nong Shim - Shin Ramyun",         "name_zh": "辛拉面",        "price": 13500,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Mie & Pasta",     "brand": "Nongshim",       "size": "120gr",   "image_url": "/uploads/products/product_27.jpg"},
    {"sku": "MM-028", "name": "Quaker Oats Instant Merah",       "name_zh": "燕麦",          "price": 56500,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Quaker",         "size": "1.2 Kg",  "image_url": "/uploads/products/product_28.jpg"},
    {"sku": "MM-029", "name": "Fitbar Chocolate",                "name_zh": "健康零食",      "price": 4900,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Fitbar",         "size": "20gr",    "image_url": "/uploads/products/product_29.jpg"},
    {"sku": "MM-030", "name": "Beng Beng Maxx",                  "name_zh": "威化饼干",      "price": 4900,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Beng Beng",      "size": "32gr",    "image_url": "/uploads/products/product_30.jpg"},
    {"sku": "MM-031", "name": "Silver Queen",                    "name_zh": "巧克力",        "price": 19600,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Silver Queen",   "size": "52gr",    "image_url": "/uploads/products/product_31.jpg"},
    {"sku": "MM-032", "name": "Kacang Mayasi",                   "name_zh": "炒花生",        "price": 10100,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Mayasi",         "size": "65gr",    "image_url": "/uploads/products/product_32.jpg"},
    {"sku": "MM-033", "name": "Kacang Dua Kelinci",              "name_zh": "双兔花生",      "price": 32500,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Dua Kelinci",    "size": "370gr",   "image_url": "/uploads/products/product_33.jpg"},
    {"sku": "MM-034", "name": "Kacang Garuda",                   "name_zh": "鹰牌花生",      "price": 31900,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Garuda",         "size": "350gr",   "image_url": "/uploads/products/product_34.jpg"},
    {"sku": "MM-035", "name": "Chitato",                         "name_zh": "薯片",          "price": 18900,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Chitato",        "size": "14gr",    "image_url": "/uploads/products/product_35.jpg"},
    {"sku": "MM-036", "name": "Qtela",                           "name_zh": "薯片",          "price": 6600,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Qtela",          "size": "60gr",    "image_url": "/uploads/products/product_36.jpg"},
    {"sku": "MM-037", "name": "Kuaci Rebo",                      "name_zh": "葵花籽",        "price": 15100,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Rebo",           "size": "140gr",   "image_url": "/uploads/products/product_37.jpg"},
    {"sku": "MM-038", "name": "Roma Sari Gandum",                "name_zh": "全麦饼干",      "price": 8000,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Roma",           "size": "149gr",   "image_url": "/uploads/products/product_38.jpg"},
    {"sku": "MM-039", "name": "Biskuit Regal",                   "name_zh": "奶油饼干",      "price": 12000,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Regal",          "size": "120gr",   "image_url": "/uploads/products/product_39.jpg"},
    {"sku": "MM-040", "name": "Biskuit Ritz Cheese",             "name_zh": "黄油饼干",      "price": 8800,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Ritz",           "size": "91gr",    "image_url": "/uploads/products/product_40.jpg"},
    {"sku": "MM-041", "name": "Biskuit Good Time",               "name_zh": "曲奇饼干",      "price": 8100,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Good Time",      "size": "72gr",    "image_url": "/uploads/products/product_41.jpg"},
    {"sku": "MM-042", "name": "Wafer Nabati",                    "name_zh": "威化饼干",      "price": 5800,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Nabati",         "size": "75gr",    "image_url": "/uploads/products/product_42.jpg"},
    {"sku": "MM-043", "name": "Mentos Candy",                    "name_zh": "曼妥思糖",      "price": 4100,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Permen",          "brand": "Mentos",         "size": "37gr",    "image_url": "/uploads/products/product_43.jpg"},
    {"sku": "MM-044", "name": "Kopiko Candy",                    "name_zh": "咖啡糖",        "price": 8900,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Permen",          "brand": "Kopiko",         "size": "105g",    "image_url": "/uploads/products/product_44.jpg"},
    {"sku": "MM-045", "name": "Fisherman's Friend",              "name_zh": "渔夫之宝",      "price": 17500,  "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Permen",          "brand": "Fisherman's",    "size": "25g",     "image_url": "/uploads/products/product_45.jpg"},
    {"sku": "MM-046", "name": "Permen Kiss",                     "name_zh": "糖果",          "price": 6900,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Permen",          "brand": "Kiss",           "size": "100gr",   "image_url": "/uploads/products/product_46.jpg"},
    {"sku": "MM-047", "name": "Finna Snack Kerupuk Udang",       "name_zh": "虾片",          "price": 1000,   "unit": "pcs",   "stock": 50, "category": "Makanan & Minuman", "sub_category": "Snack & Biskuit", "brand": "Finna",          "size": "10gr",    "image_url": "/uploads/products/product_47.jpg"},
    {"sku": "MM-048", "name": "Lux Body Wash",                   "name_zh": "力士沐浴露",    "price": 23800,  "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Sabun Mandi",     "brand": "Lux",            "size": "400ml",   "image_url": "/uploads/products/product_48.jpg"},
    {"sku": "MM-049", "name": "Lifebuoy Sabun Batang",           "name_zh": "卫宝香皂",      "price": 3200,   "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Sabun Mandi",     "brand": "Lifebuoy",       "size": "60gr",    "image_url": "/uploads/products/product_49.jpg"},
    {"sku": "MM-050", "name": "Lifebuoy Body Wash",              "name_zh": "卫宝沐浴露",    "price": 18100,  "unit": "btl",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Sabun Mandi",     "brand": "Lifebuoy",       "size": "100ml",   "image_url": "/uploads/products/product_50.jpg"},
    {"sku": "MM-051", "name": "Sabun Cair Biore",                "name_zh": "碧柔沐浴露",    "price": 23000,  "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Sabun Mandi",     "brand": "Biore",          "size": "400ml",   "image_url": "/uploads/products/product_51.jpg"},
    {"sku": "MM-052", "name": "Sabun Cair Nuvo",                 "name_zh": "新活力沐浴露",  "price": 17900,  "unit": "btl",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Sabun Mandi",     "brand": "Nuvo",           "size": "400ml",   "image_url": "/uploads/products/product_52.jpg"},
    {"sku": "MM-053", "name": "Sabun Batang Dettol",             "name_zh": "滴露香皂",      "price": 4500,   "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Sabun Mandi",     "brand": "Dettol",         "size": "60gr",    "image_url": "/uploads/products/product_53.jpg"},
    {"sku": "MM-054", "name": "Sabun Batang Lux",                "name_zh": "力士香皂",      "price": 4500,   "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Sabun Mandi",     "brand": "Lux",            "size": "70gr",    "image_url": "/uploads/products/product_54.jpg"},
    {"sku": "MM-055", "name": "Sunsilk Shampoo Silky Smooth",    "name_zh": "夏士莲洗发水",  "price": 26900,  "unit": "btl",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Rambut","brand": "Sunsilk",         "size": "160ml",   "image_url": "/uploads/products/product_55.jpg"},
    {"sku": "MM-056", "name": "Lifebuoy Shampoo Anti Dandruff",  "name_zh": "卫宝洗发水",    "price": 12700,  "unit": "btl",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Rambut","brand": "Lifebuoy",        "size": "70ml",    "image_url": "/uploads/products/product_56.jpg"},
    {"sku": "MM-057", "name": "Head & Shoulders",                "name_zh": "海飞丝洗发水",  "price": 34300,  "unit": "btl",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Rambut","brand": "H&S",             "size": "160ml",   "image_url": "/uploads/products/product_57.jpg"},
    {"sku": "MM-058", "name": "Shampo Clear",                    "name_zh": "清扬洗发水",    "price": 15500,  "unit": "btl",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Rambut","brand": "Clear",           "size": "70ml",    "image_url": "/uploads/products/product_58.jpg"},
    {"sku": "MM-059", "name": "Shampo Zinc",                     "name_zh": "锌洗发水",      "price": 23000,  "unit": "btl",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Rambut","brand": "Zinc",            "size": "170ml",   "image_url": "/uploads/products/product_59.jpg"},
    {"sku": "MM-060", "name": "Pepsodent Pasta Gigi",            "name_zh": "牙膏",          "price": 9900,   "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Mulut", "brand": "Pepsodent",       "size": "120gr",   "image_url": "/uploads/products/product_60.jpg"},
    {"sku": "MM-061", "name": "Formula Pasta Gigi",              "name_zh": "牙膏",          "price": 11600,  "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Mulut", "brand": "Formula",         "size": "160gr",   "image_url": "/uploads/products/product_61.jpg"},
    {"sku": "MM-062", "name": "Sikat Gigi Pepsodent 1pcs",       "name_zh": "牙刷",          "price": 3100,   "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Mulut", "brand": "Pepsodent",       "size": "1pcs",    "image_url": "/uploads/products/product_62.jpg"},
    {"sku": "MM-063", "name": "Gilletette Razor Blue II",        "name_zh": "剃须刀",        "price": 9600,   "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Kulit", "brand": "Gilletee",        "size": "1pcs",    "image_url": "/uploads/products/product_63.jpg"},
    {"sku": "MM-064", "name": "Sabun Cuci Muka Nivea",           "name_zh": "妮维雅洁面",    "price": 38500,  "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Kulit", "brand": "Nivea",           "size": "100ml",   "image_url": "/uploads/products/product_64.jpg"},
    {"sku": "MM-065", "name": "Biore Facial Foam Men",           "name_zh": "碧柔男士洁面",  "price": 32500,  "unit": "pcs",   "stock": 50, "category": "Perawatan Diri",    "sub_category": "Perawatan Kulit", "brand": "Biore",           "size": "100gr",   "image_url": "/uploads/products/product_65.jpg"},
    {"sku": "MM-066", "name": "Rinso Detergen Bubuk",            "name_zh": "力士洗衣粉",    "price": 19900,  "unit": "pcs",   "stock": 50, "category": "Kebersihan",        "sub_category": "Detergen",        "brand": "Rinso",           "size": "770gr",   "image_url": "/uploads/products/product_66.jpg"},
    {"sku": "MM-067", "name": "Rinso Cair",                      "name_zh": "力士液态洗衣液","price": 14500,  "unit": "pcs",   "stock": 50, "category": "Kebersihan",        "sub_category": "Detergen",        "brand": "Rinso",           "size": "510gr",   "image_url": "/uploads/products/product_67.jpg"},
    {"sku": "MM-068", "name": "Hit Insektisida",                 "name_zh": "杀虫剂",        "price": 35300,  "unit": "btl",   "stock": 50, "category": "Kebersihan",        "sub_category": "Insektisida",     "brand": "Hit",             "size": "600ml",   "image_url": "/uploads/products/product_68.jpg"},
    {"sku": "MM-069", "name": "Baygon",                          "name_zh": "灭蚊剂",        "price": 44900,  "unit": "btl",   "stock": 50, "category": "Kebersihan",        "sub_category": "Insektisida",     "brand": "Baygon",          "size": "600ml",   "image_url": "/uploads/products/product_69.jpg"},
    {"sku": "MM-070", "name": "Autan",                           "name_zh": "驱蚊液",        "price": 500,    "unit": "pcs",   "stock": 50, "category": "Kebersihan",        "sub_category": "Insektisida",     "brand": "Autan",           "size": "6ml",     "image_url": "/uploads/products/product_70.jpg"},
    {"sku": "MM-071", "name": "Soffell",                         "name_zh": "驱蚊喷雾",      "price": 11000,  "unit": "pcs",   "stock": 50, "category": "Kebersihan",        "sub_category": "Insektisida",     "brand": "Soffell",         "size": "60gr",    "image_url": "/uploads/products/product_71.jpg"},
    {"sku": "MM-072", "name": "Paseo Smart Facial Tissue",       "name_zh": "面巾纸",        "price": 12300,  "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Tisu",            "brand": "Paseo",           "size": "540ply",  "image_url": "/uploads/products/product_72.jpg"},
    {"sku": "MM-073", "name": "Tissue Basah Mitu Pink",          "name_zh": "湿巾",          "price": 4500,   "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Tisu Basah",      "brand": "Mitu",            "size": "10s",     "image_url": "/uploads/products/product_73.jpg"},
    {"sku": "MM-074", "name": "Merah Putih Handuk Polos",        "name_zh": "毛巾",          "price": 69300,  "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Handuk & Lap",    "brand": "Merah Putih",     "size": "70x135cm","image_url": "/uploads/products/product_74.jpg"},
    {"sku": "MM-075", "name": "Larisst Sapu",                    "name_zh": "扫帚",          "price": 43300,  "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Peralatan Bersih","brand": "-",               "size": "-",       "image_url": "/uploads/products/product_75.jpg"},
    {"sku": "MM-076", "name": "Gantungan Baju",                  "name_zh": "衣架",          "price": 4000,   "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Peralatan Lain",  "brand": "-",               "size": "1",       "image_url": "/uploads/products/product_76.jpg"},
    {"sku": "MM-077", "name": "Mug Seng Enamel Polos 6cm",       "name_zh": "杯子",          "price": 8800,   "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Peralatan Lain",  "brand": "-",               "size": "150ml",   "image_url": "/uploads/products/product_77.jpg"},
    {"sku": "MM-078", "name": "Celana Dalam XL",                 "name_zh": "内裤",          "price": 63400,  "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Pakaian",         "brand": "GT MAN",          "size": "XL",      "image_url": "/uploads/products/product_78.jpg"},
    {"sku": "MM-079", "name": "Celana Dalam XXL",                "name_zh": "内裤",          "price": 86700,  "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Pakaian",         "brand": "GT MAN",          "size": "XXL",     "image_url": "/uploads/products/product_79.jpg"},
    {"sku": "MM-080", "name": "Bagus Kapur Ajaib",               "name_zh": "樟",            "price": 10800,  "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Peralatan Lain",  "brand": "Bagus",           "size": "1",       "image_url": "/uploads/products/product_80.jpg"},
    {"sku": "MM-081", "name": "Keranjang",                       "name_zh": "浴室收纳篮",    "price": 27900,  "unit": "pcs",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Peralatan Lain",  "brand": "-",               "size": "-",       "image_url": "/uploads/products/product_81.jpg"},
    {"sku": "MM-082", "name": "Cap Lang Kayu Putih",             "name_zh": "草药",          "price": 22700,  "unit": "btl",   "stock": 50, "category": "Herbal",            "sub_category": "Herbal",          "brand": "Cap Lang",        "size": "60ml",    "image_url": "/uploads/products/product_82.jpg"},
    {"sku": "MM-083", "name": "Tolak Angin",                     "name_zh": "草药",          "price": 24500,  "unit": "box",   "stock": 50, "category": "Herbal",            "sub_category": "Herbal",          "brand": "Sido Muncul",     "size": "5x15ml",  "image_url": "/uploads/products/product_83.jpg"},
    {"sku": "MM-084", "name": "Musitika Ratu Minyak Zaitun",     "name_zh": "橄榄油",        "price": 38900,  "unit": "btl",   "stock": 50, "category": "Herbal",            "sub_category": "Herbal",          "brand": "Mustika Ratu",    "size": "175ml",   "image_url": "/uploads/products/product_84.jpg"},
    {"sku": "MM-085", "name": "Luwak Tin Can",                   "name_zh": "锡罐咖啡",      "price": 320000, "unit": "kaleng","stock": 50, "category": "Makanan & Minuman", "sub_category": "Kopi & Teh",      "brand": "Luwak",           "size": "100gr",   "image_url": "/uploads/products/product_85.jpg"},
    {"sku": "MM-086", "name": "TOYA Tumbler 4 Liter",            "name_zh": "水瓶",          "price": 386000, "unit": "btl",   "stock": 50, "category": "Peralatan Rumah",   "sub_category": "Lain-Lain",       "brand": "Tidak ada Merk",  "size": "4 Liter", "image_url": "/uploads/products/product_86.jpg"},
]


def _seed_products(db: Session):
    for p in SEED_PRODUCTS:
        existing = db.query(Product).filter(Product.sku == p["sku"]).first()
        if existing:
            continue
        db.add(Product(
            name=p["name"],
            name_zh=p.get("name_zh"),
            sku=p["sku"],
            price=p["price"],
            stock=p["stock"],
            unit=p["unit"],
            category=p.get("category"),
            sub_category=p.get("sub_category"),
            brand=p.get("brand"),
            size=p.get("size"),
            image_url=p.get("image_url"),
            is_active=True,
        ))
    db.commit()
    print(f"Products seeded.")


if __name__ == "__main__":
    init_db()
    print("Database initialised.")
