from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import extract
from datetime import date, datetime
import calendar
from typing import Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user, require_admin_or_superadmin
from app.models.user import User
from app.models.attendance import AttendanceLog
from app.models.holiday import Holiday
from app.models.working_days import WorkingDaysConfig

router = APIRouter(
    prefix="/payroll",
    tags=["Payroll"]
)

class SalaryUpdateSchema(BaseModel):
    user_id: str
    base_salary: float

@router.get("/summary")
def get_payroll_summary(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    today = datetime.now()
    q_year = year or today.year
    q_month = month or today.month

    # Get working days config
    working_days_cfg = db.query(WorkingDaysConfig).first()
    days_map = [True, True, True, True, True, True, False] # default: Mon-Sat working, Sun holiday
    if working_days_cfg:
        days_map = [
            working_days_cfg.monday, working_days_cfg.tuesday, working_days_cfg.wednesday,
            working_days_cfg.thursday, working_days_cfg.friday, working_days_cfg.saturday,
            working_days_cfg.sunday
        ]

    # Get holidays in this month
    month_holidays = db.query(Holiday).filter(
        extract("year", Holiday.date) == q_year,
        extract("month", Holiday.date) == q_month
    ).all()
    holiday_dates = {h.date for h in month_holidays}

    # Count dynamic working days in this month
    num_days = calendar.monthrange(q_year, q_month)[1]
    total_working_days = 0
    for day_num in range(1, num_days + 1):
        d = date(q_year, q_month, day_num)
        is_sun = d.weekday() == 6
        is_hol = d in holiday_dates
        is_work_configured = days_map[d.weekday()]

        if is_work_configured and not is_sun and not is_hol:
            total_working_days += 1

    # Fetch all employees
    employees = db.query(User).filter(User.role == "employee").order_by(User.name).all()

    payroll_records = []
    for emp in employees:
        # Fetch logs for this user in this month
        logs = db.query(AttendanceLog).filter(
            AttendanceLog.user_id == emp.id,
            extract("year", AttendanceLog.date) == q_year,
            extract("month", AttendanceLog.date) == q_month
        ).all()

        # Calculate worked days: full_day/present/holiday_work count as 1.0, half_day count as 0.5
        worked_days = 0.0
        paid_leaves = 0.0
        for log in logs:
            if log.day_status in ["full_day", "present", "holiday_work"]:
                worked_days += 1.0
            elif log.day_status == "half_day":
                worked_days += 0.5
            elif log.day_status == "comp_off_leave":
                paid_leaves += 1.0

        total_paid_days = worked_days + paid_leaves
        base_salary = emp.base_salary or 0.0

        calculated_salary = 0.0
        if total_working_days > 0 and base_salary > 0:
            calculated_salary = (base_salary / total_working_days) * total_paid_days

        payroll_records.append({
            "user_id": str(emp.id),
            "employee_id": emp.employee_id,
            "name": emp.name,
            "email": emp.email,
            "base_salary": base_salary,
            "total_working_days": total_working_days,
            "worked_days": worked_days,
            "paid_leaves": paid_leaves,
            "total_paid_days": total_paid_days,
            "calculated_salary": round(calculated_salary, 2)
        })

    return {
        "year": q_year,
        "month": q_month,
        "total_working_days": total_working_days,
        "records": payroll_records
    }

@router.post("/salary")
def update_employee_salary(
    payload: SalaryUpdateSchema,
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    emp = db.query(User).filter(User.id == payload.user_id).first()
    if not emp:
        # Fallback to employee_id
        emp = db.query(User).filter(User.employee_id == payload.user_id).first()

    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp.base_salary = payload.base_salary
    db.commit()

    return {"message": "Salary updated successfully", "base_salary": emp.base_salary}


@router.get("/my-slip")
def get_my_pay_slip(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.now()
    q_year = year or today.year
    q_month = month or today.month

    # Get working days config
    working_days_cfg = db.query(WorkingDaysConfig).first()
    days_map = [True, True, True, True, True, True, False] # default: Mon-Sat working, Sun holiday
    if working_days_cfg:
        days_map = [
            working_days_cfg.monday, working_days_cfg.tuesday, working_days_cfg.wednesday,
            working_days_cfg.thursday, working_days_cfg.friday, working_days_cfg.saturday,
            working_days_cfg.sunday
        ]

    # Get holidays in this month
    month_holidays = db.query(Holiday).filter(
        extract("year", Holiday.date) == q_year,
        extract("month", Holiday.date) == q_month
    ).all()
    holiday_dates = {h.date for h in month_holidays}

    # Count dynamic working days in this month
    num_days = calendar.monthrange(q_year, q_month)[1]
    total_working_days = 0
    for day_num in range(1, num_days + 1):
        d = date(q_year, q_month, day_num)
        is_sun = d.weekday() == 6
        is_hol = d in holiday_dates
        is_work_configured = days_map[d.weekday()]

        if is_work_configured and not is_sun and not is_hol:
            total_working_days += 1

    # Fetch logs for this user in this month
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == current_user.id,
        extract("year", AttendanceLog.date) == q_year,
        extract("month", AttendanceLog.date) == q_month
    ).all()

    worked_days = 0.0
    paid_leaves = 0.0
    for log in logs:
        if log.day_status in ["full_day", "present", "holiday_work"]:
            worked_days += 1.0
        elif log.day_status == "half_day":
            worked_days += 0.5
        elif log.day_status == "comp_off_leave":
            paid_leaves += 1.0

    total_paid_days = worked_days + paid_leaves
    base_salary = current_user.base_salary or 0.0

    calculated_salary = 0.0
    if total_working_days > 0 and base_salary > 0:
        calculated_salary = (base_salary / total_working_days) * total_paid_days

    return {
        "year": q_year,
        "month": q_month,
        "base_salary": base_salary,
        "total_working_days": total_working_days,
        "worked_days": worked_days,
        "paid_leaves": paid_leaves,
        "total_paid_days": total_paid_days,
        "calculated_salary": round(calculated_salary, 2)
    }
