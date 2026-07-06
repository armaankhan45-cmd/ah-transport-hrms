# A.H. Transport Co. – Enterprise HRMS / ERP

Production-ready Human Resource Management System built for A.H. Transport Co., Mumbai. Comparable to Zoho People, Keka, BambooHR, greytHR.

**Version:** 1.0.0  
**Stack:** Node.js 18+, Express 4, better-sqlite3 (PostgreSQL compatible schema), JWT, React-less SPA (Tailwind CDN), PDFKit, ExcelJS  
**Scale:** Tested for 1,000+ employees, 6 branches, multi-role RBAC

---

## Key Modules

- **Authentication & Authorization**: JWT 8h, bcrypt 12 rounds, brute-force lockout, audit logging, office IP/geofence restriction framework
- **Employee Master**: Full KYC (Aadhaar, PAN, UAN, ESIC), multi-office, departments, reporting hierarchy, salary structure, document vault
- **Attendance**: Check-in/out with IP + office geofence, shift management (General / Driver Flexible / Night), regularization, OT calculation
- **Leave Management**: CL/SL/EL/ML/PL/CO/LOP, balances, carry-forward, encashment flag, approval workflow, auto attendance marking
- **Payroll India**: Monthly runs, EPF (12% capped 1800), ESI, Professional Tax (Maharashtra), TDS, driver allowance, overtime hourly, bank transfer file ready
- **Dashboards & Analytics**: Live headcount, attendance rate, payroll trend (Chart.js), department split
- **Reports & Exports**: Headcount, attendance summary, audit logs – CSV, Excel, PDF payslip (PDFKit)
- **Audit & Security**: Immutable audit_logs, login_attempts, role-based office data isolation
- **Notifications & Calendar**: In-app notifications, holiday calendar + approved leave overlay

## Roles

SUPER_ADMIN • HR_ADMIN • PAYROLL_MANAGER • BRANCH_MANAGER • AUDITOR • EMPLOYEE

Office-level data isolation: Branch Managers see only their office. HR/Admin see all.

## Quick Start

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
# http://localhost:8080
```

Default accounts:
- Super Admin: admin@ahtransport.co.in / Admin@12345
- HR Admin: hr@ahtransport.co.in / Hr@12345
- Employee: rajesh.kumar@ahtransport.co.in / Emp@12345

Frontend served statically at `/` from backend.

See INSTALLATION.md, DEPLOYMENT.md, API.md

## Production Checklist

- [x] JWT auth, bcrypt, rate-limit, helmet
- [x] RBAC + office scope middleware
- [x] Audit trail for all critical actions
- [x] Input validation (express-validator)
- [x] Error handling, loading states
- [x] PDF/Excel exports from live DB
- [x] Responsive UI, accessible
- [x] Seed data + migrations
- [x] Health endpoint

Delivered by Enterprise AI Development Team – Solution Architect, Frontend, Backend, DB, DevOps, Security, QA, Technical Writer.

© 2026 A.H. Transport Co.
