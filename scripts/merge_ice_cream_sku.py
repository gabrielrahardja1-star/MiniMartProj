#!/usr/bin/env python3
"""Collapse the whole ice-cream range into a single "Es Krim" product.

All ice cream now sells for one price, so the 7 individual flavours
(SKUs MMI-074 .. MMI-080) become one catalog line:

  * MMI-074 is kept and rebranded to  name="Es Krim" / name_zh="冰淇淋",
    category "Es Krim". Its stock becomes the sum of all 7 flavours.
  * The other 6 rows are deactivated (is_active=0) after every row that
    points at them - historic `order_items` and mapped `invoice_items` -
    is repointed to MMI-074, so past sales stay intact and now resolve to
    the single "Es Krim" line.

Nothing is deleted. `order_items.unit_price` / `subtotal` are left exactly
as they were recorded (historic accuracy); only `product_id` moves.

Ice-cream rows are found by SKU (MMI-074..080) OR by category matching
"es krim" case-insensitively, so a mis-spelled category still gets caught.

DRY-RUN by default (does everything in a transaction, ROLLS BACK).
Pass --commit to persist; a timestamped DB backup is written first.
Pass --force to proceed even if the flavours don't all share one price
(MMI-074's current price is then kept as the Es Krim price).

    python3 scripts/merge_ice_cream_sku.py [db_path]            # dry run
    python3 scripts/merge_ice_cream_sku.py [db_path] --commit   # persist

On the server:

    docker compose exec backend python scripts/merge_ice_cream_sku.py /app/data/minimart.db
    docker compose exec backend python scripts/merge_ice_cream_sku.py /app/data/minimart.db --commit
"""
import datetime
import os
import sqlite3
import sys

CANON_SKU = "MMI-074"
CANON_NAME = "Es Krim"
CANON_NAME_ZH = "冰淇淋"        # 冰淇淋
CANON_CATEGORY = "Es Krim"
CANON_CATEGORY_ZH = "冰淇淋"    # 冰淇淋
ICE_CREAM_SKUS = [f"MMI-0{n}" for n in range(74, 81)]  # MMI-074 .. MMI-080

argv = sys.argv[1:]
COMMIT = "--commit" in argv
FORCE = "--force" in argv
pos = [a for a in argv if not a.startswith("--")]
DBPATH = pos[0] if pos else "/app/data/minimart.db"


