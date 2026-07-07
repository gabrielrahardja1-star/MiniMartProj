from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    balance_after: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    performed_by_worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    worker: Mapped["Worker"] = relationship(
        "Worker",
        back_populates="wallet_transactions",
        foreign_keys=[worker_id],
    )
    performed_by: Mapped["Worker"] = relationship("Worker", foreign_keys=[performed_by_worker_id])
    order: Mapped["Order | None"] = relationship("Order")

    __table_args__ = (Index("ix_wallet_tx_worker_created", "worker_id", "created_at"),)
