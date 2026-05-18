from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import date

from app.utils.timezone import today_ist

from app.core.database import get_db
from app.core.security import get_current_user, require_admin_or_superadmin

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

    today = today_ist()

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


@router.get("/employee-stats")
def get_employee_stats(
    user_id: str = None,
    year: int = None,
    month: int = None,
    query_date: date = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Authorize
    target_user_id = current_user.id
    if user_id:
        if current_user.role not in ["admin", "superadmin"] and user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to view other employee stats")
        target_user_id = user_id
        
    # Get user object
    user = db.query(User).filter(User.id == target_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    # If no year or month, use current date's
    today = today_ist()
    q_year = year or today.year
    q_month = month or today.month

    # 2. Yearly calculations
    yearly_logs = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == target_user_id,
        extract("year", AttendanceLog.date) == q_year
    ).all()

    yearly_hours = sum(log.total_hours or 0.0 for log in yearly_logs)
    yearly_worked_days = len([log for log in yearly_logs if log.day_status in ["present", "full_day", "half_day", "holiday_work"]])

    # 3. Monthly calculations
    monthly_logs = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == target_user_id,
        extract("year", AttendanceLog.date) == q_year,
        extract("month", AttendanceLog.date) == q_month
    ).all()

    monthly_hours = sum(log.total_hours or 0.0 for log in monthly_logs)
    monthly_worked_days = len([log for log in monthly_logs if log.day_status in ["present", "full_day", "half_day", "holiday_work"]])
    
    # Breakdown of statuses in month
    breakdown = {
        "full_day": len([log for log in monthly_logs if log.day_status == "full_day"]),
        "half_day": len([log for log in monthly_logs if log.day_status == "half_day"]),
        "holiday_work": len([log for log in monthly_logs if log.day_status == "holiday_work"]),
        "comp_off_leave": len([log for log in monthly_logs if log.day_status == "comp_off_leave"]),
        "present": len([log for log in monthly_logs if log.day_status == "present"])
    }

    # 4. Single day detail (if queried)
    single_day_log = None
    if query_date:
        log = db.query(AttendanceLog).filter(
            AttendanceLog.user_id == target_user_id,
            AttendanceLog.date == query_date
        ).first()
        if log:
            single_day_log = {
                "id": str(log.id),
                "date": log.date,
                "checkin_time": log.checkin_time,
                "checkout_time": log.checkout_time,
                "total_hours": log.total_hours,
                "checkin_status": log.checkin_status,
                "checkout_status": log.checkout_status,
                "day_status": log.day_status,
                "checkin_note": log.checkin_note,
                "checkout_note": log.checkout_note,
                "checkin_photo_url": log.checkin_photo_url,
                "checkout_photo_url": log.checkout_photo_url
            }

    return {
        "employee_name": user.name,
        "employee_id": user.employee_id,
        "query_year": q_year,
        "query_month": q_month,
        "yearly_stats": {
            "total_hours": round(yearly_hours, 2),
            "worked_days": yearly_worked_days
        },
        "monthly_stats": {
            "total_hours": round(monthly_hours, 2),
            "worked_days": monthly_worked_days,
            "breakdown": breakdown
        },
        "single_day_detail": single_day_log
    }