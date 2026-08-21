from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Worker(Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hr_employee_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    pin_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="worker")  # "worker" or "admin"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    balance: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    orders: Mapped[list["Order"]] = relationship("Order", back_populates="worker")
    wallet_transactions: Mapped[list["WalletTransaction"]] = relationship(
        "WalletTransaction",
        back_populates="worker",
        foreign_keys="WalletTransaction.worker_id",
    )
