from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    symbol = Column(String(50), nullable=False, index=True)
    market = Column(String(50), default="CRYPTO", index=True)  # CRYPTO, FOREX, STOCKS, FUTURES, OTHER
    direction = Column(String(10), nullable=False)             # LONG, SHORT
    status = Column(String(20), default="CLOSED", index=True)  # OPEN, CLOSED, CANCELLED

    entry_date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    exit_date = Column(DateTime, nullable=True)

    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    quantity = Column(Float, nullable=False, default=1.0)

    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    fees = Column(Float, default=0.0)

    # Calculated metrics
    pnl = Column(Float, default=0.0)
    pnl_percentage = Column(Float, default=0.0)
    r_multiple = Column(Float, nullable=True)

    # Context & Psychology
    tags = Column(String(500), default="")  # comma-separated tags e.g. "Breakout,SupportBounce"
    setup_notes = Column(Text, nullable=True)
    post_trade_notes = Column(Text, nullable=True)
    discipline_rating = Column(Integer, default=5)  # 1 to 5
    followed_rules = Column(Boolean, default=True)
    chart_url = Column(String(1000), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="trades")
