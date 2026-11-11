from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class TradingAccount(Base):
    __tablename__ = "trading_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    name = Column(String(100), nullable=False)
    platform = Column(String(50), default="CUSTOM", nullable=False)  # HYPERLIQUID, BINANCE, BYBIT, OKX, PROP, CUSTOM
    account_type = Column(String(30), default="PERSONAL", nullable=False)  # PERSONAL, FUTURES, SPOT, PROP, DEMO
    currency = Column(String(10), default="USD", nullable=False)
    color = Column(String(20), default="#c49bff", nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="accounts")
    trades = relationship("Trade", back_populates="account")
    deposits = relationship("Deposit", back_populates="account")
