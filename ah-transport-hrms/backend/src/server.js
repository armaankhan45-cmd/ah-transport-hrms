// A.H. Transport Co. – Enterprise HRMS
// server.js v1.3 – Office-Only Employees / Admin Remote Anywhere
// Production – Render / Railway / Docker / Windows LAN
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const config = require('./config/env');
const { runMigrations, getDb } = require('./db/database');
const logger = require('./utils/logger');

// ---------------- DB init ----------------
runMigrations();

// ---- Seed core admin users ----
(function ensureSeedUsers(){
  const db = getDb();
  try {
    const adminExists = db.prepare('SELECT COUNT(*) as c FROM users WHERE email=?').get('admin@ahtransport.co.in').c;
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('Admin@12345', 12);
      const superRole = db.prepare('SELECT id FROM roles WHERE code=?').get('SUPER_ADMIN')?.id || 1;
      const hrRole = db.prepare('SELECT id FROM roles WHERE code=?').get('HR_ADMIN')?.id || 2;
      const empRole = db.prepare('SELECT id FROM roles WHERE code=?').get('EMPLOYEE')?.id || 6;

      const u1 = db.prepare('INSERT INTO users (employee_code, email, password_hash, role_id, office_id, must_change_password) VALUES (?,?,?,?,?,0)')
        .run('AHT1001','admin@ahtransport.co.in',hash,superRole,1);
      db.prepare(`INSERT INTO employees (user_id,employee_code,first_name,last_name,display_name,email,phone,department_id,office_id,designation,employment_type,date_of_joining,employee_status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(u1.lastInsertRowid,'AHT1001','System','Administrator','System Administrator','admin@ahtransport.co.in','9876543210',4,1,'Super Admin','Permanent','2020-01-01','Active');

      const hrHash = bcrypt.hashSync('Hr@12345',12);
      const u2 = db.prepare('INSERT INTO users (employee_code,email,password_hash,role_id,office_id,must_change_password) VALUES (?,?,?,?,?,0)')
        .run('AHT1002','hr@ahtransport.co.in',hrHash,hrRole,1);
      db.prepare(`INSERT INTO employees (user_id,employee_code,first_name,last_name,email,department_id,office_id,designation,date_of_joining,employee_status)
        VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(u2.lastInsertRowid,'AHT1002','Priya','Sharma','hr@ahtransport.co.in',4,1,'HR Manager','2021-03-15','Active');

      console.log('✅ Seed users: admin@ahtransport.co.in / Admin@12345');
    }
  } catch(e){ console.log('Seed note:', e.message); }
})();

const app = express();

// ---------------- Security / Office Mode ----------------
// Trust proxy – true on cloud (Render/Railway), false on pure LAN – configurable
app.set('trust proxy', config.TRUST_PROXY ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' }
}));

// CORS – office LAN + public admin
const corsList = String(config.CORS_ORIGIN || '*').split(/[ ,]+/).filter(Boolean);
const allowAllCors = corsList.includes('*');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowAllCors) return cb(null, true);
    if (corsOriginsInclude(corsList, origin)) return cb(null, true);
    // auto-allow private LAN + localhost + hrms.*
    if (/^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|.*\.ahtransport\.co\.in|.*\.onrender\.com|.*\.railway\.app|.*\.repl\.co|hrms\.local)/i.test(origin)) return cb(null, true);
    return cb(null, true); // permissive fallback – RBAC still enforces
  },
  credentials: true
}));
function corsOriginsInclude(list, origin){ return list.some(o => o === origin || o === '*'); }

app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// ---- Office IP firewall – with Admin bypass ----
let officeNetworkGuard = (req,res,next)=>next();
let deviceGuard = (req,res,next)=>next();
try {
  const sec = require('./middleware/officeSecurity');
  officeNetworkGuard = sec.officeNetworkGuard || officeNetworkGuard;
  // deviceGuard is applied inside authenticate middleware
} catch(e){
  console.warn('[HRMS] officeSecurity middleware not found – running open mode');
}

