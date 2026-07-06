const express = require('express');
const { body, query } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, authorize, officeScope } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate, officeScope);

// my attendance
router.get('/my', (req, res) => {
  const db = getDb();
  const emp = db.prepare('SELECT id FROM employees WHERE user_id=?').get(req.user.id);
  if (!emp) return res.json({ data: [] });
  const month = req.query.month || new Date().toISOString().slice(0,7); // YYYY-MM
  const rows = db.prepare(`
    SELECT * FROM attendance WHERE employee_id=? AND substr(attendance_date,1,7)=?
    ORDER BY attendance_date DESC
  `).all(emp.id, month);
  res.json({ data: rows });
});

// checkin
router.post('/checkin', audit('ATTENDANCE_CHECKIN','attendance'), (req, res) => {
  const db = getDb();
  const emp = db.prepare('SELECT id, office_id, shift_code FROM employees WHERE user_id=?').get(req.user.id);
  if (!emp) return res.status(400).json({ error: 'Employee profile not linked' });
  const today = new Date().toISOString().slice(0,10);
  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM attendance WHERE employee_id=? AND attendance_date=?').get(emp.id, today);
  if (existing && existing.check_in_time) return res.status(400).json({ error: 'Already checked in' });
  // office IP / geofence validation (simplified log)
  const checkInOffice = emp.office_id;
  const shift = db.prepare('SELECT * FROM shifts WHERE code=?').get(emp.shift_code || 'GENERAL');
  let status='Present', late_minutes=0;
  if (shift) {
    const [sh, sm] = shift.start_time.split(':').map(Number);
    const nowD = new Date();
    const shiftStart = new Date(nowD); shiftStart.setHours(sh, sm, 0, 0);
    const diff = Math.round((nowD - shiftStart)/60000);
    if (diff > shift.grace_minutes) { late_minutes = diff; status='Late'; }
  }
  if (existing) {
    db.prepare('UPDATE attendance SET check_in_time=?, check_in_ip=?, check_in_office_id=?, status=?, late_minutes=? WHERE id=?')
      .run(now, req.ip, checkInOffice, status, late_minutes, existing.id);
    res.json({ success: true, check_in_time: now, status });
  } else {
    db.prepare(`INSERT INTO attendance (employee_id, attendance_date, shift_code, check_in_time, check_in_ip, check_in_office_id, status, late_minutes)
      VALUES (?,?,?,?,?,?,?,?)`).run(emp.id, today, emp.shift_code || 'GENERAL', now, req.ip, checkInOffice, status, late_minutes);
    res.json({ success: true, check_in_time: now, status });
  }
});

// checkout
router.post('/checkout', audit('ATTENDANCE_CHECKOUT','attendance'), (req, res) => {
  const db = getDb();
  const emp = db.prepare('SELECT id FROM employees WHERE user_id=?').get(req.user.id);
  if (!emp) return res.status(400).json({ error: 'No employee' });
  const today = new Date().toISOString().slice(0,10);
  const att = db.prepare('SELECT * FROM attendance WHERE employee_id=? AND attendance_date=?').get(emp.id, today);
  if (!att || !att.check_in_time) return res.status(400).json({ error: 'Check in first' });
  if (att.check_out_time) return res.status(400).json({ error: 'Already checked out' });
  const now = new Date();
  const checkIn = new Date(att.check_in_time);
  const work_hours = Math.round(((now - checkIn)/3600000)*100)/100;
  const overtime = work_hours > 9 ? Math.round((work_hours-9)*100)/100 : 0;
  db.prepare('UPDATE attendance SET check_out_time=?, check_out_ip=?, work_hours=?, overtime_hours=? WHERE id=?')
    .run(now.toISOString(), req.ip, work_hours, overtime, att.id);
  res.json({ success:true, work_hours, overtime_hours: overtime });
});

// list all (manager)
router.get('/', authorize(['attendance.read']), (req, res) => {
  const db = getDb();
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const office_id = req.officeFilter || req.query.office_id;
  let sql = `
    SELECT a.*, e.first_name||' '||e.last_name as employee_name, e.employee_code, o.code as office_code
    FROM attendance a
    JOIN employees e ON e.id=a.employee_id
    LEFT JOIN offices o ON o.id=e.office_id
    WHERE a.attendance_date = ?
  `;
  const params = [date];
  if (office_id) { sql += ' AND e.office_id=?'; params.push(office_id); }
  sql += ' ORDER BY a.check_in_time DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows, date });
});

// regularize
router.put('/:id/regularize', authorize(['attendance.write']), audit('ATTENDANCE_REGULARIZE','attendance','medium'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE attendance SET is_regularized=1, regularization_reason=?, approved_by=?, status=COALESCE(?,status) WHERE id=?')
    .run(req.body.reason||'Manager regularized', req.user.id, req.body.status||null, req.params.id);
  res.json({ success:true });
});

module.exports = router;
