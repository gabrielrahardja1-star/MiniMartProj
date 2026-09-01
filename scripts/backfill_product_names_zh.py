#!/usr/bin/env python3
"""Apply the reviewed Chinese product names (中文名称（建议）, 2026-09-01).

For every product below we set `name_zh` to the reviewed translation, overwriting
whatever was there. Products that had Chinese text sitting in the Latin `name`
column (no real `name_zh`) also get a clean Latin `name`.

Covers the full 65-item production catalog. Products absent from a given DB are
reported and skipped (the smaller dev DB only has the first 41).

Matching is by SKU; each row carries a `guard` substring that must appear in the
current `name` or `name_zh` as a safety check before anything is written.

DRY-RUN by default (opens a transaction, ROLLS BACK). Pass --commit to persist;
a timestamped DB backup is written first.

    python3 scripts/backfill_product_names_zh.py [db_path]            # dry run
    python3 scripts/backfill_product_names_zh.py [db_path] --commit   # persist

On the server:

    docker compose exec backend python scripts/backfill_product_names_zh.py /app/data/minimart.db
    docker compose exec backend python scripts/backfill_product_names_zh.py /app/data/minimart.db --commit
"""
import datetime
import os
import shutil
import sqlite3
import sys

# sku -> (guard, new_name_or_None, new_name_zh)
UPDATES = {
    "MMI-002": ("Bear Brand", None, "BEAR BRAND 熊牌灭菌乳"),
    "MMI-003": ("Collagena", None, "Collagena 胶原蛋白灭菌乳"),
    "MMI-009": ("Mizone", None, "Mizone Coco Boost 运动饮料"),
    "MMI-010": ("Sari Kacang Hijau", None, "绿豆饮料"),
    "MMI-011": ("Buavita", None, "Buavita 果汁饮料"),
    "MMI-012": ("Tebs", None, "TEBS 碳酸茶饮料"),
    "MMI-013": ("仙草", "Minuman Panda", "熊猫牌仙草饮料"),
    "MMI-014": ("Cap Badak", None, "Cap Badak 犀牛牌清凉饮料"),
    "MMI-015": ("You C 1000", None, "YOU C1000 维生素C饮料"),
    "MMI-017": ("ICHITAN", None, "ICHITAN 黑糖味饮料"),
    "MMI-018": ("NU Milk Tea", None, "NU 奶茶"),
    "MMI-019": ("Coca Cola", None, "可口可乐 / 零度可口可乐"),
    "MMI-021": ("Adem Sari", None, "Adem Sari 清凉气泡饮料"),
    "MMI-022": ("CLEO", None, "CLEO 纯净饮用水 12.8升"),
    "MMI-024": ("Ovaltine", None, "Ovaltine 阿华田三合一巧克力麦芽饮品"),
    "MMI-026": ("Luwak", None, "Luwak 低糖白咖啡"),
    "MMI-027": ("Good Day", None, "Good Day 速溶咖啡"),
    "MMI-029": ("Indomie", None, "Indomie 印尼方便面"),
    "MMI-031": ("辣鸡炒面", "Samyang", "三养辣鸡炒面"),
    "MMI-035": ("Beng Beng", None, "Beng Beng Maxx 巧克力威化棒"),
    "MMI-038": ("Dua Kelinci", None, "Dua Kelinci 花生"),
    "MMI-039": ("Garuda", None, "Garuda 花生"),
    "MMI-040": ("Chitato", None, "Chitato 薯片"),
    "MMI-041": ("Qtela", None, "Qtela 木薯脆片"),
    "MMI-042": ("Rebo", None, "Rebo 葵花籽"),
    "MMI-044": ("Regal", None, "Regal 玛丽饼干"),
    "MMI-046": ("Good Time", None, "Good Time 曲奇饼干"),
    "MMI-047": ("Nabati", None, "Nabati 威化饼干"),
    "MMI-048": ("Tango", None, "Tango 巧克力威化饼干"),
    "MMI-050": ("Kopiko", None, "Kopiko 咖啡糖"),
    "MMI-054": ("洗发水", "Shampo Head & Shoulder", "Head & Shoulders 海飞丝洗发水"),
    "MMI-055": ("牙膏", None, "Pepsodent 牙膏"),
    "MMI-056": ("牙刷", None, "Pepsodent 牙刷（1支）"),
    "MMI-057": ("妮维雅", "Nivea", "NIVEA 妮维雅洁面乳"),
    "MMI-058": ("碧柔", "Biore", "Biore 碧柔男士洁面乳"),
    "MMI-059": ("洗衣粉", None, "Rinso 洗衣粉"),
    "MMI-060": ("洗衣液", None, "Rinso 洗衣液"),
    "MMI-061": ("HIT", None, "HIT 杀虫喷雾"),
    "MMI-063": ("Paseo", None, "Paseo Smart 抽取式面巾纸"),
    "MMI-065": ("Larisst", None, "Larisst 扫帚"),
    "MMI-067": ("Mustika Ratu", None, "Mustika Ratu 橄榄护理油"),
    # --- items 42-65: only present in the full production catalog ---
    "MMI-072": ("Teh Sosro", None, "Teh Sosro 茶包"),
    "MMI-073": ("Teh Pucuk", None, "Teh Pucuk Harum 茉莉花茶饮料"),
    "MMI-020": ("Yakult", None, "养乐多低糖乳酸菌饮料"),
    "MMI-075": ("HaloChoco", "Es krim HaloChoco", "HaloChoco 巧克力冰淇淋"),
    "MMI-074": ("Halo Cookies", "Es krim Halo Cookies", "Halo 曲奇冰淇淋"),
    "MMI-076": ("Tiger Choco", "Es krim Tiger Choco", "Tiger Choco 巧克力冰淇淋"),
    "MMI-077": ("KastilEs", "Es krim KastilEs Yogurt", "KastilEs 酸奶味冰淇淋"),
    "MMI-078": ("PisCok", "ES KRIM PisCok Krispi", "脆皮香蕉巧克力冰淇淋"),
    "MMI-079": ("Fantasy Almond", "Es krim Fantasy Almond", "Fantasy 杏仁巧克力冰淇淋"),
    "MMI-080": ("Tiramisu Cookies", "Es krim Tiramisu Cookies", "提拉米苏曲奇冰淇淋"),
    "MMI-085": ("Jus buah jeruk", None, "橙汁饮料"),
    "MMI-081": ("Beng Beng kecil", None, "Beng Beng 小包装巧克力威化"),
    "MMI-082": ("Larutan cap kaki 3", None, "Cap Kaki Tiga 三脚牌清凉饮料 320毫升"),
    "MMI-083": ("Nissin", None, "Nissin 日清脆饼干"),
    "MMI-084": ("Roma Malkist", None, "Roma Malkist 肉松苏打饼干"),
    "MMI-086": ("Dilan", None, "Dilan 曲奇饼干"),
    "MMI-O86": ("Lee Kum Kee", None, "李锦记酱油（生抽）"),  # SKU really has a letter O
    "MMI-087": ("HIT Spray", None, "HIT 杀虫喷雾 600毫升"),
    "MMI-088": ("Soffell", None, "Soffell 驱蚊液"),
    "MMI-089": ("Nongshin", None, "农心辛拉面"),
    "MMI-016": ("Floridina", None, "Floridina 橙汁果粒饮料"),
    "MMI-090": ("ABC Sari kacang hijau", None, "ABC 绿豆饮料 250毫升"),
    "MMI-091": ("Good Day Cappucino", None, "Good Day 卡布奇诺咖啡 250克"),
    "MMI-092": ("Luwak Less Sugar", None, "Luwak 低糖白咖啡 19包"),
}

