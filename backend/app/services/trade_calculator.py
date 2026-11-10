from typing import Optional, Tuple

def calculate_trade_metrics(
    direction: str,
    entry_price: float,
    exit_price: Optional[float],
    quantity: float,
    fees: float = 0.0,
    stop_loss: Optional[float] = None,
    manual_pnl: Optional[float] = None
) -> Tuple[float, float, Optional[float]]:
    """
    Returns (pnl, pnl_percentage, r_multiple)
    """
    if exit_price is None:
        return 0.0, 0.0, None

    direction_upper = direction.upper()

    if manual_pnl is not None and manual_pnl != 0.0 and exit_price == entry_price:
        pnl = manual_pnl - fees
        cost_basis = entry_price * quantity
        pnl_pct = (pnl / cost_basis * 100.0) if cost_basis > 0 else 0.0
    else:
        if direction_upper == "LONG":
            gross_pnl = (exit_price - entry_price) * quantity
            pnl_pct = ((exit_price - entry_price) / entry_price) * 100.0 if entry_price > 0 else 0.0
        else:  # SHORT
            gross_pnl = (entry_price - exit_price) * quantity
            pnl_pct = ((entry_price - exit_price) / entry_price) * 100.0 if entry_price > 0 else 0.0
        pnl = gross_pnl - (fees or 0.0)

    # Calculate R-Multiple if stop loss was defined
    r_multiple: Optional[float] = None
    if stop_loss is not None and stop_loss > 0:
        if direction_upper == "LONG" and stop_loss < entry_price:
            risk_per_unit = entry_price - stop_loss
            total_risk = risk_per_unit * quantity
            if total_risk > 0:
                r_multiple = round(pnl / total_risk, 2)
        elif direction_upper == "SHORT" and stop_loss > entry_price:
            risk_per_unit = stop_loss - entry_price
            total_risk = risk_per_unit * quantity
            if total_risk > 0:
                r_multiple = round(pnl / total_risk, 2)

    return round(pnl, 2), round(pnl_pct, 2), r_multiple
