#!/usr/bin/env python3
"""Reconcile the 28-Aug-2026 'Ending Balance' sheet against the live workers table.

READ-ONLY. Prints a report; writes nothing.

Usage:  python3 scripts/reconcile_ending_balances.py [path/to/minimart.db]
        (default: /app/data/minimart.db, i.e. the path inside the backend container)
"""
import re, sqlite3, sys

_path = sys.argv[1] if len(sys.argv) > 1 else "/app/data/minimart.db"
DB = "file:%s?mode=ro" % _path

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

def norm_name(s):
    s = s.strip().lower()
    s = s.replace(".", "").replace("'", "").replace("’", "").replace("-", " ")
    s = re.sub(r"\s+", "", s)
    return s

def id_variants(raw):
    """return set of exact-ish ids and a set of (letters,digits) loose keys"""
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

conn = sqlite3.connect(DB, uri=True)
rows = conn.execute("SELECT id, employee_id, COALESCE(hr_employee_id,''), name, is_active, "
                    "CAST(balance AS FLOAT) FROM workers").fetchall()
print("roster rows read: %d" % len(rows))

by_name = {}
by_hr_exact = {}
by_hr_loose = {}
wk = {}
for wid, emp, hr, name, active, bal in rows:
    w = dict(id=wid, emp=emp, hr=hr, name=name, active=active, bal=bal)
    wk[wid] = w
    by_name.setdefault(norm_name(name), []).append(w)
    if hr:
        by_hr_exact.setdefault(re.sub(r"\s+", "", hr.upper()), []).append(w)
        m = re.match(r"^([A-Z]+)-?([A-Z]?)(\d+)$", re.sub(r"\s+", "", hr.upper()))
        if m:
            by_hr_loose.setdefault((m.group(1), m.group(3)[-6:]), []).append(w)

results = []
for no, sid, sname, bal in SHEET:
    exact_ids, loose_ids = id_variants(sid)
    name_cands = [norm_name(x) for x in sname.split("/")]
    hr_hits, seen = [], set()
    for e in exact_ids:
        for w in by_hr_exact.get(e, []):
            if w["id"] not in seen: seen.add(w["id"]); hr_hits.append(w)
    hr_loose_hits = []
    if not hr_hits:
        for k in loose_ids:
            for w in by_hr_loose.get(k, []):
                if w["id"] not in seen: seen.add(w["id"]); hr_loose_hits.append(w)
    name_hits, seen2 = [], set()
    for nc in name_cands:
        for w in by_name.get(nc, []):
            if w["id"] not in seen2: seen2.add(w["id"]); name_hits.append(w)

    chosen, status, note = None, "", ""
    hr_all = hr_hits or hr_loose_hits
    hr_kind = "hr" if hr_hits else ("hr~" if hr_loose_hits else "")
    if len(hr_all) == 1:
        chosen = hr_all[0]
        nmatch = norm_name(chosen["name"]) in name_cands
        if nmatch and hr_kind == "hr":
            status, note = "CONFIRMED", "name+id agree"
        elif nmatch:
            status, note = "CONFIRMED", "name agree, id fuzzy (%s vs sheet %s)" % (chosen["hr"], sid)
        else:
            status, note = "LIKELY", "id match (%s); sheet name '%s' != roster '%s'" % (hr_kind, sname, chosen["name"])
    elif len(hr_all) > 1:
        status = "AMBIGUOUS"; note = "id -> multiple: " + ", ".join("#%d %s/%s" % (w["id"], w["emp"], w["hr"]) for w in hr_all)
    elif len(name_hits) == 1:
        chosen = name_hits[0]
        status, note = "LIKELY", "name match only; sheet id '%s' not in roster (roster id %s)" % (sid, chosen["hr"] or "-")
    elif len(name_hits) > 1:
        status = "AMBIGUOUS"; note = "name -> multiple: " + ", ".join("#%d %s/%s" % (w["id"], w["emp"], w["hr"]) for w in name_hits)
    else:
        status = "UNMATCHED"; note = "no id or name match"
    results.append(dict(no=no, sid=sid, sname=sname, bal=bal, chosen=chosen, status=status, note=note))

# ── conflict post-pass: >1 sheet row -> same worker ─────────────────────────
from collections import defaultdict
wid_rows = defaultdict(list)
for r in results:
    if r["chosen"]:
        wid_rows[r["chosen"]["id"]].append(r)
for wid, rs in wid_rows.items():
    if len(rs) > 1:
        for r in rs:
            r["status"] = "CONFLICT"
            r["note"] = "rows %s all map to worker #%d %s" % (
                ",".join(str(x["no"]) for x in rs), wid, wk[wid]["name"])

# ── output ─────────────────────────────────────────────────────────────────
order = {"CONFIRMED":0,"LIKELY":1,"AMBIGUOUS":2,"CONFLICT":3,"UNMATCHED":4}
def fmt(n): return "{:>10,}".format(n)

print("\n================ RECONCILIATION REPORT ================")
counts = defaultdict(int); total_confirmed_likely = 0
for r in sorted(results, key=lambda r:(order[r["status"]], r["no"])):
    counts[r["status"]] += 1
    c = r["chosen"]
    tgt = "-> #%-4d %-22s bal %s => %s" % (c["id"], c["name"][:22], fmt(c["bal"]), fmt(r["bal"])) if c else "%s=> %s" % (" "*40, fmt(r["bal"]))
    print("[%-9s] row %3d  %-26s %-26s %s" % (r["status"], r["no"], r["sname"][:26], r["sid"][:26], tgt))
    if r["note"]: print(" "*13 + "· " + r["note"])
    if c and not c["active"]: print(" "*13 + "· !! roster worker #%d is INACTIVE" % c["id"])
    if r["status"] in ("CONFIRMED","LIKELY"): total_confirmed_likely += r["bal"]

print("\n---- summary ----")
for k in order:
    print("  %-10s %d" % (k, counts[k]))
print("  sheet rows total       : %d" % len(results))
print("  Σ ending balance (all) : %s" % fmt(sum(r["bal"] for r in results)))
print("  Σ applied (CONFIRMED+LIKELY): %s" % fmt(total_confirmed_likely))
print("  negative targets       : %s" % ", ".join("row %d %s (%s)"%(r["no"],r["sname"],fmt(r["bal"])) for r in results if r["bal"]<0))
