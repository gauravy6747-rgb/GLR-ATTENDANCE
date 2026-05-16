# Neon Database Setup

Use Neon as the hosted PostgreSQL database for GLR Attendance.

## 1. Create Neon Project

1. Go to https://console.neon.tech
2. Create a new project.
3. Choose the nearest region to your users.
4. Open **Connection Details**.
5. Copy the pooled or direct PostgreSQL connection string.

Use a connection string with SSL:

```text
postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

## 2. Local Backend

Create `backend/.env` from `backend/.env.example` and set:

```text
DATABASE_URL=your_neon_connection_string
```

Then run:

```powershell
cd C:\Gaurav\attendance-system\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

The app currently calls `Base.metadata.create_all(...)` on startup, so tables are created automatically.

## 3. EC2 Backend

Set the same `DATABASE_URL` in your EC2 `.env` file.

For production HTTPS with Vercel frontend, also set:

```text
FRONTEND_ORIGINS=https://frontend-beryl-rho-37.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none
```

## 4. Keep Photos Out Of Neon

Do not store face photos as database blobs or base64 rows. Store only paths/URLs in Postgres.

For testing, `FACE_DATA_DIR=face_data` is fine. For production, use EC2 disk, S3, or Cloudflare R2.
