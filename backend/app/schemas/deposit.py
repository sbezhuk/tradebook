from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field


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


class DepositResponse(DepositBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DepositListResponse(BaseModel):
    items: List[DepositResponse]
    total_amount: float
    count: int
