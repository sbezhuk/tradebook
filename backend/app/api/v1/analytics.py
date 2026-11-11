from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.trade import Trade
from app.models.deposit import Deposit
from app.schemas.analytics import AnalyticsResponse
from app.api.deps import get_current_user
from app.services.analytics_service import compute_analytics

router = APIRouter(prefix="/analytics", tags=["Аналітика"])

@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    month: Optional[str] = Query(None, description="Звітний місяць у форматі YYYY-MM"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if month:
        try:
            year_str, month_str = month.split("-")
            year = int(year_str)
            m = int(month_str)
            if not (1900 <= year <= 2200 and 1 <= m <= 12):
                raise ValueError
            month = f"{year:04d}-{m:02d}"
        except ValueError:
            raise HTTPException(status_code=400, detail="Невірний формат місяця. Очікується YYYY-MM")
    trades = db.query(Trade).filter(Trade.user_id == current_user.id).all()
    deposits = db.query(Deposit).filter(Deposit.user_id == current_user.id).all()
    return compute_analytics(trades, month=month, deposits=deposits)
