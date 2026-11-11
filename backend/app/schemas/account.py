from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class AccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Назва акаунту або портфелю")
    platform: str = Field(default="CUSTOM", max_length=50, description="Біржа / платформа")
    account_type: str = Field(default="PERSONAL", max_length=30, description="Тип рахунку")
    currency: str = Field(default="USD", max_length=10, description="Валюта обліку")
    color: str = Field(default="#c49bff", max_length=20, description="Колір індикатора")


class AccountCreate(AccountBase):
    is_default: bool = False


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    platform: Optional[str] = Field(default=None, max_length=50)
    account_type: Optional[str] = Field(default=None, max_length=30)
    currency: Optional[str] = Field(default=None, max_length=10)
    color: Optional[str] = Field(default=None, max_length=20)
    is_default: Optional[bool] = None


class AccountResponse(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    is_default: bool
    created_at: datetime
    trades_count: int = 0
    open_trades: int = 0
    total_pnl: float = 0.0
    total_deposits: float = 0.0
    current_balance: float = 0.0


class AccountListResponse(BaseModel):
    items: List[AccountResponse]
    total: int
