const config = require('../config/env');
const { getDb } = require('../db/database');
const crypto = require('crypto');

// Simple CIDR matcher – IPv4 + IPv6 prefix
function ipToBigInt(ip) {
  if (ip.includes(':')) {
    // IPv6 – expand and convert
    // strip zone %6
    ip = ip.split('%')[0];
    // handle :: compression
    const parts = ip.split('::');
    let hextets = [];
    if (parts.length === 2) {
      const left = parts[0] ? parts[0].split(':') : [];
      const right = parts[1] ? parts[1].split(':') : [];
      const missing = 8 - left.length - right.length;
      hextets = [...left, ...Array(missing).fill('0'), ...right];
    } else {
      hextets = ip.split(':');
    }
    let val = 0n;
    hextets.forEach(h => {
      val = (val << 16n) + BigInt(parseInt(h || '0', 16));
    });
    return { v: val, bits: 128 };
  } else {
    // IPv4
    const b = ip.split('.').map(Number);
    if (b.length !== 4 || b.some(n => isNaN(n))) return null;
    const val = (BigInt(b[0])<<24n) + (BigInt(b[1])<<16n) + (BigInt(b[2])<<8n) + BigInt(b[3]);
    return { v: val, bits: 32 };
  }
}

function cidrMatch(ip, cidr) {
  try {
    const [net, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr || (net.includes(':') ? '128' : '32'), 10);
    const ipP = ipToBigInt(ip);
    const netP = ipToBigInt(net);
    if (!ipP || !netP || ipP.bits !== netP.bits) return false;
    const shift = BigInt(ipP.bits - prefix);
    return (ipP.v >> shift) === (netP.v >> shift);
  } catch { return false; }
}

function normalizeIp(req) {
  let ip = req.ip || req.connection.remoteAddress || '';
  // express gives ::ffff:192.168.1.29
  if (ip.startsWith('::ffff:')) ip = ip.substring(7);
  ip = ip.split('%')[0];
  return ip;
}