argv = sys.argv[1:]
COMMIT = "--commit" in argv
pos = [a for a in argv if not a.startswith("--")]
DBPATH = pos[0] if pos else "minimart.db"


def main():
    con = sqlite3.connect(DBPATH)
    con.row_factory = sqlite3.Row
    rows = {r["sku"]: r for r in con.execute(
        "SELECT id, sku, name, name_zh FROM products").fetchall()}
    print("db: %s   products: %d   mode: %s\n" %
          (DBPATH, len(rows), "COMMIT" if COMMIT else "DRY-RUN"))

    changes = []   # (id, sku, field, old, new)
    problems = []   # blocks a commit
    skipped = []    # sku not in this db - just informational

    for sku, (guard, new_name, new_zh) in UPDATES.items():
        r = rows.get(sku)
        if r is None:
            skipped.append(sku)
            continue
        hay = "%s %s" % (r["name"] or "", r["name_zh"] or "")
        if guard not in hay:
            problems.append("%s guard %r not in %r" % (sku, guard, hay.strip()))
            continue
        if new_name is not None and new_name != r["name"]:
            changes.append((r["id"], sku, "name", r["name"], new_name))
        if new_zh != (r["name_zh"] or None):
            changes.append((r["id"], sku, "name_zh", r["name_zh"], new_zh))

    for pid, sku, field, old, new in changes:
        print("#%-3d %-9s %-8s %r -> %r" % (pid, sku, field, old, new))
    print("\n%d field update(s) across %d product(s)" %
          (len(changes), len({c[0] for c in changes})))

    if skipped:
        print("\n(%d SKU(s) not in this db, skipped: %s)" %
              (len(skipped), ", ".join(skipped)))

    if problems:
        print("\n!! %d problem(s):" % len(problems))
        for p in problems:
            print("   - " + p)

    ok = not problems
    if COMMIT and not ok:
        con.close()
        print("\nRefusing to commit with unresolved problems above.")
        sys.exit(1)

    if COMMIT:
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        bkp = "%s.bak-%s" % (DBPATH, stamp)
        shutil.copy2(DBPATH, bkp)
        print("\nbackup: %s (%d bytes)" % (bkp, os.path.getsize(bkp)))

    cur = con.cursor()
    try:
        cur.execute("BEGIN")
        for pid, _sku, field, _old, new in changes:
            cur.execute("UPDATE products SET %s=? WHERE id=?" % field, (new, pid))

        left = cur.execute(
            "SELECT id, name FROM products "
            "WHERE (name_zh IS NULL OR name_zh='') AND is_active=1").fetchall()
        print("\n--- verification ---")
        print("  active products still without a Chinese name: %d" % len(left))
        for row in left:
            print("     #%d %s" % (row[0], row[1]))

        if COMMIT:
            con.commit()
            print("\nCOMMITTED to %s" % DBPATH)
        else:
            con.rollback()
            print("\nDRY-RUN complete - rolled back. Re-run with --commit to persist.")
    except Exception as e:
        con.rollback()
        print("\nROLLED BACK: %s" % e)
        sys.exit(2)
    finally:
        con.close()


if __name__ == "__main__":
    main()
