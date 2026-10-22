import sqlite3
import json
import urllib.request
from collections import defaultdict

print("Connecting to local harness database...")
con = sqlite3.connect("file:/Users/digvijayshahi/.alpha-harness/harness.db?mode=ro", uri=True)
cur = con.cursor()

# 1. Fetch submitted alphas from vault API
try:
    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/vault/alphas/query",
        data=json.dumps({"submitted": True, "limit": 1000}).encode("utf-8"),
        headers={"Content-Type": "application/json", "x-harness-client": "1"}
    )
    res = urllib.request.urlopen(req)
    vault_data = json.loads(res.read())
    submitted_alphas = {a["alphaId"]: a for a in vault_data.get("results", [])}
except Exception as e:
    print("Could not query Vault API:", e)
    submitted_alphas = {}

print(f"Vault API returned {len(submitted_alphas)} submitted alphas.")

# 2. Inspect all feasible trials
print("Inspecting feasible trials...")
feasible_rows = cur.execute("""
    SELECT id, study_id, expression, alpha_id, result, created_at
    FROM trial
    WHERE feasible = 1
""").fetchall()

print(f"Total raw feasible trial records: {len(feasible_rows)}")

IGNORED_CHECKS = frozenset({"SELF_CORRELATION", "PROD_CORRELATION"})
REFUSING = frozenset({"FAIL", "ERROR"})

unique_submittable_expressions = set()
submittable_by_study = defaultdict(list)
sharpe_distribution = []
anomalous_sharpes = []

for tid, sid, expr, aid, res_str, cat in feasible_rows:
    if not res_str or not expr:
        continue
    try:
        res = json.loads(res_str)
        stats = res.get("stats") or {}
        sh = stats.get("sharpe")
        fit = stats.get("fitness")
        to = stats.get("turnover")
        ret = stats.get("returns")
        checks = res.get("checks") or []
        
        # Verify genuine numerical Sharpe
        if sh is None or not isinstance(sh, (int, float)) or sh < 1.25:
            continue
            
        # Verify gating checks
        has_error = False
        has_pass = False
        for c in checks:
            cname = str(c.get("name", "")).upper()
            cres = str(c.get("result", "")).upper()
            if cname in IGNORED_CHECKS:
                continue
            if cres in REFUSING:
                has_error = True
                break
            if cres == "PASS":
                has_pass = True
                
        if has_error or not has_pass:
            continue
            
        # Turnover within platform limits
        if to is not None and (to < 0.01 or to > 0.70):
            continue
            
        unique_submittable_expressions.add(expr.strip())
        submittable_by_study[sid].append({
            "trial_id": tid,
            "alpha_id": aid,
            "expression": expr,
            "sharpe": sh,
            "fitness": fit,
            "turnover": to,
            "returns": ret,
            "created_at": cat,
            "checks": checks
        })
        sharpe_distribution.append(sh)
        
        if sh > 5.0:
            anomalous_sharpes.append({
                "trial_id": tid,
                "study_id": sid,
                "alpha_id": aid,
                "expression": expr,
                "sharpe": sh,
                "fitness": fit,
                "turnover": to,
                "returns": ret,
                "checks": checks,
                "created_at": cat
            })
    except Exception:
        pass

print(f"Verified submittable trials: {sum(len(v) for v in submittable_by_study.values())}")
print(f"Unique submittable expressions: {len(unique_submittable_expressions)}")
print(f"Sharpe distribution: min={min(sharpe_distribution):.2f}, avg={sum(sharpe_distribution)/len(sharpe_distribution):.2f}, max={max(sharpe_distribution):.2f}")
print(f"Alphas with Sharpe > 5.0: {len(anomalous_sharpes)}")

# Save anomaly analysis to json
with open("scripts/anomalous_sharpes.json", "w") as f:
    json.dump(anomalous_sharpes, f, indent=2)

print("Saved anomalous sharpe candidates to scripts/anomalous_sharpes.json")
