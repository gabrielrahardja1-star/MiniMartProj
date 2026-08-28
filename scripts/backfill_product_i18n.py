#!/usr/bin/env python3
"""One-time cleanup of the 51-item production catalog:

  1. normalise category spelling  ("Es krim"/"ES KRIM" -> "Es Krim", "Teh" -> "Kopi & Teh")
  2. move Chinese text that was typed into `name` over to `name_zh`
     (6 products: the Edit sheet had no Chinese-name field until this change)
  3. fill `name_zh` for the 5 products that never had one
  4. assign a category to the 2 uncategorised products (#43, #44 -> Minuman)
  5. set `category_zh` on every product from app/core/product_categories.py

DRY-RUN by default (does everything in a transaction, ROLLS BACK).
Pass --commit to persist; a timestamped DB backup is written first.

    python3 scripts/backfill_product_i18n.py [db_path]            # dry run
    python3 scripts/backfill_product_i18n.py [db_path] --commit   # persist
"""
import datetime
import os
import re
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.product_categories import CATEGORY_KEYS, CATEGORY_ZH  # noqa: E402

argv = sys.argv[1:]
COMMIT = "--commit" in argv
pos = [a for a in argv if not a.startswith("--")]
DBPATH = pos[0] if pos else "/app/data/minimart.db"

CJK = re.compile(r"[一-鿿㐀-䶿（）]")

# category spelling fixes (raw value -> canonical key)
CATEGORY_RENAMES = {
    "Es krim": "Es Krim",
    "ES KRIM": "Es Krim",
    "Teh": "Kopi & Teh",
}

# id -> (name substring that must be present as a safety check, Chinese name to set)
NAME_ZH_FILL = {
    43: ("Teh Pucuk", "竹叶茶"),
    46: ("Halo Cookies", "哈喽曲奇"),
    48: ("KastilEs Yogurt", "酸奶冰淇淋"),
    50: ("Fantasy Almond", "杏仁冰淇淋"),
    51: ("Tiramisu Cookies", "提拉米苏曲奇"),
}

# id -> (name substring safety check, category to set)
CATEGORY_FILL = {
    43: ("Teh Pucuk", "Minuman"),
    44: ("Yakult", "Minuman"),
}


def split_trailing_cjk(name):
    """'Minuman Panda 熊猫牌仙草饮料' -> ('Minuman Panda', '熊猫牌仙草饮料')"""
    m = re.search(r"[一-鿿㐀-䶿（）][一-鿿㐀-䶿（）\s]*$", name)
    if not m:
        return name, ""
    return name[:m.start()].strip(), m.group(0).strip()


def main():
    con = sqlite3.connect(DBPATH)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        "SELECT id, name, name_zh, category, category_zh FROM products ORDER BY id"
    ).fetchall()
    print("db: %s   products: %d   mode: %s\n" %
          (DBPATH, len(rows), "COMMIT" if COMMIT else "DRY-RUN"))

    changes = []   # (id, field, old, new)
    problems = []

    for r in rows:
        pid, name, name_zh = r["id"], r["name"], (r["name_zh"] or "")
        category = r["category"] or ""

        # 1. category rename / canonicalise casing
        new_cat = CATEGORY_RENAMES.get(category, category)
        if new_cat == category and category and category not in CATEGORY_KEYS:
            hit = next((k for k in CATEGORY_KEYS if k.lower() == category.lower()), None)
            if hit:
                new_cat = hit

        # 4. fill category for the uncategorised ones
        if pid in CATEGORY_FILL:
            guard, forced = CATEGORY_FILL[pid]
            if guard.lower() not in name.lower():
                problems.append("#%d category-fill guard failed (name=%r)" % (pid, name))
            elif not category:
                new_cat = forced

        if new_cat != category:
            changes.append((pid, "category", category or None, new_cat or None))

        # 2. move trailing Chinese out of `name`
        if not name_zh and CJK.search(name):
            latin, zh = split_trailing_cjk(name)
            if zh and latin:
                changes.append((pid, "name", name, latin))
                changes.append((pid, "name_zh", None, zh))
                name, name_zh = latin, zh
            elif zh and not latin:
                problems.append("#%d name is Chinese-only (%r) - leaving as-is" % (pid, name))

        # 3. fill missing name_zh
        if not name_zh and pid in NAME_ZH_FILL:
            guard, zh = NAME_ZH_FILL[pid]
            if guard.lower() not in name.lower():
                problems.append("#%d name_zh-fill guard failed (name=%r)" % (pid, name))
            else:
                changes.append((pid, "name_zh", None, zh))
                name_zh = zh

        if not name_zh:
            problems.append("#%d still has no Chinese name (%r)" % (pid, name))

        # 5. category_zh from the canonical map (using the post-rename category)
        want_zh = CATEGORY_ZH.get(new_cat)
        if want_zh != (r["category_zh"] or None):
            changes.append((pid, "category_zh", r["category_zh"] or None, want_zh))

    # ── report ────────────────────────────────────────────────────────────
    by_id = {}
    for pid, field, old, new in changes:
        by_id.setdefault(pid, []).append((field, old, new))
    for pid in sorted(by_id):
        nm = next(r["name"] for r in rows if r["id"] == pid)
        print("#%-3d %s" % (pid, nm))
        for field, old, new in by_id[pid]:
            print("      %-12s %r -> %r" % (field, old, new))

    print("\n%d field updates across %d products" % (len(changes), len(by_id)))
    if problems:
        print("\n!! %d problem(s):" % len(problems))
        for p in problems:
            print("   - " + p)

    # ── apply ─────────────────────────────────────────────────────────────
    if COMMIT:
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        bkp = "%s.bak-%s" % (DBPATH, stamp)
        with sqlite3.connect(bkp) as b:
            con.backup(b)
        print("\nbackup: %s (%d bytes)" % (bkp, os.path.getsize(bkp)))

    cur = con.cursor()
    try:
        cur.execute("BEGIN")
        for pid, field, _old, new in changes:
            cur.execute("UPDATE products SET %s=? WHERE id=?" % field, (new, pid))

        # verify: every product ends up with a category_zh matching its category,
        # and no product left without a Chinese name
        bad = cur.execute(
            "SELECT id, name, category, category_zh FROM products "
            "WHERE (name_zh IS NULL OR name_zh='') "
            "   OR (category IS NOT NULL AND category != '' AND category_zh IS NULL)"
        ).fetchall()
        cats = [c[0] for c in cur.execute(
            "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''")]
        unknown = [c for c in cats if c not in CATEGORY_KEYS]

        print("\n--- verification ---")
        print("  products w/o Chinese name or category_zh : %d" % len(bad))
        for row in bad:
            print("     #%d %s  cat=%r" % (row[0], row[1], row[2]))
        print("  categories not in the canonical list     : %s" % (unknown or "none"))

        ok = not bad and not unknown and not problems
        print("  RESULT: %s" % ("OK" if ok else "*** review needed ***"))

        if COMMIT and ok:
            con.commit()
            print("\nCOMMITTED to %s" % DBPATH)
        elif COMMIT:
            con.rollback()
            print("\nROLLED BACK - fix the problems above and re-run.")
            sys.exit(1)
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
