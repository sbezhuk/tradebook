import csv
import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field


@dataclass
class ParsedHyperliquidTrade:
    symbol: str
    market: str
    direction: str  # LONG or SHORT
    status: str     # CLOSED or OPEN
    entry_date: datetime
    exit_date: Optional[datetime]
    entry_price: float
    exit_price: Optional[float]
    quantity: float
    fees: float
    pnl: float
    pnl_percentage: float
    tags: str
    setup_notes: str


@dataclass
class _PositionTracker:
    coin: str
    direction: str
    entry_date: datetime
    open_qty: float = 0.0
    open_notional: float = 0.0
    open_fees: float = 0.0
    open_closed_pnl: float = 0.0
    close_qty: float = 0.0
    close_notional: float = 0.0
    close_fees: float = 0.0
    close_closed_pnl: float = 0.0
    last_exit_date: Optional[datetime] = None
    fills_count: int = 0


@dataclass
class ParsedHyperliquidDeposit:
    amount: float
    deposit_date: datetime
    action: str
    note: str


@dataclass
class ParsedHyperliquidFunding:
    funding_time: datetime
    coin: str
    direction: str  # LONG or SHORT
    size: float
    payment: float
    rate: float = 0.0


def _parse_hl_amount(raw_val: str) -> Tuple[float, str]:
    """Parse Hyperliquid amount strings like '52.604246 USDC' or '-100 USDC'."""
    s = (raw_val or "").strip()
    if not s:
        return 0.0, ""
    parts = s.split()
    num_str = parts[0].replace(",", "")
    unit = " ".join(parts[1:]).strip()
    return float(num_str), unit


