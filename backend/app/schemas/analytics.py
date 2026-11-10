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
    profit_factor: float
    average_trade: float
    average_win: float
    average_loss: float
    best_trade: float
    worst_trade: float
    max_consecutive_wins: int
    max_consecutive_losses: int
    rule_discipline_rate: float  # % trades where followed_rules is True

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

class AnalyticsResponse(BaseModel):
    summary: SummaryStats
    equity_curve: List[EquityPoint]
    by_market: List[BreakdownItem]
    by_direction: List[BreakdownItem]
    by_tag: List[BreakdownItem]
    by_day_of_week: List[BreakdownItem]
