from collections import defaultdict
from typing import Dict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.account import TradingAccount
from app.models.trade import Trade
from app.models.deposit import Deposit
from app.schemas.account import (
    AccountCreate,
    AccountUpdate,
    AccountResponse,
    AccountListResponse,
)
from app.api.deps import get_current_user
from app.services.account_service import ensure_user_default_account

router = APIRouter(prefix="/accounts", tags=["Акаунти"])


def _build_account_response(
    acc: TradingAccount,
    trades: list[Trade],
    deposits: list[Deposit],
) -> AccountResponse:
    closed_trades = [t for t in trades if t.status == "CLOSED"]
    open_trades = sum(1 for t in trades if t.status == "OPEN")
    total_pnl = round(sum(float(t.pnl or 0.0) for t in closed_trades), 2)
    total_deposits = round(sum(float(d.amount or 0.0) for d in deposits), 2)
    current_balance = round(total_deposits + total_pnl, 2)

    return AccountResponse(
        id=acc.id,
        user_id=acc.user_id,
        name=acc.name,
        platform=acc.platform,
        account_type=acc.account_type,
        currency=acc.currency,
        color=acc.color,
        is_default=acc.is_default,
        created_at=acc.created_at,
        trades_count=len(trades),
        open_trades=open_trades,
        total_pnl=total_pnl,
        total_deposits=total_deposits,
        current_balance=current_balance,
    )


@router.get("", response_model=AccountListResponse)
def list_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_default_account(db, current_user.id)

    accounts = (
        db.query(TradingAccount)
        .filter(TradingAccount.user_id == current_user.id)
        .order_by(TradingAccount.is_default.desc(), TradingAccount.id.asc())
        .all()
    )

    trades_by_acc: Dict[int, list[Trade]] = defaultdict(list)
    for t in db.query(Trade).filter(Trade.user_id == current_user.id).all():
        if t.account_id is not None:
            trades_by_acc[t.account_id].append(t)

    deposits_by_acc: Dict[int, list[Deposit]] = defaultdict(list)
    for d in db.query(Deposit).filter(Deposit.user_id == current_user.id).all():
        if d.account_id is not None:
            deposits_by_acc[d.account_id].append(d)

    items = [
        _build_account_response(acc, trades_by_acc[acc.id], deposits_by_acc[acc.id])
        for acc in accounts
    ]
    return AccountListResponse(items=items, total=len(items))


@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    account_in: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_default_account(db, current_user.id)

    name_clean = account_in.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Назва акаунту не може бути порожньою")

    if account_in.is_default:
        db.query(TradingAccount).filter(
            TradingAccount.user_id == current_user.id
        ).update({"is_default": False}, synchronize_session=False)

    account = TradingAccount(
        user_id=current_user.id,
        name=name_clean,
        platform=(account_in.platform or "CUSTOM").strip().upper(),
        account_type=(account_in.account_type or "PERSONAL").strip().upper(),
        currency=(account_in.currency or "USD").strip().upper(),
        color=(account_in.color or "#c49bff").strip(),
        is_default=bool(account_in.is_default),
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _build_account_response(account, [], [])


@router.put("/{account_id}", response_model=AccountResponse)
def update_account(
    account_id: int,
    account_in: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = (
        db.query(TradingAccount)
        .filter(TradingAccount.id == account_id, TradingAccount.user_id == current_user.id)
        .first()
    )
    if not account:
        raise HTTPException(status_code=404, detail="Акаунт не знайдено")

    update_data = account_in.model_dump(exclude_unset=True)

    if "name" in update_data and update_data["name"] is not None:
        name_clean = update_data["name"].strip()
        if not name_clean:
            raise HTTPException(status_code=400, detail="Назва акаунту не може бути порожньою")
        account.name = name_clean

    if "platform" in update_data and update_data["platform"] is not None:
        account.platform = update_data["platform"].strip().upper()
    if "account_type" in update_data and update_data["account_type"] is not None:
        account.account_type = update_data["account_type"].strip().upper()
    if "currency" in update_data and update_data["currency"] is not None:
        account.currency = update_data["currency"].strip().upper()
    if "color" in update_data and update_data["color"] is not None:
        account.color = update_data["color"].strip()

    if update_data.get("is_default") is True:
        db.query(TradingAccount).filter(
            TradingAccount.user_id == current_user.id,
            TradingAccount.id != account.id,
        ).update({"is_default": False}, synchronize_session=False)
        account.is_default = True

    db.commit()
    db.refresh(account)

    acc_trades = (
        db.query(Trade)
        .filter(Trade.user_id == current_user.id, Trade.account_id == account.id)
        .all()
    )
    acc_deposits = (
        db.query(Deposit)
        .filter(Deposit.user_id == current_user.id, Deposit.account_id == account.id)
        .all()
    )
    return _build_account_response(account, acc_trades, acc_deposits)


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: int,
    delete_data: bool = Query(
        False,
        description="Якщо True — видалити угоди та депозити цього акаунту; інакше перенести в основний акаунт",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accounts = (
        db.query(TradingAccount)
        .filter(TradingAccount.user_id == current_user.id)
        .order_by(TradingAccount.is_default.desc(), TradingAccount.id.asc())
        .all()
    )
    target = next((a for a in accounts if a.id == account_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Акаунт не знайдено")

    if len(accounts) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Неможливо видалити єдиний акаунт профілю",
        )

    fallback = next((a for a in accounts if a.id != account_id and a.is_default), None)
    if not fallback:
        fallback = next(a for a in accounts if a.id != account_id)
        fallback.is_default = True

    if delete_data:
        db.query(Trade).filter(
            Trade.user_id == current_user.id,
            Trade.account_id == account_id,
        ).delete(synchronize_session=False)
        db.query(Deposit).filter(
            Deposit.user_id == current_user.id,
            Deposit.account_id == account_id,
        ).delete(synchronize_session=False)
    else:
        db.query(Trade).filter(
            Trade.user_id == current_user.id,
            Trade.account_id == account_id,
        ).update({"account_id": fallback.id}, synchronize_session=False)
        db.query(Deposit).filter(
            Deposit.user_id == current_user.id,
            Deposit.account_id == account_id,
        ).update({"account_id": fallback.id}, synchronize_session=False)

    db.delete(target)
    db.commit()
    return None
