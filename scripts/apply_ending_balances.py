#!/usr/bin/env python3
"""Apply the 28-Aug-2026 'Ending Balance' sheet to the workers table.

DRY-RUN by default (opens the DB, does everything in a transaction, ROLLS BACK).
Pass --commit to persist. On --commit a timestamped backup of the DB file is
made first (via the sqlite backup API, so it is always consistent).

Each affected worker gets:
  * workers.balance set to the sheet's ending balance
  * one wallet_transactions row (adjustment_credit / adjustment_debit) so the
    ledger reconciles, note = the reconciliation note, performed_by = ADMIN001

Edge cases were decided with the on-site admin on 28 Aug 2026 -- see OVERRIDES,
DEACTIVATE and NEW_HIRES below.

Usage:
  python3 apply_ending_balances.py [db_path]                 # dry run
  python3 apply_ending_balances.py [db_path] --commit        # persist
  python3 apply_ending_balances.py [db_path] --partial       # allow uncovered
                                                             #   rows (testing)
"""
import re, sqlite3, sys, datetime

argv = sys.argv[1:]
COMMIT  = "--commit"  in argv
PARTIAL = "--partial" in argv
pos = [a for a in argv if not a.startswith("--")]
DBPATH = pos[0] if pos else "/app/data/minimart.db"

NOTE = "Opening balance - reconciled from 28 Aug 2026 offline sales sheet"
ADMIN_ID = 1
DEFAULT_PIN = "0000"

# ── sheet rows: (no, sheet_id, name, ending_balance_idr) ─────────────────────
SHEET = [
(1,"MMI-B220053","Liu Haiyan/Liu Jin Gui",64000),
(2,"MMI-B240244","Liu Xianbin",29000),
(3,"CKI-G260789","Li Huaining",333500),
(4,"MMI-B230084","Wang Kai",426000),
(5,"MMI-B240237","Zhang Guoxin",360000),
(6,"CKI-G260714","Zhang Zhixin",135000),
(7,"CKI-G260532","Si Yanbin",176000),
(8,"MMI-B230085","Wang Mingchen",284500),
(9,"CKI-G260686","Huang Lijun",236000),
(10,"MMI-B220048","Du Xibao",320000),
(11,"MMI-B230078","Liu Zhiquan",484000),
(12,"MMI-B250307","Jiang Biao",260000),
(13,"MMI-B230070","Gao Bo",224000),
(14,"CKI-G260760","Wang Yujie",285000),
(15,"MMI-B250277","Wang Kun",180000),
(16,"Pegawai Baru","Miao Chang Qing",229000),
(17,"MMI-B230077","Liu Jinfu",254000),
(18,"CKI-G260692","Wang Shusheng",809000),
(19,"CKI-G260770","Huang Huiqun",425000),
(20,"MMI-B250335","Ma Hongfu",75000),
(21,"MMI-B240225","Guo Junfeng",187500),
(22,"CKI-G260699","Zou Hongtao",144000),
(23,"CKI-G260698","Zhao Lianfu/Zhao Rong Fu",140000),
(24,"CKI-G260687","Liu Guangliang",440000),
(25,"MMI-B240194","Wang Chenglu",320000),
(26,"CKI-G260761","Han Jun",320000),
(27,"CKI-G260759","Liang Guotai/Zhan Yan Chun",320000),
(28,"MMI-B240195","Ma Chao",262500),
(29,"MMI-B230071","Gao Chao",380000),
(30,"MMI-B230140","Lu Changfu",380000),
(31,"MMI-B250330","Yang Xiaoming",260000),
(32,"MMI-B240221","Liu Guilong",260000),
(33,"MMI-B250305","Chen Guoqing",114000),
(34,"MMI-B230088","Zhang Chengfu",152000),
(35,"CKI-G260709","Wang Zhonghui",398000),
(36,"CKI-G260765","Wang Chuanchuan",102000),
(37,"MMI-B250331","Pang Yashen",417000),
(38,"MMI-B230086","Wang Zhiyou",424000),
(39,"CKI-G260533","Ma Guoliang",105000),
(40,"CKI-G260711","Yu Zhongbao",79000),
(41,"MMI-B240214 / MMI-B240250","Zhang Yufu",-29000),
(42,"MMI-B250344","Zhou Jingyao",160000),
(43,"Pegawai Baru","Zhang Zi Ye",380000),
(44,"MMI-B250300","Zhao Xin",600000),
(45,"MMI-B250303","Li Huaiyi",65000),
(46,"MMI-B240210","Cai Gaoyi",6500),
(47,"MMI-B250314","Liu Yang",32000),
(48,"MMI-B240172","Li Fulong",136000),
(49,"MMI-B240190","Zheng Jun",50000),
(50,"MMI-B230115","Guan Degui",242000),
(51,"CKI-G260780","Li Wanbao",256000),
(52,"CKI-G260689","Qu Jixiang",320000),
(53,"CKI-G260705","Li Yadong",215000),
(54,"MMI-B240169","Zhao Jinlu",290000),
(55,"CKI-G260768","Zhang Lin",225000),
(56,"MMI-B230109","Zhang Jinming",363000),
(57,"CKI-G260758","Feng Changyou",71500),
(58,"Pegawai Baru","Wen Chun Nua",141000),
(59,"Pegawai Baru","Duan Hai Jun",40500),
(60,"CKI-G260696","You Dong",2000),
(61,"MMI-B250293","Sun Zhengrong/Chau You Yan",319000),
(62,"CKI-G260784","Zhang Chunyi",318000),
(63,"MMI-B250302","Cheng Yang",141500),
(64,"MMI-B240186","Jiang Zhenwei",234500),
(65,"CKI-G260700","Chen Daoqing",320000),
(66,"Pegawai Baru","Han Cheng",273000),
(67,"MMI-B220057","Qu Hang",131500),
(68,"MMI-B230138","Hu Wanpeng",260000),
(69,"CKI-G260702","Geng Jingfu",397000),
(70,"MMI-B250309","Guo Heping/Guo Hua",266000),
(71,"CKI-G260712","Zang Shuliang",288500),
(72,"MMI-B240171 / CKI-G260688","Liu Jun",93500),
(73,"MMI-B250338","Yu Deshui",288500),
(74,"MMI-B230091","Huang Xiujiang",415000),
(75,"MMI-B240208","Sun Hai/Kong Qing Feng",404500),
(76,"MMI-B240165","Liu Mingqiu",355000),
(77,"MMI-B260347","Xing Yongmin",267500),
(78,"CKI-G260713","Zhang Liguo",170000),
(79,"Pegawai Baru","Li Jiang",270000),
(80,"MMI-B230080","Ma Qingquan",-10000),
(81,"CKI-G260694","Yan Xinhua",289500),
(82,"MMI-B260346","Nie Shijin",281000),
(83,"CKI-G260715","Zhao Lixin",668000),
(84,"MMI-B240220","Han Zhongxin",80000),
(85,"CKI-G260691","Wang Jianbin",120500),
(86,"CKI-G260707","Ma Baizhong",218000),
(87,"CKI-G260685","Gong Libin",299000),
(88,"CKI-G260762","Ren Chuanbao",347000),
(89,"MMI-B230089","Zhu Guanghai",-162500),
(90,"MMI-B230095","Zhang Long",429000),
(91,"CKI-G260701","Gao Jun",500000),
(92,"MMI-B2506","Sui Yongpeng",475000),
(93,"Pegawai Baru","Shong De Yuan",623500),
(94,"MMI-B250334","He Binggang",248000),
(95,"MMI-B250280","Zhang Yue",844500),
(96,"MMI-B320113","Li Zhenfang",250000),
(97,"MMI-B230144","Jia Yuhai",139000),
(98,"MMI-B320072","Gong Lingang",257500),
(99,"MMI-B250274","Dong Baochun",199000),
(100,"CKI-G260695","Yin Xianggou",367500),
(101,"MMI-B230119","Liu Dianbang",242000),
(102,"MMI-B240180","Yuan Haibin",263500),
(103,"MMI-B240217","Li Guochen",392000),
(104,"MMI-B240248","Yang Yikun",354500),
(105,"MMI-B230161","Guo Lei",84000),
(106,"MMI-B250315","Zhao Chenghao",249000),
(107,"CKI-G260764","Wang Shequan",225500),
(108,"Pegawai Baru","Lu Yu Bo",320000),
(109,"MMI-B240187","Zhang Liang",320000),
(110,"CKI-G260717","Fan Wei",275000),
(111,"MMI-230116","Meng Fanyi",320000),
(112,"Pegawai Baru","Zhang Xing Hai",461000),
(113,"","Liu Haiyan",500000),
]

