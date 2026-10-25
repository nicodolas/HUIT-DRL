import psycopg2
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(".env.local") as f:
    lines = dict(l.strip().split("=", 1) for l in f if "=" in l and not l.startswith("#"))

owner_conn_str = lines.get("DATABASE_URL_OWNER", lines.get("DATABASE_URL")).strip('"')

print("Connecting as DB owner to add column evidence_url...")
conn = psycopg2.connect(owner_conn_str)
conn.autocommit = True
cur = conn.cursor()

cur.execute("""
    ALTER TABLE drl_records
    ADD COLUMN IF NOT EXISTS evidence_url text;
""")

print("Successfully added evidence_url column to drl_records!")

# Verify column exists
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'drl_records' AND column_name = 'evidence_url';
""")
row = cur.fetchone()
print(f"Verified column: {row}")
conn.close()
