from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime, date
import pandas as pd
import os
from typing import Optional
from sqlalchemy import extract

from app.core.database import get_db
from app.core.security import require_admin_or_superadmin
from app.models.user import User
from app.models.attendance import AttendanceLog
from app.models.company import Location
from app.services.gps_service import calculate_distance_meters

router = APIRouter(
    prefix="/export",
    tags=["Export"]
)


@router.get("/attendance/xlsx")
def export_attendance_excel(
    query_date: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    employee_id: Optional[str] = Query(None),
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    query = db.query(
        AttendanceLog,
        User
    ).join(
        User,
        AttendanceLog.user_id == User.id
    )

    if query_date:
        try:
            parsed_date = datetime.strptime(query_date, "%Y-%m-%d").date()
            query = query.filter(AttendanceLog.date == parsed_date)
        except ValueError:
            pass
    elif year and month:
        query = query.filter(
            extract('year', AttendanceLog.date) == year,
            extract('month', AttendanceLog.date) == month
        )
    elif year:
        query = query.filter(extract('year', AttendanceLog.date) == year)

    if employee_id:
        query = query.filter(
            (User.employee_id == employee_id) | (User.id == employee_id)
        )

    records = query.order_by(
        AttendanceLog.date.desc(),
        AttendanceLog.checkin_time.desc()
    ).all()

    locations = db.query(Location).all()
    data = []

    for attendance, user in records:
        matched_location = None
        if attendance.checkin_lat is not None and attendance.checkin_lng is not None:
            # Look up matching location name by coordinate distance
            for loc in locations:
                dist = calculate_distance_meters(
                    attendance.checkin_lat,
                    attendance.checkin_lng,
                    loc.latitude,
                    loc.longitude
                )
                if dist <= loc.radius_meters + 10:  # 10m GPS offset margin
                    matched_location = loc.name
                    break
            
            # Fallback to closest zone name if none matched geofence exactly
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

        data.append({
            "Employee ID": user.employee_id,
            "Employee Name": user.name,
            "Email": user.email,
            "Date": attendance.date,
            "Check-in Time": attendance.checkin_time,
            "Check-out Time": attendance.checkout_time,
            "Check-in Status": attendance.checkin_status,
            "Check-out Status": attendance.checkout_status,
            "Total Hours": attendance.total_hours,
            "Day Status": attendance.day_status,
            "Location Zone": matched_location or "Remote",
            "Check-in Latitude": attendance.checkin_lat,
            "Check-in Longitude": attendance.checkin_lng,
            "Check-out Latitude": attendance.checkout_lat,
            "Check-out Longitude": attendance.checkout_lng
        })

    df = pd.DataFrame(data)

    os.makedirs("exports", exist_ok=True)

    file_name = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    file_path = os.path.join("exports", file_name)

    # Prevent empty list exception inside pandas Excel writer
    if df.empty:
        df = pd.DataFrame(columns=[
            "Employee ID", "Employee Name", "Email", "Date", "Check-in Time", "Check-out Time",
            "Check-in Status", "Check-out Status", "Total Hours", "Day Status", "Location Zone",
            "Check-in Latitude", "Check-in Longitude", "Check-out Latitude", "Check-out Longitude"
        ])

    with pd.ExcelWriter(file_path, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Attendance Report")

        worksheet = writer.sheets["Attendance Report"]

        for column_cells in worksheet.columns:
            max_length = 0
            column_letter = column_cells[0].column_letter

            for cell in column_cells:
                if cell.value:
                    max_length = max(max_length, len(str(cell.value)))

            worksheet.column_dimensions[column_letter].width = max_length + 3

    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )