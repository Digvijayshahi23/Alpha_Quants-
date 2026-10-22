import sqlite3
import json
import urllib.request
from collections import defaultdict
import time

t0 = time.time()

# 1. Fetch submitted alphas from vault API
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/vault/alphas/query",
    data=json.dumps({"submitted": True, "limit": 500}).encode("utf-8"),
    headers={"Content-Type": "application/json", "x-harness-client": "1"}
)
res = urllib.request.urlopen(req)
data = json.loads(res.read())
submitted_alphas = {a["alphaId"]: a for a in data.get("results", [])}

con = sqlite3.connect("file:/Users/digvijayshahi/.alpha-harness/harness.db?mode=ro", uri=True)
cur = con.cursor()

# Map of alphaId to submission info
submitted_by_date = defaultdict(int)
for a in submitted_alphas.values():
    d = (a.get("dateCreated") or a.get("dateSubmitted") or "")[:10]
    if d:
        submitted_by_date[d] += 1

# First, query all feasible trials to inspect their real Sharpe
feasible_trials = cur.execute("""
    SELECT 
        t.id,
        t.alpha_id,
        t.result
    FROM trial t
    WHERE t.feasible = 1
""").fetchall()

feasible_sharpe_pass = set()
for tid, alpha_id, res_str in feasible_trials:
    if res_str:
        try:
            res_obj = json.loads(res_str)
            stats = res_obj.get("stats") or {}
            sh = stats.get("sharpe")
            if sh is not None and isinstance(sh, (int, float)) and sh >= 1.25:
                feasible_sharpe_pass.add(tid)
        except Exception:
            pass

print(f"Verified {len(feasible_sharpe_pass)} / {len(feasible_trials)} feasible trials with Sharpe >= 1.25")

# Second, query all trials basic stats (fast, dictionary lookup instead of full table join)
study_dates = dict(cur.execute("SELECT id, substr(created_at, 1, 10) FROM study").fetchall())
trial_rows = cur.execute("SELECT study_id, id, state, feasible, alpha_id FROM trial").fetchall()
all_trials = [(study_dates.get(sid, "unknown"), tid, state, feasible, aid) for sid, tid, state, feasible, aid in trial_rows]
print(f"Loaded {len(all_trials)} total trials in {time.time() - t0:.2f}s")

daily_stats = defaultdict(lambda: {
    "generated": 0,
    "validated": 0,
    "simulated": 0,
    "passed_criteria": 0,
    "submittable": 0,
    "unique_alphas": set(),
    "submitted": 0,
    "accepted": 0,
})

for sdate, tid, state, feasible, alpha_id in all_trials:
    st = daily_stats[sdate]
    st["generated"] += 1
        
    is_sim = state == "COMPLETE" and alpha_id is not None
    if state != "PRUNED" or is_sim:
        st["validated"] += 1
    if is_sim:
        st["simulated"] += 1
        st["unique_alphas"].add(alpha_id)
        
    if tid in feasible_sharpe_pass:
        st["passed_criteria"] += 1
        st["submittable"] += 1
        
    if alpha_id and alpha_id in submitted_alphas:
        st["submitted"] += 1
        sub_status = submitted_alphas[alpha_id].get("status", "")
        if sub_status in ("ACTIVE", "QUALIFIED"):
            st["accepted"] += 1

print("=" * 110)
print(f"{'Date':<11} {'Gen (A)':<8} {'Val (B)':<8} {'Sim (C)':<8} {'Pass (D)':<9} {'Subm (E)':<9} {'Subd (F)':<9} {'Acc (G)':<8} {'Vault Subd'}")
print("=" * 110)

for d in sorted(daily_stats.keys()):
    st = daily_stats[d]
    v_subd = submitted_by_date.get(d, 0)
    print(f"{d:<11} {st['generated']:<8} {st['validated']:<8} {st['simulated']:<8} {st['passed_criteria']:<9} {st['submittable']:<9} {st['submitted']:<9} {st['accepted']:<8} {v_subd:<10}")
