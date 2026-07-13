from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.worker import Worker
from app.models.wallet import WalletTransaction

MONTHLY_TOPUP_AMOUNT = 300000


def monthly_worker_topup():
    """
    Top up all active workers with 300K at the start of each month.
    This is called by the APScheduler on the 1st of each month at 00:00 UTC.
    """
    db: Session = SessionLocal()
    try:
        admin_worker = db.query(Worker).filter(Worker.role == "admin").first()
        if not admin_worker:
            print("[monthly_topup] No admin worker found, skipping topup")
            return

        workers = db.query(Worker).filter(Worker.is_active == True).all()
        if not workers:
            print("[monthly_topup] No active workers found")
            return

        topup_count = 0
        for worker in workers:
            try:
                worker.balance = round(float(worker.balance) + MONTHLY_TOPUP_AMOUNT, 2)
                db.add(WalletTransaction(
                    worker_id=worker.id,
                    type="topup",
                    amount=MONTHLY_TOPUP_AMOUNT,
                    balance_after=worker.balance,
                    performed_by_worker_id=admin_worker.id,
                    note="Monthly automatic top-up",
                ))
                topup_count += 1
            except Exception as e:
                print(f"[monthly_topup] Error topping up worker {worker.id}: {e}")
                db.rollback()
                continue

        db.commit()
        print(f"[monthly_topup] Successfully topped up {topup_count} workers with {MONTHLY_TOPUP_AMOUNT} each")
    except Exception as e:
        print(f"[monthly_topup] Fatal error: {e}")
        db.rollback()
    finally:
        db.close()
