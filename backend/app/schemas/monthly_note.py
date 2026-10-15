from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class MonthlyNoteSubmitRequest(BaseModel):
    note: str


class MonthlyNoteResponse(BaseModel):
    id: str
    user_id: str
    year: int
    month: int
    note: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WindowInfoResponse(BaseModel):
    is_open: bool
    current_day: int
    window_days: str = "1-5"
    target_year: int
    target_month: int
    target_month_name: str
    existing_note: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
