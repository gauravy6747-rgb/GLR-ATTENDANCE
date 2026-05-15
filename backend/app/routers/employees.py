from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.attendance import AttendanceLog
from app.models.comp_off import CompOffBalance, CompOffTransaction
from app.models.leave import LeaveRequest
from app.models.notification import FaceVerificationFailure, NotificationLog, PushSubscription
from app.models.user import User
from app.schemas.employee import (
    EmployeeCreate,
    EmployeeResponse
)
from app.core.security import hash_password, require_admin_or_superadmin

router = APIRouter(
    prefix="/employees",
    tags=["Employees"]
)


@router.post(
    "/",
    response_model=EmployeeResponse
)
def create_employee(
    employee: EmployeeCreate,
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        (User.employee_id == employee.employee_id) |
        (User.email == employee.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Employee ID or email already exists"
        )

    hashed_password = hash_password(
        employee.password
    )

    new_user = User(
        employee_id=employee.employee_id,
        name=employee.name,
        email=employee.email,
        password_hash=hashed_password,
        phone=employee.phone,
        role=employee.role
    )

    try:
        db.add(new_user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Employee ID or email already exists"
        )

    db.refresh(new_user)

    return new_user


@router.get("/", response_model=list[EmployeeResponse])
def get_employees(
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    return db.query(User).all()

@router.delete("/{employee_id}")
def delete_employee(
    employee_id: str,
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == employee_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    db.query(AttendanceLog).filter(AttendanceLog.override_by == user.id).update(
        {AttendanceLog.override_by: None},
        synchronize_session=False
    )
    db.query(LeaveRequest).filter(LeaveRequest.action_by == user.id).update(
        {LeaveRequest.action_by: None},
        synchronize_session=False
    )
    db.query(CompOffTransaction).filter(CompOffTransaction.approved_by == user.id).update(
        {CompOffTransaction.approved_by: None},
        synchronize_session=False
    )

    db.query(FaceVerificationFailure).filter(FaceVerificationFailure.user_id == user.id).delete(synchronize_session=False)
    db.query(PushSubscription).filter(PushSubscription.user_id == user.id).delete(synchronize_session=False)
    db.query(NotificationLog).filter(NotificationLog.user_id == user.id).delete(synchronize_session=False)
    db.query(LeaveRequest).filter(LeaveRequest.user_id == user.id).delete(synchronize_session=False)
    db.query(CompOffTransaction).filter(CompOffTransaction.user_id == user.id).delete(synchronize_session=False)
    db.query(CompOffBalance).filter(CompOffBalance.user_id == user.id).delete(synchronize_session=False)
    db.query(AttendanceLog).filter(AttendanceLog.user_id == user.id).delete(synchronize_session=False)

    db.delete(user)
    db.commit()
    return {"message": "Employee deleted"}
