from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, computed_field


class DepositBase(BaseModel):
    amount: float = Field(..., gt=0, description="Сума операції депозиту або виведення (USD)")
    deposit_date: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Дата та час внесення або виведення коштів",
    )
    note: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Нотатка або джерело/призначення операції",
    )
    account_id: Optional[int] = Field(default=None, description="ID торгового акаунту")
    type: Optional[str] = Field(
        default="deposit",
        description="Тип операції: 'deposit' (поповнення) або 'withdraw' (виведення)",
    )


class DepositCreate(DepositBase):
    pass


class WithdrawCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Сума виведення коштів (USD)")
    deposit_date: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Дата та час виведення коштів",
    )
    note: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Нотатка (наприклад: вивід на карту, прибуток, біржа)",
    )
    account_id: Optional[int] = Field(default=None, description="ID торгового акаунту")


class DepositResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    account_id: Optional[int] = None
    amount: float
    deposit_date: datetime
    note: Optional[str] = None
    created_at: datetime

    @computed_field
    @property
    def type(self) -> str:
        return "withdraw" if self.amount < 0 else "deposit"


class DepositListResponse(BaseModel):
    items: List[DepositResponse]
    total_amount: float
    count: int
    total_deposited: Optional[float] = 0.0
    total_withdrawn: Optional[float] = 0.0


class HyperliquidDepositImportResponse(BaseModel):
    imported_count: int
    skipped_duplicates: int
    total_amount: float
    deposits: List[DepositResponse]
