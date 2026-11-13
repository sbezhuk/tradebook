from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User
from app.models.trade import Trade
from app.models.funding_payment import FundingPayment
from app.schemas.funding import (
    FundingCreate,
    FundingUpdate,
    FundingLinkTradeRequest,
    FundingResponse,
    FundingListResponse,
    DeleteAllFundingResponse,
)
from app.api.deps import get_current_user
from app.services.account_service import (
    ensure_user_default_account,
    resolve_user_account,
    validate_optional_account_filter,
)

router = APIRouter(prefix="/funding", tags=["Фандінг"])


def _normalize_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _validate_trade_ownership(db: Session, user_id: int, trade_id: Optional[int]) -> Optional[Trade]:
    if trade_id is None:
        return None
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == user_id).first()
    if not trade:
        raise HTTPException(status_code=400, detail=f"Угоду #{trade_id} не знайдено або вона належить іншому користувачу")
    return trade


@router.get("", response_model=FundingListResponse)
def list_funding(
    account_id: Optional[int] = Query(None, description="Фільтр за торговим акаунтом"),
    coin: Optional[str] = Query(None, description="Фільтр за монетою / тікером"),
    direction: Optional[str] = Query(None, description="Фільтр за напрямком: LONG або SHORT"),
    trade_id: Optional[int] = Query(None, description="Фільтр за конкретною прив'язаною угодою"),
    linked_only: Optional[bool] = Query(None, description="Тільки прив'язані до угод"),
    unlinked_only: Optional[bool] = Query(None, description="Тільки не прив'язані до угод"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_default_account(db, current_user.id)
    query = (
        db.query(FundingPayment)
        .options(joinedload(FundingPayment.trade))
        .filter(FundingPayment.user_id == current_user.id)
    )

    valid_account_id = validate_optional_account_filter(db, current_user.id, account_id)
    if valid_account_id is not None:
        query = query.filter(FundingPayment.account_id == valid_account_id)

    if coin:
        clean_coin = coin.strip().upper()
        if clean_coin:
            query = query.filter(func.upper(FundingPayment.coin) == clean_coin)

    if direction:
        clean_dir = direction.strip().upper()
        if clean_dir in ("LONG", "SHORT"):
            query = query.filter(FundingPayment.direction == clean_dir)

    if trade_id is not None:
        query = query.filter(FundingPayment.trade_id == trade_id)
    elif linked_only is True:
        query = query.filter(FundingPayment.trade_id.isnot(None))
    elif unlinked_only is True:
        query = query.filter(FundingPayment.trade_id.is_(None))

    all_payments = query.all()
    total_funding = round(sum(fp.payment for fp in all_payments), 4)
    total_received = round(sum(fp.payment for fp in all_payments if fp.payment > 0), 4)
    total_paid = round(sum(abs(fp.payment) for fp in all_payments if fp.payment < 0), 4)

    items = (
        query.order_by(FundingPayment.funding_time.desc(), FundingPayment.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return FundingListResponse(
        items=[FundingResponse.model_validate(fp) for fp in items],
        total_funding=total_funding,
        total_received=total_received,
        total_paid=total_paid,
        count=len(all_payments),
    )


@router.post("", response_model=FundingResponse, status_code=status.HTTP_201_CREATED)
def create_funding(
    funding_in: FundingCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_account = resolve_user_account(db, current_user.id, funding_in.account_id)

    coin_clean = funding_in.coin.strip().upper()
    if not coin_clean:
        raise HTTPException(status_code=400, detail="Вкажіть монету / тікер")

    direction_clean = (funding_in.direction or "LONG").strip().upper()
    if direction_clean not in ("LONG", "SHORT"):
        direction_clean = "LONG"

    raw_dt = funding_in.funding_time or datetime.now(timezone.utc)
    funding_time = _normalize_utc_naive(raw_dt)
    note_clean = funding_in.note.strip() if funding_in.note else None

    # Validate trade ownership if manually linking to a trade
    trade = _validate_trade_ownership(db, current_user.id, funding_in.trade_id)

    fp_record = FundingPayment(
        user_id=current_user.id,
        account_id=target_account.id,
        trade_id=trade.id if trade else None,
        coin=coin_clean,
        direction=direction_clean,
        funding_time=funding_time,
        size=round(float(funding_in.size or 0.0), 8),
        payment=round(float(funding_in.payment), 8),
        rate=float(funding_in.rate or 0.0),
        note=note_clean,
    )
    db.add(fp_record)
    db.commit()
    db.refresh(fp_record)
    return fp_record


@router.get("/{funding_id}", response_model=FundingResponse)
def get_funding(
    funding_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(FundingPayment)
        .options(joinedload(FundingPayment.trade))
        .filter(FundingPayment.id == funding_id, FundingPayment.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Запис фандінгу не знайдено")
    return record


@router.put("/{funding_id}", response_model=FundingResponse)
def update_funding(
    funding_id: int,
    funding_in: FundingUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(FundingPayment)
        .options(joinedload(FundingPayment.trade))
        .filter(FundingPayment.id == funding_id, FundingPayment.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Запис фандінгу не знайдено")

    if funding_in.account_id is not None:
        target_account = resolve_user_account(db, current_user.id, funding_in.account_id)
        record.account_id = target_account.id

    if funding_in.coin is not None:
        clean_coin = funding_in.coin.strip().upper()
        if not clean_coin:
            raise HTTPException(status_code=400, detail="Монета не може бути порожньою")
        record.coin = clean_coin

    if funding_in.direction is not None:
        clean_dir = funding_in.direction.strip().upper()
        if clean_dir in ("LONG", "SHORT"):
            record.direction = clean_dir

    if funding_in.payment is not None:
        record.payment = round(float(funding_in.payment), 8)

    if funding_in.size is not None:
        record.size = round(float(funding_in.size), 8)

    if funding_in.rate is not None:
        record.rate = float(funding_in.rate)

    if funding_in.funding_time is not None:
        record.funding_time = _normalize_utc_naive(funding_in.funding_time)

    if funding_in.note is not None:
        clean_note = funding_in.note.strip()
        record.note = clean_note or None

    if "trade_id" in funding_in.model_fields_set:
        if funding_in.trade_id is None:
            record.trade_id = None
        else:
            trade = _validate_trade_ownership(db, current_user.id, funding_in.trade_id)
            record.trade_id = trade.id

    db.commit()
    db.refresh(record)
    return record


@router.post("/{funding_id}/link-trade", response_model=FundingResponse)
def link_trade_to_funding(
    funding_id: int,
    link_in: FundingLinkTradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manually link or unlink a funding payment to/from a trade.
    Pass trade_id to link, or null to unlink.
    """
    record = (
        db.query(FundingPayment)
        .options(joinedload(FundingPayment.trade))
        .filter(FundingPayment.id == funding_id, FundingPayment.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Запис фандінгу не знайдено")

    if link_in.trade_id is not None:
        trade = _validate_trade_ownership(db, current_user.id, link_in.trade_id)
        record.trade_id = trade.id
    else:
        record.trade_id = None

    db.commit()
    db.refresh(record)
    return record


@router.delete("/{funding_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_funding(
    funding_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    record = (
        db.query(FundingPayment)
        .filter(FundingPayment.id == funding_id, FundingPayment.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Запис фандінгу не знайдено")

    db.delete(record)
    db.commit()
    return None


@router.delete("", response_model=DeleteAllFundingResponse)
def delete_all_funding(
    account_id: Optional[int] = Query(None, description="Очистити фандінг лише вказаного акаунту"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(FundingPayment).filter(FundingPayment.user_id == current_user.id)
    if account_id is not None:
        target_account = resolve_user_account(db, current_user.id, account_id)
        query = query.filter(FundingPayment.account_id == target_account.id)

    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return DeleteAllFundingResponse(deleted_count=deleted_count)
