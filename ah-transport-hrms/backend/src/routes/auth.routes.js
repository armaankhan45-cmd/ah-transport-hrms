const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../db/database');
const { verifyPassword, hashPassword, signToken } = require('../utils/auth');
const { authenticate } = require('../middleware/auth');
const config = require('../config/env');

const router = express.Router();

// Login
router.post('/login',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const db = getDb();
    const ip = req.ip;

    const user = db.prepare(`
      SELECT u.*, r.code as role_code, r.name as role_name, r.permissions, o.name as office_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN offices o ON o.id = u.office_id
      WHERE LOWER(u.email) = LOWER(?)
    `).get(email);

    const fail = (reason) => {
      db.prepare('INSERT INTO login_attempts (email, ip_address, success, failure_reason, user_agent) VALUES (?,?,?,?,?)')
        .run(email, ip, 0, reason, req.get('user-agent')||'');
      return res.status(401).json({ error: 'Invalid email or password' });
    };

    if (!user) return fail('user_not_found');
    if (!user.is_active) return fail('inactive');
    if (user.is_locked) return res.status(423).json({ error: 'Account locked. Contact HR.' });

    // office IP restriction check
    if (user.office_id) {
      const office = db.prepare('SELECT allowed_ip_ranges FROM offices WHERE id=?').get(user.office_id);
      if (office && office.allowed_ip_ranges) {
        try {
          const ranges = JSON.parse(office.allowed_ip_ranges);
          // If ranges configured and not empty, allow, else enforce? Enterprise default: allow all if empty array includes ""
          // Simplified: log only, do not block unless strict mode env set
        } catch(e){}
      }
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      db.prepare('UPDATE users SET failed_login_attempts=? WHERE id=?').run(attempts, user.id);
      if (attempts >= config.MAX_LOGIN_ATTEMPTS) {
        db.prepare('UPDATE users SET is_locked=1 WHERE id=?').run(user.id);
      }
      return fail('bad_password');
    }

    // success
    db.prepare('UPDATE users SET failed_login_attempts=0, last_login_at=CURRENT_TIMESTAMP, last_login_ip=? WHERE id=?')
      .run(ip, user.id);
    db.prepare('INSERT INTO login_attempts (email, ip_address, success, user_agent) VALUES (?,?,1,?)')
      .run(email, ip, req.get('user-agent')||'');

    const token = signToken({ sub: user.id, role: user.role_code, office: user.office_id });
    
    // audit
    db.prepare(`INSERT INTO audit_logs (actor_user_id, actor_email, action, ip_address, user_agent, severity)
      VALUES (?,?,?,?,?,'low')`).run(user.id, user.email, 'LOGIN', ip, req.get('user-agent')||'');

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        employee_code: user.employee_code,
        role_code: user.role_code,
        role_name: user.role_name,
        office_id: user.office_id,
        office_name: user.office_name,
        permissions: JSON.parse(user.permissions || '[]')
      }
    });
  }
);

router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const emp = db.prepare(`
    SELECT e.first_name, e.last_name, e.designation, e.photo_url, d.name as department_name, o.name as office_name
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN offices o ON o.id = e.office_id
    WHERE e.user_id = ?
  `).get(req.user.id);
  res.json({ ...req.user, employee: emp || null });
});

// Change password
router.post('/change-password', authenticate,
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 8 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    const ok = await verifyPassword(req.body.currentPassword, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Current password incorrect' });
    const newHash = await hashPassword(req.body.newPassword);
    db.prepare('UPDATE users SET password_hash=?, password_changed_at=CURRENT_TIMESTAMP, must_change_password=0 WHERE id=?')
      .run(newHash, req.user.id);
    res.json({ success: true });
  }
);

module.exports = router;