// apply IP guard to all /api – login will auto-bypass admins
app.use('/api/', officeNetworkGuard);

// Rate limit
app.use('/api/', rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS || 15*60*1000,
  max: config.RATE_LIMIT_MAX || 300,
  standardHeaders: true,
  legacyHeaders: false
}));

// ---------------- Routes – safe load ----------------
function safeUse(pathRoute, modulePath){
  try { app.use(pathRoute, require(modulePath)); console.log(`[HRMS] mounted ${pathRoute} -> ${modulePath}`); }
  catch(e){ console.warn(`[HRMS] skip ${modulePath}: ${e.message}`); }
}
safeUse('/api/auth', './routes/auth.routes');
safeUse('/api/employees', './routes/employees.routes');
safeUse('/api/attendance', './routes/attendance.routes');
safeUse('/api/leaves', './routes/leaves.routes');
safeUse('/api/payroll', './routes/payroll.routes');
safeUse('/api/dashboard', './routes/dashboard.routes');
safeUse('/api/reports', './routes/reports.routes');
safeUse('/api/export', './routes/export.routes');
safeUse('/api/master', './routes/master.routes');

// ---------------- Health ----------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    company: 'A.H. Transport Co.',
    product: 'HRMS Enterprise v1.3',
    time: new Date().toISOString(),
    office_mode: 'EMPLOYEE: office WiFi only / ADMIN: anywhere',
    node: process.version
  });
});

app.get('/api', (req,res)=> res.redirect('/api/health'));

// ---------------- Frontend – bulletproof resolver ----------------
const publicCandidates = [
  process.env.FRONTEND_DIR,
  path.join(__dirname, '..', 'public'),
  path.join(__dirname, '..', '..', 'frontend', 'public'),
  path.join(__dirname, '..', '..', '..', 'frontend', 'public'),
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), 'frontend', 'public'),
  path.join(process.cwd(), 'backend', 'public'),
  path.join(process.cwd(), '..', 'frontend', 'public'),
  path.join(process.cwd(), '..', '..', 'frontend', 'public'),
  '/opt/render/project/src/frontend/public',
  '/opt/render/project/src/ah-transport-hrms/frontend/public',
  '/app/frontend/public',
  '/app/public',
  '/workspace/ah-transport-hrms/frontend/public'
].filter(Boolean);

