# Installation Guide – A.H. Transport HRMS v1.0

## Prerequisites
- Ubuntu 22.04 / RHEL 9 / Windows Server 2022
- Node.js 18 LTS+ (`node -v`)
- 2 vCPU, 4GB RAM minimum (recommended 4 vCPU / 8GB for 1000 employees)
- 20GB SSD

## 1. Clone / Extract
```
unzip ah-transport-hrms-v1.zip
cd ah-transport-hrms
```

## 2. Environment
```
cp .env.example .env
# edit JWT_SECRET – generate: openssl rand -base64 48
nano .env
```

## 3. Install
```
cd backend
npm ci --only=production
npm run migrate
npm run seed
```

This creates:
- database/hrms.sqlite (WAL mode)
- 6 offices, 8 departments, 7 leave types, 6 shifts
- admin users

## 4. Run
Development:
```
npm run dev
```
Production (PM2):
```
npm install -g pm2
pm2 start src/server.js --name ah-hrms
pm2 save
pm2 startup
```

Open http://SERVER_IP:8080

Health: GET /api/health

## 5. First Login
admin@ahtransport.co.in / Admin@12345
→ Settings → Change Password (mandatory)

Create HR users: Employee Master → Add Employee (check Create User Account)

## 6. Office IP Restrictions
Update offices.allowed_ip_ranges JSON in DB:
```sql
UPDATE offices SET allowed_ip_ranges='["203.192.12.0/24","49.36.15.0/24"]' WHERE code='HO-MUM';
```

## Troubleshooting
- EACCES port 80 → use reverse proxy (nginx) – see DEPLOYMENT.md
- SQLITE_BUSY → WAL is enabled; increase timeout if needed
- Login locked → `UPDATE users SET is_locked=0, failed_login_attempts=0 WHERE email='...';`

Support: it@ahtransport.co.in
