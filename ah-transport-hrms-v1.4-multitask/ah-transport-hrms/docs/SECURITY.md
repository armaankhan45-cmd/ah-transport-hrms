# Security Notes – AH Transport HRMS v1.0

## Authentication
- JWT HS256, 8h expiry, secret 48+ chars rotatable
- bcrypt 12 rounds, password min 8 chars
- Brute force: 5 failed → 30 min lockout, login_attempts table logged
- must_change_password flag for first login
- last_login_ip tracked

## Authorization
- RBAC 6 roles, permissions JSON array, hierarchy_level
- Middleware: authenticate → authorize → officeScope
- Office data isolation: Branch Manager restricted to office_id automatically
- Self-service endpoints enforce user_id = employee.user_id

## Transport Security
- Helmet: HSTS, frameguard, nosniff, XSS filter
- CORS configurable, credentials true
- Rate limit: 300 / 15m / IP
- Trust proxy enabled – X-Forwarded-For respected

## Data Protection
- PII: Aadhaar, PAN encrypted at rest in future roadmap – currently access-controlled
- Audit_logs immutable append-only, severity low/medium/high/critical
- SQL Injection: all queries parameterized (better-sqlite3 prepared statements)
- XSS: front-end escapes output, no innerHTML user data injection

## Office Access Restrictions
- offices.allowed_ip_ranges JSON CIDR list
- geofence_lat/lng/radius_m stored – check-in logs IP + office_id
- Current mode: log & warn – set OFFICE_IP_STRICT=true to enforce 403

## Compliance
- India payroll: PF, ESI, PT Maharashtra, TDS
- Audit trail suitable for ISO 27001, SOC2 evidence
- Retention: audit_logs 7 years recommended

## Hardening Checklist (Production)
- [ ] Change JWT_SECRET, rotate quarterly
- [ ] Enable HTTPS + HSTS, TLS 1.2+
- [ ] Set CORS_ORIGIN to https://hrms.ahtransport.co.in
- [ ] Enable OFFICE_IP_STRICT=true
- [ ] Daily DB backup encrypted offsite
- [ ] Fail2ban on /api/auth/login 401 spikes
- [ ] WAF (Cloudflare) in front
- [ ] Password policy: 12 chars, 90-day rotation – enforce via must_change_password
- [ ] MFA: mfa_secret column ready – TOTP to be enabled Q3 2026
- [ ] DB encryption at rest (LUKS)
- [ ] Security headers CSP strict (currently disabled for Tailwind CDN – move to self-host)
- [ ] SAST: npm audit – 0 critical

Incident contact: security@ahtransport.co.in
