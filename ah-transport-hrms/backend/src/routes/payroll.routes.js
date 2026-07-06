const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, authorize, officeScope } = require('../middleware/auth');
const { audit } = require('../middleware/audit');

const router = express.Router();
router.use(authenticate, officeScope);

function calculatePayrollForEmployee(emp, salary, payDays, monthDays, overtime_hours) {
  const factor = payDays / monthDays;
  const basic_earned = Math.round(salary.basic_monthly * factor);
  const hra_earned = Math.round((salary.hra_monthly||0) * factor);
  const conveyance_earned = Math.round((salary.conveyance_monthly||0) * factor);
  const special_earned = Math.round((salary.special_allowance_monthly||0) * factor);
  const driver_earned = Math.round((salary.driver_allowance_monthly||0) * factor);
  const overtime_earned = Math.round((overtime_hours||0) * (salary.overtime_rate_hourly||250));
  const gross = basic_earned + hra_earned + conveyance_earned + special_earned + driver_earned + overtime_earned;
  // Deductions India
  const pf_employee = salary.pf_applicable ? Math.min(Math.round(basic_earned * 0.12), 1800) : 0;
  const esi_employee = salary.esi_applicable && gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  let pt = 0;
  if ((salary.pt_state||'Maharashtra') === 'Maharashtra') { pt = gross > 10000 ? 200 : 0; if (['2','3'].includes(String(new Date().getMonth()+1))===false){} } // simplified
  // Feb extra? skip
  if (gross <= 7500) pt = 0; else if (gross <= 10000) pt = 175; else pt = 200;
  const tds = salary.tds_per_month || 0;
  const total_deductions = pf_employee + esi_employee + pt + tds;
  const net_pay = gross - total_deductions;
  const pf_employer = pf_employee;
  const esi_employer = salary.esi_applicable && gross <= 21000 ? Math.round(gross * 0.0325) : 0;
  return {
    basic_earned, hra_earned, conveyance_earned, special_allowance_earned: special_earned,
    driver_allowance_earned: driver_earned, overtime_earned, gross_earnings: gross,
    pf_employee, esi_employee, professional_tax: pt, tds,
    total_deductions, net_pay,
    pf_employer, esi_employer
  };
}

// list runs
router.get('/runs', authorize(['payroll.read']), (req, res) => {
  const db = getDb();
  let sql = 'SELECT pr.*, o.name as office_name, o.code as office_code FROM payroll_runs pr LEFT JOIN offices o ON o.id=pr.office_id WHERE 1=1';
  const params=[];
  if (req.officeFilter) { sql += ' AND (pr.office_id=? OR pr.office_id IS NULL)'; params.push(req.officeFilter); }
  sql += ' ORDER BY pr.pay_year DESC, pr.pay_month DESC';
  res.json({ data: db.prepare(sql).all(...params) });
});

