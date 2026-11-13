from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class LinkedTradeBrief(BaseModel):
    id: int
    symbol: str
    direction: str
    entry_price: float
    exit_price: Optional[float] = None
    entry_date: datetime
    pnl: float
    status: str

    model_config = ConfigDict(from_attributes=True)


class FundingBase(BaseModel):
    coin: str = Field(..., min_length=1, max_length=50, description="Монета / Тікер (наприклад BTC, ETH)")
    direction: str = Field(default="LONG", description="LONG або SHORT")
    size: float = Field(default=0.0, ge=0.0, description="Розмір позиції")
    payment: float = Field(..., description="Сума фандінгу в USD (позитивна = отримано, негативна = списано)")
    rate: float = Field(default=0.0, description="Ставка фандінгу")
    funding_time: Optional[datetime] = None
    note: Optional[str] = Field(default=None, max_length=255, description="Примітка до виплати")
    trade_id: Optional[int] = Field(default=None, description="ID пов'язаної угоди (вручну)")


class FundingCreate(FundingBase):
    account_id: Optional[int] = Field(default=None, description="ID торгового акаунту")


class FundingUpdate(BaseModel):
    account_id: Optional[int] = None
    coin: Optional[str] = Field(default=None, min_length=1, max_length=50)
    direction: Optional[str] = None
    size: Optional[float] = Field(default=None, ge=0.0)
    payment: Optional[float] = None
    rate: Optional[float] = None
    funding_time: Optional[datetime] = None
    note: Optional[str] = Field(default=None, max_length=255)
    trade_id: Optional[int] = None


class FundingLinkTradeRequest(BaseModel):
    trade_id: Optional[int] = Field(default=None, description="ID угоди для прив'язки або null для відв'язки")


class FundingResponse(FundingBase):
    id: int
    user_id: int
    account_id: Optional[int]
    funding_time: datetime
    created_at: Optional[datetime] = None
    trade: Optional[LinkedTradeBrief] = None

    model_config = ConfigDict(from_attributes=True)


class FundingListResponse(BaseModel):
    items: List[FundingResponse]
    total_funding: float
    total_received: float
    total_paid: float
    count: int


class DeleteAllFundingResponse(BaseModel):
    deleted_count: int
