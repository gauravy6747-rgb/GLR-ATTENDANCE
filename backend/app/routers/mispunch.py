from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime, date

from app.utils.timezone import now_ist, today_ist
from app.core.database import get_db
from app.core.security import get_current_user, require_admin_or_superadmin
from app.models.user import User
from app.models.attendance import AttendanceLog
from app.models.mispunch import MisPunchRequest
from app.models.holiday import Holiday
from app.models.working_days import WorkingDaysConfig
from app.models.comp_off import CompOffBalance, CompOffTransaction
from app.schemas.mispunch import (
    MisPunchRequestCreate,
    MisPunchActionRequest,
    MisPunchRequestResponse
)
from app.routers.attendance import is_user_expected_working_day

router = APIRouter(
    prefix="/mispunch",
    tags=["MisPunch Regularization"]
)


@router.post("/request", response_model=MisPunchRequestResponse)
def request_mispunch(
    data: MisPunchRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.date > today_ist():
        raise HTTPException(
            status_code=400,
            detail="Cannot submit a mispunch request for a future date."
        )

    # Check if a pending mispunch request already exists for this date
    existing_pending = db.query(MisPunchRequest).filter(
        MisPunchRequest.user_id == current_user.id,
        MisPunchRequest.date == data.date,
        MisPunchRequest.status == "pending"
    ).first()

    if existing_pending:
        raise HTTPException(
            status_code=400,
            detail="A pending mispunch request already exists for this date."
        )

    if data.request_type not in ["checkout_only", "checkin_only", "both"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid request type. Must be 'checkout_only', 'checkin_only', or 'both'."
        )

    if data.request_type == "checkout_only" and not data.requested_checkout_time:
        raise HTTPException(
            status_code=400,
            detail="Requested checkout time is required for checkout_only request."
        )

    if data.request_type == "checkin_only" and not data.requested_checkin_time:
        raise HTTPException(
            status_code=400,
            detail="Requested checkin time is required for checkin_only request."
        )

    if data.request_type == "both":
        if not data.requested_checkin_time or not data.requested_checkout_time:
            raise HTTPException(
                status_code=400,
                detail="Both checkin and checkout times are required for 'both' request type."
            )
        if data.requested_checkout_time <= data.requested_checkin_time:
            raise HTTPException(
                status_code=400,
                detail="Requested checkout time must be after checkin time."
            )

    mispunch_req = MisPunchRequest(
        user_id=current_user.id,
        date=data.date,
        request_type=data.request_type,
        requested_checkin_time=data.requested_checkin_time,
        requested_checkout_time=data.requested_checkout_time,
        reason=data.reason,
        status="pending"
    )

    db.add(mispunch_req)
    db.commit()
    db.refresh(mispunch_req)

    return {
        "id": mispunch_req.id,
        "user_id": mispunch_req.user_id,
        "employee_name": current_user.name,
        "employee_code": current_user.employee_id,
        "date": mispunch_req.date,
        "request_type": mispunch_req.request_type,
        "requested_checkin_time": mispunch_req.requested_checkin_time,
        "requested_checkout_time": mispunch_req.requested_checkout_time,
        "reason": mispunch_req.reason,
        "status": mispunch_req.status,
        "created_at": mispunch_req.created_at,
        "action_by_name": None,
        "action_at": None,
        "admin_notes": None
    }


@router.get("/my-requests", response_model=list[MisPunchRequestResponse])
def get_my_mispunch_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    requests = db.query(MisPunchRequest).filter(
        MisPunchRequest.user_id == current_user.id
    ).order_by(MisPunchRequest.created_at.desc()).all()

    # Pre-fetch action by users if any
    action_user_ids = {r.action_by for r in requests if r.action_by}
    action_users = {}
    if action_user_ids:
        users = db.query(User).filter(User.id.in_(action_user_ids)).all()
        action_users = {u.id: u.name for u in users}

    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "employee_name": current_user.name,
            "employee_code": current_user.employee_id,
            "date": r.date,
            "request_type": r.request_type,
            "requested_checkin_time": r.requested_checkin_time,
            "requested_checkout_time": r.requested_checkout_time,
            "reason": r.reason,
            "status": r.status,
            "created_at": r.created_at,
            "action_by_name": action_users.get(r.action_by),
            "action_at": r.action_at,
            "admin_notes": r.admin_notes
        }
        for r in requests
    ]


