from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
from app.core.database import get_db
from app.models.user import User
from app.models.trade import Trade
from app.schemas.trade import (
    TradeCreate,
    TradeUpdate,
    TradeResponse,
    TradeListResponse,
    HyperliquidImportResponse,
)
from app.api.deps import get_current_user
from app.services.trade_calculator import calculate_trade_metrics
from app.services.hyperliquid_importer import parse_hyperliquid_csv

router = APIRouter(prefix="/trades", tags=["Угоди"])

@router.get("", response_model=TradeListResponse)
def list_trades(
    market: Optional[str] = Query(None, description="Фільтр за ринком (CRYPTO, FOREX, STOCKS тощо)"),
    symbol: Optional[str] = Query(None, description="Пошук за символом"),
    direction: Optional[str] = Query(None, description="LONG або SHORT"),
    status: Optional[str] = Query(None, description="OPEN, CLOSED, CANCELLED"),
    tag: Optional[str] = Query(None, description="Фільтр за тегом"),
    month: Optional[str] = Query(None, description="Фільтр за звітним місяцем (YYYY-MM)"),
    sort_by: str = Query("date_desc", description="date_desc, date_asc, pnl_desc, pnl_asc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Trade).filter(Trade.user_id == current_user.id)

    if market:
        query = query.filter(Trade.market == market)
    if symbol:
        query = query.filter(Trade.symbol.ilike(f"%{symbol}%"))
    if direction:
        query = query.filter(Trade.direction == direction.upper())
    if status:
        query = query.filter(Trade.status == status.upper())
    if tag:
        query = query.filter(Trade.tags.ilike(f"%{tag}%"))
    if month:
        try:
            year_str, month_str = month.split("-")
            year = int(year_str)
            m = int(month_str)
            if not (1900 <= year <= 2200 and 1 <= m <= 12):
                raise ValueError
            month_start = datetime(year, m, 1)
            next_month_start = datetime(year + 1, 1, 1) if m == 12 else datetime(year, m + 1, 1)
        except ValueError:
            raise HTTPException(status_code=400, detail="Невірний формат місяця. Очікується YYYY-MM")
        period_dt = func.coalesce(Trade.exit_date, Trade.entry_date)
        query = query.filter(period_dt >= month_start, period_dt < next_month_start)

    total = query.count()

    if sort_by == "date_asc":
        query = query.order_by(asc(Trade.entry_date))
    elif sort_by == "pnl_desc":
        query = query.order_by(desc(Trade.pnl))
    elif sort_by == "pnl_asc":
        query = query.order_by(asc(Trade.pnl))
    else:  # date_desc default
        query = query.order_by(desc(Trade.entry_date))

    items = query.offset(skip).limit(limit).all()

    return TradeListResponse(
        items=[TradeResponse.model_validate(t) for t in items],
        total=total
    )

@router.post("", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
def create_trade(
    trade_in: TradeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Calculate PnL, PnL %, R-Multiple
    pnl, pnl_pct, r_multiple = calculate_trade_metrics(
        direction=trade_in.direction,
        entry_price=trade_in.entry_price,
        exit_price=trade_in.exit_price,
        quantity=trade_in.quantity,
        fees=trade_in.fees,
        stop_loss=trade_in.stop_loss,
        manual_pnl=trade_in.pnl
    )

    trade = Trade(
        user_id=current_user.id,
        symbol=trade_in.symbol.upper(),
        market=trade_in.market.upper(),
        direction=trade_in.direction.upper(),
        status=trade_in.status.upper(),
        entry_date=trade_in.entry_date,
        exit_date=trade_in.exit_date,
        entry_price=trade_in.entry_price,
        exit_price=trade_in.exit_price,
        quantity=trade_in.quantity,
        stop_loss=trade_in.stop_loss,
        take_profit=trade_in.take_profit,
        fees=trade_in.fees,
        pnl=pnl,
        pnl_percentage=pnl_pct,
        r_multiple=r_multiple,
        tags=trade_in.tags or "",
        setup_notes=trade_in.setup_notes,
        post_trade_notes=trade_in.post_trade_notes,
        discipline_rating=trade_in.discipline_rating,
        followed_rules=trade_in.followed_rules,
        chart_url=trade_in.chart_url
    )

    db.add(trade)
    db.commit()
    db.refresh(trade)
    return TradeResponse.model_validate(trade)

@router.get("/tags/all", response_model=List[str])
def get_user_tags(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trades = db.query(Trade.tags).filter(Trade.user_id == current_user.id).all()
    all_tags = set()
    for (tags_str,) in trades:
        if tags_str:
            for t in tags_str.split(","):
                clean = t.strip()
                if clean:
                    all_tags.add(clean)
    return sorted(list(all_tags))

@router.post("/import/hyperliquid", response_model=HyperliquidImportResponse)
async def import_hyperliquid_trades(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Будь ласка, завантажте CSV файл експорту з Hyperliquid")

    raw_bytes = await file.read()
    try:
        csv_text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Файл повинен бути в кодуванні UTF-8")

    try:
        parsed_trades = parse_hyperliquid_csv(csv_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Помилка парсингу CSV: {str(e)}")

    if not parsed_trades:
        return HyperliquidImportResponse(
            imported_count=0,
            skipped_duplicates=0,
            open_count=0,
            total_pnl=0.0,
            trades=[]
        )

    # Fetch existing trades for duplicate check
    existing = db.query(Trade).filter(Trade.user_id == current_user.id).all()
    existing_keys = set()
    for ex in existing:
        ex_dt = ex.entry_date.replace(tzinfo=None) if ex.entry_date else None
        existing_keys.add((
            ex.symbol.upper(),
            ex.direction.upper(),
            ex_dt.strftime("%Y-%m-%d %H:%M:%S") if ex_dt else "",
            round(ex.entry_price, 6),
            round(ex.quantity, 6),
        ))

    created_trades: List[Trade] = []
    skipped = 0
    open_count = 0
    total_pnl = 0.0

    for pt in parsed_trades:
        entry_naive = pt.entry_date.replace(tzinfo=None)
        exit_naive = pt.exit_date.replace(tzinfo=None) if pt.exit_date else None

        dedup_key = (
            pt.symbol.upper(),
            pt.direction.upper(),
            entry_naive.strftime("%Y-%m-%d %H:%M:%S"),
            round(pt.entry_price, 6),
            round(pt.quantity, 6),
        )
        if dedup_key in existing_keys:
            skipped += 1
            continue

        existing_keys.add(dedup_key)

        trade = Trade(
            user_id=current_user.id,
            symbol=pt.symbol.upper(),
            market=pt.market,
            direction=pt.direction,
            status=pt.status,
            entry_date=entry_naive,
            exit_date=exit_naive,
            entry_price=pt.entry_price,
            exit_price=pt.exit_price,
            quantity=pt.quantity,
            fees=pt.fees,
            pnl=pt.pnl,
            pnl_percentage=pt.pnl_percentage,
            tags=pt.tags,
            setup_notes=pt.setup_notes,
            discipline_rating=5,
            followed_rules=True,
        )
        db.add(trade)
        created_trades.append(trade)
        if pt.status == "OPEN":
            open_count += 1
        else:
            total_pnl += pt.pnl

    db.commit()
    for tr in created_trades:
        db.refresh(tr)

    return HyperliquidImportResponse(
        imported_count=len(created_trades),
        skipped_duplicates=skipped,
        open_count=open_count,
        total_pnl=round(total_pnl, 4),
        trades=[TradeResponse.model_validate(t) for t in created_trades]
    )

@router.get("/{trade_id}", response_model=TradeResponse)
def get_trade(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == current_user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Угоду не знайдено")
    return TradeResponse.model_validate(trade)

@router.put("/{trade_id}", response_model=TradeResponse)
def update_trade(
    trade_id: int,
    trade_in: TradeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == current_user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Угоду не знайдено")

    update_data = trade_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("symbol", "market", "direction", "status") and isinstance(value, str):
            setattr(trade, field, value.upper())
        else:
            setattr(trade, field, value)

    # Recalculate metrics
    pnl, pnl_pct, r_multiple = calculate_trade_metrics(
        direction=trade.direction,
        entry_price=trade.entry_price,
        exit_price=trade.exit_price,
        quantity=trade.quantity,
        fees=trade.fees,
        stop_loss=trade.stop_loss,
        manual_pnl=trade.pnl
    )
    trade.pnl = pnl
    trade.pnl_percentage = pnl_pct
    trade.r_multiple = r_multiple

    db.commit()
    db.refresh(trade)
    return TradeResponse.model_validate(trade)

@router.delete("/{trade_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trade(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    trade = db.query(Trade).filter(Trade.id == trade_id, Trade.user_id == current_user.id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Угоду не знайдено")
    db.delete(trade)
    db.commit()
    return None
