import sqlite3
import json
import time

t0 = time.time()
con = sqlite3.connect("file:/Users/digvijayshahi/.alpha-harness/harness.db?mode=ro", uri=True)
cur = con.cursor()

# Query only feasible trials (3578 rows total in DB)
rows = cur.execute("""
    SELECT 
        s.id,
        substr(s.created_at, 1, 10) as sdate,
        s.sampler,
        s.name,
        t.id as trial_id,
        t.alpha_id,
        t.expression,
        t.result
    FROM study s
    JOIN trial t ON s.id = t.study_id
    WHERE t.feasible = 1
""").fetchall()

print(f"Loaded {len(rows)} feasible trials in {time.time() - t0:.2f}s")

study_agg = {}

for sid, sdate, sampler, sname, tid, alpha_id, expr, res_str in rows:
    if sid not in study_agg:
        study_agg[sid] = {
            "id": sid,
            "date": sdate,
            "sampler": sampler,
            "name": sname,
            "feasible_count": 0,
            "sharpe_valid_count": 0,
            "sharpes": [],
            "fitnesses": [],
            "turnovers": [],
            "returns": [],
            "alphas": set(),
        }
    
    st = study_agg[sid]
    st["feasible_count"] += 1
    if alpha_id:
        st["alphas"].add(alpha_id)
        
    if res_str:
        try:
            res = json.loads(res_str)
            stats = res.get("stats") or {}
            sh = stats.get("sharpe")
            fit = stats.get("fitness")
            to = stats.get("turnover")
            ret = stats.get("returns")
            
            if sh is not None and isinstance(sh, (int, float)):
                st["sharpes"].append(sh)
                st["sharpe_valid_count"] += 1
            if fit is not None and isinstance(fit, (int, float)):
                st["fitnesses"].append(fit)
            if to is not None and isinstance(to, (int, float)):
                st["turnovers"].append(to)
            if ret is not None and isinstance(ret, (int, float)):
                st["returns"].append(ret)
        except Exception:
            pass

print(f"Total studies with feasible alphas: {len(study_agg)}")

hdr = f"{'ID':<4} {'Date':<10} {'Feas':<6} {'ValidSh':<8} {'MaxSh':<8} {'AvgSh':<8} {'AvgFit':<8} {'Sampler':<12} {'Name'}"
print("\n=== STUDIES RANKED BY VALID NUMERICAL SHARPE ===")
print(hdr)
print("-" * 95)

sorted_studies = sorted(
    study_agg.values(),
    key=lambda x: (x["sharpe_valid_count"], max(x["sharpes"]) if x["sharpes"] else -99),
    reverse=True
)

for s in sorted_studies[:35]:
    max_sh = round(max(s["sharpes"]), 2) if s["sharpes"] else "-"
    avg_sh = round(sum(s["sharpes"]) / len(s["sharpes"]), 2) if s["sharpes"] else "-"
    avg_fit = round(sum(s["fitnesses"]) / len(s["fitnesses"]), 2) if s["fitnesses"] else "-"
    name = (s["name"] or "")[:35]
    print(f"{s['id']:>4} {s['date']:>10} {s['feasible_count']:>6} {s['sharpe_valid_count']:>8} {str(max_sh):>8} {str(avg_sh):>8} {str(avg_fit):>8} {s['sampler']:<12} {name}")
