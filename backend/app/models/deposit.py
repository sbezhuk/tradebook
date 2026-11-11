from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Deposit(Base):
    __tablename__ = "deposits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("trading_accounts.id"), nullable=True, index=True)
    amount = Column(Float, nullable=False)
    deposit_date = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    note = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="deposits")
    account = relationship("TradingAccount", back_populates="deposits")
