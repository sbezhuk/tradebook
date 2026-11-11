from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.deposit import Deposit
from app.schemas.deposit import (
    DepositCreate,
    DepositResponse,
    DepositListResponse,
    HyperliquidDepositImportResponse,
)
from app.api.deps import get_current_user
from app.services.hyperliquid_importer import parse_hyperliquid_deposits_csv

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


@router.post("/import/hyperliquid", response_model=HyperliquidDepositImportResponse)
async def import_hyperliquid_deposits(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Будь ласка, завантажте CSV файл експорту депозитів з Hyperliquid",
        )

    raw_bytes = await file.read()
    try:
        csv_text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Файл повинен бути в кодуванні UTF-8")

    try:
        parsed_deposits = parse_hyperliquid_deposits_csv(csv_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Помилка парсингу CSV: {str(e)}")

    if not parsed_deposits:
        return HyperliquidDepositImportResponse(
            imported_count=0,
            skipped_duplicates=0,
            total_amount=0.0,
            deposits=[],
        )

    existing = db.query(Deposit).filter(Deposit.user_id == current_user.id).all()
    existing_keys = set()
    for ex in existing:
        ex_dt = ex.deposit_date.replace(tzinfo=None) if ex.deposit_date else None
        existing_keys.add((
            ex_dt.strftime("%Y-%m-%d %H:%M:%S") if ex_dt else "",
            round(float(ex.amount), 6),
            (ex.note or "").strip(),
        ))

    created_deposits: List[Deposit] = []
    skipped = 0
    total_amount = 0.0

    for pd in parsed_deposits:
        dep_naive = _normalize_utc_naive(pd.deposit_date)
        note_clean = pd.note.strip() if pd.note else ""
        dedup_key = (
            dep_naive.strftime("%Y-%m-%d %H:%M:%S"),
            round(float(pd.amount), 6),
            note_clean,
        )
        if dedup_key in existing_keys:
            skipped += 1
            continue

        existing_keys.add(dedup_key)
        deposit = Deposit(
            user_id=current_user.id,
            amount=round(float(pd.amount), 6),
            deposit_date=dep_naive,
            note=note_clean or None,
        )
        db.add(deposit)
        created_deposits.append(deposit)
        total_amount += pd.amount

    db.commit()
    for dep in created_deposits:
        db.refresh(dep)

    return HyperliquidDepositImportResponse(
        imported_count=len(created_deposits),
        skipped_duplicates=skipped,
        total_amount=round(total_amount, 2),
        deposits=[DepositResponse.model_validate(d) for d in created_deposits],
    )


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
