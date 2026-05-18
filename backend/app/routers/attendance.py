from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import date
import os

from app.utils.timezone import now_ist, today_ist

from app.core.database import get_db
from app.core.security import get_current_user, require_admin_or_superadmin
from app.models.user import User
from app.models.attendance import AttendanceLog
from app.models.company import Location
from app.models.holiday import Holiday
from app.models.working_days import WorkingDaysConfig
from app.models.comp_off import CompOffBalance, CompOffTransaction
from app.models.notification import FaceVerificationFailure
from app.schemas.attendance import AttendanceResponse, CheckInRequest, CheckOutRequest, OverrideRequest
from app.services.aws_rekognition_service import AwsRekognitionError, compare_faces
from app.services.face_storage_service import FaceStorageError, get_face_path, save_attendance_face, BACKEND_ROOT
from app.services.gps_service import calculate_distance_meters

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"]
)


def verify_attendance_face(current_user: User, photo: str, action_type: str, db: Session):
    if not photo:
        raise HTTPException(
            status_code=400,
            detail="Face photo is required. Please allow camera access and capture a selfie."
        )

    try:
        enrolled_face_path = get_face_path(current_user.face_image_url)
        result = compare_faces(enrolled_face_path, photo)
    except FaceStorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except AwsRekognitionError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Face verification failed: {exc}"
        )

    if not result["is_match"]:
        failure_photo_url = None
        try:
            failure_photo_url = save_attendance_face(photo, current_user.id, f"{action_type}_failed")
        except FaceStorageError:
            pass

        db.add(FaceVerificationFailure(
            user_id=current_user.id,
            photo_url=failure_photo_url,
            similarity_score=str(result["similarity"]),
            action_type=action_type
        ))
        db.commit()

        raise HTTPException(
            status_code=403,
            detail="Face not match. Please try again."
        )

    try:
        photo_url = save_attendance_face(photo, current_user.id, action_type)
    except FaceStorageError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "photo_url": photo_url,
        "score": result["similarity"]
    }

