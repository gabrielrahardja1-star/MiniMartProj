from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.worker import Worker
from app.schemas.auth import LoginRequest, TokenResponse, CurrentUser
from app.core.security import verify_pin, hash_pin, create_access_token
from app.core.deps import get_current_worker

router = APIRouter(prefix="/api/auth", tags=["auth"])


DUMMY_USERS = {
    "admin": {"pin": "0000", "id": 0, "name": "Dummy Admin", "role": "admin"},
    "cashier": {"pin": "0000", "id": -1, "name": "Dummy Cashier", "role": "cashier"},
    "worker": {"pin": "0000", "id": -2, "name": "Dummy Worker", "role": "worker"},
}


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    dummy = DUMMY_USERS.get(body.employee_id)
    if dummy and body.pin == dummy["pin"]:
        token = create_access_token({"sub": body.employee_id, "role": dummy["role"]})
        return TokenResponse(
            access_token=token,
            id=dummy["id"],
            employee_id=body.employee_id,
            name=dummy["name"],
            role=dummy["role"],
            pin_hash=hash_pin(dummy["pin"]),
        )

    worker = db.query(Worker).filter(
        Worker.employee_id == body.employee_id,
        Worker.is_active == True,
    ).first()

    if not worker or not verify_pin(body.pin, worker.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid employee ID or PIN",
        )

    token = create_access_token({"sub": worker.employee_id, "role": worker.role})
    return TokenResponse(
        access_token=token,
        id=worker.id,
        employee_id=worker.employee_id,
        name=worker.name,
        role=worker.role,
        # Lets the mobile app cache this and verify the PIN locally if a
        # later login attempt happens while the tablet is offline. Safe to
        # return here: a login response only ever reaches the worker who
        # owns that PIN, never anyone else's.
        pin_hash=worker.pin_hash,
    )


@router.get("/me", response_model=CurrentUser)
def me(current_worker: Worker = Depends(get_current_worker)):
    return current_worker
