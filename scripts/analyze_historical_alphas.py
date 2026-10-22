import sqlite3
import json
import urllib.request
from collections import defaultdict

# 1. Load submitted alphas from vault API
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/vault/alphas/query",
    data=json.dumps({"submitted": True, "limit": 500}).encode("utf-8"),
    headers={"Content-Type": "application/json", "x-harness-client": "1"}
)
res = urllib.request.urlopen(req)
data = json.loads(res.read())
submitted_alphas = {a["alphaId"]: a for a in data.get("results", [])}
print(f"Loaded {len(submitted_alphas)} submitted alphas from vault API.")

con = sqlite3.connect("file:/Users/digvijayshahi/.alpha-harness/harness.db?mode=ro", uri=True)
cur = con.cursor()

studies = cur.execute("SELECT id, name, sampler, template_name, substr(created_at, 1, 10), created_at FROM study ORDER BY id").fetchall()

study_stats = []

for sid, sname, sampler, tname, sdate, created_at in studies:
    trials = cur.execute("SELECT id, state, feasible, result, alpha_id, expression FROM trial WHERE study_id = ?", (sid,)).fetchall()
    
    gen_count = len(trials)
    if gen_count == 0:
        continue
        
    val_count = 0
    sim_count = 0
    passed_criteria_count = 0
    submittable_count = 0
    submitted_count = 0
    accepted_count = 0
    
    unique_exprs = set()
    
    for tid, state, feasible, result_json, alpha_id, expr in trials:
        if expr:
            unique_exprs.add(expr)
        
        is_simulated = state == "COMPLETE" and alpha_id is not None
        if state != "PRUNED" or is_simulated:
            val_count += 1
            
        if is_simulated:
            sim_count += 1
            
        if feasible == 1:
            passed_criteria_count += 1
            
        if result_json:
            try:
                res_obj = json.loads(result_json)
                failed = res_obj.get("failedChecks", [])
                if res_obj.get("feasible") and len(failed) == 0:
                    submittable_count += 1
            except Exception:
                pass
                
        if alpha_id and alpha_id in submitted_alphas:
            submitted_count += 1
            status = submitted_alphas[alpha_id].get("status", "")
            if status in ("ACTIVE", "QUALIFIED"):
                accepted_count += 1
                
    study_stats.append({
        "id": sid,
        "name": sname,
        "sampler": sampler,
        "template": tname,
        "date": sdate,
        "created_at": created_at,
        "unique_exprs": len(unique_exprs),
        "generated": gen_count,
        "validated": val_count,
        "simulated": sim_count,
        "passed_criteria": passed_criteria_count,
        "submittable": submittable_count,
        "submitted": submitted_count,
        "accepted": accepted_count,
    })

print(f"Studies with trials: {len(study_stats)}")

header = f"{'ID':<4} {'Date':<10} {'Gen':<6} {'Sim':<6} {'Pass':<6} {'Subm':<6} {'Subd':<5} {'Acc':<4} {'Sampler':<12} {'Name'}"
print("\n=== TOP 40 STUDIES BY SUBMITTABLE / CRITERIA MET ===")
print(header)
print("-" * 100)
for s in sorted(study_stats, key=lambda x: (x["submittable"], x["passed_criteria"], x["submitted"]), reverse=True)[:40]:
    name = (s["name"] or "")[:45]
    print(f"{s['id']:>4} {s['date']:>10} {s['generated']:>6} {s['simulated']:>6} {s['passed_criteria']:>6} {s['submittable']:>6} {s['submitted']:>5} {s['accepted']:>4} {s['sampler']:<12} {name}")

# Also group by Date to see day-by-day aggregate performance
daily = defaultdict(lambda: {"gen": 0, "sim": 0, "pass": 0, "subm": 0, "subd": 0, "acc": 0, "studies": 0})
for s in study_stats:
    d = s["date"]
    daily[d]["gen"] += s["generated"]
    daily[d]["sim"] += s["simulated"]
    daily[d]["pass"] += s["passed_criteria"]
    daily[d]["subm"] += s["submittable"]
    daily[d]["subd"] += s["submitted"]
    daily[d]["acc"] += s["accepted"]
    daily[d]["studies"] += 1

print("\n=== DAILY AGGREGATE SUMMARY (A-G) ===")
print(f"{'Date':<10} {'Studies':<8} {'Gen (A)':<8} {'Sim (C)':<8} {'Pass (D)':<9} {'Subm (E)':<9} {'Subd (F)':<9} {'Acc (G)':<8}")
print("-" * 80)
for d in sorted(daily.keys()):
    st = daily[d]
    print(f"{d:<10} {st['studies']:<8} {st['gen']:<8} {st['sim']:<8} {st['pass']:<9} {st['subm']:<9} {st['subd']:<9} {st['acc']:<8}")
