# Production Go-Live Checklist – A.H. Transport HRMS v1.0

## Infrastructure
- [ ] Server: 4 vCPU / 8GB / 100GB SSD, Ubuntu 22.04 LTS
- [ ] Node 20 LTS installed
- [ ] Nginx reverse proxy + Let's Encrypt TLS
- [ ] Firewall: 443, 80 open; 8080 localhost only
- [ ] Timezone IST (Asia/Kolkata), NTP synced

## Application
- [ ] .env configured: JWT_SECRET 64+ random, NODE_ENV=production
- [ ] npm ci --only=production, no devDeps
- [ ] npm run migrate + seed executed
- [ ] PM2 cluster mode: pm2 start src/server.js -i 2 --name ah-hrms
- [ ] Health check /api/health 200
- [ ] Log rotation: pm2 install pm2-logrotate

## Security
- [ ] Default admin password changed
- [ ] CORS_ORIGIN set to production domain
- [ ] Rate limit verified
- [ ] Helmet headers verified
- [ ] Office IP ranges configured
- [ ] fail2ban enabled on auth endpoint
- [ ] Backups cron active, test restore done
- [ ] Audit log review enabled

## Data
- [ ] Offices verified: Mumbai, Delhi, BLR, Chennai, Kolkata, Nagpur
- [ ] Departments mapped
- [ ] Holidays FY 2026-27 loaded
- [ ] Employee import CSV validated – 1000 records test
- [ ] Salary structures active effective 2024-04-01
- [ ] Leave balances initialized

## Payroll
- [ ] PF/ESI/PT rates verified with Finance
- [ ] Test payroll run in Draft, totals reconciled
- [ ] Payslip PDF branding approved
- [ ] Bank transfer format tested

## User Acceptance
- [ ] HR Admin UAT sign-off
- [ ] Branch Manager UAT sign-off
- [ ] Payroll Manager UAT sign-off
- [ ] Employee self-service tested (check-in, leave apply, payslip download)
- [ ] Mobile responsive verified (Android/iOS)

## Operations
- [ ] Runbook distributed
- [ ] Backup & Restore tested
- [ ] Monitoring: Uptime Kuma + /api/health
- [ ] On-call roster published
- [ ] Training: HR team 2hr workshop completed

Sign-off:
HR Head: ______________ Date: ______
IT Head: ______________ Date: ______
CFO: ______________ Date: ______
