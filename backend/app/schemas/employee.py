from pydantic import BaseModel, EmailStr
from uuid import UUID


class EmployeeCreate(BaseModel):

    employee_id: str
    name: str
    email: EmailStr
    password: str
    phone: str
    role: str


class EmployeeResponse(BaseModel):

    id: UUID
    employee_id: str
    name: str
    email: EmailStr
    phone: str
    role: str
    face_enrolled: bool

    class Config:
        from_attributes = True
