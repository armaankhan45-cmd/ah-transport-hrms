-- Seed Core Data - A.H. Transport Co.
INSERT INTO roles (code, name, description, permissions, hierarchy_level) VALUES
('SUPER_ADMIN', 'Super Administrator', 'Full system access', '["*"]', 1),
('HR_ADMIN', 'HR Administrator', 'HR operations full access', '["employee.read","employee.write","attendance.read","attendance.write","leave.approve","report.read","dashboard.read"]', 2),
('PAYROLL_MANAGER', 'Payroll Manager', 'Payroll processing', '["payroll.read","payroll.write","payroll.approve","employee.read","report.read"]', 3),
('BRANCH_MANAGER', 'Branch Manager', 'Office level management', '["employee.read","attendance.read","attendance.write","leave.approve.office","dashboard.office"]', 4),
('AUDITOR', 'Auditor', 'Read-only audit access', '["audit.read","report.read","employee.read"]', 5),
('EMPLOYEE', 'Employee', 'Self service', '["self.read","self.attendance","self.leave","self.payslip"]', 10);

INSERT INTO offices (code, name, city, state, address, phone, email, allowed_ip_ranges, geofence_lat, geofence_lng) VALUES
('HO-MUM', 'Head Office Mumbai', 'Mumbai', 'Maharashtra', 'Plot 45, Transport Nagar, Wadala East, Mumbai 400037', '+91-22-24123456', 'ho@ahtransport.co.in', '["103.21.0.0/16","49.36.0.0/14",""]', 19.0176, 72.8562),
('BR-DEL', 'Delhi Branch', 'New Delhi', 'Delhi', 'A-12, Transport Centre, Sanjay Gandhi Transport Nagar', '+91-11-27671234', 'delhi@ahtransport.co.in', '[]', 28.7041, 77.1025),
('BR-BLR', 'Bangalore Branch', 'Bengaluru', 'Karnataka', 'No 88, Yeshwanthpur Industrial Area', '+91-80-23456789', 'blr@ahtransport.co.in', '[]', 12.9716, 77.5946),
('BR-CHN', 'Chennai Branch', 'Chennai', 'Tamil Nadu', 'Madhuravoyal Truck Terminal', '+91-44-26261234', 'chennai@ahtransport.co.in', '[]', 13.0827, 80.2707),
('BR-KOL', 'Kolkata Branch', 'Kolkata', 'West Bengal', 'Dhulagarh Truck Terminal', '+91-33-23451234', 'kolkata@ahtransport.co.in', '[]', 22.5726, 88.3639),
('BR-NGP', 'Nagpur Hub', 'Nagpur', 'Maharashtra', 'Butibori MIDC Transport Yard', '+91-712-2681234', 'nagpur@ahtransport.co.in', '[]', 21.1458, 79.0882);

INSERT INTO departments (code, name, office_id, budget_annual) VALUES
('OPS', 'Operations & Fleet', 1, 120000000),
('DRV', 'Drivers Pool', 1, 85000000),
('MAINT', 'Maintenance', 1, 25000000),
('HR', 'Human Resources', 1, 8000000),
('FIN', 'Finance & Accounts', 1, 12000000),
('SALES', 'Sales & Business Development', 1, 15000000),
('IT', 'IT & Systems', 1, 6000000),
('WH', 'Warehouse & Logistics', 2, 30000000);

INSERT INTO shifts (code, name, start_time, end_time, grace_minutes, half_day_hours) VALUES
('GENERAL', 'General Shift', '09:30', '18:30', 15, 4.5),
('MORNING', 'Morning Shift', '06:00', '14:00', 10, 4.0),
('EVENING', 'Evening Shift', '14:00', '22:00', 10, 4.0),
('NIGHT', 'Night Shift', '22:00', '06:00', 10, 4.0),
('DRIVER', 'Driver Flexible', '00:00', '23:59', 120, 6.0);

INSERT INTO leave_types (code, name, annual_quota, carry_forward_max, encashable, requires_approval, color_hex) VALUES
('CL', 'Casual Leave', 12, 0, 0, 1, '#3B82F6'),
('SL', 'Sick Leave', 12, 6, 0, 0, '#EF4444'),
('EL', 'Earned Leave', 18, 30, 1, 1, '#10B981'),
('ML', 'Maternity Leave', 182, 0, 0, 1, '#EC4899'),
('PL', 'Paternity Leave', 15, 0, 0, 1, '#8B5CF6'),
('LOP', 'Loss of Pay', 365, 0, 0, 1, '#6B7280'),
('CO', 'Comp Off', 12, 0, 0, 1, '#F59E0B');

INSERT INTO holidays (holiday_date, name, office_id, type) VALUES
('2026-01-26', 'Republic Day', NULL, 'National'),
('2026-03-29', 'Holi', NULL, 'National'),
('2026-08-15', 'Independence Day', NULL, 'National'),
('2026-10-02', 'Gandhi Jayanti', NULL, 'National'),
('2026-10-20', 'Diwali', NULL, 'National'),
('2026-12-25', 'Christmas', NULL, 'National'),
('2026-05-01', 'Maharashtra Day', 1, 'Regional'),
('2026-04-14', 'Tamil New Year', 4, 'Regional'),
('2026-09-07', 'Ganesh Chaturthi', 1, 'Regional');
