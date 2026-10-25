import psycopg2

OWNER_CONN_STR = "postgresql://neondb_owner:[REDACTED_PASSWORD]@ep-sample-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
with open(".env.local") as f:
    lines = dict(l.strip().split("=", 1) for l in f if "=" in l and not l.startswith("#"))
APP_CONN_STR = lines["DATABASE_URL"].strip('"')

# 1. Owner creates a test table
conn_o = psycopg2.connect(OWNER_CONN_STR)
conn_o.autocommit = True
cur_o = conn_o.cursor()
cur_o.execute("CREATE TABLE IF NOT EXISTS security_probe (id int primary key);")
cur_o.close()
conn_o.close()

# 2. drl_app_user tries to DROP the table
conn_a = psycopg2.connect(APP_CONN_STR)
conn_a.autocommit = True
cur_a = conn_a.cursor()
try:
    cur_a.execute("DROP TABLE security_probe;")
    print("FAIL: drl_app_user was able to drop table!")
except Exception as e:
    print("SECURITY CHECK PASSED: drl_app_user was BLOCKED from dropping table!")
    print("Error:", str(e).strip())
cur_a.close()
conn_a.close()

# Clean up
conn_o = psycopg2.connect(OWNER_CONN_STR)
conn_o.autocommit = True
cur_o = conn_o.cursor()
cur_o.execute("DROP TABLE IF EXISTS security_probe;")
cur_o.close()
conn_o.close()
