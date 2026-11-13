from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class FundingPayment(Base):
    __tablename__ = "funding_payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("trading_accounts.id"), nullable=True, index=True)
    trade_id = Column(Integer, ForeignKey("trades.id", ondelete="SET NULL"), nullable=True, index=True)

    funding_time = Column(DateTime, nullable=False, index=True)
    coin = Column(String(50), nullable=False, index=True)
    direction = Column(String(10), nullable=False)  # LONG or SHORT
    size = Column(Float, nullable=False)
    payment = Column(Float, nullable=False)  # positive = received, negative = paid
    rate = Column(Float, default=0.0)
    note = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User")
    account = relationship("TradingAccount")
    trade = relationship("Trade", foreign_keys=[trade_id])
