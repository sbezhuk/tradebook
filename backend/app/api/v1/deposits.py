from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.deposit import Deposit
from app.schemas.deposit import (
    DepositCreate,
    WithdrawCreate,
    DepositResponse,
    DepositListResponse,
    HyperliquidDepositImportResponse,
    DepositPreviewItem,
    HyperliquidDepositsPreviewResponse,
    DepositCommitItem,
    DepositBatchCommitRequest,
)
from app.api.deps import get_current_user
from app.services.hyperliquid_importer import parse_hyperliquid_deposits_csv
from app.services.account_service import (
    ensure_user_default_account,
    resolve_user_account,
    validate_optional_account_filter,
)

router = APIRouter(prefix="/deposits", tags=["Депозити"])


def _normalize_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


@router.get("", response_model=DepositListResponse)
def list_deposits(
    account_id: Optional[int] = Query(None, description="Фільтр за торговим акаунтом"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_default_account(db, current_user.id)
    query = db.query(Deposit).filter(Deposit.user_id == current_user.id)
    valid_account_id = validate_optional_account_filter(db, current_user.id, account_id)
    if valid_account_id is not None:
        query = query.filter(Deposit.account_id == valid_account_id)

    items = query.order_by(Deposit.deposit_date.desc(), Deposit.id.desc()).all()
    total_amount = round(sum(d.amount for d in items), 2)
    total_deposited = round(sum(d.amount for d in items if d.amount > 0), 2)
    total_withdrawn = round(abs(sum(d.amount for d in items if d.amount < 0)), 2)
    return DepositListResponse(
        items=items,
        total_amount=total_amount,
        total_deposited=total_deposited,
        total_withdrawn=total_withdrawn,
        count=len(items),
    )


@router.post("", response_model=DepositResponse, status_code=status.HTTP_201_CREATED)
def create_deposit(
    deposit_in: DepositCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_account = resolve_user_account(db, current_user.id, deposit_in.account_id)
    note_clean = deposit_in.note.strip() if deposit_in.note else None

    raw_amount = float(deposit_in.amount)
    is_withdrawal = (deposit_in.type or "").strip().lower() in ("withdraw", "withdrawal")
    final_amount = -abs(raw_amount) if is_withdrawal else abs(raw_amount)

    deposit = Deposit(
        user_id=current_user.id,
        account_id=target_account.id,
        amount=round(final_amount, 2),
        deposit_date=_normalize_utc_naive(deposit_in.deposit_date),
        note=note_clean or ("Виведення коштів" if is_withdrawal else None),
    )
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    return deposit


@router.post("/withdraw", response_model=DepositResponse, status_code=status.HTTP_201_CREATED)
def withdraw_deposit(
    withdraw_in: WithdrawCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_account = resolve_user_account(db, current_user.id, withdraw_in.account_id)
    note_clean = withdraw_in.note.strip() if withdraw_in.note else None
    withdrawal = Deposit(
        user_id=current_user.id,
        account_id=target_account.id,
        amount=-round(abs(float(withdraw_in.amount)), 2),
        deposit_date=_normalize_utc_naive(withdraw_in.deposit_date),
        note=note_clean or "Виведення коштів",
    )
    db.add(withdrawal)
    db.commit()
    db.refresh(withdrawal)
    return withdrawal


@router.post("/import/hyperliquid/preview", response_model=HyperliquidDepositsPreviewResponse)
async def preview_hyperliquid_deposits(
    file: UploadFile = File(...),
    account_id: Optional[int] = Query(None, description="ID торгового акаунту для імпорту"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_account = resolve_user_account(db, current_user.id, account_id)
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

    existing = (
        db.query(Deposit)
        .filter(Deposit.user_id == current_user.id, Deposit.account_id == target_account.id)
        .all()
    )
    existing_keys = set()
    for ex in existing:
        ex_dt = ex.deposit_date.replace(tzinfo=None) if ex.deposit_date else None
        existing_keys.add((
            ex_dt.strftime("%Y-%m-%d %H:%M:%S") if ex_dt else "",
            round(float(ex.amount), 6),
            (ex.note or "").strip(),
        ))

    items: List[DepositPreviewItem] = []
    duplicate_count = 0
    seen_in_batch = set()

    for idx, pd in enumerate(parsed_deposits):
        dep_naive = _normalize_utc_naive(pd.deposit_date)
        note_clean = pd.note.strip() if pd.note else ""
        dedup_key = (
            dep_naive.strftime("%Y-%m-%d %H:%M:%S"),
            round(float(pd.amount), 6),
            note_clean,
        )
        is_dup = False
        dup_reason = None
        if dedup_key in existing_keys:
            is_dup = True
            dup_reason = "Цей запис уже є в базі для даного акаунту"
            duplicate_count += 1
        elif dedup_key in seen_in_batch:
            is_dup = True
            dup_reason = "Повторюється всередині файлу"
            duplicate_count += 1
        else:
            seen_in_batch.add(dedup_key)

        items.append(
            DepositPreviewItem(
                temp_id=f"preview-dep-{idx}",
                amount=round(float(pd.amount), 6),
                deposit_date=dep_naive,
                action=pd.action,
                note=note_clean or None,
                type="withdraw" if pd.amount < 0 else "deposit",
                is_duplicate=is_dup,
                duplicate_reason=dup_reason,
            )
        )

    return HyperliquidDepositsPreviewResponse(
        total_parsed=len(items),
        duplicate_count=duplicate_count,
        items=items,
    )


@router.post("/import/commit", response_model=HyperliquidDepositImportResponse)
def commit_deposits_import(
    payload: DepositBatchCommitRequest,
    account_id: Optional[int] = Query(None, description="ID торгового акаунту для збереження"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_account = resolve_user_account(db, current_user.id, account_id)
    if not payload.deposits:
        return HyperliquidDepositImportResponse(
            imported_count=0,
            skipped_duplicates=0,
            total_amount=0.0,
            deposits=[],
        )

    existing = (
        db.query(Deposit)
        .filter(Deposit.user_id == current_user.id, Deposit.account_id == target_account.id)
        .all()
    )
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

    for pd in payload.deposits:
        dep_naive = _normalize_utc_naive(pd.deposit_date) if pd.deposit_date else datetime.utcnow()
        raw_amt = float(pd.amount)
        if pd.type == "withdraw" and raw_amt > 0:
            raw_amt = -raw_amt
        elif pd.type == "deposit" and raw_amt < 0:
            raw_amt = abs(raw_amt)
        amt = round(raw_amt, 6)
        note_clean = pd.note.strip() if pd.note else ""

        dedup_key = (
            dep_naive.strftime("%Y-%m-%d %H:%M:%S"),
            amt,
            note_clean,
        )
        if dedup_key in existing_keys:
            skipped += 1
            continue

        existing_keys.add(dedup_key)
        deposit = Deposit(
            user_id=current_user.id,
            account_id=target_account.id,
            amount=amt,
            deposit_date=dep_naive,
            note=note_clean or None,
        )
        db.add(deposit)
        created_deposits.append(deposit)
        total_amount += amt

    db.commit()
    for d in created_deposits:
        db.refresh(d)

    return HyperliquidDepositImportResponse(
        imported_count=len(created_deposits),
        skipped_duplicates=skipped,
        total_amount=round(total_amount, 2),
        deposits=[DepositResponse.model_validate(d) for d in created_deposits],
    )


@router.post("/import/hyperliquid", response_model=HyperliquidDepositImportResponse)
async def import_hyperliquid_deposits(
    file: UploadFile = File(...),
    account_id: Optional[int] = Query(None, description="ID торгового акаунту для імпорту"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_account = resolve_user_account(db, current_user.id, account_id)
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

    existing = (
        db.query(Deposit)
        .filter(Deposit.user_id == current_user.id, Deposit.account_id == target_account.id)
        .all()
    )
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
            account_id=target_account.id,
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
