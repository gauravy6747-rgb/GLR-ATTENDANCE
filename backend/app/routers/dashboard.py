from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date

from app.core.database import get_db
from app.core.security import require_admin_or_superadmin

from app.models.user import User
from app.models.attendance import AttendanceLog

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/admin-stats")
def admin_dashboard_stats(
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):

    today = date.today()

    total_employees = db.query(User).filter(
        User.role == "employee"
    ).count()

    today_present = db.query(AttendanceLog).filter(
        AttendanceLog.date == today
    ).count()

    today_absent = total_employees - today_present

    full_day_count = db.query(AttendanceLog).filter(
        AttendanceLog.date == today,
        AttendanceLog.day_status == "full_day"
    ).count()

    half_day_count = db.query(AttendanceLog).filter(
        AttendanceLog.date == today,
        AttendanceLog.day_status == "half_day"
    ).count()

    return {
        "date": today,
        "total_employees": total_employees,
        "today_present": today_present,
        "today_absent": today_absent,
        "full_day_count": full_day_count,
        "half_day_count": half_day_count
    }