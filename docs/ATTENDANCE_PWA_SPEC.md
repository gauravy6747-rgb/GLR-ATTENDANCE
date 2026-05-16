# Attendance PWA — Complete Product Specification

> **Version:** 1.0.0  
> **Status:** Locked — Ready to Build  
> **Last Updated:** May 2026  
> **Scope:** v1 Production Build

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Roles & Permissions](#3-roles--permissions)
4. [User Flows](#4-user-flows)
5. [Authentication](#5-authentication)
6. [Face Verification System](#6-face-verification-system)
7. [Location Validation System](#7-location-validation-system)
8. [Attendance Rules & Logic](#8-attendance-rules--logic)
9. [Shift & Working Day Configuration](#9-shift--working-day-configuration)
10. [Holiday Calendar](#10-holiday-calendar)
11. [Comp-Off System](#11-comp-off-system)
12. [Notifications](#12-notifications)
13. [Admin Panel Capabilities](#13-admin-panel-capabilities)
14. [Payroll Export](#14-payroll-export)
15. [Database Schema](#15-database-schema)
16. [API Route Map](#16-api-route-map)
17. [Pages & Screens](#17-pages--screens)
18. [PWA Configuration](#18-pwa-configuration)
19. [Security Considerations](#19-security-considerations)
20. [Out of Scope — v1](#20-out-of-scope--v1)

---

## 1. Project Overview

A Progressive Web App (PWA) for employee attendance management. The system combines **GPS-based location verification** and **Azure Face API liveness detection** to ensure check-ins are legitimate. It supports a flat company-employee hierarchy with three roles, a comprehensive comp-off system, and full payroll export capabilities.

### Core Principles

- **Security first** — location validated server-side only, face verification always via Azure, no client-side trust
- **Audit integrity** — nothing is deleted or edited once submitted (notes, attendance logs, transactions)
- **Admin control** — all overrides, approvals, and configurations centralized in admin panel
- **Mobile first** — PWA installable on Android and iOS, optimized for one-handed operation
- **No dark mode** — light theme only

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React (PWA) | Installable, service worker, web manifest |
| Backend | FastAPI (Python) | Async, high performance |
| Database | PostgreSQL | Relational, audit-ready |
| Auth | JWT | 7-day token expiry |
| Face Verification | Azure Face API | Server-side only, liveness detection enabled |
| Photo Storage | Cloudflare R2 | Live captures only — no file uploads accepted |
| Push Notifications | Web Push API + VAPID | Checkout reminders, admin alerts |
| Hosting | TBD | Railway / Render / VPS |

### Key Constraints

- Azure Face API keys **never exposed to frontend** — all calls proxied through FastAPI
- Location coordinates **never validated client-side** — raw coordinates sent to server
- All photos taken **live via camera** — no file upload path exists in the UI or API
- PostgreSQL chosen over NoSQL for relational integrity across attendance, comp-off, and leave tables

---

## 3. Roles & Permissions

### Hierarchy
```
Company
└── Employees (flat — no departments or teams in v1)
```

### Role Definitions

| Role | Description |
|---|---|
| **Superadmin** | Creates the company, manages locations, creates admin accounts. Full system access. |
| **Admin** | Day-to-day operations — manages employees, overrides attendance, approves comp-off, manages holidays and working days, exports payroll. |
| **Employee** | Checks in/out, views own attendance history and notes, applies for comp-off leave. |

### Permission Matrix

| Action | Superadmin | Admin | Employee |
|---|---|---|---|
| Create company / locations | ✅ | ❌ | ❌ |
| Create / deactivate admin accounts | ✅ | ❌ | ❌ |
| Add / deactivate employees | ✅ | ✅ | ❌ |
| Check in / check out | ❌ | ❌ | ✅ |
| View own attendance history | ✅ | ✅ | ✅ |
| View all employees' attendance | ✅ | ✅ | ❌ |
| Manual attendance override | ✅ | ✅ | ❌ |
| Approve / reject comp-off leave | ✅ | ✅ | ❌ |
| Mark comp-off as salary payout | ✅ | ✅ | ❌ |
| Apply for comp-off leave | ❌ | ❌ | ✅ |
| Manage holidays | ✅ | ✅ | ❌ |
| Configure working days | ✅ | ✅ | ❌ |
| Manage check-in locations | ✅ | ❌ | ❌ |
| Export payroll | ✅ | ✅ | ❌ |
| Search attendance notes | ✅ | ✅ | ❌ |

---

## 4. User Flows

### 4.1 Company Setup (Superadmin)
```
Superadmin signs up
→ Creates company profile
→ Sets check-in location (lat, lng, radius)
→ Creates admin accounts
→ System pre-loads Indian + Maharashtra holidays
→ Admin configures working days and shift windows
→ Admin adds employees
```

### 4.2 Employee Onboarding
```
Admin adds employee (name, email, phone, employee ID)
→ Employee receives email invite with set-password link
→ Employee sets password
→ Employee logs in for first time
→ MANDATORY: Live photo capture screen appears
→ Photo sent to FastAPI → Azure Face API → stored to R2
→ face_enrolled = true
→ Employee lands on Home Dashboard
```

### 4.3 Daily Check-in Flow
```
Employee opens app
→ Home Dashboard shows CHECK IN button
→ Taps CHECK IN
→ Camera opens — live photo captured (liveness check)
→ Optional: add check-in note (max 280 chars)
→ App captures GPS coordinates
→ All data sent to FastAPI:
   - Live photo → Azure Face API comparison
   - Coordinates → server-side Haversine distance check
→ Both pass → check-in recorded → status assigned
→ Both fail / either fails → error shown → retry allowed (unlimited)
```

### 4.4 Daily Check-out Flow
```
Employee taps CHECK OUT on dashboard
→ Camera opens — live photo captured (liveness check)
→ Optional: add checkout note (max 280 chars)
→ App captures GPS coordinates
→ Same server-side validation as check-in
→ Checkout recorded
→ Total hours calculated and stored
→ Day status assigned (full_day / half_day)
```

### 4.5 Comp-Off Leave Application Flow
```
Employee views comp-off balance
→ Taps "Apply for Leave"
→ Selects date
→ Submits application
→ Admin sees request in Leave Request Queue
→ Admin approves / rejects (with optional note)
→ On approval:
   - leave_requests.status = approved
   - attendance_logs record created for that date: status = comp_off_leave
   - comp_off_balance.days_used += 1.0
   - comp_off_transactions record created: type = used_leave
→ Employee notified via push notification
```

### 4.6 Admin Manual Override Flow
```
Admin opens employee's attendance record
→ Selects a date
→ Taps "Override"
→ Selects new status (present / absent / half_day / comp_off_leave)
→ MANDATORY: types admin note explaining override
→ is_manual_override = true, override_by = admin_id
→ Record updated — original data preserved alongside override
```

---

## 5. Authentication

### JWT Configuration
- Algorithm: HS256
- Expiry: 7 days
- Payload: `user_id`, `role`, `company_id`, `exp`, `iat`
- Stored in: `httpOnly` cookie (not localStorage — XSS protection)
- Refresh: User must log in again after 7 days

### Password Policy
- Minimum 8 characters
- At least 1 uppercase, 1 number, 1 special character
- Hashed with bcrypt (cost factor 12)
- No plain text ever stored or logged

### Session Rules
- Single active session per employee (new login invalidates previous token)
- Admin and Superadmin may have multiple sessions
- All auth failures logged with IP + timestamp

---

## 6. Face Verification System

### Enrollment (First Login)

```
1. Full-screen camera prompt — no skip option
2. Liveness detection active (Azure Liveness API)
3. Browser captures frame → sends as base64 to POST /api/face/enroll
4. FastAPI calls Azure Face API Detect with liveness
5. Azure returns face_id
6. Photo stored to Cloudflare R2 at path: faces/{user_id}/enrolled.jpg
7. users.face_image_url updated
8. users.face_enrolled = true
9. Employee proceeds to dashboard
```

### Check-in / Check-out Verification

```
1. Browser captures live photo → sends to POST /api/face/verify
2. FastAPI calls Azure Face API:
   a. Detect face in new photo
   b. Compare against enrolled face_id
3. Similarity score returned
4. Score ≥ 70% → verification passed
5. Score < 70% → verification failed:
   - Failed attempt logged: user_id, timestamp, photo URL (stored to R2), score
   - Check-in/out denied
   - Employee sees error: "Face not recognized. Please try again."
6. Unlimited retries allowed
```

### Similarity Threshold
- **Minimum:** 70%
- **Recommended:** 70–75%
- Configurable by Superadmin (not employee-visible)

### Azure Down Fallback
- Check-in blocked entirely
- Employee sees: "Verification service unavailable. Please contact your admin."
- Admin receives push notification: "Azure Face API unreachable — employees cannot check in."
- No silent bypass — attendance cannot be marked without face verification

### Photo Storage (Cloudflare R2)
```
R2 Bucket Structure:
├── faces/
│   └── {user_id}/
│       ├── enrolled.jpg          ← enrollment photo
│       └── failed/
│           └── {timestamp}.jpg   ← failed verification attempts
└── checkins/
    └── {user_id}/
        └── {date}/
            ├── checkin.jpg
            └── checkout.jpg
```

- All photos are private (no public R2 URLs)
- Access via signed URLs generated by FastAPI (15-minute expiry)
- Photos treated as biometric data — access logged

---

## 7. Location Validation System

### How It Works
```
1. Browser calls navigator.geolocation.getCurrentPosition()
2. Raw lat/lng sent to server with check-in request
3. FastAPI calculates Haversine distance between:
   - Employee coordinates
   - Company location coordinates
4. Distance ≤ radius (default 100m) → location valid
5. Distance > radius → check-in denied with message:
   "You are outside the allowed check-in zone."
```

**Critical:** Distance calculation happens only on the server. The frontend never makes a pass/fail location decision.

### Anti-Spoofing Layers

| Layer | What It Detects | Action |
|---|---|---|
| Server-side Haversine | Client-side JS manipulation | Hard block |
| Coordinate drift monitoring | Identical exact coordinates repeated (real GPS drifts slightly) | Flag for admin review |
| Impossible travel detection | Check-in from Location A, then Location B within physically impossible time | Flag for admin review |
| IP geolocation cross-check | Broad VPN / proxy use | Flag only (not block — mobile IPs are unreliable) |

> **Honest limitation:** OS-level GPS spoofing on rooted Android cannot be detected by a web app. The above layers deter 99% of casual attempts. Perfect security is not achievable without a native app.

### Location Configuration
- Superadmin sets: name, latitude, longitude, radius (meters)
- Default radius: 100m
- Multiple locations supported (e.g. multiple office branches)
- Each employee's check-in validated against the company's active location(s)

### Offline / No GPS Scenario
- No offline queue — no silent retries
- Employee sees: "Unable to get your location. Please check your GPS and try again."
- Unlimited manual retries
- No attendance marked until both face + location pass

---

## 8. Attendance Rules & Logic

### Check-in Status

| Condition | Status |
|---|---|
| Check-in before 7:00 AM | `early_bird` |
| Check-in 7:00 AM – 11:00 AM | `on_time` |
| Check-in after 11:00 AM | `late` |

### Checkout Status

| Condition | Status |
|---|---|
| Checkout before 4:00 PM | `early_leave` |
| Checkout 4:00 PM – 8:00 PM | `on_time_out` |
| Checkout after 8:00 PM | `present` |

### Day Classification

| Condition | Result |
|---|---|
| Total hours worked ≥ 8.5 | `full_day` |
| Total hours worked < 8.5 | `half_day` |
| No check-in recorded | `absent` |
| Checked in on a holiday + ≥ 8.5 hrs | `holiday_work` → earns 1.0 comp-off |
| Checked in on a holiday + < 8.5 hrs | `holiday_work` → earns 0.5 comp-off |
| Admin-approved comp-off leave applied | `comp_off_leave` (not absent) |
| Admin manual override | any status — logged with admin note |

### 8.5 Hour Rule — Exact Calculation
- `total_hours = checkout_time - checkin_time` (in decimal hours)
- Example: Check-in 8:00 AM, Checkout 4:45 PM = 8.75 hrs = `full_day`
- Example: Check-in 10:59 AM, Checkout 4:30 PM = 5.52 hrs = `half_day`
- The time window (7–11 AM) and the 8.5hr rule are **independent** — both apply
- A late check-in making 8.5 hrs physically impossible = automatic `half_day`
- Admin can override any auto-classification with a mandatory note

### Check-in / Check-out Notes
- Fully optional on both check-in and checkout
- Maximum 280 characters
- Non-editable after submission (audit integrity)
- Visible to: employee (own records), admin (all records)
- Searchable in admin panel via full-text search

---

## 9. Shift & Working Day Configuration

### Working Days
- Admin toggles each day of the week: Monday–Sunday
- Default: Monday–Friday
- Changes logged with `updated_by` + `updated_at`

### Shift Windows (Fixed — Admin Cannot Change in v1)
| Window | Time |
|---|---|
| Check-in opens | 12:00 AM (early_bird from any time) |
| On-time check-in | 7:00 AM – 11:00 AM |
| Late threshold | After 11:00 AM |
| On-time checkout | 4:00 PM – 8:00 PM |
| Early leave threshold | Before 4:00 PM |
| Minimum full day | 8.5 hours worked |

### Holiday Priority
If a date is both a configured working day and a holiday, **holiday takes precedence.** Any check-in on that date is `holiday_work`.

---

## 10. Holiday Calendar

### Pre-loaded Holidays

#### National Holidays — Fixed Date
| Holiday | Date |
|---|---|
| Republic Day | January 26 |
| Independence Day | August 15 |
| Gandhi Jayanti | October 2 |
| Christmas | December 25 |

#### National Holidays — Variable Date (Admin updates annually)
| Holiday |
|---|
| Good Friday |
| Holi |
| Eid ul-Fitr |
| Eid ul-Adha |
| Buddha Purnima |
| Janmashtami |
| Dussehra |
| Diwali |
| Guru Nanak Jayanti |
| Muharram |

#### Maharashtra State Holidays
| Holiday | Date |
|---|---|
| Chhatrapati Shivaji Maharaj Jayanti | February 19 |
| Dr. Ambedkar Jayanti | April 14 |
| Maharashtra Day | May 1 |
| Gudi Padwa | Variable (admin updates annually) |

### Admin Holiday Management
- Add new holiday: name + date + type (national / state / custom)
- Edit existing holiday (name, date)
- Delete holiday
- All changes logged

---

## 11. Comp-Off System

### Earning Comp-Off
| Scenario | Earned |
|---|---|
| Work on holiday + ≥ 8.5 hrs | 1.0 comp-off day |
| Work on holiday + < 8.5 hrs | 0.5 comp-off day |

- Auto-credited on day classification
- Immediately visible in employee's comp-off balance
- No manual approval needed to earn

### Redemption — Two Paths

#### Path 1: Extra Leave Day
```
Employee applies for comp-off leave (selects date)
→ Admin sees request in Leave Queue
→ Admin approves (optional note) or rejects (optional note)
→ On approval:
   - attendance_logs: date marked as comp_off_leave
   - comp_off_balance.days_used += amount
   - comp_off_transactions: type = used_leave
→ On rejection:
   - Balance unchanged
   - Employee notified with admin note
```

#### Path 2: Salary Payout
```
Admin opens employee's comp-off record
→ Selects amount to pay out (0.5 or 1.0 or more days)
→ Marks as "Paid Out"
→ comp_off_balance.days_paid_out += amount
→ comp_off_transactions: type = paid_out
→ Payroll export reflects payout in that month's row
→ Actual salary processing handled by finance team externally
```

### Rules
- No expiry on comp-off balance
- Balance supports 0.5 increments (float)
- Employee cannot apply for more leave than their available balance
- Full transaction audit trail maintained

---

## 12. Notifications

### Checkout Reminder (Web Push)
- Trigger: Employee has checked in but not checked out by configurable reminder time (default: 7:30 PM)
- Message: "Don't forget to check out before 8:00 PM!"
- Sent via: Web Push API + VAPID
- Frequency: Once per day per user

### Azure API Down Alert
- Trigger: Azure Face API returns error / timeout
- Recipient: All admin accounts
- Channel: Web Push
- Message: "Face verification service is unavailable. Employees cannot check in."

### Impossible Travel Alert
- Trigger: Anomalous coordinate pattern detected
- Recipient: Admin
- Channel: Web Push + visible flag in admin dashboard
- Message: "Suspicious check-in detected for [Employee Name]. Review attendance."

### Comp-Off Leave Status
- Trigger: Admin approves or rejects a leave request
- Recipient: Employee
- Channel: Web Push
- Message: "Your comp-off leave request for [date] has been [approved/rejected]."

### PWA Push Requirements
- VAPID public/private key pair generated on server
- Subscription stored per user in `push_subscriptions` table
- iOS 16.4+ supported (with limitations — user must add PWA to home screen first)

---

## 13. Admin Panel Capabilities

### Dashboard Overview
- Total employees
- Present today / absent today / on leave today
- Late check-ins today
- Pending leave requests (count)
- Pending comp-off payouts
- Recent anomaly flags

### Employee Management
- Add employee (name, email, phone, employee ID, role)
- Deactivate employee (soft delete — records preserved)
- Reactivate employee
- View individual employee profile + full attendance history
- Reset employee face enrollment (triggers re-enrollment on next login)

### Attendance Records
- Filter by: date range, employee, status, department (future)
- Full-text search across check-in and checkout notes
- View check-in/checkout photos (via signed R2 URLs)
- View GPS coordinates on map
- Manual override: select date → set status → mandatory admin note
- All overrides marked with `is_manual_override = true` + admin ID + timestamp

### Comp-Off Management
- View all employee comp-off balances
- View full transaction history per employee
- Approve / reject leave requests (with optional admin note)
- Mark comp-off days as salary payout

### Leave Request Queue
- List of all pending leave requests
- Approve / reject with single tap
- Optional rejection note
- History of all approved/rejected requests

### Holiday Management
- View all holidays in a calendar view + list view
- Add holiday (name, date, type)
- Edit holiday
- Delete holiday

### Working Days Configuration
- Toggle Mon–Sun on/off
- View current config
- Change log visible to superadmin

### Location Management (Superadmin only)
- Add location (name, lat, lng, radius)
- Edit location
- Deactivate location
- View location on map

### Anomaly Flags
- List of flagged check-ins (drift detected, impossible travel, failed face attempts)
- Admin can dismiss flag or escalate to investigation note

---

## 14. Payroll Export

### Export Formats
- CSV (for payroll system imports)
- Excel / .xlsx (for HR manual review)

### Export Filters
- By employee (individual or all)
- By month + year

### Export Columns

| Column | Description |
|---|---|
| Employee Name | Full name |
| Employee ID | EMP-001 format |
| Month | e.g. April 2026 |
| Total Working Days | Based on working_days_config minus holidays |
| Days Present (Full) | Days with ≥ 8.5 hrs worked |
| Days Present (Half) | Days with < 8.5 hrs worked |
| Days Absent | Working days with no check-in |
| Late Check-ins | Count of `late` status check-ins |
| Early Checkouts | Count of `early_leave` status checkouts |
| Total Hours Worked | Sum of all session durations |
| Holiday Work Days | Days marked `holiday_work` |
| Comp-Off Earned | Float — days earned this month |
| Comp-Off Used (Leave) | Float — leave days taken this month |
| Comp-Off Paid Out | Float — days paid out this month |
| Comp-Off Balance | Running total as of month end |
| Manual Overrides | Count of admin-overridden records |

---

## 15. Database Schema

### `users`
```sql
id                  UUID PRIMARY KEY
company_id          UUID REFERENCES companies(id)
employee_id         VARCHAR(20) UNIQUE        -- EMP-001 format
name                VARCHAR(100) NOT NULL
email               VARCHAR(100) UNIQUE NOT NULL
password_hash       VARCHAR(255) NOT NULL
phone               VARCHAR(20)
role                ENUM('superadmin', 'admin', 'employee')
face_image_url      TEXT                      -- R2 URL
face_enrolled       BOOLEAN DEFAULT FALSE
is_active           BOOLEAN DEFAULT TRUE
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ
```

### `companies`
```sql
id                  UUID PRIMARY KEY
name                VARCHAR(100) NOT NULL
created_at          TIMESTAMPTZ DEFAULT NOW()
```

### `locations`
```sql
id                  UUID PRIMARY KEY
company_id          UUID REFERENCES companies(id)
name                VARCHAR(100) NOT NULL
latitude            DECIMAL(10, 8) NOT NULL
longitude           DECIMAL(11, 8) NOT NULL
radius_meters       INTEGER DEFAULT 100
is_active           BOOLEAN DEFAULT TRUE
created_by          UUID REFERENCES users(id)
created_at          TIMESTAMPTZ DEFAULT NOW()
```

### `attendance_logs`
```sql
id                      UUID PRIMARY KEY
user_id                 UUID REFERENCES users(id)
date                    DATE NOT NULL
checkin_time            TIMESTAMPTZ
checkin_lat             DECIMAL(10, 8)
checkin_lng             DECIMAL(11, 8)
checkin_photo_url       TEXT                  -- R2 signed URL base path
checkin_note            VARCHAR(280)
checkin_face_score      DECIMAL(5, 2)
checkout_time           TIMESTAMPTZ
checkout_lat            DECIMAL(10, 8)
checkout_lng            DECIMAL(11, 8)
checkout_photo_url      TEXT
checkout_note           VARCHAR(280)
checkout_face_score     DECIMAL(5, 2)
total_hours             DECIMAL(5, 2)         -- calculated on checkout
checkin_status          ENUM('early_bird', 'on_time', 'late')
checkout_status         ENUM('early_leave', 'on_time_out', 'present')
day_status              ENUM('full_day', 'half_day', 'absent',
                             'holiday_work', 'comp_off_leave')
is_manual_override      BOOLEAN DEFAULT FALSE
override_by             UUID REFERENCES users(id)
override_at             TIMESTAMPTZ
override_note           TEXT
is_anomaly_flagged      BOOLEAN DEFAULT FALSE
anomaly_type            VARCHAR(50)           -- 'drift' / 'impossible_travel'
created_at              TIMESTAMPTZ DEFAULT NOW()

UNIQUE(user_id, date)
```

### `holidays`
```sql
id                  UUID PRIMARY KEY
company_id          UUID REFERENCES companies(id)
name                VARCHAR(100) NOT NULL
date                DATE NOT NULL
type                ENUM('national', 'state', 'custom')
is_preloaded        BOOLEAN DEFAULT FALSE
created_by          UUID REFERENCES users(id)
created_at          TIMESTAMPTZ DEFAULT NOW()
```

### `working_days_config`
```sql
id                  UUID PRIMARY KEY
company_id          UUID REFERENCES companies(id)
monday              BOOLEAN DEFAULT TRUE
tuesday             BOOLEAN DEFAULT TRUE
wednesday           BOOLEAN DEFAULT TRUE
thursday            BOOLEAN DEFAULT TRUE
friday              BOOLEAN DEFAULT TRUE
saturday            BOOLEAN DEFAULT FALSE
sunday              BOOLEAN DEFAULT FALSE
updated_by          UUID REFERENCES users(id)
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

### `comp_off_balance`
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id) UNIQUE
days_earned         DECIMAL(5, 1) DEFAULT 0
days_used           DECIMAL(5, 1) DEFAULT 0
days_paid_out       DECIMAL(5, 1) DEFAULT 0
last_updated        TIMESTAMPTZ DEFAULT NOW()

-- Available balance = days_earned - days_used - days_paid_out
```

### `comp_off_transactions`
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id)
type                ENUM('earned', 'used_leave', 'paid_out')
amount              DECIMAL(5, 1) NOT NULL     -- 0.5 or 1.0
reference_date      DATE NOT NULL              -- holiday worked / leave taken
approved_by         UUID REFERENCES users(id)
notes               VARCHAR(280)
created_at          TIMESTAMPTZ DEFAULT NOW()
```

### `leave_requests`
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id)
date_requested      DATE NOT NULL
type                ENUM('comp_off') DEFAULT 'comp_off'
status              ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
applied_at          TIMESTAMPTZ DEFAULT NOW()
reviewed_by         UUID REFERENCES users(id)
reviewed_at         TIMESTAMPTZ
admin_note          VARCHAR(280)
```

### `notifications_log`
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id)
type                ENUM('checkout_reminder', 'azure_down',
                         'anomaly_flag', 'leave_approved', 'leave_rejected')
sent_at             TIMESTAMPTZ DEFAULT NOW()
status              ENUM('sent', 'failed')
payload             JSONB
```

### `push_subscriptions`
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id)
endpoint            TEXT NOT NULL
p256dh              TEXT NOT NULL
auth                TEXT NOT NULL
created_at          TIMESTAMPTZ DEFAULT NOW()
```

### `face_verification_failures`
```sql
id                  UUID PRIMARY KEY
user_id             UUID REFERENCES users(id)
attempt_at          TIMESTAMPTZ DEFAULT NOW()
photo_url           TEXT                -- R2 path to failed attempt photo
similarity_score    DECIMAL(5, 2)
action_type         ENUM('checkin', 'checkout', 'enrollment')
```

---

## 16. API Route Map

### Authentication
```
POST   /api/auth/login              -- email + password → JWT
POST   /api/auth/logout             -- invalidate token
POST   /api/auth/set-password       -- first-time password set (invite link)
GET    /api/auth/me                 -- current user info
```

### Face Enrollment & Verification
```
POST   /api/face/enroll             -- first login photo → Azure → R2
POST   /api/face/verify             -- check-in/out photo → Azure compare → result
GET    /api/face/status             -- check if user is enrolled
```

### Attendance
```
POST   /api/attendance/checkin      -- photo + coordinates + optional note
POST   /api/attendance/checkout     -- photo + coordinates + optional note
GET    /api/attendance/today        -- current user's today status
GET    /api/attendance/history      -- current user's history (paginated)
GET    /api/attendance/history/{user_id}   -- admin: specific user history
GET    /api/attendance/all          -- admin: all records (filterable)
PUT    /api/attendance/{id}/override       -- admin: manual override
GET    /api/attendance/search       -- admin: full-text search on notes
GET    /api/attendance/anomalies    -- admin: flagged records
POST   /api/attendance/anomalies/{id}/dismiss
```

### Employees
```
GET    /api/employees               -- admin: list all employees
POST   /api/employees               -- admin: add employee
GET    /api/employees/{id}          -- admin: employee profile
PUT    /api/employees/{id}          -- admin: update employee
PUT    /api/employees/{id}/deactivate
PUT    /api/employees/{id}/reactivate
PUT    /api/employees/{id}/reset-face  -- admin: trigger re-enrollment
```

### Comp-Off
```
GET    /api/compoff/balance         -- current user balance
GET    /api/compoff/balance/{user_id}      -- admin: specific user
GET    /api/compoff/transactions    -- current user transaction history
GET    /api/compoff/transactions/{user_id} -- admin: specific user
POST   /api/compoff/payout          -- admin: mark days as paid out
```

### Leave Requests
```
POST   /api/leave/apply             -- employee: submit comp-off leave request
GET    /api/leave/my-requests       -- employee: own leave history
GET    /api/leave/queue             -- admin: all pending requests
PUT    /api/leave/{id}/approve      -- admin: approve
PUT    /api/leave/{id}/reject       -- admin: reject with optional note
```

### Holidays
```
GET    /api/holidays                -- list all holidays
POST   /api/holidays                -- admin: add holiday
PUT    /api/holidays/{id}           -- admin: edit holiday
DELETE /api/holidays/{id}           -- admin: delete holiday
```

### Configuration
```
GET    /api/config/working-days     -- get current working days
PUT    /api/config/working-days     -- admin: update working days
GET    /api/config/locations        -- get active locations
POST   /api/config/locations        -- superadmin: add location
PUT    /api/config/locations/{id}   -- superadmin: edit location
DELETE /api/config/locations/{id}   -- superadmin: deactivate location
```

### Payroll Export
```
GET    /api/export/payroll?month=&year=&user_id=   -- CSV
GET    /api/export/payroll/xlsx?month=&year=        -- Excel
```

### Notifications
```
POST   /api/notifications/subscribe    -- save push subscription
DELETE /api/notifications/unsubscribe
```

---

## 17. Pages & Screens

### Public (Unauthenticated)
| Screen | Route | Description |
|---|---|---|
| Login | `/login` | Email + password, JWT issued on success |
| Set Password | `/set-password?token=` | First-time password setup via invite link |

### Employee
| Screen | Route | Description |
|---|---|---|
| Face Enrollment | `/enroll` | Blocks all navigation until complete — first login only |
| Home Dashboard | `/` | CHECK IN / CHECK OUT button, today's status, quick stats |
| My Attendance | `/my-attendance` | Monthly calendar view + list, filter by status |
| My Comp-Off | `/my-compoff` | Balance, transaction history, apply for leave |

### Admin
| Screen | Route | Description |
|---|---|---|
| Admin Dashboard | `/admin` | Overview stats, anomaly alerts, leave queue count |
| Employees | `/admin/employees` | List, search, add, deactivate |
| Employee Detail | `/admin/employees/:id` | Full profile + attendance history |
| Attendance Records | `/admin/attendance` | All records, filters, note search, override |
| Leave Queue | `/admin/leave` | Pending requests, approve/reject |
| Comp-Off Management | `/admin/compoff` | All balances, payout management |
| Holidays | `/admin/holidays` | Calendar + list, add/edit/delete |
| Working Days | `/admin/config/working-days` | Day toggles |
| Payroll Export | `/admin/export` | Month picker, employee filter, download CSV/Excel |
| Anomaly Flags | `/admin/anomalies` | Flagged check-ins, dismiss or escalate |

### Superadmin (additional)
| Screen | Route | Description |
|---|---|---|
| Company Setup | `/admin/company` | Company name, initial config |
| Locations | `/admin/locations` | Map view, add/edit/deactivate check-in zones |
| Admin Accounts | `/admin/accounts` | Create/deactivate admin users |

---

## 18. PWA Configuration

### Web App Manifest (`manifest.json`)
```json
{
  "name": "Attendance App",
  "short_name": "Attendance",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#YOUR_PRIMARY_COLOR",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker Strategy
- **Shell (HTML, CSS, JS):** Cache-first — app loads instantly
- **API calls (attendance, face, location):** Network-only — no cached responses
- **Static assets (icons, fonts):** Cache-first with stale-while-revalidate
- No offline queue — failed check-ins must be retried online

### Camera Permissions
- Required for face verification — app requests on enrollment and each check-in/out
- If permission denied → clear message: "Camera access is required to check in. Please enable it in your browser settings."
- No check-in possible without camera

### iOS Limitations (Honest)
- Web Push requires iOS 16.4+ AND PWA must be added to home screen
- Camera access in Safari PWA works but may prompt each session
- Communicate these limitations clearly during onboarding for iPhone users

---

## 19. Security Considerations

### What Is Protected
| Threat | Mitigation |
|---|---|
| API key exposure | Azure keys stored in FastAPI env vars only — never in frontend |
| Client-side location spoofing | Server-side Haversine — frontend result never trusted |
| Photo upload bypass | API only accepts live camera stream — no file upload endpoint |
| JWT theft | httpOnly cookies prevent JS access |
| XSS | httpOnly JWT cookies, Content-Security-Policy headers |
| CSRF | SameSite=Strict cookie policy |
| Brute force login | Rate limiting on /api/auth/login (5 attempts / 15 min) |
| OS-level GPS spoofing | Drift monitoring + impossible travel flagging — cannot fully prevent |
| Azure outage | Hard block — no attendance recorded without verification |
| Biometric data access | All R2 photos accessed via short-lived signed URLs only |

### Data Privacy (India DPDP Act Compliance)
- Face photos are biometric personal data
- Clear consent obtained during enrollment
- Photos stored securely in private R2 bucket
- Access logged
- Deletion policy must be defined before launch (employee offboarding)
- Privacy policy must be shown and accepted during first login

---

## 20. Out of Scope — v1

The following are explicitly deferred to v2 or later:

| Feature | Reason |
|---|---|
| Dark mode | Not required |
| Department / team hierarchy | Flat structure sufficient for v1 |
| Re-enrollment flow (appearance change) | 70% threshold handles minor changes |
| Auto-checkout | Not requested |
| Offline queue / sync | Retry-only approach chosen |
| Comp-off expiry | Not required |
| Shift window customization by admin | Fixed windows for v1 |
| Multi-tenant / multi-company | Single company for v1 |
| Manager role | Not required — admin sees all |
| Holiday API auto-sync | Admin updates manually |
| Comp-off redemption approval workflow (email) | Push notification sufficient |
| Biometric deletion / offboarding flow | Define before launch — not in v1 build |

---

*End of Specification — v1.0.0*
