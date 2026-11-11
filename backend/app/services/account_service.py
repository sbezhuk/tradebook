from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.account import TradingAccount
from app.models.trade import Trade
from app.models.deposit import Deposit


def ensure_user_default_account(db: Session, user_id: int) -> TradingAccount:
    """
    Guarantees the user has at least one trading account (marked default)
    and backfills any legacy trades/deposits with NULL account_id.
    """
    accounts = (
        db.query(TradingAccount)
        .filter(TradingAccount.user_id == user_id)
        .order_by(TradingAccount.is_default.desc(), TradingAccount.id.asc())
        .all()
    )

    if not accounts:
        default_acc = TradingAccount(
            user_id=user_id,
            name="Основний акаунт",
            platform="CUSTOM",
            account_type="PERSONAL",
            currency="USD",
            color="#c49bff",
            is_default=True,
        )
        db.add(default_acc)
        db.commit()
        db.refresh(default_acc)
    else:
        default_acc = next((a for a in accounts if a.is_default), accounts[0])
        if not default_acc.is_default:
            default_acc.is_default = True
            db.commit()
            db.refresh(default_acc)

    # Backfill legacy records with NULL account_id
    updated_trades = (
        db.query(Trade)
        .filter(Trade.user_id == user_id, Trade.account_id.is_(None))
        .update({"account_id": default_acc.id}, synchronize_session=False)
    )
    updated_deposits = (
        db.query(Deposit)
        .filter(Deposit.user_id == user_id, Deposit.account_id.is_(None))
        .update({"account_id": default_acc.id}, synchronize_session=False)
    )
    if updated_trades or updated_deposits:
        db.commit()

    return default_acc


def resolve_user_account(
    db: Session,
    user_id: int,
    account_id: Optional[int],
) -> TradingAccount:
    """
    Validates that account_id belongs to user_id, or returns the user's default account.
    """
    default_acc = ensure_user_default_account(db, user_id)
    if account_id is None:
        return default_acc

    acc = (
        db.query(TradingAccount)
        .filter(TradingAccount.id == account_id, TradingAccount.user_id == user_id)
        .first()
    )
    if not acc:
        raise HTTPException(status_code=404, detail="Акаунт не знайдено")
    return acc


def validate_optional_account_filter(
    db: Session,
    user_id: int,
    account_id: Optional[int],
) -> Optional[int]:
    """Validates account_id when used as a filter parameter (None means all accounts)."""
    if account_id is None:
        return None
    acc = (
        db.query(TradingAccount)
        .filter(TradingAccount.id == account_id, TradingAccount.user_id == user_id)
        .first()
    )
    if not acc:
        raise HTTPException(status_code=404, detail="Акаунт не знайдено")
    return acc.id
