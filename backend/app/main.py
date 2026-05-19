from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.core.database import engine, Base

# ── Import ALL models so create_all registers every table ──────────────────
from app.models.user import User  # noqa: F401
from app.models.attendance import AttendanceLog  # noqa: F401
from app.models.company import Company, Location  # noqa: F401
from app.models.holiday import Holiday  # noqa: F401
from app.models.working_days import WorkingDaysConfig  # noqa: F401
from app.models.comp_off import CompOffBalance, CompOffTransaction  # noqa: F401
from app.models.leave import LeaveRequest  # noqa: F401
from app.models.payroll import MonthlySalary  # noqa: F401
from app.models.notification import (  # noqa: F401
    NotificationLog,
    PushSubscription,
    FaceVerificationFailure
)

# ── Create all tables (Already created, bypassed for near-instant startup) ──
# Base.metadata.create_all(bind=engine)

# ── Safe Database Column Migrations (Bypassed for near-instant startup) ─────
# from sqlalchemy import text
# with engine.connect() as conn:
#     try:
#         conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS base_salary FLOAT DEFAULT 0.0;"))
#         conn.commit()
#     except Exception as e:
#         print("Safe migration skipped or error:", e)

# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="GLR Attendance")

# ── Dynamic CORS Middleware ──────────────────────────────────────────────────
from fastapi import Request
from starlette.responses import Response

@app.middleware("http")
async def dynamic_cors_middleware(request: Request, call_next):
    # Handle preflight (OPTIONS) requests
    if request.method == "OPTIONS":
        response = Response(status_code=204)
        origin = request.headers.get("origin")
        if origin:
            if any(dom in origin for dom in ["vercel.app", "taxplanadvisor.in", "glrattendance.com", "localhost", "127.0.0.1"]):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
                response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
        return response

    response = await call_next(request)
    origin = request.headers.get("origin")
    if origin:
        if any(dom in origin for dom in ["vercel.app", "taxplanadvisor.in", "glrattendance.com", "localhost", "127.0.0.1"]):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept"
            # Expose set-cookie header if needed
            response.headers["Access-Control-Expose-Headers"] = "Set-Cookie"
    return response

# ── Routers ─────────────────────────────────────────────────────────────────
from app.routers import auth, employees, attendance, face, location, dashboard, export, company, leave, payroll  # noqa: E402

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(attendance.router)
app.include_router(face.router)
app.include_router(location.router)
app.include_router(export.router)
app.include_router(employees.router)
app.include_router(company.router)
app.include_router(leave.router)
app.include_router(payroll.router)


@app.get("/")
def home():
    return {"message": "GLR Attendance Running"}