function isOfficeIp(ip) {
  // loopback always allowed for local admin
  if (['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip)) return true;
  for (const cidr of config.ALLOWED_NETWORKS) {
    if (cidr.includes('/')) {
      if (cidrMatch(ip, cidr)) return true;
    } else {
      if (ip === cidr) return true;
    }
  }
  return false;
}

// Device fingerprint – because MAC is not sent over HTTP, we use:
// - IP + User-Agent hash + optional device_id header (set by office IT)
// - Admin pre-approves devices in device_whitelist table
function deviceFingerprint(req) {
  const ip = normalizeIp(req);
  const ua = req.get('user-agent') || '';
  const deviceId = req.get('x-device-id') || req.get('x-ah-device') || '';
  // if deviceId provided (office IT installs a registry key / browser extension), use it
  const raw = deviceId ? `did:${deviceId}` : `${ip}|${ua}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0,32);
}

function officeNetworkGuard(req, res, next) {
  if (!config.OFFICE_IP_STRICT) return next();
  const ip = normalizeIp(req);

  // If request has JWT – defer to post-auth deviceGuard which knows role
  // This allows Admin remote access – employees will still be checked post-auth
  const authHdr = req.headers.authorization || '';
  if (authHdr.startsWith('Bearer ')) {
    return next();
  }

  // Admin remote access bypass – check if login attempt is admin
  // 1) If already authenticated (req.user), allow admin roles from anywhere
  if (req.user && ['SUPER_ADMIN','HR_ADMIN','PAYROLL_MANAGER','AUDITOR'].includes(req.user.role_code)) {
    return next();
  }

  // 2) At login time – peek email, if admin role, skip IP block
  if (req.path.includes('/auth/login') && req.body && req.body.email) {
    try {
      const db = getDb();
      const u = db.prepare(`
        SELECT r.code as role_code
        FROM users u JOIN roles r ON r.id = u.role_id
        WHERE LOWER(u.email)=LOWER(?)
      `).get(req.body.email);
      if (u && ['SUPER_ADMIN','HR_ADMIN','PAYROLL_MANAGER','AUDITOR'].includes(u.role_code)) {
        // admin – allow from anywhere, log it
        db.prepare(`INSERT INTO audit_logs (actor_email, action, ip_address, user_agent, severity, new_values)
          VALUES (?,?,?,?, 'medium', ?)`)
          .run(req.body.email, 'ADMIN_REMOTE_LOGIN', ip, req.get('user-agent')||'', JSON.stringify({ remote: true, ip }));
        return next();
      }
    } catch {}
  }

  // 3) Employee / Branch Manager – must be office IP
  if (!isOfficeIp(ip)) {
    const db = getDb();
    try {
      db.prepare(`INSERT INTO audit_logs (actor_email, action, ip_address, user_agent, severity, new_values)
        VALUES (?,?,?,?,?,?)`).run(
          req.body?.email || req.user?.email || null,
          'OFFICE_IP_BLOCKED',
          ip,
          (req.get('user-agent')||'').substring(0,200),
          'high',
          JSON.stringify({ path: req.originalUrl })
        );
    } catch {}
    return res.status(403).json({
      error: 'Access denied – Office WiFi / Office computer only',
      code: 'OFFICE_IP_REQUIRED',
      your_ip: ip,
      allowed_networks: config.ALLOWED_NETWORKS,
      help: 'Employees must connect via A.H. Transport office WiFi (192.168.1.x / 2400:7f60:207::/48). Admins can login remotely – use admin@ahtransport.co.in'
    });
  }
  next();
}

// After authentication – verify device is whitelisted
function deviceGuard(req, res, next) {
  if (!config.DEVICE_WHITELIST_ENFORCE && !config.OFFICE_IP_STRICT) return next();
  if (!req.user) return next(); // will be caught by authenticate

  // ADMIN REMOTE ACCESS – bypass device whitelist + IP check
  if (['SUPER_ADMIN','HR_ADMIN','PAYROLL_MANAGER','AUDITOR'].includes(req.user.role_code)) {
    // still log device fingerprint for audit, but allow
    req.deviceFingerprint = deviceFingerprint(req);
    return next();
  }

  // EMPLOYEE – enforce office IP even with valid JWT
  const ip = normalizeIp(req);
  if (config.OFFICE_IP_STRICT && !isOfficeIp(ip)) {
    const db = getDb();
    try {
      db.prepare(`INSERT INTO audit_logs (actor_user_id, actor_email, action, ip_address, user_agent, severity, new_values)
        VALUES (?,?,?,?, 'high', ?)`)
        .run(req.user.id, req.user.email, 'EMPLOYEE_REMOTE_BLOCKED', ip, req.get('user-agent')||'', JSON.stringify({ role: req.user.role_code }));
    } catch {}
    return res.status(403).json({
      error: 'Employees – Office WiFi / Office computer only',
      code: 'OFFICE_IP_REQUIRED_EMPLOYEE',
      your_ip: ip,
      allowed_networks: config.ALLOWED_NETWORKS,
      note: 'Admins: use admin@ahtransport.co.in – remote access allowed'
    });
  }

  if (!config.DEVICE_WHITELIST_ENFORCE) return next();

  const fp = deviceFingerprint(req);
  req.deviceFingerprint = fp;
  const db = getDb();
  // ensure device_whitelist table exists
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS device_whitelist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fingerprint TEXT UNIQUE NOT NULL,
        label TEXT,
        mac_address TEXT,
        ip_address TEXT,
        user_agent TEXT,
        assigned_user_id INTEGER REFERENCES users(id),
        office_id INTEGER REFERENCES offices(id),
        is_active INTEGER DEFAULT 1,
        last_seen_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_device_fp ON device_whitelist(fingerprint);
    `);
  } catch {}
  const dev = db.prepare('SELECT * FROM device_whitelist WHERE fingerprint=? AND is_active=1').get(fp);
  // ip already defined above
  if (dev) {
    // update last_seen
    db.prepare('UPDATE device_whitelist SET last_seen_at=CURRENT_TIMESTAMP, ip_address=? WHERE id=?').run(ip, dev.id);
    req.device = dev;
    return next();
  }
  // not whitelisted
  // allow SUPER_ADMIN to auto-register first device if table empty, or if ALLOW_DEVICE_REGISTRATION=true
  const count = db.prepare('SELECT COUNT(*) as c FROM device_whitelist WHERE is_active=1').get().c;
  if (count === 0 && req.user.role_code === 'SUPER_ADMIN') {
    // auto approve first admin device
    db.prepare(`INSERT INTO device_whitelist (fingerprint, label, mac_address, ip_address, user_agent, assigned_user_id, office_id, created_by)
      VALUES (?,?,?,?,?,?,?,?)`).run(
        fp,
        'Auto-approved Admin Office PC',
        null,
        ip,
        (req.get('user-agent')||'').substring(0,250),
        req.user.id,
        req.user.office_id,
        req.user.id
      );
    return next();
  }
  if (config.ALLOW_DEVICE_REGISTRATION) {
    // auto-register but inactive – needs admin approval – for now block
  }
  // log block
  try {
    db.prepare(`INSERT INTO audit_logs (actor_user_id, actor_email, action, ip_address, user_agent, severity, new_values)
      VALUES (?,?,?,?,?, 'critical', ?)`)
      .run(req.user.id, req.user.email, 'DEVICE_BLOCKED', ip, req.get('user-agent')||'', JSON.stringify({ fingerprint: fp }));
  } catch {}
  return res.status(403).json({
    error: 'This computer is not authorized – Office computer only',
    code: 'DEVICE_NOT_WHITELISTED',
    device_fingerprint: fp,
    your_ip: ip,
    help: 'Contact IT Admin (it@ahtransport.co.in) – provide your Device ID: '+fp+' – MAC: ask admin to add. Office PC at 192.168.1.29 (10-FF-E0-4E-C3-3D) is pre-approved.'
  });
}

module.exports = {
  officeNetworkGuard,
  deviceGuard,
  deviceFingerprint,
  normalizeIp,
  isOfficeIp
};
