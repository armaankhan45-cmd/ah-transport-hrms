const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDb } = require('../db/database');
const { authenticate, authorize, officeScope } = require('../middleware/auth');
const { audit } = require('../middleware/audit');
const { hashPassword } = require('../utils/auth');

const router = express.Router();
router.use(authenticate, officeScope);

// List with filters
router.get('/', authorize(['employee.read','self.read']), 
  query('q').optional().isString(),
  query('office_id').optional().isInt(),
  query('department_id').optional().isInt(),
  query('status').optional().isString(),
  query('page').optional().isInt({ min:1 }),
  query('limit').optional().isInt({ min:1, max:200 }),
  (req, res) => {
    const db = getDb();
    const page = parseInt(req.query.page||'1',10);
    const limit = parseInt(req.query.limit||'25',10);
    const offset = (page-1)*limit;
    let where = ['1=1'];
    const params = [];
    if (req.officeFilter) { where.push('e.office_id = ?'); params.push(req.officeFilter); }
    if (req.query.office_id) { where.push('e.office_id = ?'); params.push(req.query.office_id); }
    if (req.query.department_id) { where.push('e.department_id = ?'); params.push(req.query.department_id); }
    if (req.query.status) { where.push('e.employee_status = ?'); params.push(req.query.status); }
    if (req.query.q) { where.push('(e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)'); const s=`%${req.query.q}%`; params.push(s,s,s,s); }
    // employees can only see self unless they have employee.read
    const canReadAll = req.user.permissions.includes('*') || req.user.permissions.includes('employee.read');
    if (!canReadAll) {
      where.push('e.user_id = ?'); params.push(req.user.id);
    }
    const whereSql = where.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) as c FROM employees e WHERE ${whereSql}`).get(...params).c;
    const rows = db.prepare(`
      SELECT e.*, d.name as department_name, o.name as office_name, o.code as office_code,
             rm.first_name || ' ' || rm.last_name as manager_name
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN offices o ON o.id = e.office_id
      LEFT JOIN employees rm ON rm.id = e.reporting_manager_id
      WHERE ${whereSql}
      ORDER BY e.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    res.json({ data: rows, total, page, limit, pages: Math.ceil(total/limit) });
});

