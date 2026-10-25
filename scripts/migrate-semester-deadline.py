import psycopg2
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(".env.local") as f:
    lines = dict(l.strip().split("=", 1) for l in f if "=" in l and not l.startswith("#"))

owner_conn_str = lines.get("DATABASE_URL_OWNER", lines.get("DATABASE_URL")).strip('"')

print("Connecting as DB owner to add submission_deadline and status columns...")
conn = psycopg2.connect(owner_conn_str)
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    ALTER TABLE semesters
    ADD COLUMN IF NOT EXISTS submission_deadline varchar(32);
""")

cur.execute("""
    ALTER TABLE semesters
    ADD COLUMN IF NOT EXISTS status varchar(32) DEFAULT 'active';
""")

print("Successfully added columns to semesters table!")

# Verify columns exist
cur.execute("""
    SELECT column_name, data_type, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'semesters' AND column_name IN ('submission_deadline', 'status');
""")
rows = cur.fetchall()
for row in rows:
    print(f"Verified column: {row}")
conn.close()
