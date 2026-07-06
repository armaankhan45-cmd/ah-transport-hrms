# API Documentation – AH Transport HRMS v1.0

Base URL: `https://hrms.ahtransport.co.in/api`
Auth: `Authorization: Bearer <JWT>`

All responses JSON. Errors: `{ "error": "message" }`

## Auth
POST /auth/login
Body: { email, password }
→ { token, user }

GET /auth/me – current user + employee profile

POST /auth/change-password { currentPassword, newPassword }

## Employees
GET /employees?q=&office_id=&department_id=&status=&page=1&limit=25
→ { data:[...], total, page, pages }

GET /employees/:id → employee + salary

POST /employees – HR write
Body: first_name, last_name, email, designation, department_id, office_id, date_of_joining, ctc_annual?, ...

PUT /employees/:id

DELETE /employees/:id – soft exit

## Attendance
GET /attendance/my?month=YYYY-MM
POST /attendance/checkin
POST /attendance/checkout
GET /attendance?date=YYYY-MM-DD – manager view
PUT /attendance/:id/regularize { reason, status }

## Leaves
GET /leaves?status=Pending
POST /leaves { leave_type_code, start_date, end_date, reason, ... }
PUT /leaves/:id/approve
PUT /leaves/:id/reject { reason }
GET /leaves/types/list
GET /leaves/balance/my?year=2026

## Payroll
GET /payroll/runs
POST /payroll/generate { pay_month, pay_year, office_id? }
GET /payroll/runs/:id → run + items
POST /payroll/runs/:id/approve
GET /payroll/my-slips

## Dashboard
GET /dashboard/stats → total_employees, present_today, on_leave_today, attendance_rate, by_department[], attendance_trend[]
GET /dashboard/analytics → payroll_trend[]

## Reports
GET /reports/headcount
GET /reports/attendance-summary?start=&end=
GET /reports/audit-logs – requires audit.read
GET /reports/calendar/events?month=YYYY-MM
GET /reports/notifications
POST /reports/notifications/:id/read

## Export
GET /export/employees/csv → text/csv
GET /export/payroll/:runId/excel → .xlsx
GET /export/payslip/:itemId/pdf → application/pdf

## Master
GET /master/offices
GET /master/departments?office_id=
GET /master/shifts

## Error codes
401 Unauthenticated
403 Forbidden (RBAC / office scope)
400 Validation
423 Account locked
500 Server error

## Rate Limit
300 req / 15 min / IP on /api/*

## RBAC Matrix
- SUPER_ADMIN: *
- HR_ADMIN: employee.*, attendance.*, leave.approve, report.read
- PAYROLL_MANAGER: payroll.*
- BRANCH_MANAGER: office-scoped read/write attendance, leave.approve.office
- AUDITOR: audit.read, report.read, employee.read
- EMPLOYEE: self.*

Office isolation enforced automatically via officeScope middleware.
