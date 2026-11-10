from datetime import datetime, timedelta, timezone
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User
from app.models.trade import Trade
from app.services.trade_calculator import calculate_trade_metrics

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Check if demo user exists
    user = db.query(User).filter(User.username == "trader").first()
    if not user:
        user = User(
            email="trader@example.com",
            username="trader",
            hashed_password=get_password_hash("password123")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Created demo user: trader / password123")
    else:
        user.email = "trader@example.com"
        db.commit()

    # Check if trades already exist
    existing_count = db.query(Trade).filter(Trade.user_id == user.id).count()
    if existing_count > 0:
        print(f"User already has {existing_count} trades. Skipping seed trades.")
        db.close()
        return

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
            "setup_notes": "Пробій консолідації на 4H таймфреймі після ретесту зони попиту.",
            "post_trade_notes": "Чудовий вхід, фіксація майже біля тейку. Дотримався плану на 100%.",
            "discipline_rating": 5,
            "followed_rules": True,
        },
        {
            "symbol": "EUR/USD",
            "market": "FOREX",
            "direction": "SHORT",
            "status": "CLOSED",
            "entry_days_ago": 11,
            "duration_hours": 8,
            "entry_price": 1.0880,
            "exit_price": 1.0820,
            "quantity": 100000.0,
            "stop_loss": 1.0910,
            "take_profit": 1.0815,
            "fees": 7.0,
            "tags": "LondonOpen, TrendContinuation",
            "setup_notes": "Зняття ліквідності азійської сесії на відкритті Лондона, відскок від Order Block.",
            "post_trade_notes": "Швидкий рух до цілі, ідеальний RR.",
            "discipline_rating": 5,
            "followed_rules": True,
        },
        {
            "symbol": "NVDA",
            "market": "STOCKS",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_days_ago": 9,
            "duration_hours": 5,
            "entry_price": 128.50,
            "exit_price": 125.00,
            "quantity": 100.0,
            "stop_loss": 126.00,
            "take_profit": 136.00,
            "fees": 2.0,
            "tags": "GapAndGo, EarningsRun",
            "setup_notes": "Спроба зіграти відбій після відкриття сесії з гепом.",
            "post_trade_notes": "Порушив стоп-лосс! Зняв стоп на 126.00 і отримав більший мінус. Урок: ніколи не рухати стоп проти себе.",
            "discipline_rating": 2,
            "followed_rules": False,
        },
        {
            "symbol": "ETH/USDT",
            "market": "CRYPTO",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_days_ago": 7,
            "duration_hours": 20,
            "entry_price": 3210.0,
            "exit_price": 3390.0,
            "quantity": 3.0,
            "stop_loss": 3140.0,
            "take_profit": 3400.0,
            "fees": 8.0,
            "tags": "SupportBounce, 1H-OB",
            "setup_notes": "Тест ключового рівня підтримки з дивергенцією RSI на годинному таймфреймі.",
            "post_trade_notes": "Чітке відпрацювання сценарію.",
            "discipline_rating": 5,
            "followed_rules": True,
        },
        {
            "symbol": "NQ1!",
            "market": "FUTURES",
            "direction": "SHORT",
            "status": "CLOSED",
            "entry_days_ago": 5,
            "duration_hours": 4,
            "entry_price": 20350.0,
            "exit_price": 20420.0,
            "quantity": 2.0,
            "stop_loss": 20420.0,
            "take_profit": 20100.0,
            "fees": 15.0,
            "tags": "FVG, NYSession",
            "setup_notes": "Вхід у Fair Value Gap під час Нью-Йоркської сесії після макроновин.",
            "post_trade_notes": "Стоп-аут. Ринок виявився сильнішим ніж очікувалось. Стоп спрацював дисципліновано.",
            "discipline_rating": 4,
            "followed_rules": True,
        },
        {
            "symbol": "SOL/USDT",
            "market": "CRYPTO",
            "direction": "LONG",
            "status": "CLOSED",
            "entry_days_ago": 3,
            "duration_hours": 18,
            "entry_price": 172.0,
            "exit_price": 189.5,
            "quantity": 25.0,
            "stop_loss": 166.0,
            "take_profit": 190.0,
            "fees": 6.5,
            "tags": "Breakout, HighVolume",
            "setup_notes": "Акумуляція на денному графіку з виходом на підвищених об'ємах.",
            "post_trade_notes": "Забрав понад 2.5R, чудовий трейд.",
            "discipline_rating": 5,
            "followed_rules": True,
        },
        {
            "symbol": "XAU/USD",
            "market": "COMMODITIES",
            "direction": "LONG",
            "status": "OPEN",
            "entry_days_ago": 1,
            "duration_hours": 0,
            "entry_price": 2685.50,
            "exit_price": None,
            "quantity": 10.0,
            "stop_loss": 2665.00,
            "take_profit": 2730.00,
            "fees": 5.0,
            "tags": "Geopolitics, SupportBounce",
            "setup_notes": "Золото тестує тижневий максимум на фоні глобальної невизначеності.",
            "post_trade_notes": "Позиція відкрита, переведено в безубиток.",
            "discipline_rating": 5,
            "followed_rules": True,
        }
    ]

    for item in sample_trades:
        entry_dt = now - timedelta(days=item["entry_days_ago"])
        exit_dt = (entry_dt + timedelta(hours=item["duration_hours"])) if item["status"] == "CLOSED" else None

        pnl, pnl_pct, r_multiple = calculate_trade_metrics(
            direction=item["direction"],
            entry_price=item["entry_price"],
            exit_price=item["exit_price"],
            quantity=item["quantity"],
            fees=item["fees"],
            stop_loss=item["stop_loss"]
        )

        trade = Trade(
            user_id=user.id,
            symbol=item["symbol"],
            market=item["market"],
            direction=item["direction"],
            status=item["status"],
            entry_date=entry_dt,
            exit_date=exit_dt,
            entry_price=item["entry_price"],
            exit_price=item["exit_price"],
            quantity=item["quantity"],
            stop_loss=item["stop_loss"],
            take_profit=item["take_profit"],
            fees=item["fees"],
            pnl=pnl,
            pnl_percentage=pnl_pct,
            r_multiple=r_multiple,
            tags=item["tags"],
            setup_notes=item["setup_notes"],
            post_trade_notes=item["post_trade_notes"],
            discipline_rating=item["discipline_rating"],
            followed_rules=item["followed_rules"]
        )
        db.add(trade)

    db.commit()
    print("Successfully seeded demo trades.")
    db.close()

if __name__ == "__main__":
    seed()
