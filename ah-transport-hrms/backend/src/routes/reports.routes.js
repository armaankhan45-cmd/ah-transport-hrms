const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, authorize, officeScope } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, officeScope);

router.get('/headcount', authorize(['report.read']), (req, res) => {
  const db = getDb();
  const sql = `
    SELECT o.code as office_code, o.name as office_name,
      SUM(CASE WHEN e.employment_type='Permanent' THEN 1 ELSE 0 END) as permanent,
      SUM(CASE WHEN e.employment_type='Driver' THEN 1 ELSE 0 END) as drivers,
      SUM(CASE WHEN e.employment_type='Contract' THEN 1 ELSE 0 END) as contract,
      COUNT(*) as total
    FROM employees e LEFT JOIN offices o ON o.id=e.office_id
    WHERE e.employee_status='Active'
    GROUP BY o.id
  `;
  res.json({ data: db.prepare(sql).all() });
});

router.get('/attendance-summary', authorize(['report.read']), (req, res) => {
  const { start, end } = req.query;
  const s = start || new Date(new Date().getFullYear(), new Date().getMonth(),1).toISOString().slice(0,10);
  const e = end || new Date().toISOString().slice(0,10);
  const db = getDb();
  let sql = `
    SELECT e.employee_code, e.first_name||' '||e.last_name as name, o.code as office,
      SUM(CASE WHEN a.status='Present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status='Late' THEN 1 ELSE 0 END) as late,
      SUM(CASE WHEN a.status='Absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN a.status='Leave' THEN 1 ELSE 0 END) as leave_days,
      COALESCE(SUM(a.work_hours),0) as work_hours,
      COALESCE(SUM(a.overtime_hours),0) as ot_hours
    FROM employees e
    LEFT JOIN attendance a ON a.employee_id=e.id AND a.attendance_date BETWEEN ? AND ?
    LEFT JOIN offices o ON o.id=e.office_id
    WHERE e.employee_status='Active'
  `;
  const params=[s,e];
  if (req.officeFilter) { sql += ' AND e.office_id=?'; params.push(req.officeFilter); }
  sql += ' GROUP BY e.id ORDER BY e.employee_code';
  res.json({ start: s, end: e, data: db.prepare(sql).all(...params) });
});

router.get('/audit-logs', authorize(['audit.read']), (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500`).all();
  res.json({ data: rows });
});

router.get('/calendar/events', (req, res) => {
  const db = getDb();
  const month = req.query.month || new Date().toISOString().slice(0,7);
  const holidays = db.prepare(`SELECT holiday_date as date, name as title, 'holiday' as type FROM holidays WHERE substr(holiday_date,1,7)=?`).all(month);
  // approved leaves calendar
  let leaveSql = `SELECT l.start_date, l.end_date, e.first_name||' '||e.last_name as title FROM leaves l JOIN employees e ON e.id=l.employee_id WHERE l.status='Approved' AND (substr(l.start_date,1,7)=? OR substr(l.end_date,1,7)=?)`;
  const params=[month, month];
  if (req.officeFilter) { leaveSql += ' AND e.office_id=?'; params.push(req.officeFilter); }
  const leaves = db.prepare(leaveSql).all(...params).map(l=>({ date:l.start_date, end:l.end_date, title:l.title+' - Leave', type:'leave' }));
  res.json({ events: [...holidays, ...leaves] });
});

router.get('/notifications', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ data: rows });
});

router.post('/notifications/:id/read', (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
