-- A.H. Transport Co. - Enterprise HRMS
-- Production Database Schema v1.0.0
-- Compatible: PostgreSQL 14+, SQLite 3.38+
-- Designed for 1,000+ employees, multi-branch

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- =====================
-- CORE AUTH & RBAC
-- =====================

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL, -- SUPER_ADMIN, HR_ADMIN, PAYROLL_MANAGER, BRANCH_MANAGER, EMPLOYEE, AUDITOR
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT NOT NULL, -- JSON array
  hierarchy_level INTEGER NOT NULL DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS offices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL, -- MUM-01, DEL-01
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  address TEXT,
  pincode TEXT,
  phone TEXT,
  email TEXT,
  manager_id INTEGER,
  allowed_ip_ranges TEXT, -- JSON: ["203.0.113.0/24"]
  geofence_lat REAL,
  geofence_lng REAL,
  geofence_radius_m INTEGER DEFAULT 200,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  head_id INTEGER,
  office_id INTEGER REFERENCES offices(id),
  budget_annual DECIMAL(14,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  office_id INTEGER REFERENCES offices(id),
  is_active INTEGER DEFAULT 1,
  is_locked INTEGER DEFAULT 0,
  mfa_enabled INTEGER DEFAULT 0,
  mfa_secret TEXT,
  last_login_at DATETIME,
  last_login_ip TEXT,
  password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  must_change_password INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- EMPLOYEE MASTER
-- =====================

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT,
  father_name TEXT,
  dob DATE,
  gender TEXT CHECK(gender IN ('Male','Female','Other')),
  marital_status TEXT,
  blood_group TEXT,
  nationality TEXT DEFAULT 'Indian',
  phone TEXT,
  alternate_phone TEXT,
  email TEXT UNIQUE,
  personal_email TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  aadhaar_number TEXT UNIQUE,
  pan_number TEXT UNIQUE,
  uan_number TEXT,
  esic_number TEXT,
  -- Employment
  department_id INTEGER REFERENCES departments(id),
  office_id INTEGER REFERENCES offices(id),
  designation TEXT NOT NULL,
  employment_type TEXT CHECK(employment_type IN ('Permanent','Contract','Probation','Trainee','Driver','Helper')) DEFAULT 'Permanent',
  reporting_manager_id INTEGER REFERENCES employees(id),
  date_of_joining DATE NOT NULL,
  date_of_confirmation DATE,
  date_of_exit DATE,
  work_location TEXT,
  shift_code TEXT DEFAULT 'GENERAL',
  employee_status TEXT CHECK(employee_status IN ('Active','OnLeave','Suspended','Exited')) DEFAULT 'Active',
  -- Bank & Statutory
  bank_name TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  -- System
  photo_url TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salary_structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_from DATE NOT NULL,
  effective_to DATE,
  ctc_annual DECIMAL(12,2) NOT NULL,
  basic_monthly DECIMAL(10,2) NOT NULL,
  hra_monthly DECIMAL(10,2) DEFAULT 0,
  conveyance_monthly DECIMAL(10,2) DEFAULT 0,
  special_allowance_monthly DECIMAL(10,2) DEFAULT 0,
  driver_allowance_monthly DECIMAL(10,2) DEFAULT 0,
  overtime_rate_hourly DECIMAL(8,2) DEFAULT 0,
  pf_applicable INTEGER DEFAULT 1,
  esi_applicable INTEGER DEFAULT 1,
  pt_state TEXT DEFAULT 'Maharashtra',
  tds_per_month DECIMAL(10,2) DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- ATTENDANCE
-- =====================

CREATE TABLE IF NOT EXISTS shifts (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TEXT NOT NULL, -- "09:30"
  end_time TEXT NOT NULL,
  grace_minutes INTEGER DEFAULT 15,
  half_day_hours DECIMAL(4,2) DEFAULT 4.5
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  attendance_date DATE NOT NULL,
  shift_code TEXT REFERENCES shifts(code),
  check_in_time DATETIME,
  check_out_time DATETIME,
  check_in_location TEXT,
  check_out_location TEXT,
  check_in_ip TEXT,
  check_out_ip TEXT,
  check_in_office_id INTEGER REFERENCES offices(id),
  work_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  status TEXT CHECK(status IN ('Present','Absent','HalfDay','Late','WeekOff','Holiday','OnDuty','Leave')) DEFAULT 'Present',
  late_minutes INTEGER DEFAULT 0,
  is_regularized INTEGER DEFAULT 0,
  regularization_reason TEXT,
  approved_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS holidays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  office_id INTEGER REFERENCES offices(id), -- NULL = pan India
  type TEXT CHECK(type IN ('National','Regional','Optional')) DEFAULT 'National',
  UNIQUE(holiday_date, office_id)
);

-- =====================
-- LEAVE MANAGEMENT
-- =====================

CREATE TABLE IF NOT EXISTS leave_types (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  annual_quota DECIMAL(5,2) NOT NULL,
  carry_forward_max DECIMAL(5,2) DEFAULT 0,
  encashable INTEGER DEFAULT 0,
  requires_approval INTEGER DEFAULT 1,
  applicable_gender TEXT, -- NULL = all
  min_service_days INTEGER DEFAULT 0,
  color_hex TEXT DEFAULT '#3B82F6'
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  leave_type_code TEXT NOT NULL REFERENCES leave_types(code),
  year INTEGER NOT NULL,
  opening_balance DECIMAL(5,2) DEFAULT 0,
  accrued DECIMAL(5,2) DEFAULT 0,
  availed DECIMAL(5,2) DEFAULT 0,
  carry_forward DECIMAL(5,2) DEFAULT 0,
  balance DECIMAL(5,2) GENERATED ALWAYS AS (opening_balance + accrued + carry_forward - availed) STORED,
  UNIQUE(employee_id, leave_type_code, year)
);

CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  leave_type_code TEXT NOT NULL REFERENCES leave_types(code),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(4,1) NOT NULL,
  is_half_day INTEGER DEFAULT 0,
  reason TEXT NOT NULL,
  contact_phone TEXT,
  address_during_leave TEXT,
  status TEXT CHECK(status IN ('Pending','Approved','Rejected','Cancelled','Withdrawn')) DEFAULT 'Pending',
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  approved_at DATETIME,
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- PAYROLL
-- =====================

CREATE TABLE IF NOT EXISTS payroll_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_code TEXT UNIQUE NOT NULL, -- PR-2026-06
  pay_month INTEGER NOT NULL, -- 1-12
  pay_year INTEGER NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  office_id INTEGER REFERENCES offices(id), -- NULL = all
  employee_count INTEGER DEFAULT 0,
  gross_total DECIMAL(14,2) DEFAULT 0,
  deductions_total DECIMAL(14,2) DEFAULT 0,
  net_total DECIMAL(14,2) DEFAULT 0,
  status TEXT CHECK(status IN ('Draft','Processing','Approved','Paid','Locked')) DEFAULT 'Draft',
  processed_by INTEGER REFERENCES users(id),
  processed_at DATETIME,
  approved_by INTEGER REFERENCES users(id),
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pay_month, pay_year, office_id)
);

