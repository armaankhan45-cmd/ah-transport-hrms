-- Demo Employee Seed – 25 sample transport staff
-- Passwords: Emp@12345 (bcrypt pre-hashed in server.js seed)
-- This file is illustrative; full seed runs automatically in server.js
-- See backend/src/server.js ensureSeedUsers()

-- Mumbai HO Drivers
-- AHT1006 Deepak Yadav – Driver
-- AHT1007 Mohammed Ali – Driver (BLR)

-- Additional sample insert template:
-- INSERT INTO employees (employee_code, first_name, last_name, email, department_id, office_id, designation, date_of_joining, employee_status)
-- VALUES ('AHT10XX','First','Last','email@ahtransport.co.in',2,1,'Driver','2024-01-15','Active');

-- Total seeded via server.js: 1 Super Admin, 1 HR Admin, 6 demo staff = 8 users
-- Scale test: use scripts/bulk_import.js to generate 1000 employees
