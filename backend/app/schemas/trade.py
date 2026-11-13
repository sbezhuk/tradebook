from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

class TradeBase(BaseModel):
    symbol: str = Field(..., description="Символ або пара")
    market: str = Field(default="CRYPTO", description="CRYPTO, FOREX, STOCKS, FUTURES, COMMODITIES")
    direction: str = Field(..., description="LONG або SHORT")
    status: str = Field(default="OPEN", description="OPEN, CLOSED, CANCELLED")
    account_id: Optional[int] = Field(default=None, description="ID торгового акаунту")
    entry_date: datetime
    exit_date: Optional[datetime] = None
    entry_price: float = Field(..., gt=0)
    exit_price: Optional[float] = None
    quantity: float = Field(..., gt=0)
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    fees: float = Field(default=0.0, ge=0)
    funding: float = Field(default=0.0)
    pnl: Optional[float] = None
    tags: Optional[str] = ""
    setup_notes: Optional[str] = None
    post_trade_notes: Optional[str] = None
    discipline_rating: int = Field(default=5, ge=1, le=5)
    followed_rules: bool = True
    chart_url: Optional[str] = None

class TradeCreate(TradeBase):
    pass

class TradeUpdate(BaseModel):
    symbol: Optional[str] = None
    market: Optional[str] = None
    direction: Optional[str] = None
    status: Optional[str] = None
    account_id: Optional[int] = None
    entry_date: Optional[datetime] = None
    exit_date: Optional[datetime] = None
    entry_price: Optional[float] = None
    exit_price: Optional[float] = None
    quantity: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    fees: Optional[float] = None
    funding: Optional[float] = None
    pnl: Optional[float] = None
    tags: Optional[str] = None
    setup_notes: Optional[str] = None
    post_trade_notes: Optional[str] = None
    discipline_rating: Optional[int] = None
    followed_rules: Optional[bool] = None
    chart_url: Optional[str] = None

class TradeResponse(TradeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    pnl: float
    pnl_percentage: float
    r_multiple: Optional[float] = None
    created_at: datetime
    updated_at: datetime

class TradeListResponse(BaseModel):
    items: List[TradeResponse]
    total: int

class HyperliquidImportResponse(BaseModel):
    imported_count: int
    skipped_duplicates: int
    open_count: int
    total_pnl: float
    trades: List[TradeResponse]


class HyperliquidFundingImportResponse(BaseModel):
    imported_count: int
    skipped_duplicates: int
    total_funding: float
    account_total_funding: float

class DeleteAllTradesResponse(BaseModel):
    deleted_count: int
