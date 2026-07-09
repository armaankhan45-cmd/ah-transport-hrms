const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, authorize, officeScope } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate, officeScope);

function calcDays(start, end) {
  const s = new Date(start); const e = new Date(end);
  const diff = Math.round((e - s)/86400000) + 1;
  return diff > 0 ? diff : 1;
}

// list
router.get('/', (req, res) => {
  const db = getDb();
  const canApprove = req.user.permissions.includes('*') || req.user.permissions.includes('leave.approve') || req.user.permissions.includes('leave.approve.office');
  let sql = `
    SELECT l.*, lt.name as leave_type_name, lt.color_hex,
           e.first_name||' '||e.last_name as employee_name, e.employee_code,
           o.name as office_name
    FROM leaves l
    JOIN leave_types lt ON lt.code=l.leave_type_code
    JOIN employees e ON e.id=l.employee_id
    LEFT JOIN offices o ON o.id=e.office_id
    WHERE 1=1
  `;
  const params=[];
  if (!canApprove) {
    // self only
    const emp = db.prepare('SELECT id FROM employees WHERE user_id=?').get(req.user.id);
    sql += ' AND l.employee_id=?'; params.push(emp?emp.id:-1);
  } else if (req.officeFilter) {
    sql += ' AND e.office_id=?'; params.push(req.officeFilter);
  }
  if (req.query.status) { sql += ' AND l.status=?'; params.push(req.query.status); }
  sql += ' ORDER BY l.applied_at DESC LIMIT 200';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows });
});

// apply
router.post('/', 
  body('leave_type_code').notEmpty(),
  body('start_date').isISO8601(),
  body('end_date').isISO8601(),
  body('reason').isLength({ min: 5 }),
  audit('LEAVE_APPLY','leave'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const db = getDb();
    const emp = db.prepare('SELECT id FROM employees WHERE user_id=?').get(req.user.id);
    if (!emp) return res.status(400).json({ error: 'Employee profile missing' });
    const total_days = calcDays(req.body.start_date, req.body.end_date);
    // check balance
    const year = new Date(req.body.start_date).getFullYear();
    const bal = db.prepare('SELECT balance FROM leave_balances WHERE employee_id=? AND leave_type_code=? AND year=?')
      .get(emp.id, req.body.leave_type_code, year);
    if (bal && bal.balance < total_days && req.body.leave_type_code !== 'LOP') {
      // still allow but warn
    }
    const r = db.prepare(`INSERT INTO leaves (employee_id, leave_type_code, start_date, end_date, total_days, reason, contact_phone, address_during_leave)
      VALUES (?,?,?,?,?,?,?,?)`).run(
        emp.id, req.body.leave_type_code, req.body.start_date, req.body.end_date,
        total_days, req.body.reason, req.body.contact_phone||null, req.body.address_during_leave||null
    );
    // notify managers
    res.status(201).json({ id: r.lastInsertRowid, total_days });
});

// approve
router.put('/:id/approve', authorize(['leave.approve','leave.approve.office']), audit('LEAVE_APPROVE','leave','medium'), (req, res) => {
  const db = getDb();
  const leave = db.prepare('SELECT l.*, e.office_id FROM leaves l JOIN employees e ON e.id=l.employee_id WHERE l.id=?').get(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Not found' });
  if (req.officeFilter && leave.office_id !== req.officeFilter) return res.status(403).json({ error: 'Office restricted' });
  db.prepare('UPDATE leaves SET status=?, approved_by=?, approved_at=CURRENT_TIMESTAMP WHERE id=?').run('Approved', req.user.id, req.params.id);
  // deduct balance
  const year = new Date(leave.start_date).getFullYear();
  db.prepare(`UPDATE leave_balances SET availed = availed + ? 
    WHERE employee_id=? AND leave_type_code=? AND year=?`).run(leave.total_days, leave.employee_id, leave.leave_type_code, year);
  // create attendance entries as Leave
  const tx = db.transaction(() => {
    let d = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    while (d <= end) {
      const ds = d.toISOString().slice(0,10);
      db.prepare(`INSERT INTO attendance (employee_id, attendance_date, status, work_hours)
        VALUES (?,?, 'Leave', 0)
        ON CONFLICT(employee_id, attendance_date) DO UPDATE SET status='Leave'`).run(leave.employee_id, ds);
      d.setDate(d.getDate()+1);
    }
  });
  tx();
  res.json({ success: true });
});

router.put('/:id/reject', authorize(['leave.approve','leave.approve.office']), audit('LEAVE_REJECT','leave','medium'), (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE leaves SET status='Rejected', approved_by=?, approved_at=CURRENT_TIMESTAMP, rejection_reason=? WHERE id=?`)
    .run(req.user.id, req.body.reason||'Not approved', req.params.id);
  res.json({ success:true });
});

// leave types & balances
router.get('/types/list', (req, res) => {
  const db = getDb();
  const types = db.prepare('SELECT * FROM leave_types ORDER BY code').all();
  res.json({ data: types });
});

router.get('/balance/my', (req, res) => {
  const db = getDb();
  const emp = db.prepare('SELECT id FROM employees WHERE user_id=?').get(req.user.id);
  if (!emp) return res.json({ data: [] });
  const year = parseInt(req.query.year || new Date().getFullYear(),10);
  const rows = db.prepare(`
    SELECT lb.*, lt.name as leave_type_name, lt.color_hex, lt.annual_quota
    FROM leave_balances lb
    JOIN leave_types lt ON lt.code=lb.leave_type_code
    WHERE lb.employee_id=? AND lb.year=?
  `).all(emp.id, year);
  res.json({ data: rows, year });
});

module.exports = router;