def main():
    con = sqlite3.connect(DBPATH)
    con.row_factory = sqlite3.Row

    marks = ",".join("?" * len(ICE_CREAM_SKUS))
    ice = con.execute(
        f"SELECT id, sku, name, name_zh, price, stock, category, is_active "
        f"FROM products "
        f"WHERE sku IN ({marks}) OR LOWER(TRIM(category)) = 'es krim' "
        f"ORDER BY sku",
        ICE_CREAM_SKUS,
    ).fetchall()

    print("db: %s   ice-cream rows: %d   mode: %s%s\n" % (
        DBPATH, len(ice), "COMMIT" if COMMIT else "DRY-RUN",
        "  (--force)" if FORCE else ""))

    problems = []
    if not ice:
        print("No ice-cream products in this DB - nothing to do.")
        con.close()
        return

    canon = next((r for r in ice if r["sku"] == CANON_SKU), None)
    if canon is None:
        print("!! canonical SKU %s not found among the ice-cream rows:" % CANON_SKU)
        for r in ice:
            print("     #%d %-9s %s" % (r["id"], r["sku"], r["name"]))
        con.close()
        sys.exit(1)

    others = [r for r in ice if r["id"] != canon["id"]]
    canon_id = canon["id"]

    # --- price sanity -----------------------------------------------------
    prices = sorted({float(r["price"]) for r in ice})
    print("prices found across the range: %s" % ", ".join("%.0f" % p for p in prices))
    if len(prices) > 1 and not FORCE:
        problems.append(
            "flavours do not share a single price %s - pass --force to keep "
            "%s's price (%.0f) as the Es Krim price" % (prices, CANON_SKU, float(canon["price"])))

    # --- what will move --------------------------------------------------
    other_ids = [r["id"] for r in others]
    ids_marks = ",".join("?" * len(other_ids)) if other_ids else "NULL"
    n_oi = con.execute(
        f"SELECT COUNT(*) FROM order_items WHERE product_id IN ({ids_marks})",
        other_ids).fetchone()[0] if other_ids else 0
    n_ii = con.execute(
        f"SELECT COUNT(*) FROM invoice_items WHERE product_id IN ({ids_marks})",
        other_ids).fetchone()[0] if other_ids else 0
    stock_total = sum(int(r["stock"] or 0) for r in ice)

    print("\ncanonical  #%d %-9s %r  (zh=%r, cat=%r, stock=%s, active=%s)" % (
        canon_id, canon["sku"], canon["name"], canon["name_zh"],
        canon["category"], canon["stock"], canon["is_active"]))
    print("\nfolding in %d flavour(s):" % len(others))
    for r in others:
        oi = con.execute("SELECT COUNT(*) FROM order_items WHERE product_id=?",
                         (r["id"],)).fetchone()[0]
        ii = con.execute("SELECT COUNT(*) FROM invoice_items WHERE product_id=?",
                         (r["id"],)).fetchone()[0]
        print("   #%-3d %-9s %-28s stock=%-4s order_items=%-4s invoice_items=%s" % (
            r["id"], r["sku"], (r["name"] or "")[:28], r["stock"], oi, ii))

    print("\nresult:")
    print("   %d order_items  + %d invoice_items  repointed to #%d" % (n_oi, n_ii, canon_id))
    print("   Es Krim stock  = %s (sum of all %d rows)" % (stock_total, len(ice)))
    print("   %d flavour row(s) set is_active=0" % len(others))

    if problems:
        print("\n!! %d problem(s):" % len(problems))
        for p in problems:
            print("   - " + p)

    # --- apply ---------------------------------------------------------------
    if COMMIT and problems:
        con.close()
        print("\nRefusing to commit with unresolved problems above.")
        sys.exit(1)

    if COMMIT:
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        bkp = "%s.bak-%s" % (DBPATH, stamp)
        with sqlite3.connect(bkp) as b:
            con.backup(b)
        print("\nbackup: %s (%d bytes)" % (bkp, os.path.getsize(bkp)))

    cur = con.cursor()
    try:
        cur.execute("BEGIN")

        for oid in other_ids:
            cur.execute("UPDATE order_items   SET product_id=? WHERE product_id=?", (canon_id, oid))
            cur.execute("UPDATE invoice_items SET product_id=? WHERE product_id=?", (canon_id, oid))
            cur.execute("UPDATE products SET is_active=0, stock=0 WHERE id=?", (oid,))

        now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute(
            "UPDATE products SET name=?, name_zh=?, category=?, category_zh=?, "
            "stock=?, is_active=1, size=NULL, brand=NULL, sub_category=NULL, "
            "updated_at=? WHERE id=?",
            (CANON_NAME, CANON_NAME_ZH, CANON_CATEGORY, CANON_CATEGORY_ZH,
             stock_total, now, canon_id))

        # --- verification ---
        leftover_oi = cur.execute(
            f"SELECT COUNT(*) FROM order_items WHERE product_id IN ({ids_marks})",
            other_ids).fetchone()[0] if other_ids else 0
        leftover_ii = cur.execute(
            f"SELECT COUNT(*) FROM invoice_items WHERE product_id IN ({ids_marks})",
            other_ids).fetchone()[0] if other_ids else 0
        active_es_krim = cur.execute(
            "SELECT id, sku, name FROM products WHERE is_active=1 AND category=?",
            (CANON_CATEGORY,)).fetchall()

        print("\n--- verification ---")
        print("  order_items still on a folded flavour   : %d" % leftover_oi)
        print("  invoice_items still on a folded flavour : %d" % leftover_ii)
        print("  active products in category 'Es Krim'   : %d" % len(active_es_krim))
        for row in active_es_krim:
            print("     #%d %s %s" % (row[0], row[1], row[2]))

        ok = (leftover_oi == 0 and leftover_ii == 0
              and len(active_es_krim) == 1
              and active_es_krim[0][0] == canon_id
              and not problems)
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
