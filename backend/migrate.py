"""
Migration script — adds new columns to existing tables.
Safe to run multiple times (uses IF NOT EXISTS / exception handling).
Run with: python migrate.py
"""
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured. Add your Neon Postgres connection string to backend/.env.")

# Parse the connection string for psycopg2
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()


def add_column_if_missing(table, column, col_type, default=None):
    """Add a column to a table only if it doesn't already exist."""
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
    """, (table, column))
    if cur.fetchone():
        print(f"  ✓ {table}.{column} already exists — skipping")
        return

    default_clause = f"DEFAULT {default}" if default else ""
    cur.execute(f'ALTER TABLE "{table}" ADD COLUMN "{column}" {col_type} {default_clause}')
    print(f"  + Added {table}.{column} ({col_type})")


print("\n-- users --------------------------------------------------")
add_column_if_missing("users", "created_at", "TIMESTAMP", "NOW()")
add_column_if_missing("users", "updated_at", "TIMESTAMP")
add_column_if_missing("users", "saturday_policy", "VARCHAR(30)", "'alt_sat_holiday'")

print("\n-- attendance_logs ----------------------------------------")
add_column_if_missing("attendance_logs", "checkin_photo_url",    "TEXT")
add_column_if_missing("attendance_logs", "checkin_note",         "VARCHAR(280)")
add_column_if_missing("attendance_logs", "checkin_face_score",   "FLOAT")
add_column_if_missing("attendance_logs", "checkout_photo_url",   "TEXT")
add_column_if_missing("attendance_logs", "checkout_note",        "VARCHAR(280)")
add_column_if_missing("attendance_logs", "checkout_face_score",  "FLOAT")
add_column_if_missing("attendance_logs", "is_manual_override",   "BOOLEAN", "FALSE")
add_column_if_missing("attendance_logs", "override_by",          "UUID")
add_column_if_missing("attendance_logs", "override_at",          "TIMESTAMP")
add_column_if_missing("attendance_logs", "override_note",        "TEXT")
add_column_if_missing("attendance_logs", "is_anomaly_flagged",   "BOOLEAN", "FALSE")
add_column_if_missing("attendance_logs", "anomaly_type",         "VARCHAR(30)")

cur.close()
conn.close()
print("\nMigration complete.\n")
