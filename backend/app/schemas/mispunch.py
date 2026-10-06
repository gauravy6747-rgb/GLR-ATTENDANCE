from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID


class MisPunchRequestCreate(BaseModel):
    date: date
    request_type: str  # 'checkout_only', 'checkin_only', 'both'
    requested_checkin_time: Optional[datetime] = None
    requested_checkout_time: Optional[datetime] = None
    reason: str


class MisPunchActionRequest(BaseModel):
    action: str  # 'approve', 'reject'
    notes: Optional[str] = None


class MisPunchRequestResponse(BaseModel):
    id: UUID
    user_id: UUID
    employee_name: str
    employee_code: Optional[str] = None
    date: date
    request_type: str
    requested_checkin_time: Optional[datetime] = None
    requested_checkout_time: Optional[datetime] = None
    reason: str
    status: str
    created_at: datetime
    action_by_name: Optional[str] = None
    action_at: Optional[datetime] = None
    admin_notes: Optional[str] = None

    class Config:
        from_attributes = True
