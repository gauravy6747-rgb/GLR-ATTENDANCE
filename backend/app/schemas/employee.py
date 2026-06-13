from pydantic import BaseModel, EmailStr
from uuid import UUID
from typing import Optional


class EmployeeCreate(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    password: str
    phone: str
    role: str
    saturday_policy: Optional[str] = "alt_sat_holiday"


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    saturday_policy: Optional[str] = None
    base_salary: Optional[float] = None


class EmployeeResponse(BaseModel):
    id: UUID
    employee_id: str
    name: str
    email: EmailStr
    phone: str
    role: str
    face_enrolled: bool
    saturday_policy: str
    base_salary: Optional[float] = 0.0

    class Config:
        from_attributes = True
