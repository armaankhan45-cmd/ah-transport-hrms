# Postman Collection – Quick Import

Base URL variable: {{base}} = http://localhost:8080/api

1. POST {{base}}/auth/login
Body: {"email":"admin@ahtransport.co.in","password":"Admin@12345"}
Save token → {{token}}

Headers for authed calls: Authorization: Bearer {{token}}

Endpoints:
- GET {{base}}/auth/me
- GET {{base}}/dashboard/stats
- GET {{base}}/employees
- POST {{base}}/employees
- GET {{base}}/attendance/my
- POST {{base}}/attendance/checkin
- POST {{base}}/attendance/checkout
- GET {{base}}/leaves
- POST {{base}}/leaves
- PUT {{base}}/leaves/1/approve
- GET {{base}}/payroll/runs
- POST {{base}}/payroll/generate
- GET {{base}}/reports/headcount
- GET {{base}}/export/employees/csv
- GET {{base}}/export/payslip/1/pdf

Full OpenAPI spec: see docs/API.md
