from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# For SQLite, check_same_thread=False is required for multiple threads
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
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
            fp_cols = {col["name"] for col in inspector.get_columns("funding_payments")}
            if "note" not in fp_cols:
                conn.execute(text("ALTER TABLE funding_payments ADD COLUMN note VARCHAR(255)"))
            if "trade_id" not in fp_cols:
                conn.execute(text("ALTER TABLE funding_payments ADD COLUMN trade_id INTEGER REFERENCES trades(id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_funding_payments_trade_id ON funding_payments (trade_id)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
