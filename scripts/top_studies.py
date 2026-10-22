import sqlite3
import json

con = sqlite3.connect("file:/Users/digvijayshahi/.alpha-harness/harness.db?mode=ro", uri=True)
cur = con.cursor()

cur.execute("""
    SELECT t.study_id, count(t.id), max(cast(json_extract(t.result, '$.stats.sharpe') as float)), avg(cast(json_extract(t.result, '$.stats.sharpe') as float))
    FROM trial t
    WHERE t.feasible = 1 AND cast(json_extract(t.result, '$.stats.sharpe') as float) >= 1.25
    GROUP BY t.study_id
    ORDER BY count(t.id) DESC
    LIMIT 20
""")
rows = cur.fetchall()

header = "{:<10} {:<42} {:<14} {:<12} {:<12} {:<20}".format(
    "Study ID", "Name", "Submittable", "Max Sharpe", "Avg Sharpe", "Created At"
)
print(header)
print("=" * 115)
for sid, cnt, max_sh, avg_sh in rows:
    sinfo = cur.execute("SELECT name, created_at FROM study WHERE id = ?", (sid,)).fetchone()
    name = sinfo[0] if sinfo else "unknown"
    cat = sinfo[1] if sinfo else "unknown"
    print("{:<10} {:<42} {:<14} {:<12.2f} {:<12.2f} {:<20}".format(
        sid, name[:40], cnt, max_sh, avg_sh, cat[:19]
    ))