// generate
router.post('/generate', authorize(['payroll.write']), audit('PAYROLL_GENERATE','payroll','high'), (req, res) => {
  const { pay_month, pay_year, office_id } = req.body;
  if (!pay_month || !pay_year) return res.status(400).json({ error: 'pay_month/pay_year required' });
  const db = getDb();
  const monthStr = String(pay_month).padStart(2,'0');
  const period_start = `${pay_year}-${monthStr}-01`;
  const period_end = new Date(pay_year, pay_month, 0).toISOString().slice(0,10);
  const monthDays = new Date(pay_year, pay_month, 0).getDate();
  const run_code = `PR-${pay_year}-${monthStr}${office_id?'-O'+office_id:''}`;

  const existing = db.prepare('SELECT id FROM payroll_runs WHERE pay_month=? AND pay_year=? AND IFNULL(office_id,0)=IFNULL(?,0)').get(pay_month, pay_year, office_id||null);
  if (existing) return res.status(400).json({ error: 'Payroll run already exists. Delete first to regenerate.' });

  // get employees
  let empSql = `SELECT e.*, s.*,
    s.id as salary_id
    FROM employees e
    JOIN salary_structures s ON s.employee_id=e.id AND s.is_active=1
    WHERE e.employee_status='Active' AND e.date_of_joining <= ?
    AND (e.date_of_exit IS NULL OR e.date_of_exit >= ?)
  `;
  const params=[period_end, period_start];
  if (office_id) { empSql += ' AND e.office_id=?'; params.push(office_id); }
  else if (req.officeFilter) { empSql += ' AND e.office_id=?'; params.push(req.officeFilter); }
  const employees = db.prepare(empSql).all(...params);

  const tx = db.transaction(() => {
    const runIns = db.prepare(`INSERT INTO payroll_runs 
      (run_code, pay_month, pay_year, pay_period_start, pay_period_end, office_id, status, processed_by, processed_at)
      VALUES (?,?,?,?,?,?, 'Processing', ?, CURRENT_TIMESTAMP)`);
    const runId = runIns.run(run_code, pay_month, pay_year, period_start, period_end, office_id||null, req.user.id).lastInsertRowid;

    let gross_total=0, deductions_total=0, net_total=0, count=0;
    const itemStmt = db.prepare(`INSERT INTO payroll_items
      (payroll_run_id, employee_id, pay_days, lop_days, overtime_hours,
       basic_earned, hra_earned, conveyance_earned, special_allowance_earned, driver_allowance_earned, overtime_earned, gross_earnings,
       pf_employee, esi_employee, professional_tax, tds, total_deductions, net_pay, pf_employer, esi_employer,
       bank_account_no, bank_ifsc)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

    employees.forEach(emp => {
      // attendance summary
      const att = db.prepare(`
        SELECT 
          SUM(CASE WHEN status IN ('Present','Late','HalfDay','OnDuty') THEN 1 
                   WHEN status='HalfDay' THEN 0.5 ELSE 0 END) as present_days,
          SUM(overtime_hours) as ot_hours
        FROM attendance
        WHERE employee_id=? AND attendance_date BETWEEN ? AND ?
      `).get(emp.id, period_start, period_end);
      const present_days = att?.present_days || 0;
      const ot_hours = att?.ot_hours || 0;
      // leave paid days
      const leave_days = db.prepare(`
        SELECT SUM(total_days) as ld FROM leaves
        WHERE employee_id=? AND status='Approved'
          AND NOT (end_date < ? OR start_date > ?)
      `).get(emp.id, period_start, period_end)?.ld || 0;
      const pay_days = Math.min(monthDays, present_days + leave_days);
      const lop_days = Math.max(0, monthDays - pay_days);

      const calc = calculatePayrollForEmployee(emp, emp, pay_days, monthDays, ot_hours);
      itemStmt.run(
        runId, emp.id, pay_days, lop_days, ot_hours,
        calc.basic_earned, calc.hra_earned, calc.conveyance_earned, calc.special_allowance_earned, calc.driver_allowance_earned,
        calc.overtime_earned, calc.gross_earnings,
        calc.pf_employee, calc.esi_employee, calc.professional_tax, calc.tds,
        calc.total_deductions, calc.net_pay,
        calc.pf_employer, calc.esi_employer,
        emp.bank_account_no, emp.bank_ifsc
      );
      gross_total += calc.gross_earnings;
      deductions_total += calc.total_deductions;
      net_total += calc.net_pay;
      count++;
    });

    db.prepare(`UPDATE payroll_runs SET employee_count=?, gross_total=?, deductions_total=?, net_total=?, status='Draft'
      WHERE id=?`).run(count, gross_total, deductions_total, net_total, runId);
    return { runId, count, gross_total, net_total };
  });

  const result = tx();
  res.status(201).json(result);
});

// run details
router.get('/runs/:id', authorize(['payroll.read']), (req, res) => {
  const db = getDb();
  const run = db.prepare('SELECT * FROM payroll_runs WHERE id=?').get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  const items = db.prepare(`
    SELECT pi.*, e.first_name||' '||e.last_name as employee_name, e.employee_code, e.designation,
           o.code as office_code
    FROM payroll_items pi
    JOIN employees e ON e.id=pi.employee_id
    LEFT JOIN offices o ON o.id=e.office_id
    WHERE pi.payroll_run_id=?
    ORDER BY e.employee_code
  `).all(req.params.id);
  res.json({ run, items });
});

// approve
router.post('/runs/:id/approve', authorize(['payroll.approve']), audit('PAYROLL_APPROVE','payroll','critical'), (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE payroll_runs SET status='Approved', approved_by=?, approved_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(req.user.id, req.params.id);
  res.json({ success: true });
});

// my payslips
router.get('/my-slips', (req, res) => {
  const db = getDb();
  const emp = db.prepare('SELECT id FROM employees WHERE user_id=?').get(req.user.id);
  if (!emp) return res.json({ data: [] });
  const rows = db.prepare(`
    SELECT pi.*, pr.pay_month, pr.pay_year, pr.run_code, pr.pay_period_start, pr.pay_period_end
    FROM payroll_items pi
    JOIN payroll_runs pr ON pr.id=pi.payroll_run_id
    WHERE pi.employee_id=?
    ORDER BY pr.pay_year DESC, pr.pay_month DESC
  `).all(emp.id);
  res.json({ data: rows });
});

module.exports = router;
