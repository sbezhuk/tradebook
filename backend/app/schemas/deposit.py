from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class DepositBase(BaseModel):
    amount: float = Field(..., gt=0, description="Сума поповнення депозиту (USD)")
    deposit_date: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Дата та час внесення депозиту",
    )
    note: Optional[str] = Field(
        default=None,
        max_length=255,
        description="Нотатка або джерело поповнення",
    )


class DepositCreate(DepositBase):
    pass


class DepositResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    amount: float
    deposit_date: datetime
    note: Optional[str] = None
    created_at: datetime


class DepositListResponse(BaseModel):
    items: List[DepositResponse]
    total_amount: float
    count: int


class HyperliquidDepositImportResponse(BaseModel):
    imported_count: int
    skipped_duplicates: int
    total_amount: float
    deposits: List[DepositResponse]
