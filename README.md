# GLR Attendance

An attendance and HR web app built for our company. Employees check in and out from their phones, verified by **face match** and **GPS location**. Admins manage attendance, leave, payroll and reports from a single dashboard.

**Live:** [frontend-beryl-rho-37.vercel.app](https://frontend-beryl-rho-37.vercel.app)

## Features

**For employees**
- Check in / check out with **face verification** (AWS Rekognition) and **GPS geofencing**, so attendance is only marked at an approved office location
- Multiple sessions per day for breaks, plus a live shift timer
- Personal attendance calendar and monthly stats (days present, average hours worked)
- Leave requests and comp-off balance
- **Mispunch regularisation**: request a correction for a missed or wrong punch
- Monthly payroll slip
- Monthly issue notes and mood check-ins

**For admins**
- Dashboard with today's attendance and company-wide stats
- Employee management, office locations and company settings (working days, holidays, Saturday half-day policy)
- Approve or reject leave and mispunch requests; override check-in/out times
- Payroll with overtime calculation
- Multi-sheet **Excel reports** with expected vs actual hours

**Platform**
- Installable **PWA** with offline banner
- Light and dark themes
- JWT authentication with email password reset

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, React Router, Axios |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL |
| Auth | JWT (python-jose), bcrypt |
| Face verification | AWS Rekognition (Azure Face API also integrated) |
| Reports | pandas, openpyxl |
| Deployment | Frontend on Vercel; backend on AWS EC2, auto-deployed by GitHub Actions on every push to `main` |

## Project structure

```
backend/
  app/
    routers/    # auth, attendance, face, leave, mispunch, payroll, export, ...
    models/     # SQLAlchemy models
    schemas/    # Pydantic request/response models
    services/   # face verification, GPS distance, auth
  main.py       # legacy entry; the app runs from app/main.py
frontend/
  src/
    pages/      # admin pages + employee/ pages
    components/ # calendar, stats dashboard, payroll slip, ...
.github/workflows/deploy-backend.yml
```

## Running locally

**Backend**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in database URL, JWT secret, AWS keys
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Author

**Gaurav Yadav** · [LinkedIn](https://www.linkedin.com/in/gaurav-yadav-80928b376) · [GitHub](https://github.com/gauravy6747-rgb)
