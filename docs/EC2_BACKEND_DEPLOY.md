# EC2 Backend Deployment

Use this when deploying the GLR Attendance FastAPI backend to an Ubuntu EC2 instance.

## 1. EC2 Setup

Recommended for testing:

```text
Instance: t3.micro
OS: Ubuntu 22.04 or 24.04
Storage: 20-30 GB gp3
Security group: allow 22, 80, 443
```

Keep PostgreSQL on Neon. Do not install PostgreSQL on the EC2 instance for this setup.

## 2. Install Server Packages

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip nginx git
```

## 3. Upload Or Clone Project

Example:

```bash
git clone YOUR_REPO_URL attendance-system
cd attendance-system/backend
```

If you are uploading manually, put the project at:

```text
/home/ubuntu/attendance-system
```

## 4. Python Environment

```bash
cd /home/ubuntu/attendance-system/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 5. Backend Environment

Create:

```bash
nano /home/ubuntu/attendance-system/backend/.env
```

Use:

```text
DATABASE_URL=your_neon_postgres_url_with_sslmode_require
SECRET_KEY=replace_with_long_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_DAYS=7

FRONTEND_ORIGINS=https://frontend-beryl-rho-37.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none

AWS_ACCESS_KEY_ID=your_new_aws_key
AWS_SECRET_ACCESS_KEY=your_new_aws_secret
AWS_REGION=ap-south-1
FACE_MATCH_THRESHOLD=60

FACE_DATA_DIR=/home/ubuntu/attendance-system/backend/face_data
```

Do not reuse leaked/local AWS keys. Create fresh IAM keys before production.

## 6. Test Backend

```bash
cd /home/ubuntu/attendance-system/backend
source .venv/bin/activate
python -c "from app.core.database import engine; c=engine.connect(); print(c.exec_driver_sql('select 1').scalar()); c.close()"
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open another SSH tab:

```bash
curl http://127.0.0.1:8000/
```

Expected:

```json
{"message":"GLR Attendance Running"}
```

Create at least one active office location before employee check-ins:

```bash
OFFICE_LOCATION_NAME="Main Office" \
OFFICE_LOCATION_LATITUDE="28.61390000" \
OFFICE_LOCATION_LONGITUDE="77.20900000" \
OFFICE_LOCATION_RADIUS_METERS="150" \
python scripts/create_location.py
```

Use your real office GPS coordinates. You can also add this from the admin panel at `/office-locations`.

## 7. Systemd Service

Create:

```bash
sudo nano /etc/systemd/system/glr-attendance.service
```

Paste:

```ini
[Unit]
Description=GLR Attendance FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/attendance-system/backend
EnvironmentFile=/home/ubuntu/attendance-system/backend/.env
ExecStart=/home/ubuntu/attendance-system/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable glr-attendance
sudo systemctl start glr-attendance
sudo systemctl status glr-attendance
```

## 8. Nginx Reverse Proxy

Create:

```bash
sudo nano /etc/nginx/sites-available/glr-attendance
```

Paste:

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_PUBLIC_IP;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/glr-attendance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 9. HTTPS

Point a domain to the EC2 public IP, then run:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR_DOMAIN
```

Your backend URL becomes:

```text
https://YOUR_DOMAIN
```

## 10. Connect Vercel Frontend

In Vercel project settings, add:

```text
VITE_API_BASE_URL=https://YOUR_DOMAIN
```

Redeploy frontend:

```powershell
cd C:\Gaurav\attendance-system\frontend
npx.cmd vercel --prod --yes
```
