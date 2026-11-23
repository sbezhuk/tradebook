import os
import pytest
from datetime import datetime, timedelta, timezone

# Ensure tests always run against an isolated test database, never touching main tradebook DB
os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg2://localhost:5432/tradebook_test"
)
os.environ["OTP_REQUIRED"] = "false"

from app.core.database import Base, engine, ensure_schema_migrations, SessionLocal
from app.core.security import get_password_hash
from app.models.user import User
from app.models.trade import Trade
from app.services.trade_calculator import calculate_trade_metrics

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    ensure_schema_migrations()

    # Seed demo user 'trader' for tests
    db = SessionLocal()
    demo_user = User(
        email="trader@example.com",
        username="trader",
        hashed_password=get_password_hash("password123")
    )
    db.add(demo_user)
    db.commit()
    db.refresh(demo_user)

    now = datetime.now(timezone.utc)
    sample_trades = [
        {
            "symbol": "BTC/USDT",
            "market": "CRYPTO",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_days_ago": 14,
            "duration_hours": 36,
            "entry_price": 64200.0,
            "exit_price": 67800.0,
            "quantity": 0.5,
            "stop_loss": 63100.0,
            "take_profit": 68000.0,
            "fees": 12.5,
            "tags": "Breakout, 4H-Demand, BullishTrend",
            "setup_notes": "Пробій консолідації",
            "post_trade_notes": "Чудовий вхід",
            "discipline_rating": 5,
            "followed_rules": True,
        },
        {
            "symbol": "EUR/USD",
            "market": "FOREX",
            "direction": "SHORT",
            "status": "CLOSED",
            "entry_days_ago": 11,
            "duration_hours": 12,
            "entry_price": 1.0850,
            "exit_price": 1.0790,
            "quantity": 100000,
            "stop_loss": 1.0880,
            "take_profit": 1.0750,
            "fees": 5.0,
            "tags": "TrendFollowing, DXY-Strength",
            "setup_notes": "Відбій від рівня опору",
            "post_trade_notes": "Вийшов раніше",
            "discipline_rating": 4,
            "followed_rules": True,
        },
        {
            "symbol": "NVDA",
            "market": "STOCKS",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_days_ago": 8,
            "duration_hours": 48,
            "entry_price": 125.0,
            "exit_price": 121.5,
            "quantity": 50,
            "stop_loss": 122.0,
            "take_profit": 135.0,
            "fees": 2.0,
            "tags": "EarningsMomentum",
            "setup_notes": "Спроба зіграти на звітності",
            "post_trade_notes": "Спіймав стоп",
            "discipline_rating": 4,
            "followed_rules": True,
        },
        {
            "symbol": "ETH/USDT",
            "market": "CRYPTO",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_days_ago": 5,
            "duration_hours": 20,
            "entry_price": 3450.0,
            "exit_price": 3620.0,
            "quantity": 2.0,
            "stop_loss": 3380.0,
            "take_profit": 3700.0,
            "fees": 8.0,
            "tags": "SupportBounce, 1H-FVG",
            "setup_notes": "Заповнення FVG",
            "post_trade_notes": "Ідеально",
            "discipline_rating": 5,
            "followed_rules": True,
        },
        {
            "symbol": "XAU/USD",
            "market": "COMMODITIES",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_days_ago": 3,
            "duration_hours": 8,
            "entry_price": 2320.0,
            "exit_price": 2355.0,
            "quantity": 10,
            "stop_loss": 2305.0,
            "take_profit": 2360.0,
            "fees": 15.0,
            "tags": "Breakout, Geopolitics",
            "setup_notes": "Лонг золота",
            "post_trade_notes": "Сильний імпульс",
            "discipline_rating": 5,
            "followed_rules": True,
        },
        {
            "symbol": "SOL/USDT",
            "market": "CRYPTO",
            "direction": "SHORT",
            "status": "CLOSED",
            "entry_days_ago": 2,
            "duration_hours": 15,
            "entry_price": 155.0,
            "exit_price": 162.0,
            "quantity": 15,
            "stop_loss": 160.0,
            "take_profit": 142.0,
            "fees": 4.5,
            "tags": "FOMIC",
            "setup_notes": "Вхід без підтвердження",
            "post_trade_notes": "Порушив ризик",
            "discipline_rating": 1,
            "followed_rules": False,
        },
        {
            "symbol": "TSLA",
            "market": "STOCKS",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_days_ago": 1,
            "duration_hours": 6,
            "entry_price": 210.0,
            "exit_price": 218.5,
            "quantity": 30,
            "stop_loss": 204.0,
            "take_profit": 225.0,
            "fees": 3.0,
            "tags": "GapAndGo",
            "setup_notes": "Ранковий імпульс",
            "post_trade_notes": "Все по плану",
            "discipline_rating": 5,
            "followed_rules": True,
        },
    ]

    for item in sample_trades:
        entry_date = now - timedelta(days=item["entry_days_ago"])
        exit_date = entry_date + timedelta(hours=item["duration_hours"])
        pnl, pnl_pct, r_mult = calculate_trade_metrics(
            direction=item["direction"],
            entry_price=item["entry_price"],
            exit_price=item["exit_price"],
            quantity=item["quantity"],
            fees=item["fees"],
            stop_loss=item["stop_loss"],
        )
        trade = Trade(
            user_id=demo_user.id,
            symbol=item["symbol"],
            market=item["market"],
            direction=item["direction"],
            status=item["status"],
            entry_date=entry_date,
            exit_date=exit_date,
            entry_price=item["entry_price"],
            exit_price=item["exit_price"],
            quantity=item["quantity"],
            stop_loss=item["stop_loss"],
            take_profit=item["take_profit"],
            fees=item["fees"],
            funding=0.0,
            pnl=pnl,
            pnl_percentage=pnl_pct,
            r_multiple=r_mult,
            tags=item["tags"],
            setup_notes=item["setup_notes"],
            post_trade_notes=item["post_trade_notes"],
            discipline_rating=item["discipline_rating"],
            followed_rules=item["followed_rules"],
        )
        db.add(trade)
    db.commit()
    db.close()

    yield
