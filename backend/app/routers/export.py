from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
import pandas as pd
import os

from app.core.database import get_db
from app.core.security import require_admin_or_superadmin
from app.models.user import User
from app.models.attendance import AttendanceLog

router = APIRouter(
    prefix="/export",
    tags=["Export"]
)


@router.get("/attendance/xlsx")
def export_attendance_excel(
    current_user: User = Depends(require_admin_or_superadmin),
    db: Session = Depends(get_db)
):
    records = db.query(
        AttendanceLog,
        User
    ).join(
        User,
        AttendanceLog.user_id == User.id
    ).order_by(
        AttendanceLog.date.desc()
    ).all()

    data = []

    for attendance, user in records:
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
            "Check-in Latitude": attendance.checkin_lat,
            "Check-in Longitude": attendance.checkin_lng,
            "Check-out Latitude": attendance.checkout_lat,
            "Check-out Longitude": attendance.checkout_lng
        })

    df = pd.DataFrame(data)

    os.makedirs("exports", exist_ok=True)

    file_name = f"attendance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    file_path = os.path.join("exports", file_name)

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