# ── edge-case resolutions (decided with the on-site admin, 28 Aug 2026) ─────
# sheet row no -> existing worker id that receives the balance
OVERRIDES = {
    1:  12,    # Liu Haiyan  (row 113 is a *different*, new person)
    41: 150,   # Zhang Yufu  -> #150 MMI-B240214  (deactivate dup #187)
    72: 424,   # Liu Jun     -> #424 CKI-G260688  (deactivate dup #121)
    98: 17,    # "Gong Lingang" == roster "Gong Ligang" #17 MMI-B230072
}
# duplicate accounts of people handled above -> set is_active = 0
DEACTIVATE = {187: "Zhang Yufu dup of #150", 121: "Liu Jun dup of #424"}
# sheet row no -> placeholder employee_id for brand-new worker accounts
NEW_HIRES = {
    16: "TEMP-01", 43: "TEMP-02", 58: "TEMP-03", 59: "TEMP-04", 66: "TEMP-05",
    79: "TEMP-06", 93: "TEMP-07", 108: "TEMP-08", 112: "TEMP-09", 113: "TEMP-10",
}

# ── name / id matching (same logic as reconcile_ending_balances.py) ─────────
def norm_name(s):
    s = s.strip().lower().replace(".", "").replace("'", "").replace("’", "").replace("-", " ")
    return re.sub(r"\s+", "", s)

def id_variants(raw):
    exact, loose = set(), set()
    for part in raw.split("/"):
        p = re.sub(r"\s+", "", part.strip().upper())
        if not p or p == "PEGAWAIBARU":
            continue
        exact.add(p)
        m = re.match(r"^([A-Z]+)-?([A-Z]?)(\d+)$", p)
        if m:
            loose.add((m.group(1), m.group(3)[-6:]))
    return exact, loose

def build_indexes(rows):
    by_name, by_hr_exact, by_hr_loose = {}, {}, {}
    for w in rows:
        by_name.setdefault(norm_name(w["name"]), []).append(w)
        if w["hr"]:
            H = re.sub(r"\s+", "", w["hr"].upper())
            by_hr_exact.setdefault(H, []).append(w)
            m = re.match(r"^([A-Z]+)-?([A-Z]?)(\d+)$", H)
            if m:
                by_hr_loose.setdefault((m.group(1), m.group(3)[-6:]), []).append(w)
    return by_name, by_hr_exact, by_hr_loose

def match_row(sid, sname, ix):
    by_name, by_hr_exact, by_hr_loose = ix
    exact_ids, loose_ids = id_variants(sid)
    name_cands = [norm_name(x) for x in sname.split("/")]
    hr_hits, seen = [], set()
    for e in exact_ids:
        for w in by_hr_exact.get(e, []):
            if w["id"] not in seen:
                seen.add(w["id"]); hr_hits.append(w)
    hr_loose = []
    if not hr_hits:
        for k in loose_ids:
            for w in by_hr_loose.get(k, []):
                if w["id"] not in seen:
                    seen.add(w["id"]); hr_loose.append(w)
    name_hits, seen2 = [], set()
    for nc in name_cands:
        for w in by_name.get(nc, []):
            if w["id"] not in seen2:
                seen2.add(w["id"]); name_hits.append(w)
    hr_all = hr_hits or hr_loose
    if len(hr_all) == 1:
        w = hr_all[0]
        nmatch = norm_name(w["name"]) in name_cands
        if nmatch:
            return w, "CONFIRMED"
        return w, "LIKELY"
    if len(hr_all) > 1:
        return None, "AMBIGUOUS"
    if len(name_hits) == 1:
        return name_hits[0], "LIKELY"
    if len(name_hits) > 1:
        return None, "AMBIGUOUS"
    return None, "UNMATCHED"

# ── load roster ────────────────────────────────────────────────────────────
con = sqlite3.connect(DBPATH)
con.row_factory = sqlite3.Row
roster = [dict(id=r["id"], emp=r["employee_id"], hr=r["hr_employee_id"] or "",
               name=r["name"], active=r["is_active"], bal=float(r["balance"]))
          for r in con.execute("SELECT id, employee_id, hr_employee_id, name, "
                               "is_active, balance FROM workers")]
wk = {w["id"]: w for w in roster}
ix = build_indexes(roster)
print("roster rows: %d   db: %s   mode: %s" %
      (len(roster), DBPATH, "COMMIT" if COMMIT else "DRY-RUN"))
if COMMIT and len(roster) < 400 and not PARTIAL:
    print("ABORT: only %d workers -- this does not look like the production DB." % len(roster))
    sys.exit(1)

# ── build the plan ─────────────────────────────────────────────────────────
def fmt(n): return "{:>11,}".format(int(n))

plan = []          # (row_no, worker_id, name, target, kind)
new_hire_plan = [] # (row_no, employee_id, name, target)
problems = []
target_by_wid = {}

for no, sid, sname, bal in SHEET:
    if no in NEW_HIRES:
        new_hire_plan.append((no, NEW_HIRES[no], sname, bal))
        continue
    if no in OVERRIDES:
        wid = OVERRIDES[no]
        if wid not in wk:
            problems.append("row %d override -> worker #%d does not exist" % (no, wid))
            continue
        plan.append((no, wid, wk[wid]["name"], bal, "override"))
    else:
        w, status = match_row(sid, sname, ix)
        if status in ("CONFIRMED", "LIKELY") and w:
            plan.append((no, w["id"], w["name"], bal, status.lower()))
        else:
            problems.append("row %d '%s' (%s) -> %s, not covered" % (no, sname, sid, status))
            continue
    wid = plan[-1][1]
    if wid in target_by_wid:
        problems.append("worker #%d targeted by rows %d and %d"
                        % (wid, target_by_wid[wid], no))
    target_by_wid[wid] = no

for wid, why in DEACTIVATE.items():
    if wid not in wk:
        problems.append("deactivate -> worker #%d does not exist" % wid)

# new-hire employee_id collisions
existing_emp = {w["emp"] for w in roster}
for no, emp, name, bal in new_hire_plan:
    if emp in existing_emp:
        problems.append("new hire row %d: employee_id %s already exists" % (no, emp))

# ── report the plan ────────────────────────────────────────────────────────
print("\n--- 4 OVERRIDES / edge cases ---")
for no, wid, name, tgt, kind in plan:
    if kind == "override":
        print("  row %3d  -> #%-4d %-20s  %s -> %s" %
              (no, wid, name[:20], fmt(wk[wid]["bal"]), fmt(tgt)))
print("\n--- 2 DEACTIVATIONS (is_active -> 0) ---")
for wid, why in DEACTIVATE.items():
    if wid in wk:
        print("  #%-4d %-20s  (%s)  balance now %s" %
              (wid, wk[wid]["name"][:20], why, fmt(wk[wid]["bal"])))
print("\n--- 10 NEW HIRES (create worker, PIN %s, active) ---" % DEFAULT_PIN)
for no, emp, name, bal in new_hire_plan:
    print("  row %3d  %-8s %-20s  -> %s" % (no, emp, name[:20], fmt(bal)))
print("\n--- %d DIRECT MATCHES (confirmed/likely) ---" %
      len([p for p in plan if p[4] != "override"]))
nonzero = [p for p in plan if p[4] != "override" and wk[p[1]]["bal"] != 0]
if nonzero:
    print("  !! these matched workers already have a non-zero balance:")
    for no, wid, name, tgt, kind in nonzero:
        print("     #%d %s: now %s -> %s" % (wid, name, fmt(wk[wid]["bal"]), fmt(tgt)))
else:
    print("  (all currently 0.00 -- straight set)")

if problems:
    print("\n!!!! %d PROBLEM(S):" % len(problems))
    for p in problems:
        print("   - " + p)

covered = len(plan) + len(new_hire_plan)
print("\n--- totals ---")
print("  sheet rows            : %d" % len(SHEET))
print("  covered (will apply)  : %d  (%d direct + 4 override + 10 new)" %
      (covered, len([p for p in plan if p[4] != 'override'])))
print("  Sigma sheet ending balance : %s" % fmt(sum(b for _,_,_,b in SHEET)))

if problems and not PARTIAL:
    print("\nABORT: uncovered rows / conflicts above. Fix, or pass --partial to")
    print("apply only the covered rows (testing only).")
    sys.exit(1)

for wid, why in DEACTIVATE.items():
    if wid in wk and wk[wid]["bal"] != 0:
        print("  !! WARNING: dup account #%d (%s) has non-zero balance %s; it will "
              "be deactivated but NOT zeroed." % (wid, wk[wid]["name"], fmt(wk[wid]["bal"])))

# ── backup before writing ─────────────────────────────────────────────────
if COMMIT and not PARTIAL:
    import os
    stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    bkp = "%s.bak-%s" % (DBPATH, stamp)
    with sqlite3.connect(bkp) as _b:
        con.backup(_b)
    print("\nbackup written: %s  (%d bytes)" % (bkp, os.path.getsize(bkp)))

# ── apply (inside a transaction) ───────────────────────────────────────────
now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).isoformat(sep=" ")
cur = con.cursor()
applied, tx_rows = 0, 0
start_total = float(cur.execute("SELECT COALESCE(SUM(balance),0) FROM workers").fetchone()[0])
expected_delta = (sum(tgt - wk[wid]["bal"] for _, wid, _, tgt, _ in plan)
                  + sum(b for _, _, _, b in new_hire_plan))
expected_end = round(start_total + expected_delta, 2)