def _parse_hl_time(time_str: str) -> datetime:
    s = time_str.strip()
    for fmt in (
        "%m/%d/%Y - %H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
    ):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    # Fallback ISO
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def parse_hyperliquid_csv(csv_content: str) -> List[ParsedHyperliquidTrade]:
    reader = csv.DictReader(io.StringIO(csv_content.strip()))
    if not reader.fieldnames:
        raise ValueError("CSV файл порожній або не містить заголовків")

    required_cols = {"time", "coin", "dir", "px", "sz", "fee", "closedPnl"}
    missing = required_cols - set(f.strip() for f in reader.fieldnames)
    if missing:
        raise ValueError(
            f"Невірний формат файлу Hyperliquid. Відсутні колонки: {', '.join(sorted(missing))}"
        )

    rows: List[Dict[str, Any]] = []
    for raw in reader:
        row = {k.strip(): (v.strip() if v is not None else "") for k, v in raw.items() if k}
        if not row.get("time") or not row.get("coin"):
            continue
        rows.append(
            {
                "dt": _parse_hl_time(row["time"]),
                "coin": row["coin"],
                "dir": row["dir"],
                "px": float(row["px"]),
                "sz": float(row["sz"]),
                "fee": float(row.get("fee") or 0.0),
                "closedPnl": float(row.get("closedPnl") or 0.0),
            }
        )

    # Sort chronologically so opens always precede closes
    rows.sort(key=lambda r: r["dt"])

    active_positions: Dict[str, _PositionTracker] = {}
    completed_trades: List[ParsedHyperliquidTrade] = []

    def _finalize_position(pos: _PositionTracker, force_open: bool = False) -> None:
        if pos.open_qty <= 1e-12:
            return

        avg_entry = pos.open_notional / pos.open_qty

        if pos.close_qty <= 1e-12 or force_open:
            # Position is still OPEN
            completed_trades.append(
                ParsedHyperliquidTrade(
                    symbol=pos.coin,
                    market="CRYPTO",
                    direction=pos.direction,
                    status="OPEN",
                    entry_date=pos.entry_date,
                    exit_date=None,
                    entry_price=round(avg_entry, 8),
                    exit_price=None,
                    quantity=round(pos.open_qty, 8),
                    fees=round(pos.open_fees, 6),
                    pnl=0.0,
                    pnl_percentage=0.0,
                    tags="Hyperliquid",
                    setup_notes=f"Імпортовано з Hyperliquid ({pos.fills_count} ордерів)",
                )
            )
            return

        avg_exit = pos.close_notional / pos.close_qty
        total_fees = pos.open_fees + pos.close_fees
        # Exact Hyperliquid net PnL across open + close fills
        net_pnl = pos.open_closed_pnl + pos.close_closed_pnl

        if pos.direction == "LONG":
            roi_pct = ((avg_exit - avg_entry) / avg_entry * 100.0) if avg_entry > 0 else 0.0
        else:
            roi_pct = ((avg_entry - avg_exit) / avg_entry * 100.0) if avg_entry > 0 else 0.0

        completed_trades.append(
            ParsedHyperliquidTrade(
                symbol=pos.coin,
                market="CRYPTO",
                direction=pos.direction,
                status="CLOSED",
                entry_date=pos.entry_date,
                exit_date=pos.last_exit_date or pos.entry_date,
                entry_price=round(avg_entry, 8),
                exit_price=round(avg_exit, 8),
                quantity=round(pos.close_qty, 8),
                fees=round(total_fees, 6),
                pnl=round(net_pnl, 4),
                pnl_percentage=round(roi_pct, 2),
                tags="Hyperliquid",
                setup_notes=f"Імпортовано з Hyperliquid ({pos.fills_count} ордерів)",
            )
        )

    for r in rows:
        coin = r["coin"]
        dir_str = r["dir"]
        px = r["px"]
        sz = r["sz"]
        fee = r["fee"]
        closed_pnl = r["closedPnl"]
        dt = r["dt"]

        if dir_str in ("Open Long", "Open Short"):
            direction = "LONG" if dir_str == "Open Long" else "SHORT"
            pos = active_positions.get(coin)
            if pos and pos.direction != direction:
                # Unexpected direction change without explicit close; finalize old
                _finalize_position(pos, force_open=(pos.close_qty <= 1e-12))
                pos = None

            if not pos:
                pos = _PositionTracker(coin=coin, direction=direction, entry_date=dt)
                active_positions[coin] = pos

            pos.open_qty += sz
            pos.open_notional += px * sz
            pos.open_fees += fee
            pos.open_closed_pnl += closed_pnl
            pos.fills_count += 1

        elif dir_str in ("Close Long", "Close Short"):
            direction = "LONG" if dir_str == "Close Long" else "SHORT"
            pos = active_positions.get(coin)
            if not pos:
                # Close without matching open in CSV; skip or record standalone
                continue

            pos.close_qty += sz
            pos.close_notional += px * sz
            pos.close_fees += fee
            pos.close_closed_pnl += closed_pnl
            pos.last_exit_date = dt
            pos.fills_count += 1

            # Check if position is fully closed (allow tiny floating point tolerance)
            if pos.close_qty >= pos.open_qty - max(1e-8, pos.open_qty * 1e-5):
                _finalize_position(pos)
                del active_positions[coin]

        elif dir_str in ("Long > Short", "Short > Long"):
            # Position flip: closes current position and opens opposite with remainder
            pos = active_positions.get(coin)
            if pos:
                remaining_to_close = max(0.0, pos.open_qty - pos.close_qty)
                close_sz = min(sz, remaining_to_close)
                open_rem_sz = max(0.0, sz - close_sz)

                ratio = (close_sz / sz) if sz > 0 else 1.0
                pos.close_qty += close_sz
                pos.close_notional += px * close_sz
                pos.close_fees += fee * ratio
                pos.close_closed_pnl += closed_pnl
                pos.last_exit_date = dt
                pos.fills_count += 1
                _finalize_position(pos)
                del active_positions[coin]

                if open_rem_sz > 1e-10:
                    new_dir = "SHORT" if dir_str == "Long > Short" else "LONG"
                    new_pos = _PositionTracker(coin=coin, direction=new_dir, entry_date=dt)
                    new_pos.open_qty = open_rem_sz
                    new_pos.open_notional = px * open_rem_sz
                    new_pos.open_fees = fee * (1.0 - ratio)
                    new_pos.fills_count = 1
                    active_positions[coin] = new_pos

    # Finalize any still-open positions at EOF
    for coin, pos in list(active_positions.items()):
        if pos.close_qty > 1e-12:
            # Partially closed: emit closed part and open remainder
            rem_qty = pos.open_qty - pos.close_qty
            avg_entry = pos.open_notional / pos.open_qty
            closed_ratio = pos.close_qty / pos.open_qty

            closed_part = _PositionTracker(
                coin=coin,
                direction=pos.direction,
                entry_date=pos.entry_date,
                open_qty=pos.close_qty,
                open_notional=avg_entry * pos.close_qty,
                open_fees=pos.open_fees * closed_ratio,
                open_closed_pnl=pos.open_closed_pnl * closed_ratio,
                close_qty=pos.close_qty,
                close_notional=pos.close_notional,
                close_fees=pos.close_fees,
                close_closed_pnl=pos.close_closed_pnl,
                last_exit_date=pos.last_exit_date,
                fills_count=pos.fills_count,
            )
            _finalize_position(closed_part)

            if rem_qty > max(1e-8, pos.open_qty * 1e-5):
                open_part = _PositionTracker(
                    coin=coin,
                    direction=pos.direction,
                    entry_date=pos.entry_date,
                    open_qty=rem_qty,
                    open_notional=avg_entry * rem_qty,
                    open_fees=pos.open_fees * (1.0 - closed_ratio),
                    open_closed_pnl=pos.open_closed_pnl * (1.0 - closed_ratio),
                    fills_count=1,
                )
                _finalize_position(open_part, force_open=True)
        else:
            _finalize_position(pos, force_open=True)

    return completed_trades