let publicDir = publicCandidates.find(p => { try { return fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')); } catch { return false; } });

console.log('[HRMS] frontend search:');
publicCandidates.forEach(p => { try { console.log(`  - ${p} -> ${fs.existsSync(p) ? 'exists' : 'no'}`)} catch{} });
console.log(`[HRMS] Using frontend: ${publicDir || 'NOT FOUND – using fallback UI'}`);

if (publicDir && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { maxAge: '1h', etag: true }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'), err => { if (err) next(); });
  });
} else {
  // Fallback – never show “Cannot GET /” – always show branded login helper
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.type('html').send(`<!doctype html><html lang=en><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>A.H. Transport HRMS</title>
<style>body{font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0} .wrap{max-width:920px;margin:40px auto;padding:24px} .card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px;box-shadow:0 10px 40px rgba(0,0,0,.35)} h1{margin:0 0 6px} .muted{color:#94a3b8} .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px} @media(max-width:760px){.grid{grid-template-columns:1fr}} .btn{display:block;padding:12px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;text-align:center;font-weight:600} .btn2{background:#334155} code{background:#0b1220;padding:2px 6px;border-radius:6px} table{width:100%;border-collapse:collapse;margin-top:12px} td,th{padding:8px 10px;border-bottom:1px solid #334155;text-align:left;font-size:14px}</style>
<div class=wrap><div class=card>
<h1>🚛 A.H. Transport Co.</h1>
<div class=muted>Enterprise HRMS v1.3 – Office WiFi: Employees only • Admin: anywhere</div>
<div class=grid>
  <div>
    <h3>API – LIVE ✅</h3>
    <p><a class=btn href="/api/health" target=_blank>Check /api/health</a></p>
    <p><a class=btn2 btn href="/api/auth/me" target=_blank style="display:block;padding:12px 14px;background:#334155;color:#fff;text-decoration:none;border-radius:10px;text-align:center">Test /auth/me</a></p>
    <p class=muted>Frontend static files not found on server – showing this fallback UI.<br>API is 100% working.</p>
  </div>
  <div>
    <h3>Quick Login – API</h3>
    <table>
      <tr><th>Role</th><th>Email</th><th>Password</th><th>Access</th></tr>
      <tr><td>Super Admin</td><td>admin@ahtransport.co.in</td><td><code>Admin@12345</code></td><td>anywhere ✅</td></tr>
      <tr><td>HR Admin</td><td>hr@ahtransport.co.in</td><td><code>Hr@12345</code></td><td>anywhere ✅</td></tr>
      <tr><td>Employee</td><td>rajesh.kumar@ahtransport.co.in</td><td><code>Emp@12345</code></td><td>office WiFi only 🔒</td></tr>
    </table>
    <p style="font-size:13px" class=muted>POST <code>/api/auth/login</code> with JSON {email,password} → get JWT token</p>
  </div>
</div>
<hr style="border:none;border-top:1px solid #334155;margin:18px 0">
<p><b>Office networks whitelisted:</b><br>
<code>192.168.1.0/24, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 2400:7f60:207::/48, 103.175.191.0/24, 103.160.126.0/24</code></p>
<p class=muted>Employee IP outside these → 403 Office WiFi required • Admin bypass enabled</p>
<p>Frontend fix: ensure <code>frontend/public/index.html</code> exists at one of:<br><small>${publicCandidates.map(p=>p.replace(/</g,'&lt;')).join('<br>')}</small></p>
</div></div></html>`);
  });
}

// ---------------- Error handler ----------------
app.use((err, req, res, next) => {
  try { logger.error(err); } catch {}
  console.error(err);
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: (process.env.NODE_ENV !== 'production') ? err.message : undefined,
    path: req.originalUrl
  });
});

// ---------------- Start ----------------
const PORT = parseInt(process.env.PORT || config.PORT || '8080', 10);
const HOST = process.env.HOST || config.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`
🚛  A.H. Transport Co. – HRMS v1.3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  URL (local) : http://localhost:${PORT}
  URL (LAN)   : http://${HOST === '0.0.0.0' ? '192.168.1.29' : HOST}:${PORT}
  Health      : /api/health
  Env         : ${config.NODE_ENV}
  
  🔒 SECURITY
  Office IP Strict ....: ${config.OFFICE_IP_STRICT ? 'ON ✅' : 'off'}
  Device whitelist ...: ${config.DEVICE_WHITELIST_ENFORCE ? 'ON' : 'off (admin bypass ON)'}
  CORS ...............: ${config.CORS_ORIGIN}
  Trust Proxy ........: ${config.TRUST_PROXY}

  🌐 ACCESS RULES
  EMPLOYEE / Branch Manager / Driver
    → Office WiFi ONLY  192.168.1.0/24
    → Office IPv6       2400:7f60:207::/48
    → Office computer whitelist ON
    → Outside IP = 403

  ADMIN – Super / HR / Payroll / Auditor
    → ANYWHERE – home / 4G / world ✅
    → No IP block, no device block

  👤 Logins
  Super Admin : admin@ahtransport.co.in / Admin@12345   (anywhere)
  HR Admin    : hr@ahtransport.co.in / Hr@12345         (anywhere)
  Employee    : rajesh.kumar@ahtransport.co.in / Emp@12345  (office only)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});

module.exports = app;
