from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.deposit import Deposit
from app.schemas.deposit import DepositCreate, DepositResponse, DepositListResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/deposits", tags=["Депозити"])


def _normalize_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


@router.get("", response_model=DepositListResponse)
def list_deposits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(Deposit)
        .filter(Deposit.user_id == current_user.id)
        .order_by(Deposit.deposit_date.desc(), Deposit.id.desc())
        .all()
    )
    total_amount = round(sum(d.amount for d in items), 2)
    return DepositListResponse(
        items=items,
        total_amount=total_amount,
        count=len(items),
    )


@router.post("", response_model=DepositResponse, status_code=status.HTTP_201_CREATED)
def create_deposit(
    deposit_in: DepositCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note_clean = deposit_in.note.strip() if deposit_in.note else None
    deposit = Deposit(
        user_id=current_user.id,
        amount=round(float(deposit_in.amount), 2),
        deposit_date=_normalize_utc_naive(deposit_in.deposit_date),
        note=note_clean or None,
    )
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    return deposit


@router.delete("/{deposit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deposit(
    deposit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deposit = (
        db.query(Deposit)
        .filter(Deposit.id == deposit_id, Deposit.user_id == current_user.id)
        .first()
    )
    if not deposit:
        raise HTTPException(status_code=404, detail="Депозит не знайдено")

    db.delete(deposit)
    db.commit()
    return None
