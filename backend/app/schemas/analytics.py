from typing import List, Optional
from pydantic import BaseModel

class SummaryStats(BaseModel):
    total_trades: int
    winning_trades: int
    losing_trades: int
    breakeven_trades: int
    open_trades: int
    win_rate: float
    total_pnl: float
    gross_profit: float
    gross_loss: float
    profit_factor: float
    average_trade: float
    average_win: float
    average_loss: float
    best_trade: float
    worst_trade: float
    max_consecutive_wins: int
    max_consecutive_losses: int
    rule_discipline_rate: float  # % trades where followed_rules is True
    period_deposits: float = 0.0
    period_cumulative_deposits: float = 0.0
    period_deposit_growth_pct: Optional[float] = None

class EquityPoint(BaseModel):
    date: str
    trade_id: int
    symbol: str
    pnl: float
    cumulative_pnl: float

class BreakdownItem(BaseModel):
    name: str
    trades_count: int
    win_rate: float
    total_pnl: float

class DailyActivityItem(BaseModel):
    date: str  # YYYY-MM-DD
    trades_count: int
    total_pnl: float

class MonthlySummaryItem(BaseModel):
    month: str          # YYYY-MM
    label: str          # e.g. "Листопад 2026"
    trades_count: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_pnl: float
    profit_factor: float
    deposits_amount: float = 0.0
    cumulative_deposits: float = 0.0
    deposit_growth_pct: Optional[float] = None

class AnalyticsResponse(BaseModel):
    overall_total_pnl: float
    overall_total_trades: int
    total_deposits: float = 0.0
    current_balance: float = 0.0
    overall_deposit_growth_pct: Optional[float] = None
    selected_month: Optional[str] = None
    available_months: List[MonthlySummaryItem]
    summary: SummaryStats
    equity_curve: List[EquityPoint]
    by_market: List[BreakdownItem]
    by_direction: List[BreakdownItem]
    by_tag: List[BreakdownItem]
    by_symbol: List[BreakdownItem]
    by_day_of_week: List[BreakdownItem]
    daily_activity: List[DailyActivityItem]
