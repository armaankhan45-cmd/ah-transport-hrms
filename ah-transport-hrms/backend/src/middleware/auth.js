const { verifyToken, hasPermission } = require('../utils/auth');
const { getDb } = require('../db/database');
const { deviceGuard: deviceCheck } = require('./officeSecurity');

function authenticate(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = verifyToken(token);
    const db = getDb();
    const user = db.prepare(`
      SELECT u.id, u.email, u.employee_code, u.role_id, u.office_id, u.is_active, u.is_locked,
             r.code as role_code, r.name as role_name, r.permissions
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
    `).get(decoded.sub);
    if (!user || !user.is_active || user.is_locked) {
      return res.status(401).json({ error: 'Account inactive or locked' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      employee_code: user.employee_code,
      role_id: user.role_id,
      role_code: user.role_code,
      role_name: user.role_name,
      office_id: user.office_id,
      permissions: JSON.parse(user.permissions || '[]')
    };
    // Office computer whitelist check
    return deviceCheck(req, res, next);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(requiredPerms) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    const perms = req.user.permissions || [];
    if (perms.includes('*')) return next();
    const needed = Array.isArray(requiredPerms) ? requiredPerms : [requiredPerms];
    const ok = needed.some(p => perms.includes(p));
    if (!ok) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    next();
  };
}

// Office data isolation
function officeScope(req, res, next) {
  const u = req.user;
  if (!u) return next();
  // Super admin and HR admin see all
  if (['SUPER_ADMIN','HR_ADMIN','PAYROLL_MANAGER','AUDITOR'].includes(u.role_code)) {
    req.officeFilter = null;
  } else {
    // Branch manager / employee -> restrict to own office
    req.officeFilter = u.office_id;
  }
  next();
}

module.exports = { authenticate, authorize, officeScope };