@router.get("/all", response_model=list[MisPunchRequestResponse])
def get_all_mispunch_requests(
    admin_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    results = db.query(MisPunchRequest, User).join(
        User, MisPunchRequest.user_id == User.id
    ).order_by(MisPunchRequest.created_at.desc()).all()

    action_user_ids = {r.MisPunchRequest.action_by for r in results if r.MisPunchRequest.action_by}
    action_users = {}
    if action_user_ids:
        users = db.query(User).filter(User.id.in_(action_user_ids)).all()
        action_users = {u.id: u.name for u in users}

    return [
        {
            "id": r.MisPunchRequest.id,
            "user_id": r.MisPunchRequest.user_id,
            "employee_name": r.User.name,
            "employee_code": r.User.employee_id,
            "date": r.MisPunchRequest.date,
            "request_type": r.MisPunchRequest.request_type,
            "requested_checkin_time": r.MisPunchRequest.requested_checkin_time,
            "requested_checkout_time": r.MisPunchRequest.requested_checkout_time,
            "reason": r.MisPunchRequest.reason,
            "status": r.MisPunchRequest.status,
            "created_at": r.MisPunchRequest.created_at,
            "action_by_name": action_users.get(r.MisPunchRequest.action_by),
            "action_at": r.MisPunchRequest.action_at,
            "admin_notes": r.MisPunchRequest.admin_notes
        }
        for r in results
    ]


@router.post("/{request_id}/action", response_model=MisPunchRequestResponse)
def action_mispunch_request(
    request_id: UUID,
    data: MisPunchActionRequest,
    admin_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    mispunch_req = db.query(MisPunchRequest).filter(
        MisPunchRequest.id == request_id
    ).first()

    if not mispunch_req:
        raise HTTPException(status_code=404, detail="Mispunch request not found.")

    if mispunch_req.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Only pending mispunch requests can be approved or rejected."
        )

    if data.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'approve' or 'reject'.")

    target_user = db.query(User).filter(User.id == mispunch_req.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found.")

    if data.action == "reject":
        mispunch_req.status = "rejected"
        mispunch_req.action_by = admin_user.id
        mispunch_req.action_at = now_ist()
        mispunch_req.admin_notes = data.notes
        db.commit()
        db.refresh(mispunch_req)

        return {
            "id": mispunch_req.id,
            "user_id": mispunch_req.user_id,
            "employee_name": target_user.name,
            "employee_code": target_user.employee_id,
            "date": mispunch_req.date,
            "request_type": mispunch_req.request_type,
            "requested_checkin_time": mispunch_req.requested_checkin_time,
            "requested_checkout_time": mispunch_req.requested_checkout_time,
            "reason": mispunch_req.reason,
            "status": mispunch_req.status,
            "created_at": mispunch_req.created_at,
            "action_by_name": admin_user.name,
            "action_at": mispunch_req.action_at,
            "admin_notes": mispunch_req.admin_notes
        }

    # --- Approval Action: Update / Create Attendance Log ---
    attendance = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == mispunch_req.user_id,
        AttendanceLog.date == mispunch_req.date
    ).first()

    if not attendance:
        attendance = AttendanceLog(
            user_id=mispunch_req.user_id,
            date=mispunch_req.date
        )
        db.add(attendance)
        db.flush()

    # Update checkin/checkout based on request_type
    if mispunch_req.requested_checkin_time:
        attendance.checkin_time = mispunch_req.requested_checkin_time

    if mispunch_req.requested_checkout_time:
        attendance.checkout_time = mispunch_req.requested_checkout_time

    # Calculate status and hours
    target_policy = target_user.saturday_policy or "alt_sat_holiday"
    today_date = mispunch_req.date

    holiday = db.query(Holiday).filter(Holiday.date == today_date).first()
    working_days = db.query(WorkingDaysConfig).first()
    days_map = [True, True, True, True, True, True, False]
    if working_days:
        days_map = [
            working_days.monday, working_days.tuesday, working_days.wednesday,
            working_days.thursday, working_days.friday, working_days.saturday,
            working_days.sunday
        ]
    is_expected_work = is_user_expected_working_day(
        today_date,
        target_policy,
        {holiday.date} if holiday else set(),
        days_map
    )
    is_special_day = not is_expected_work
    expected_full_hours = 6.5 if (today_date.weekday() == 5 and target_policy == "all_sat_half_day") else 8.5

    if attendance.checkin_time:
        checkin_hour = attendance.checkin_time.hour
        if checkin_hour < 7:
            attendance.checkin_status = "early_bird"
        elif checkin_hour < 11:
            attendance.checkin_status = "on_time"
        else:
            attendance.checkin_status = "late"
    else:
        attendance.checkin_status = None

    if attendance.checkin_time and attendance.checkout_time:
        checkout_naive = attendance.checkout_time.replace(tzinfo=None)
        checkin_naive = attendance.checkin_time.replace(tzinfo=None)
        total_seconds = (checkout_naive - checkin_naive).total_seconds()
        total_hours = max(0.0, round(total_seconds / 3600, 2))
        attendance.total_hours = total_hours

        if total_hours >= expected_full_hours:
            attendance.checkout_status = "on_time_out"
        else:
            attendance.checkout_status = "early_leave"

        if is_special_day:
            attendance.day_status = "holiday_work"
        else:
            if total_hours >= expected_full_hours:
                attendance.day_status = "full_day"
            elif total_hours >= 4.5:
                attendance.day_status = "half_day"
            else:
                attendance.day_status = "absent"
    else:
        # Single punch available
        if attendance.checkin_time:
            attendance.day_status = "half_day"
        else:
            attendance.day_status = "absent"
        attendance.total_hours = 0.0

    attendance.is_manual_override = True
    attendance.override_by = admin_user.id
    attendance.override_at = now_ist()
    attendance.override_note = f"Approved Mispunch Request: {mispunch_req.reason}"

    # Sync Comp-off if worked on holiday
    txn = db.query(CompOffTransaction).filter(
        CompOffTransaction.user_id == attendance.user_id,
        CompOffTransaction.reference_date == today_date,
        CompOffTransaction.type == "earned"
    ).first()

    if attendance.day_status == "holiday_work" and attendance.checkin_time:
        amount_earned = 1.0 if attendance.total_hours >= expected_full_hours else (0.5 if attendance.total_hours >= 4.5 else 0.0)
        balance = db.query(CompOffBalance).filter(CompOffBalance.user_id == attendance.user_id).first()
        if not balance:
            balance = CompOffBalance(user_id=attendance.user_id)
            db.add(balance)
            db.flush()

        old_amount = float(txn.amount) if txn else 0.0
        diff = amount_earned - old_amount
        balance.days_earned = float(balance.days_earned or 0.0) + diff

        if amount_earned > 0.0:
            if txn:
                txn.amount = amount_earned
                txn.notes = f"Approved Mispunch: Worked {'full' if attendance.total_hours >= expected_full_hours else 'half'} day on holiday/weekend"
                txn.approved_by = admin_user.id
            else:
                txn = CompOffTransaction(
                    user_id=attendance.user_id,
                    type="earned",
                    amount=amount_earned,
                    reference_date=today_date,
                    notes=f"Approved Mispunch: Worked {'full' if attendance.total_hours >= expected_full_hours else 'half'} day on holiday/weekend",
                    approved_by=admin_user.id
                )
                db.add(txn)
        else:
            if txn:
                db.delete(txn)

    mispunch_req.status = "approved"
    mispunch_req.action_by = admin_user.id
    mispunch_req.action_at = now_ist()
    mispunch_req.admin_notes = data.notes

    db.commit()
    db.refresh(mispunch_req)

    return {
        "id": mispunch_req.id,
        "user_id": mispunch_req.user_id,
        "employee_name": target_user.name,
        "employee_code": target_user.employee_id,
        "date": mispunch_req.date,
        "request_type": mispunch_req.request_type,
        "requested_checkin_time": mispunch_req.requested_checkin_time,
        "requested_checkout_time": mispunch_req.requested_checkout_time,
        "reason": mispunch_req.reason,
        "status": mispunch_req.status,
        "created_at": mispunch_req.created_at,
        "action_by_name": admin_user.name,
        "action_at": mispunch_req.action_at,
        "admin_notes": mispunch_req.admin_notes
    }