def parse_hyperliquid_deposits_csv(csv_content: str) -> List[ParsedHyperliquidDeposit]:
    """Parse Hyperliquid deposits_and_withdrawals.csv rows into normalized deposit items."""
    reader = csv.DictReader(io.StringIO(csv_content.strip()))
    if not reader.fieldnames:
        raise ValueError("CSV файл порожній або не містить заголовків")

    required_cols = {"time", "action", "accountValueChange"}
    missing = required_cols - set(f.strip() for f in reader.fieldnames if f)
    if missing:
        raise ValueError(
            f"Невірний формат файлу депозитів Hyperliquid. Відсутні колонки: {', '.join(sorted(missing))}"
        )

    parsed: List[ParsedHyperliquidDeposit] = []
    for raw in reader:
        row = {k.strip(): (v.strip() if v is not None else "") for k, v in raw.items() if k}
        if not row.get("time") or not row.get("accountValueChange"):
            continue

        dt = _parse_hl_time(row["time"])
        action = row.get("action") or "deposit"
        source = row.get("source", "")
        destination = row.get("destination", "")
        amount, unit = _parse_hl_amount(row["accountValueChange"])
        fee_val, fee_unit = _parse_hl_amount(row.get("fee", ""))

        if action.lower() in ("withdraw", "withdrawal") and amount > 0:
            amount = -abs(amount)

        if abs(amount) <= 1e-9:
            continue

        route = ""
        if source and destination:
            route = f" ({source} → {destination})"
        elif source or destination:
            route = f" ({source or destination})"

        fee_suffix = ""
        if abs(fee_val) > 1e-9:
            unit_label = f" {fee_unit or unit}".rstrip()
            fee_suffix = f" • fee {fee_val:g}{unit_label}"

        note = f"Hyperliquid: {action}{route}{fee_suffix}"[:255]

        parsed.append(
            ParsedHyperliquidDeposit(
                amount=round(amount, 6),
                deposit_date=dt,
                action=action,
                note=note,
            )
        )

    parsed.sort(key=lambda d: d.deposit_date)
    return parsed


def parse_hyperliquid_funding_csv(csv_content: str) -> List[ParsedHyperliquidFunding]:
    """Parse Hyperliquid funding_history.csv rows into normalized funding items."""
    reader = csv.DictReader(io.StringIO(csv_content.strip()))
    if not reader.fieldnames:
        raise ValueError("CSV файл порожній або не містить заголовків")

    required_cols = {"time", "coin", "sz", "side", "payment"}
    missing = required_cols - set(f.strip() for f in reader.fieldnames if f)
    if missing:
        raise ValueError(
            f"Невірний формат файлу фандінгу Hyperliquid. Відсутні колонки: {', '.join(sorted(missing))}"
        )

    parsed: List[ParsedHyperliquidFunding] = []
    for raw in reader:
        row = {k.strip(): (v.strip() if v is not None else "") for k, v in raw.items() if k}
        if not row.get("time") or not row.get("coin") or not row.get("payment"):
            continue

        dt = _parse_hl_time(row["time"])
        side_raw = (row.get("side") or "").strip().lower()
        if side_raw in ("long", "l", "buy"):
            direction = "LONG"
        elif side_raw in ("short", "s", "sell"):
            direction = "SHORT"
        else:
            direction = side_raw.upper() or "LONG"

        sz_val, _ = _parse_hl_amount(row.get("sz", "0"))
        pay_val, _ = _parse_hl_amount(row["payment"])
        rate_val, _ = _parse_hl_amount(row.get("rate", "0"))

        if abs(pay_val) <= 1e-12:
            continue

        parsed.append(
            ParsedHyperliquidFunding(
                funding_time=dt,
                coin=row["coin"].upper(),
                direction=direction,
                size=round(abs(sz_val), 8),
                payment=round(pay_val, 8),
                rate=rate_val,
            )
        )

    parsed.sort(key=lambda f: f.funding_time)
    return parsed
