import sqlite3
db = sqlite3.connect('backend/aiquant.db')
cur = db.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cur.fetchall()
for t in tables:
    print(t[0])
    cur.execute(f"PRAGMA table_info({t[0]})")
    for col in cur.fetchall():
        print(f"  {col[1]} ({col[2]})")
