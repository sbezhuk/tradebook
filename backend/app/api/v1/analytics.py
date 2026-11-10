from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.trade import Trade
from app.schemas.analytics import AnalyticsResponse
from app.api.deps import get_current_user
from app.services.analytics_service import compute_analytics

router = APIRouter(prefix="/analytics", tags=["Аналітика"])

@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trades = db.query(Trade).filter(Trade.user_id == current_user.id).all()
    return compute_analytics(trades)
