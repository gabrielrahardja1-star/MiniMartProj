#!/usr/bin/env python3
"""Apply the reviewed Chinese product names (中文名称（建议）, 2026-09-01).

For every product below we set `name_zh` to the reviewed translation, overwriting
whatever was there. Five products that had Chinese text sitting in the Latin
`name` column (no `name_zh` at all) also get a real Latin `name`.

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
    problems = []

    for sku, (guard, new_name, new_zh) in UPDATES.items():
        r = rows.get(sku)
        if r is None:
            problems.append("%s not found in this db" % sku)
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