@router.post("/checkin")
def checkin(
    location_data: CheckInRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.face_enrolled:
        raise HTTPException(
            status_code=403,
            detail="Face enrollment required before check-in"
        )
    
    active_locations = db.query(Location).filter(
        Location.is_active == True
    ).all()

    if not active_locations:
        raise HTTPException(
            status_code=400,
            detail="No active office location configured"
        )

    location_valid = False

    for office in active_locations:
        distance = calculate_distance_meters(
            location_data.latitude,
            location_data.longitude,
            office.latitude,
            office.longitude
        )

        if distance <= office.radius_meters:
            location_valid = True
            break

    if not location_valid:
        raise HTTPException(
            status_code=403,
            detail="You are outside the allowed check-in zone"
        )

    today = today_ist()

    existing_attendance = db.query(
        AttendanceLog
    ).filter(
        AttendanceLog.user_id == current_user.id,
        AttendanceLog.date == today
    ).first()

    if existing_attendance:
        raise HTTPException(
            status_code=400,
            detail="Already checked in today"
        )

    face_result = verify_attendance_face(
        current_user=current_user,
        photo=location_data.photo,
        action_type="checkin",
        db=db
    )

    now = now_ist()   # IST-aware datetime
    checkin_status = "on_time"

    if now.hour < 8:
        checkin_status = "early_bird"
    elif now.hour >= 11:
        checkin_status = "late"

    attendance = AttendanceLog(
        user_id=current_user.id,
        date=today,
        checkin_time=now,
        checkin_lat=location_data.latitude,
        checkin_lng=location_data.longitude,
        checkin_photo_url=face_result["photo_url"],
        checkin_note=location_data.note,
        checkin_face_score=face_result["score"],
        checkin_status=checkin_status,
        day_status="present"
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return {
        "message": "Check-in successful",
        "checkin_time": now,
        "status": checkin_status,
        "face_score": face_result["score"]
    }


@router.post("/checkout")
def checkout(
    location_data: CheckOutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.face_enrolled:
        raise HTTPException(
            status_code=403,
            detail="Face enrollment required before checkout"
        )
    
    active_locations = db.query(Location).filter(Location.is_active == True).all()

    if not active_locations:
        raise HTTPException(
            status_code=400,
            detail="No active office location configured"
        )

    location_valid = False

    for office in active_locations:
        distance = calculate_distance_meters(
            location_data.latitude,
            location_data.longitude,
            office.latitude,
            office.longitude
        )

        if distance <= office.radius_meters:
            location_valid = True
            break

    if not location_valid:
        raise HTTPException(
            status_code=403,
            detail="You are outside the allowed checkout zone"
        )
        
    today = today_ist()

    attendance = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == current_user.id,
        AttendanceLog.date == today
    ).first()

    if not attendance:
        raise HTTPException(
            status_code=400,
            detail="No check-in found today"
        )

    if attendance.checkout_time:
        raise HTTPException(
            status_code=400,
            detail="Already checked out today"
        )

    face_result = verify_attendance_face(
        current_user=current_user,
        photo=location_data.photo,
        action_type="checkout",
        db=db
    )

    now = now_ist()   # IST-aware datetime

    attendance.checkout_time = now
    attendance.checkout_lat = location_data.latitude
    attendance.checkout_lng = location_data.longitude
    attendance.checkout_photo_url = face_result["photo_url"]
    attendance.checkout_note = location_data.note
    attendance.checkout_face_score = face_result["score"]

    total_seconds = (now - attendance.checkin_time).total_seconds()
    total_hours = round(total_seconds / 3600, 2)
    attendance.total_hours = total_hours

    # PHASE 3: COMP-OFF LOGIC
    holiday = db.query(Holiday).filter(Holiday.date == today).first()
    
    working_days = db.query(WorkingDaysConfig).first()
    is_working_day = True
    if working_days:
        day_of_week = today.weekday()
        days_map = [
            working_days.monday, working_days.tuesday, working_days.wednesday,
            working_days.thursday, working_days.friday, working_days.saturday,
            working_days.sunday
        ]
        is_working_day = days_map[day_of_week]

    is_sunday = today.weekday() == 6
    is_special_day = bool(holiday) or not is_working_day or is_sunday

    if is_special_day:
        attendance.day_status = "holiday_work"
        
        balance = db.query(CompOffBalance).filter(CompOffBalance.user_id == current_user.id).first()
        if not balance:
            balance = CompOffBalance(user_id=current_user.id)
            db.add(balance)
        
        amount_earned = 1.0 if total_hours >= 9.0 else 0.5
        balance.days_earned = float(balance.days_earned or 0) + amount_earned
        
        txn = CompOffTransaction(
            user_id=current_user.id,
            type="earned",
            amount=amount_earned,
            reference_date=today,
            notes=f"Worked {'full' if total_hours >= 9.0 else 'half'} day ({total_hours} hrs) on a holiday/weekend"
        )
        db.add(txn)
    else:
        if total_hours >= 9.0:
            attendance.day_status = "full_day"
        else:
            attendance.day_status = "half_day"

    # Status based on shift completion
    if total_hours < 9.0:
        attendance.checkout_status = "early_leave"
    else:
        attendance.checkout_status = "on_time_out"

    db.commit()

    return {
        "message": "Checkout successful",
        "checkout_time": now,
        "total_hours": total_hours,
        "day_status": attendance.day_status,
        "face_score": face_result["score"]
    }


@router.get("/today")
def today_attendance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = today_ist()
    attendance = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == current_user.id,
        AttendanceLog.date == today
    ).first()

    if not attendance:
        return {"message": "No attendance today"}

    return attendance


@router.get(
    "/history",
    response_model=list[AttendanceResponse]
)
def attendance_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    records = db.query(AttendanceLog).filter(
        AttendanceLog.user_id == current_user.id
    ).order_by(
        AttendanceLog.date.desc()
    ).all()

    return records


@router.get("/all")
def all_attendance_records(
    date_filter: date = None,
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    query_date = date_filter or today_ist()
    
    records = db.query(
        AttendanceLog,
        User
    ).join(
        User,
        AttendanceLog.user_id == User.id
    ).filter(
        AttendanceLog.date == query_date
    ).order_by(
        AttendanceLog.checkin_time.desc()
    ).all()

    locations = db.query(Location).all()

    response_data = []
    for attendance, user in records:
        matched_location = None
        if attendance.checkin_lat is not None and attendance.checkin_lng is not None:
            # Look up matching location by coordinate distance
            for loc in locations:
                dist = calculate_distance_meters(
                    attendance.checkin_lat,
                    attendance.checkin_lng,
                    loc.latitude,
                    loc.longitude
                )
                if dist <= loc.radius_meters + 10:  # 10m buffer for GPS margin
                    matched_location = loc.name
                    break
            
            # Fallback to closest zone if none was within exact geofence radius
            if not matched_location and locations:
                closest_loc = min(
                    locations,
                    key=lambda l: calculate_distance_meters(
                        attendance.checkin_lat,
                        attendance.checkin_lng,
                        l.latitude,
                        l.longitude
                    )
                )
                matched_location = closest_loc.name

        response_data.append({
            "id": attendance.id,
            "user_id": attendance.user_id,
            "employee_id": user.employee_id,
            "employee_name": user.name,
            "date": attendance.date,
            "checkin_time": attendance.checkin_time,
            "checkout_time": attendance.checkout_time,
            "total_hours": attendance.total_hours,
            "checkin_status": attendance.checkin_status,
            "checkout_status": attendance.checkout_status,
            "day_status": attendance.day_status,
            "is_anomaly_flagged": attendance.is_anomaly_flagged,
            "is_manual_override": attendance.is_manual_override,
            "checkin_photo_url": attendance.checkin_photo_url,
            "checkout_photo_url": attendance.checkout_photo_url,
            "checkin_lat": attendance.checkin_lat,
            "checkin_lng": attendance.checkin_lng,
            "location": matched_location or "Remote"
        })

    return response_data

@router.put("/{attendance_id}/override")
def override_attendance(
    attendance_id: str,
    data: OverrideRequest,
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    attendance = db.query(AttendanceLog).filter(AttendanceLog.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    attendance.day_status = data.day_status
    attendance.is_manual_override = True
    attendance.override_by = current_user.id
    attendance.override_at = now_ist()
    attendance.override_note = data.admin_note

    db.commit()
    db.refresh(attendance)

    return {"message": "Attendance overriden successfully"}

@router.get("/photo")
def get_attendance_photo(
    path: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Try resolving path relative to backend root if it is relative or doesn't exist
    if not os.path.exists(path):
        alt_path = os.path.join(BACKEND_ROOT, path)
        if os.path.exists(alt_path):
            path = alt_path
        else:
            raise HTTPException(status_code=404, detail="Photo file not found")
            
    # Check authorization: admins can see all, employees can only see their own
    user_dir_part = f"/attendance/{current_user.id}/"
    user_dir_part_win = f"\\attendance\\{current_user.id}\\"
    
    if current_user.role not in ["admin", "superadmin"]:
        if user_dir_part not in path and user_dir_part_win not in path:
            raise HTTPException(status_code=403, detail="Not authorized to view this photo")

    return FileResponse(path)
