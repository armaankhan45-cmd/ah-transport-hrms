# Changelog

## 1.0.0 – 2026-07-05
Initial Enterprise Release – A.H. Transport Co. HRMS

- Authentication: JWT, bcrypt, lockout, audit, office IP restriction framework
- RBAC: 6 roles, office data isolation
- Employee Master: KYC, multi-office, salary structures
- Attendance: check-in/out, shifts, OT, regularization, geofence logging
- Leave: CL/SL/EL/ML/PL/CO/LOP, balances, approval, auto attendance
- Payroll India: PF, ESI, PT, TDS, driver allowance, monthly runs, PDF payslip
- Dashboard: live stats, Chart.js trends, department headcount
- Reports: headcount, attendance summary, audit logs
- Exports: CSV employees, Excel payroll, PDF payslip
- Calendar + Notifications
- Audit Logs immutable
- Responsive Tailwind SPA, accessible
- Production hardening: helmet, rate-limit, validation, error handling
- Docker + docker-compose, PM2 ready
- Seed data: 6 offices, 8 depts, 8 demo users
- Docs: README, INSTALLATION, DEPLOYMENT, API, SECURITY, BACKUP_RESTORE, PRODUCTION_CHECKLIST
- Tested 1000 employee bulk import

Known limitations / roadmap 1.1:
- TOTP MFA UI (backend column ready)
- Email / SMS notifications integration
- S3 document vault (local uploads scaffolded)
- PostgreSQL adapter (schema compatible)
- Biometric / mobile GPS attendance app
