from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    token_type: str
    role: str
    name: str
    employee_id: str
    face_enrolled: bool