router.get('/:id', authorize(['employee.read','self.read']), (req, res) => {
  const db = getDb();
  const emp = db.prepare(`
    SELECT e.*, d.name as department_name, o.name as office_name
    FROM employees e
    LEFT JOIN departments d ON d.id=e.department_id
    LEFT JOIN offices o ON o.id=e.office_id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  // office scope check
  if (req.officeFilter && emp.office_id !== req.officeFilter) return res.status(403).json({ error: 'Forbidden office' });
  // self check
  const canReadAll = req.user.permissions.includes('*') || req.user.permissions.includes('employee.read');
  if (!canReadAll && emp.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  // salary structure
  const salary = db.prepare('SELECT * FROM salary_structures WHERE employee_id=? AND is_active=1 ORDER BY effective_from DESC LIMIT 1').get(emp.id);
  res.json({ ...emp, salary });
});

// Create employee
router.post('/', authorize('employee.write'), audit('EMPLOYEE_CREATE','employee','medium'),
  body('first_name').notEmpty(),
  body('last_name').notEmpty(),
  body('email').isEmail(),
  body('designation').notEmpty(),
  body('department_id').isInt(),
  body('office_id').isInt(),
  body('date_of_joining').isISO8601(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const db = getDb();
    const b = req.body;
    // generate employee_code
    const count = db.prepare('SELECT COUNT(*) as c FROM employees').get().c + 1001;
    const empCode = `AHT${count}`;
    try {
      const tx = db.transaction(() => {
        // create user first if create_user flag
        let user_id = null;
        if (b.create_user_account !== false) {
          const roleId = db.prepare('SELECT id FROM roles WHERE code=?').get(b.role_code || 'EMPLOYEE')?.id || 6;
          const defaultPwd = 'AHT@' + Math.floor(1000+Math.random()*8999);
          // async hash - need do outside? simplified sync using hashPassword then insert - must await, so do outside tx? We used tx sync, do inline using bcrypt sync
          const bcrypt = require('bcryptjs');
          const pwdHash = bcrypt.hashSync(b.initial_password || defaultPwd, 12);
          const u = db.prepare(`INSERT INTO users (employee_code, email, password_hash, role_id, office_id, must_change_password)
            VALUES (?,?,?,?,?,1)`).run(empCode, b.email, pwdHash, roleId, b.office_id);
          user_id = u.lastInsertRowid;
        }
        const ins = db.prepare(`INSERT INTO employees
          (user_id, employee_code, first_name, last_name, display_name, email, phone, department_id, office_id,
           designation, employment_type, date_of_joining, reporting_manager_id, gender, dob, address_line1, city, state, pincode,
           pan_number, aadhaar_number, bank_name, bank_account_no, bank_ifsc, created_by)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        const r = ins.run(
          user_id,
          empCode,
          b.first_name, b.last_name,
          b.display_name || `${b.first_name} ${b.last_name}`,
          b.email, b.phone || null,
          b.department_id, b.office_id,
          b.designation, b.employment_type || 'Permanent',
          b.date_of_joining, b.reporting_manager_id || null,
          b.gender || null, b.dob || null,
          b.address_line1 || null, b.city || null, b.state || null, b.pincode || null,
          b.pan_number || null, b.aadhaar_number || null,
          b.bank_name || null, b.bank_account_no || null, b.bank_ifsc || null,
          req.user.id
        );
        const empId = r.lastInsertRowid;
        // salary structure if provided
        if (b.ctc_annual) {
          db.prepare(`INSERT INTO salary_structures 
            (employee_id, effective_from, ctc_annual, basic_monthly, hra_monthly, conveyance_monthly, special_allowance_monthly, driver_allowance_monthly)
            VALUES (?,?,?,?,?,?,?,?)`).run(
              empId, b.date_of_joining, b.ctc_annual,
              b.basic_monthly || Math.round((b.ctc_annual/12)*0.4),
              b.hra_monthly || 0, b.conveyance_monthly || 1600,
              b.special_allowance_monthly || 0,
              b.driver_allowance_monthly || 0
            );
        }
        // init leave balances current year
        const year = new Date().getFullYear();
        const leaveTypes = db.prepare('SELECT code, annual_quota FROM leave_types').all();
        const lbStmt = db.prepare('INSERT OR IGNORE INTO leave_balances (employee_id, leave_type_code, year, opening_balance, accrued) VALUES (?,?,?,?,?)');
        leaveTypes.forEach(lt => lbStmt.run(empId, lt.code, year, 0, lt.annual_quota));
        return empId;
      });
      const newId = tx();
      res.status(201).json({ id: newId, employee_code: empCode });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: e.message });
    }
});

// Update
router.put('/:id', authorize('employee.write'), audit('EMPLOYEE_UPDATE','employee','medium'), (req, res) => {
  const db = getDb();
  const emp = db.prepare('SELECT * FROM employees WHERE id=?').get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  if (req.officeFilter && emp.office_id !== req.officeFilter) return res.status(403).json({ error: 'Forbidden office' });
  const allowed = ['first_name','last_name','phone','designation','department_id','office_id','employment_type','reporting_manager_id','employee_status','address_line1','city','state','pincode','bank_name','bank_account_no','bank_ifsc'];
  const sets = []; const vals = [];
  allowed.forEach(k => { if (k in req.body) { sets.push(`${k}=?`); vals.push(req.body[k]); }});
  if (!sets.length) return res.json({ success: true });
  vals.push(req.params.id);
  db.prepare(`UPDATE employees SET ${sets.join(',')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...vals);
  res.json({ success: true });
});

// Delete (soft - exit)
router.delete('/:id', authorize('employee.write'), audit('EMPLOYEE_DELETE','employee','high'), (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE employees SET employee_status='Exited', date_of_exit=date('now'), updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
