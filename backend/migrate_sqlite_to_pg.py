"""
Script to migrate existing TradeBook data from SQLite (backend/tradebook.db) to PostgreSQL.
"""
import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SQLITE_DB = BASE_DIR / "tradebook.db"
PG_DSN = "postgresql://localhost:5432/tradebook"

TABLES_IN_ORDER = [
    "users",
    "trading_accounts",
    "trades",
    "deposits",
    "funding_payments",
]

BOOLEAN_COLUMNS = {
    "trading_accounts": {"is_default"},
    "trades": {"followed_rules"},
}

def migrate():
    if not SQLITE_DB.exists():
        print(f"SQLite file {SQLITE_DB} not found. Nothing to migrate.")
        return

    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    pg_conn = psycopg2.connect(PG_DSN)
    pg_cur = pg_conn.cursor()

    print(f"Migrating data from {SQLITE_DB} -> {PG_DSN}...")

    try:
        for table in TABLES_IN_ORDER:
            # Check SQLite row count
            sqlite_cur.execute(f"SELECT COUNT(*) FROM {table}")
            s_count = sqlite_cur.fetchone()[0]

            # Check PG row count
            pg_cur.execute(f"SELECT COUNT(*) FROM {table}")
            pg_count = pg_cur.fetchone()[0]

            if pg_count > 0:
                print(f"Table '{table}' already has {pg_count} rows in PostgreSQL. Skipping migration for this table.")
                continue

            # Fetch columns
            sqlite_cur.execute(f"PRAGMA table_info({table})")
            columns = [row["name"] for row in sqlite_cur.fetchall()]

            # Fetch all rows from SQLite
            sqlite_cur.execute(f"SELECT {', '.join(columns)} FROM {table}")
            rows = sqlite_cur.fetchall()

            if not rows:
                print(f"Table '{table}': 0 rows in SQLite, nothing to migrate.")
                continue

            col_names = ", ".join(columns)
            placeholders = ", ".join(["%s"] * len(columns))
            insert_sql = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders})"

            bool_cols = BOOLEAN_COLUMNS.get(table, set())

            def transform_val(col, val):
                if col in bool_cols:
                    if val is None:
                        return None
                    return bool(val)
                return val

            data = [
                tuple(transform_val(col, row[col]) for col in columns)
                for row in rows
            ]

            execute_batch(pg_cur, insert_sql, data)
            print(f"Migrated {len(data)} rows into '{table}'.")

            # Update PostgreSQL sequence to max(id)
            pg_cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 1)) FROM {table}")

        pg_conn.commit()
        print("\nVerification of row counts in PostgreSQL:")
        for table in TABLES_IN_ORDER:
            pg_cur.execute(f"SELECT COUNT(*) FROM {table}")
            cnt = pg_cur.fetchone()[0]
            print(f"  - {table}: {cnt} rows")

        print("\nData migration completed successfully!")

    except Exception as e:
        pg_conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        sqlite_conn.close()
        pg_conn.close()

if __name__ == "__main__":
    migrate()
