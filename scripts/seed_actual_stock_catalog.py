"""Replace the products catalog with the real current-stock MMI inventory
(41 items, from KATALOG MMI actual-stock sheet, 2026-08-26). Supersedes the
earlier 93-item mmi_minimart_seed.sql import, which covered the full
theoretical catalog including items not yet purchased; this reflects what
is actually in stock right now, with real quantities and correct Chinese names.

Chinese names (`name_zh`) and the five formerly-Chinese Latin `name`s were
revised on 2026-09-01 from the reviewed 中文名称（建议）list; scripts/
backfill_product_names_zh.py applies the same values to a live DB in place.

Run inside the backend container:

    docker compose exec backend python scripts/seed_actual_stock_catalog.py
"""
import os
import sys
import sqlite3

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, REPO_ROOT)

from app.config import settings  # noqa: E402

PRODUCTS = [
    {'id': 1, 'sheet_sku': 2, 'name': "Bear Brand Steril", 'name_zh': "BEAR BRAND 熊牌灭菌乳", 'category': "Susu", 'size': "189ml", 'unit': "kaleng", 'price': 11500, 'stock': 270, 'image_url': '/uploads/products/product_1.png'},
    {'id': 2, 'sheet_sku': 3, 'name': "Collagena", 'name_zh': "Collagena 胶原蛋白灭菌乳", 'category': "Susu", 'size': "189ml", 'unit': "kaleng / 罐", 'price': 14500, 'stock': 120, 'image_url': None},
    {'id': 3, 'sheet_sku': 9, 'name': "Mizone coco boost", 'name_zh': "Mizone Coco Boost 运动饮料", 'category': "Minuman", 'size': "500ml", 'unit': "btl / 瓶", 'price': 5000, 'stock': 240, 'image_url': '/uploads/products/product_3.png'},
    {'id': 4, 'sheet_sku': 10, 'name': "Sari Kacang Hijau", 'name_zh': "绿豆饮料", 'category': "Minuman", 'size': "150ml", 'unit': "btl / 瓶", 'price': 3500, 'stock': 120, 'image_url': '/uploads/products/product_4.png'},
    {'id': 5, 'sheet_sku': 11, 'name': "Buavita", 'name_zh': "Buavita 果汁饮料", 'category': "Minuman", 'size': "245ml", 'unit': "btl / 瓶", 'price': 6500, 'stock': 72, 'image_url': None},
    {'id': 6, 'sheet_sku': 12, 'name': "Tebs", 'name_zh': "TEBS 碳酸茶饮料", 'category': "Minuman", 'size': "500ml", 'unit': "btl / 瓶", 'price': 7500, 'stock': 24, 'image_url': '/uploads/products/product_6.png'},
    {'id': 7, 'sheet_sku': 13, 'name': "Minuman Panda", 'name_zh': "熊猫牌仙草饮料", 'category': "Minuman", 'size': "310ml", 'unit': "kaleng / 罐", 'price': 6000, 'stock': 168, 'image_url': '/uploads/products/product_7.png'},
    {'id': 8, 'sheet_sku': 14, 'name': "Cap Badak", 'name_zh': "Cap Badak 犀牛牌清凉饮料", 'category': "Minuman", 'size': "500ml", 'unit': "btl / 瓶", 'price': 9000, 'stock': 120, 'image_url': '/uploads/products/product_8.png'},
    {'id': 9, 'sheet_sku': 15, 'name': "You C 1000", 'name_zh': "YOU C1000 维生素C饮料", 'category': "Minuman", 'size': "140ml", 'unit': "btl", 'price': 7000, 'stock': 270, 'image_url': '/uploads/products/product_9.png'},
    {'id': 10, 'sheet_sku': 17, 'name': "ICHITAN Brown Sugar", 'name_zh': "ICHITAN 黑糖味饮料", 'category': "Minuman", 'size': "300ml", 'unit': "btl", 'price': 8000, 'stock': 312, 'image_url': '/uploads/products/product_10.png'},
    {'id': 11, 'sheet_sku': 18, 'name': "NU Milk Tea NU", 'name_zh': "NU 奶茶", 'category': "Minuman", 'size': "330ml", 'unit': "btl", 'price': 8000, 'stock': 184, 'image_url': '/uploads/products/product_11.png'},
    {'id': 12, 'sheet_sku': 19, 'name': "Coca Cola", 'name_zh': "可口可乐 / 零度可口可乐", 'category': "Minuman", 'size': "390ml", 'unit': "btl / 瓶", 'price': 5500, 'stock': 144, 'image_url': '/uploads/products/product_12.png'},
    {'id': 13, 'sheet_sku': 21, 'name': "Adem Sari Sparkling", 'name_zh': "Adem Sari 清凉气泡饮料", 'category': "Minuman", 'size': "320ml", 'unit': "kaleng", 'price': 9000, 'stock': 120, 'image_url': '/uploads/products/product_13.png'},
    {'id': 14, 'sheet_sku': 22, 'name': "CLEO 12800ml Cleo", 'name_zh': "CLEO 纯净饮用水 12.8升", 'category': "Minuman", 'size': "12800ml", 'unit': "pcs", 'price': 25000, 'stock': 200, 'image_url': None},
    {'id': 15, 'sheet_sku': 24, 'name': "Ovaltine 3in1", 'name_zh': "Ovaltine 阿华田三合一巧克力麦芽饮品", 'category': "Coklat Bubuk", 'size': "18×33gr", 'unit': "pcs", 'price': 71000, 'stock': 11, 'image_url': '/uploads/products/product_15.png'},
    {'id': 16, 'sheet_sku': 26, 'name': "Luwak", 'name_zh': "Luwak 低糖白咖啡", 'category': "Kopi & Teh", 'size': "10x20gr", 'unit': "pcs / 件", 'price': 10000, 'stock': 120, 'image_url': '/uploads/products/product_16.png'},
    {'id': 17, 'sheet_sku': 27, 'name': "Good Day", 'name_zh': "Good Day 速溶咖啡", 'category': "Kopi & Teh", 'size': "10x22gr", 'unit': "pcs / 件", 'price': 22000, 'stock': 180, 'image_url': '/uploads/products/product_17.png'},
    {'id': 18, 'sheet_sku': 29, 'name': "Indomie", 'name_zh': "Indomie 印尼方便面", 'category': "Mie & Pasta", 'size': "80gr", 'unit': "pcs / 件", 'price': 3500, 'stock': 234, 'image_url': '/uploads/products/product_18.png'},
    {'id': 19, 'sheet_sku': 31, 'name': "Samyang", 'name_zh': "三养辣鸡炒面", 'category': "Mie & Pasta", 'size': "140gr", 'unit': "pcs / 件", 'price': 17000, 'stock': 35, 'image_url': '/uploads/products/product_19.png'},
    {'id': 20, 'sheet_sku': 35, 'name': "Beng Beng Maxx", 'name_zh': "Beng Beng Maxx 巧克力威化棒", 'category': "Snack & Biskuit", 'size': "32gr", 'unit': "pcs / 件", 'price': 5000, 'stock': 442, 'image_url': '/uploads/products/product_20.png'},
    {'id': 21, 'sheet_sku': 38, 'name': "Dua Kelinci", 'name_zh': "Dua Kelinci 花生", 'category': "Snack & Biskuit", 'size': "370gr", 'unit': "pcs / 件", 'price': 31500, 'stock': 24, 'image_url': '/uploads/products/product_21.png'},
    {'id': 22, 'sheet_sku': 39, 'name': "Garuda", 'name_zh': "Garuda 花生", 'category': "Snack & Biskuit", 'size': "350gr", 'unit': "pcs / 件", 'price': 39000, 'stock': 9, 'image_url': '/uploads/products/product_22.png'},
    {'id': 23, 'sheet_sku': 40, 'name': "Chitato", 'name_zh': "Chitato 薯片", 'category': "Snack & Biskuit", 'size': "14gr", 'unit': "pcs / 件", 'price': 3000, 'stock': 583, 'image_url': '/uploads/products/product_23.png'},
    {'id': 24, 'sheet_sku': 41, 'name': "Qtela", 'name_zh': "Qtela 木薯脆片", 'category': "Snack & Biskuit", 'size': "60gr", 'unit': "pcs / 件", 'price': 6500, 'stock': 108, 'image_url': '/uploads/products/product_24.png'},
    {'id': 25, 'sheet_sku': 42, 'name': "Rebo", 'name_zh': "Rebo 葵花籽", 'category': "Snack & Biskuit", 'size': "140gr", 'unit': "pcs / 件", 'price': 12000, 'stock': 84, 'image_url': '/uploads/products/product_25.png'},
    {'id': 26, 'sheet_sku': 44, 'name': "Regal", 'name_zh': "Regal 玛丽饼干", 'category': "Snack & Biskuit", 'size': "120gr", 'unit': "pcs / 件", 'price': 14500, 'stock': 86, 'image_url': '/uploads/products/product_26.png'},
    {'id': 27, 'sheet_sku': 46, 'name': "Good Time", 'name_zh': "Good Time 曲奇饼干", 'category': "Snack & Biskuit", 'size': "72gr", 'unit': "pcs / 件", 'price': 9000, 'stock': 137, 'image_url': '/uploads/products/product_27.png'},
    {'id': 28, 'sheet_sku': 47, 'name': "Nabati", 'name_zh': "Nabati 威化饼干", 'category': "Snack & Biskuit", 'size': "75gr", 'unit': "pcs / 件", 'price': 5500, 'stock': 37, 'image_url': '/uploads/products/product_28.png'},
    {'id': 29, 'sheet_sku': 48, 'name': "Tango Waffer Coklat Tango", 'name_zh': "Tango 巧克力威化饼干", 'category': "Snack & Biskuit", 'size': "100gr", 'unit': "pcs", 'price': 3000, 'stock': 48, 'image_url': None},
    {'id': 30, 'sheet_sku': 50, 'name': "Kopiko", 'name_zh': "Kopiko 咖啡糖", 'category': "Permen", 'size': "165g", 'unit': "pcs / 件", 'price': 10500, 'stock': 29, 'image_url': None},
    {'id': 31, 'sheet_sku': 54, 'name': "Shampo Head & Shoulder", 'name_zh': "Head & Shoulders 海飞丝洗发水", 'category': "Perawatan Rambut", 'size': "160ml/145", 'unit': "btl / 瓶", 'price': 25500, 'stock': 90, 'image_url': '/uploads/products/product_31.png'},
    {'id': 32, 'sheet_sku': 55, 'name': "Pepsodent", 'name_zh': "Pepsodent 牙膏", 'category': "Perawatan Mulut", 'size': "120gr", 'unit': "pcs / 件", 'price': 10000, 'stock': 69, 'image_url': '/uploads/products/product_32.png'},
    {'id': 33, 'sheet_sku': 56, 'name': "Pepsodent", 'name_zh': "Pepsodent 牙刷（1支）", 'category': "Perawatan Mulut", 'size': "1pcs", 'unit': "pcs / 件", 'price': 3500, 'stock': 72, 'image_url': '/uploads/products/product_33.png'},
    {'id': 34, 'sheet_sku': 57, 'name': "Nivea", 'name_zh': "NIVEA 妮维雅洁面乳", 'category': "Perawatan Kulit", 'size': "100ml", 'unit': "pcs / 件", 'price': 35500, 'stock': 17, 'image_url': '/uploads/products/product_34.png'},
    {'id': 35, 'sheet_sku': 58, 'name': "Biore", 'name_zh': "Biore 碧柔男士洁面乳", 'category': "Perawatan Kulit", 'size': "100gr", 'unit': "pcs / 件", 'price': 33500, 'stock': 24, 'image_url': '/uploads/products/product_35.png'},
    {'id': 36, 'sheet_sku': 59, 'name': "Rinso", 'name_zh': "Rinso 洗衣粉", 'category': "Detergen", 'size': "770gr", 'unit': "pcs / 件", 'price': 19500, 'stock': 20, 'image_url': '/uploads/products/product_36.png'},
    {'id': 37, 'sheet_sku': 60, 'name': "Rinso", 'name_zh': "Rinso 洗衣液", 'category': "Detergen", 'size': "510gr", 'unit': "pcs / 件", 'price': 10500, 'stock': 16, 'image_url': '/uploads/products/product_37.png'},
    {'id': 38, 'sheet_sku': 61, 'name': "HIT", 'name_zh': "HIT 杀虫喷雾", 'category': "Insektisida", 'size': "400ml", 'unit': "btl / 瓶", 'price': 35000, 'stock': 24, 'image_url': None},
    {'id': 39, 'sheet_sku': 63, 'name': "Paseo Smart", 'name_zh': "Paseo Smart 抽取式面巾纸", 'category': "Tisu", 'size': "540ply", 'unit': "pcs / 件", 'price': 12500, 'stock': 456, 'image_url': '/uploads/products/product_39.png'},
    {'id': 40, 'sheet_sku': 65, 'name': "Larisst", 'name_zh': "Larisst 扫帚", 'category': "Peralatan Bersih", 'size': "-", 'unit': "pcs / 件", 'price': 45000, 'stock': 3, 'image_url': '/uploads/products/product_40.png'},
    {'id': 41, 'sheet_sku': 67, 'name': "Mustika Ratu", 'name_zh': "Mustika Ratu 橄榄护理油", 'category': "Herbal", 'size': "175ml", 'unit': "btl / 瓶", 'price': 45500, 'stock': 24, 'image_url': '/uploads/products/product_41.png'},
]


def main():
    db_path = settings.DATABASE_URL.removeprefix("sqlite:///")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        cur.execute("BEGIN")
        cur.execute("DELETE FROM catalog_issues")
        cur.execute("DELETE FROM products")
        for p in PRODUCTS:
            cur.execute(
                """
                INSERT INTO products (
                    id, name, name_zh, sku, price, stock, unit,
                    category, sub_category, brand, size, image_url,
                    is_active, created_at, updated_at,
                    source_no, flagged, flag_reason
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 1, datetime('now'), datetime('now'), ?, 0, NULL)
                """,
                (
                    p["id"], p["name"], p["name_zh"], f'MMI-{p["sheet_sku"]:03d}',
                    p["price"], p["stock"], p["unit"], p["category"], p["size"],
                    p["image_url"], p["sheet_sku"],
                ),
            )
        conn.commit()
        print(f"OK: {len(PRODUCTS)} products written.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
