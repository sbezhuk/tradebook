from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.schemas.common import UtcDateTime, OptionalUtcDateTime
from app.services.symbol_utils import normalize_symbol_pair, is_valid_pair

class TradeBase(BaseModel):
    symbol: str = Field(..., description="Торгова пара (напр. BTC/USDT, BTC/USDC або NVDA/USDT (IO))")
    market: str = Field(default="CRYPTO", description="CRYPTO, FOREX, STOCKS, FUTURES, COMMODITIES")
    direction: str = Field(..., description="LONG або SHORT")
    status: str = Field(default="OPEN", description="OPEN, CLOSED, CANCELLED")
    account_id: Optional[int] = Field(default=None, description="ID торгового акаунту")
    entry_date: UtcDateTime
    exit_date: OptionalUtcDateTime = None
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

    @field_validator("symbol")
    @classmethod
    def validate_and_normalize_symbol(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError("Символ або пара є обов'язковим полем")
        norm = normalize_symbol_pair(s, default_quote="USDT")
        if not is_valid_pair(norm):
            raise ValueError(f"Символ повинен бути торговою парою (напр. BTC/USDT або NVDA/USDT (IO)), отримано: {v}")
        return norm

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

    @field_validator("symbol")
    @classmethod
    def validate_and_normalize_update_symbol(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip()
        if not s:
            return None
        norm = normalize_symbol_pair(s, default_quote="USDT")
        if not is_valid_pair(norm):
            raise ValueError(f"Символ повинен бути торговою парою (напр. BTC/USDT або NVDA/USDT (IO)), отримано: {v}")
        return norm

class TradeResponse(TradeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    pnl: float
    pnl_percentage: float
    r_multiple: Optional[float] = None
    created_at: UtcDateTime
    updated_at: UtcDateTime

class TradeListResponse(BaseModel):
    items: List[TradeResponse]
    total: int

class HyperliquidImportResponse(BaseModel):
    imported_count: int
    skipped_duplicates: int
    open_count: int
    total_pnl: float
    trades: List[TradeResponse]


class TradePreviewItem(BaseModel):
    temp_id: str
    symbol: str
    market: str = "CRYPTO"
    direction: str
    status: str
    entry_date: UtcDateTime
    exit_date: OptionalUtcDateTime = None
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    fees: float = 0.0
    funding: float = 0.0
    pnl: float = 0.0
    pnl_percentage: float = 0.0
    tags: Optional[str] = ""
    setup_notes: Optional[str] = None
    is_duplicate: bool = False
    duplicate_reason: Optional[str] = None

    @field_validator("symbol")
    @classmethod
    def validate_and_normalize_preview_symbol(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError("Символ або пара є обов'язковим полем")
        return normalize_symbol_pair(s, default_quote="USDT")


class HyperliquidTradesPreviewResponse(BaseModel):
    total_parsed: int
    duplicate_count: int
    items: List[TradePreviewItem]


class TradeCommitItem(BaseModel):
    symbol: str
    market: str = "CRYPTO"
    direction: str
    status: str = "CLOSED"
    entry_date: UtcDateTime
    exit_date: OptionalUtcDateTime = None
    entry_price: float
    exit_price: Optional[float] = None
    quantity: float
    fees: float = 0.0
    funding: float = 0.0
    pnl: Optional[float] = None
    pnl_percentage: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    tags: Optional[str] = ""
    setup_notes: Optional[str] = None
    post_trade_notes: Optional[str] = None
    discipline_rating: int = 5
    followed_rules: bool = True

    @field_validator("symbol")
    @classmethod
    def validate_and_normalize_commit_symbol(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError("Символ або пара є обов'язковим полем")
        norm = normalize_symbol_pair(s, default_quote="USDT")
        if not is_valid_pair(norm):
            raise ValueError(f"Символ повинен бути торговою парою (напр. BTC/USDT або NVDA/USDT (IO)), отримано: {v}")
        return norm


class TradeBatchCommitRequest(BaseModel):
    trades: List[TradeCommitItem]


class DeleteAllTradesResponse(BaseModel):
    deleted_count: int
