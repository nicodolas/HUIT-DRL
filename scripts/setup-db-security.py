import os
import secrets
import string
import psycopg2
from psycopg2 import sql
from urllib.parse import urlparse

# Read from environment variable or .env.local
OWNER_CONN_STR = os.getenv("DATABASE_URL_OWNER")
if not OWNER_CONN_STR and os.path.exists(".env.local"):
    with open(".env.local", encoding="utf-8") as f:
        for line in f:
            if line.startswith("DATABASE_URL_OWNER="):
                OWNER_CONN_STR = line.split("=", 1)[1].strip().strip('"').strip("'")
                break

if not OWNER_CONN_STR:
    OWNER_CONN_STR = input("Nhập chuỗi kết nối DATABASE_URL_OWNER của Neon: ").strip()

parsed = urlparse(OWNER_CONN_STR)
HOST = parsed.hostname

def generate_secure_password(length=24):
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))

def main():
    print("=== Neon Database Security & Least Privilege Setup ===")
    conn = psycopg2.connect(OWNER_CONN_STR)
    conn.autocommit = True
    cur = conn.cursor()

    app_user = "drl_app_user"
    app_password = generate_secure_password()

    # 1. Check if drl_app_user already exists
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s;", (app_user,))
    exists = cur.fetchone()

    if not exists:
        print(f"Creating restricted role '{app_user}'...")
        cur.execute(sql.SQL("CREATE ROLE {} WITH LOGIN PASSWORD %s NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;").format(
            sql.Identifier(app_user)
        ), (app_password,))
    else:
        print(f"Role '{app_user}' exists. Updating password and permissions...")
        cur.execute(sql.SQL("ALTER ROLE {} WITH PASSWORD %s;").format(
            sql.Identifier(app_user)
        ), (app_password,))

    # 2. Grant permissions
    print("Granting least privilege access (SELECT, INSERT, UPDATE, DELETE)...")
    cur.execute(sql.SQL("GRANT CONNECT ON DATABASE neondb TO {};").format(sql.Identifier(app_user)))
    cur.execute(sql.SQL("GRANT USAGE ON SCHEMA public TO {};").format(sql.Identifier(app_user)))
    cur.execute(sql.SQL("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {};").format(sql.Identifier(app_user)))
    cur.execute(sql.SQL("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {};").format(sql.Identifier(app_user)))

    # Set default privileges for tables created in the future
    cur.execute(sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {};").format(sql.Identifier(app_user)))
    cur.execute(sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {};").format(sql.Identifier(app_user)))

    # Explicitly revoke CREATE on schema public to prevent DDL attacks
    cur.execute(sql.SQL("REVOKE CREATE ON SCHEMA public FROM {};").format(sql.Identifier(app_user)))

    print("Privileges configured successfully!")

    cur.close()
    conn.close()

    app_conn_str = f"postgresql://{app_user}:{app_password}@{HOST}/neondb?sslmode=require"

    # Write .env.local
    env_content = f"""# Neon Database Connection Strings
# Owner connection for DDL / migrations
DATABASE_URL_OWNER="{OWNER_CONN_STR}"

# Restricted App User connection for web/mobile runtime (Least Privilege - No DDL/DROP)
DATABASE_URL="{app_conn_str}"

# Next.js & Auth Secrets
AUTH_SECRET="{secrets.token_hex(32)}"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local")
    with open(env_path, "w", encoding="utf-8") as f:
        f.write(env_content)
    print(f"Saved secure credentials to {env_path}")

    # Write .env.example
    example_content = """# Neon Database Connection Strings
DATABASE_URL_OWNER="postgresql://neondb_owner:YOUR_OWNER_PASSWORD@ep-sample-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL="postgresql://drl_app_user:YOUR_APP_PASSWORD@ep-sample-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

AUTH_SECRET="your-32-byte-hex-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
"""
    example_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.example")
    with open(example_path, "w", encoding="utf-8") as f:
        f.write(example_content)

    # 3. Test restricted role
    print("\n--- Verifying Least Privilege Enforcement ---")
    try:
        test_conn = psycopg2.connect(app_conn_str)
        test_cur = test_conn.cursor()
        test_cur.execute("SELECT current_user, session_user;")
        print("Logged in as:", test_cur.fetchone())

        # Test privilege denial: Attempting to DROP a table should FAIL
        print("Testing DROP TABLE permission denial...")
        try:
            test_cur.execute("DROP TABLE IF EXISTS test_hack_table;")
            print("SECURITY WARNING: drl_app_user was able to execute DROP TABLE!")
        except Exception as perm_err:
            print("SECURITY PASSED: DROP TABLE was successfully blocked! Error:", str(perm_err).strip())

        test_cur.close()
        test_conn.close()
    except Exception as e:
        print("Test error:", e)

if __name__ == "__main__":
    main()
