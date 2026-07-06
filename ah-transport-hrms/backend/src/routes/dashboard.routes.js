const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, officeScope } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, officeScope);

router.get('/stats', (req, res) => {
  const db = getDb();
  const officeFilter = req.officeFilter;
  const of = officeFilter ? ' AND office_id = ' + officeFilter : '';
  const total_employees = db.prepare(`SELECT COUNT(*) as c FROM employees WHERE employee_status='Active'${of}`).get().c;
  const today = new Date().toISOString().slice(0,10);
  const present_today = db.prepare(`SELECT COUNT(DISTINCT a.employee_id) as c FROM attendance a JOIN employees e ON e.id=a.employee_id
    WHERE a.attendance_date=? AND a.status IN ('Present','Late') ${officeFilter ? 'AND e.office_id='+officeFilter : ''}`).get(today).c;
  const on_leave = db.prepare(`
    SELECT COUNT(*) as c FROM leaves l JOIN employees e ON e.id=l.employee_id
    WHERE l.status='Approved' AND ? BETWEEN l.start_date AND l.end_date ${of.replace('office_id','e.office_id')}
  `).get(today).c;
  const pending_leaves = db.prepare(`SELECT COUNT(*) as c FROM leaves l JOIN employees e ON e.id=l.employee_id
    WHERE l.status='Pending' ${officeFilter ? 'AND e.office_id='+officeFilter : ''}`).get().c;
  const month = new Date().getMonth()+1;
  const year = new Date().getFullYear();
  const payroll_month = db.prepare('SELECT net_total, employee_count, status FROM payroll_runs WHERE pay_month=? AND pay_year=? ORDER BY id DESC LIMIT 1').get(month, year) || {};
  
  // headcount by department
  const by_dept = db.prepare(`
    SELECT d.name, COUNT(e.id) as count
    FROM departments d LEFT JOIN employees e ON e.department_id=d.id AND e.employee_status='Active' ${officeFilter ? 'AND e.office_id='+officeFilter : ''}
    GROUP BY d.id, d.name ORDER BY count DESC
  `).all();
  // attendance trend last 7 days
  const trend = [];
  for (let i=6;i>=0;i--) {
    const dt = new Date(); dt.setDate(dt.getDate()-i);
    const ds = dt.toISOString().slice(0,10);
    const c = db.prepare(`SELECT COUNT(*) as c FROM attendance a JOIN employees e ON e.id=a.employee_id WHERE a.attendance_date=? AND a.status IN ('Present','Late') ${officeFilter ? 'AND e.office_id='+officeFilter : ''}`).get(ds).c;
    trend.push({ date: ds, present: c });
  }

  res.json({
    total_employees,
    present_today,
    on_leave_today: on_leave,
    pending_leaves,
    attendance_rate: total_employees ? Math.round((present_today/total_employees)*100) : 0,
    payroll_month,
    by_department: by_dept,
    attendance_trend: trend
  });
});

router.get('/analytics', (req, res) => {
  const db = getDb();
  // monthly payroll last 6 months
  const analytics = db.prepare(`
    SELECT pay_year, pay_month, SUM(net_total) as net_total, SUM(employee_count) as employees
    FROM payroll_runs WHERE status IN ('Approved','Paid')
    GROUP BY pay_year, pay_month ORDER BY pay_year DESC, pay_month DESC LIMIT 6
  `).all().reverse();
  res.json({ payroll_trend: analytics });
});

module.exports = router;
