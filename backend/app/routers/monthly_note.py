import calendar
from datetime import datetime
from typing import Optional, List
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin_or_superadmin
from app.models.user import User
from app.models.monthly_note import MonthlyNote
from app.schemas.monthly_note import (
    MonthlyNoteSubmitRequest,
    MonthlyNoteResponse,
    WindowInfoResponse
)
from app.utils.timezone import today_ist

router = APIRouter(
    prefix="/monthly-notes",
    tags=["Monthly Notes"]
)


def get_target_previous_month():
    today = today_ist()
    if today.month == 1:
        target_year = today.year - 1
        target_month = 12
    else:
        target_year = today.year
        target_month = today.month - 1
    return target_year, target_month, today.day


@router.get("/window", response_model=WindowInfoResponse)
def get_monthly_note_window_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_year, target_month, current_day = get_target_previous_month()
    is_open = (1 <= current_day <= 5)
    target_month_name = calendar.month_name[target_month]

    existing_note_rec = db.query(MonthlyNote).filter(
        MonthlyNote.user_id == current_user.id,
        MonthlyNote.year == target_year,
        MonthlyNote.month == target_month
    ).first()

    return WindowInfoResponse(
        is_open=is_open,
        current_day=current_day,
        window_days="1-5",
        target_year=target_year,
        target_month=target_month,
        target_month_name=target_month_name,
        existing_note=existing_note_rec.note if existing_note_rec else None,
        created_at=existing_note_rec.created_at if existing_note_rec else None,
        updated_at=existing_note_rec.updated_at if existing_note_rec else None
    )


@router.post("/submit", response_model=MonthlyNoteResponse)
def submit_or_update_monthly_note(
    payload: MonthlyNoteSubmitRequest,
    ignore_window: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    target_year, target_month, current_day = get_target_previous_month()
    is_open = (1 <= current_day <= 5)

    if not is_open and not ignore_window:
        raise HTTPException(
            status_code=400,
            detail="Monthly attendance issue window is closed. Messages can only be submitted or edited between the 1st and 5th of each month."
        )

    note_text = payload.note.strip()
    if not note_text:
        raise HTTPException(
            status_code=400,
            detail="Note content cannot be empty."
        )

    existing = db.query(MonthlyNote).filter(
        MonthlyNote.user_id == current_user.id,
        MonthlyNote.year == target_year,
        MonthlyNote.month == target_month
    ).first()

    now_utc = datetime.utcnow()
    if existing:
        existing.note = note_text
        existing.updated_at = now_utc
        db.commit()
        db.refresh(existing)
        note_obj = existing
    else:
        note_obj = MonthlyNote(
            id=uuid.uuid4(),
            user_id=current_user.id,
            year=target_year,
            month=target_month,
            note=note_text,
            created_at=now_utc,
            updated_at=now_utc
        )
        db.add(note_obj)
        db.commit()
        db.refresh(note_obj)

    return MonthlyNoteResponse(
        id=str(note_obj.id),
        user_id=str(note_obj.user_id),
        year=note_obj.year,
        month=note_obj.month,
        note=note_obj.note,
        created_at=note_obj.created_at,
        updated_at=note_obj.updated_at
    )


@router.get("/my-notes", response_model=List[MonthlyNoteResponse])
def get_my_monthly_notes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notes = db.query(MonthlyNote).filter(
        MonthlyNote.user_id == current_user.id
    ).order_by(MonthlyNote.year.desc(), MonthlyNote.month.desc()).all()

    return [
        MonthlyNoteResponse(
            id=str(n.id),
            user_id=str(n.user_id),
            year=n.year,
            month=n.month,
            note=n.note,
            created_at=n.created_at,
            updated_at=n.updated_at
        )
        for n in notes
    ]


@router.get("/admin/all")
def get_all_monthly_notes_admin(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    query = db.query(MonthlyNote, User).join(User, MonthlyNote.user_id == User.id)

    if year:
        query = query.filter(MonthlyNote.year == year)
    if month:
        query = query.filter(MonthlyNote.month == month)

    results = query.order_by(MonthlyNote.year.desc(), MonthlyNote.month.desc(), User.name.asc()).all()

    output = []
    for note, user in results:
        output.append({
            "id": str(note.id),
            "user_id": str(user.id),
            "employee_id": user.employee_id,
            "employee_name": user.name,
            "employee_email": user.email,
            "year": note.year,
            "month": note.month,
            "month_name": calendar.month_name[note.month],
            "note": note.note,
            "created_at": note.created_at,
            "updated_at": note.updated_at
        })

    return output
