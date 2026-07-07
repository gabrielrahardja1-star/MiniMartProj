from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class WalletTopUpRequest(BaseModel):
    amount: float = Field(..., gt=0)
    note: str | None = None

    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class WalletBalanceOut(BaseModel):
    worker_id: int
    balance: float


class WalletTransactionOut(BaseModel):
    id: int
    worker_id: int
    type: str
    amount: float
    balance_after: float
    order_id: int | None
    performed_by_worker_id: int
    note: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
