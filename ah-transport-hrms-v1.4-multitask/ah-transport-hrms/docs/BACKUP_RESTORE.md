# Backup & Restore – AH Transport HRMS

## SQLite WAL Backup

Live hot backup (no downtime):
```
sqlite3 /opt/ah-transport-hrms/database/hrms.sqlite ".backup /backups/hrms-$(date +%F_%H%M).sqlite"
```

Automated cron – /etc/cron.d/ah-hrms:
```
*/30 * * * * hrms /usr/bin/sqlite3 /opt/ah-transport-hrms/database/hrms.sqlite ".backup /backups/hourly/hrms-$(date +\%F_\%H\%M).sqlite" && find /backups/hourly -mtime +2 -delete
15 2 * * * hrms tar -czf /backups/daily/hrms-$(date +\%F).tar.gz -C /opt/ah-transport-hrms database backend/uploads && find /backups/daily -mtime +30 -delete
```

Offsite sync:
```
rclone sync /backups/daily s3:ah-hrms-backups --fast-list
```

## Restore
1. Stop app: `pm2 stop ah-hrms`
2. Replace: `cp /backups/hrms-2026-07-05.sqlite /opt/ah-transport-hrms/database/hrms.sqlite`
3. Verify: `sqlite3 ... "PRAGMA integrity_check;"`
4. Start: `pm2 start ah-hrms`

Point-in-time: SQLite WAL allows PIT – copy both hrms.sqlite, hrms.sqlite-wal, hrms.sqlite-shm together.

## Payroll Lock
After payroll approve, run is status='Approved'.
To prevent edits: `UPDATE payroll_runs SET status='Locked' WHERE id=?;`

## Disaster Recovery
RTO: 1 hour
RPO: 30 minutes

DR site: restore latest backup to secondary VM, update DNS A record hrms.ahtransport.co.in

Test restore quarterly – documented in audit_logs with action=RESTORE_TEST
