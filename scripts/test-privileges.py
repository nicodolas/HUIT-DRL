import os
import psycopg2

lines = {}
if os.path.exists(".env.local"):
    with open(".env.local", encoding="utf-8") as f:
        lines = dict(l.strip().split("=", 1) for l in f if "=" in l and not l.startswith("#"))

OWNER_CONN_STR = lines.get("DATABASE_URL_OWNER", os.getenv("DATABASE_URL_OWNER", "")).strip('"').strip("'")
APP_CONN_STR = lines.get("DATABASE_URL", os.getenv("DATABASE_URL", "")).strip('"').strip("'")

if not OWNER_CONN_STR or not APP_CONN_STR:
    print("Vui lòng cấu hình DATABASE_URL_OWNER và DATABASE_URL trong .env.local")
    exit(1)

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

