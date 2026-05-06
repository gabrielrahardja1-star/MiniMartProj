from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.worker import Worker
from app.schemas.auth import LoginRequest, TokenResponse, CurrentUser
from app.core.security import verify_pin, create_access_token
from app.core.deps import get_current_worker

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
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
    return TokenResponse(access_token=token)


@router.get("/me", response_model=CurrentUser)
def me(current_worker: Worker = Depends(get_current_worker)):
    return current_worker
