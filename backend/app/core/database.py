from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Normalize postgres connection scheme if needed
database_url = settings.DATABASE_URL
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)

# For SQLite, check_same_thread=False is required for multiple threads.
# For PostgreSQL, ensure server connection session runs in UTC so naive timestamps are consistently UTC.
connect_args = (
    {"check_same_thread": False}
    if database_url.startswith("sqlite")
    else {"options": "-c timezone=utc"}
)

engine = create_engine(
    database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema_migrations():
    """Add new columns to existing SQLite tables if upgrading an existing database."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table_name in ("trades", "deposits"):
            if table_name not in existing_tables:
                continue
            cols = {col["name"] for col in inspector.get_columns(table_name)}
            if "account_id" not in cols:
                conn.execute(
                    text(
                        f"ALTER TABLE {table_name} ADD COLUMN account_id INTEGER REFERENCES trading_accounts(id)"
                    )
                )
                conn.execute(
                    text(
                        f"CREATE INDEX IF NOT EXISTS ix_{table_name}_account_id ON {table_name} (account_id)"
                    )
                )
            if table_name == "trades" and "funding" not in cols:
                conn.execute(text("ALTER TABLE trades ADD COLUMN funding FLOAT DEFAULT 0.0"))

        if "funding_payments" in existing_tables:
            try:
                conn.execute(text("DROP TABLE IF EXISTS funding_payments CASCADE"))
            except Exception:
                conn.execute(text("DROP TABLE IF EXISTS funding_payments"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