try:
    cur.execute("BEGIN")

    # new hires first (need their new ids)
    import bcrypt
    for no, emp, name, bal in new_hire_plan:
        pin_hash = bcrypt.hashpw(DEFAULT_PIN.encode(), bcrypt.gensalt()).decode()
        cur.execute(
            "INSERT INTO workers (employee_id, hr_employee_id, name, pin_hash, "
            "role, is_active, balance, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (emp, None, name, pin_hash, "worker", 1, 0, now))
        nid = cur.lastrowid
        plan.append((no, nid, name, bal, "new"))

    # balance + ledger for every planned worker
    for no, wid, name, tgt, kind in plan:
        cur_bal = float(cur.execute("SELECT balance FROM workers WHERE id=?",
                                    (wid,)).fetchone()[0])
        delta = round(tgt - cur_bal, 2)
        cur.execute("UPDATE workers SET balance=? WHERE id=?", (tgt, wid))
        applied += 1
        if delta != 0:
            cur.execute(
                "INSERT INTO wallet_transactions (worker_id, type, amount, "
                "balance_after, order_id, performed_by_worker_id, note, reversed, "
                "created_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (wid, "adjustment_credit" if delta > 0 else "adjustment_debit",
                 abs(delta), tgt, None, ADMIN_ID, NOTE, 0, now))
            tx_rows += 1

    for wid in DEACTIVATE:
        cur.execute("UPDATE workers SET is_active=0 WHERE id=?", (wid,))

    # ── verify (still inside txn) ──────────────────────────────────────────
    errs = []
    for no, wid, name, tgt, kind in plan:
        got = float(cur.execute("SELECT balance FROM workers WHERE id=?", (wid,)).fetchone()[0])
        if round(got, 2) != round(tgt, 2):
            errs.append("#%d %s: balance %s != target %s" % (wid, name, got, tgt))
    total_bal = float(cur.execute("SELECT COALESCE(SUM(balance),0) FROM workers").fetchone()[0])
    sheet_total = sum(b for _,_,_,b in SHEET)
    n_workers = cur.execute("SELECT COUNT(*) FROM workers").fetchone()[0]
    deact_ph = ",".join(["?"] * len(DEACTIVATE))
    n_active_deact = cur.execute(
        "SELECT COUNT(*) FROM workers WHERE id IN (%s) AND is_active=1" % deact_ph,
        tuple(DEACTIVATE)).fetchone()[0]

    full_run = (not problems) and (not PARTIAL)
    print("\n--- verification (in transaction) ---")
    print("  workers updated             : %d" % applied)
    print("  wallet_transactions created : %d" % tx_rows)
    print("  new worker rows             : %d  (total workers now %d)" %
          (len(new_hire_plan), n_workers))
    print("  dup accounts still active   : %d  (expect 0)" % n_active_deact)
    print("  SUM(workers.balance) before : %s" % fmt(start_total))
    print("  SUM(workers.balance) after  : %s" % fmt(total_bal))
    print("  expected after (from deltas): %s" % fmt(expected_end))
    print("  sheet ending-balance total  : %s%s" % (
        fmt(sheet_total), "   <- must equal 'after' on a full run" if full_run else ""))
    match = (round(total_bal, 2) == expected_end) and not errs and n_active_deact == 0
    if full_run:
        match = match and round(total_bal, 2) == round(sheet_total, 2)
    if errs:
        print("  !! balance mismatches:")
        for e in errs:
            print("     " + e)
    print("  RESULT: %s" % ("OK" if match else "*** DISCREPANCY ***"))

    if not match:
        raise RuntimeError("verification failed - rolling back")

    if COMMIT and not PARTIAL:
        con.commit()
        print("\nCOMMITTED to %s" % DBPATH)
        fin_total = float(con.execute("SELECT COALESCE(SUM(balance),0) FROM workers").fetchone()[0])
        fin_tx = con.execute("SELECT COUNT(*) FROM wallet_transactions").fetchone()[0]
        print("  persisted SUM(balance) = %s   wallet_transactions rows = %d" %
              (fmt(fin_total), fin_tx))
        print("\n  new worker accounts (assign real employee IDs later):")
        for no, emp, name, bal in new_hire_plan:
            row = con.execute("SELECT id FROM workers WHERE employee_id=?", (emp,)).fetchone()
            print("    #%-4d %-8s %-20s %s" % (row[0], emp, name[:20], fmt(bal)))
    else:
        con.rollback()
        print("\nDRY-RUN complete -- rolled back, nothing written.")
        if PARTIAL:
            print("(--partial set: refusing to commit even with --commit)")
        else:
            print("Re-run with --commit to persist.")
except Exception as e:
    con.rollback()
    print("\nROLLED BACK: %s" % e)
    sys.exit(2)
finally:
    con.close()