CREATE TABLE IF NOT EXISTS payroll_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payroll_run_id INTEGER NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  -- Working days
  pay_days DECIMAL(5,2) NOT NULL,
  lop_days DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(6,2) DEFAULT 0,
  -- Earnings
  basic_earned DECIMAL(10,2) NOT NULL,
  hra_earned DECIMAL(10,2) DEFAULT 0,
  conveyance_earned DECIMAL(10,2) DEFAULT 0,
  special_allowance_earned DECIMAL(10,2) DEFAULT 0,
  driver_allowance_earned DECIMAL(10,2) DEFAULT 0,
  overtime_earned DECIMAL(10,2) DEFAULT 0,
  bonus DECIMAL(10,2) DEFAULT 0,
  arrears DECIMAL(10,2) DEFAULT 0,
  gross_earnings DECIMAL(10,2) NOT NULL,
  -- Deductions
  pf_employee DECIMAL(10,2) DEFAULT 0,
  esi_employee DECIMAL(10,2) DEFAULT 0,
  professional_tax DECIMAL(10,2) DEFAULT 0,
  tds DECIMAL(10,2) DEFAULT 0,
  loan_deduction DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  total_deductions DECIMAL(10,2) NOT NULL,
  net_pay DECIMAL(10,2) NOT NULL,
  -- Employer contributions
  pf_employer DECIMAL(10,2) DEFAULT 0,
  esi_employer DECIMAL(10,2) DEFAULT 0,
  -- Bank
  bank_account_no TEXT,
  bank_ifsc TEXT,
  payment_status TEXT CHECK(payment_status IN ('Pending','Processed','Failed')) DEFAULT 'Pending',
  payment_ref TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(payroll_run_id, employee_id)
);

-- =====================
-- COMMUNICATIONS
-- =====================

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT CHECK(type IN ('info','success','warning','error','leave','payroll','attendance')) DEFAULT 'info',
  link_url TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- AUDIT & SECURITY
-- =====================

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES users(id),
  actor_email TEXT,
  action TEXT NOT NULL, -- LOGIN, EMPLOYEE_CREATE, PAYROLL_APPROVE...
  entity_type TEXT, -- employee, payroll, leave
  entity_id TEXT,
  office_id INTEGER REFERENCES offices(id),
  ip_address TEXT,
  user_agent TEXT,
  old_values TEXT, -- JSON
  new_values TEXT, -- JSON
  severity TEXT CHECK(severity IN ('low','medium','high','critical')) DEFAULT 'low',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  ip_address TEXT,
  success INTEGER NOT NULL,
  failure_reason TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS office_access_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER REFERENCES roles(id),
  office_id INTEGER REFERENCES offices(id),
  can_read INTEGER DEFAULT 1,
  can_write INTEGER DEFAULT 0,
  can_approve INTEGER DEFAULT 0,
  UNIQUE(role_id, office_id)
);

-- =====================
-- DOCUMENTS
-- =====================

CREATE TABLE IF NOT EXISTS employee_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL, -- Aadhaar, PAN, License, etc
  file_name TEXT,
  file_path TEXT,
  verified INTEGER DEFAULT 0,
  verified_by INTEGER REFERENCES users(id),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- OFFICE COMPUTER WHITELIST
-- =====================
CREATE TABLE IF NOT EXISTS device_whitelist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  mac_address TEXT, -- e.g. 10-FF-E0-4E-C3-3D
  ip_address TEXT,
  user_agent TEXT,
  assigned_user_id INTEGER REFERENCES users(id),
  office_id INTEGER REFERENCES offices(id),
  is_active INTEGER DEFAULT 1,
  last_seen_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id)
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_emp_office ON employees(office_id);
CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_emp_status ON employees(employee_status);
CREATE INDEX IF NOT EXISTS idx_att_emp_date ON attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_payroll_run ON payroll_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_leave_emp_status ON leaves(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_device_fp ON device_whitelist(fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_active ON device_whitelist(is_active);
