from pydantic import BaseModel


class LoginRequest(BaseModel):
    employee_id: str
    pin: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    id: int
    employee_id: str
    name: str
    role: str
    pin_hash: str | None = None


class CurrentUser(BaseModel):
    id: int
    employee_id: str
    name: str
    role: str

    model_config = {"from_attributes": True}
