from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.worker import Worker
from app.core.security import decode_token

bearer_scheme = HTTPBearer()


def get_current_worker(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Worker:
    token = credentials.credentials
    try:
        payload = decode_token(token)
        employee_id: str = payload.get("sub")
        if not employee_id:
            raise ValueError("Missing subject")
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    worker = db.query(Worker).filter(Worker.employee_id == employee_id, Worker.is_active == True).first()
    if not worker:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Worker not found or inactive")
    return worker


def require_admin(current_worker: Worker = Depends(get_current_worker)) -> Worker:
    if current_worker.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_worker
