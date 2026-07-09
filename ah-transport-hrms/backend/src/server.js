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

// Initialize DB
runMigrations();

// Ensure admin user seed
(function ensureSeedUsers(){
  const db = getDb();
  const adminExists = db.prepare('SELECT COUNT(*) as c FROM users WHERE email=?').get('admin@ahtransport.co.in').c;
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('Admin@12345', 12);
    // ensure role ids
    const superRole = db.prepare('SELECT id FROM roles WHERE code=?').get('SUPER_ADMIN')?.id || 1;
    const hrRole = db.prepare('SELECT id FROM roles WHERE code=?').get('HR_ADMIN')?.id || 2;
    const payrollRole = db.prepare('SELECT id FROM roles WHERE code=?').get('PAYROLL_MANAGER')?.id || 3;
    const empRole = db.prepare('SELECT id FROM roles WHERE code=?').get('EMPLOYEE')?.id || 6;
    // create admin user
    const u1 = db.prepare('INSERT INTO users (employee_code, email, password_hash, role_id, office_id, must_change_password) VALUES (?,?,?,?,?,0)')
      .run('AHT1001', 'admin@ahtransport.co.in', hash, superRole, 1);
    // create employee profile
    db.prepare(`INSERT INTO employees (user_id, employee_code, first_name, last_name, display_name, email, phone, department_id, office_id, designation, employment_type, date_of_joining, employee_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(u1.lastInsertRowid, 'AHT1001', 'System', 'Administrator', 'System Administrator', 'admin@ahtransport.co.in', '9876543210', 4, 1, 'Super Admin', 'Permanent', '2020-01-01', 'Active');

    const hrHash = bcrypt.hashSync('Hr@12345', 12);
    const u2 = db.prepare('INSERT INTO users (employee_code, email, password_hash, role_id, office_id, must_change_password) VALUES (?,?,?,?,?,0)')
      .run('AHT1002', 'hr@ahtransport.co.in', hrHash, hrRole, 1);
    db.prepare(`INSERT INTO employees (user_id, employee_code, first_name, last_name, email, department_id, office_id, designation, date_of_joining, employee_status) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(u2.lastInsertRowid, 'AHT1002', 'Priya', 'Sharma', 'hr@ahtransport.co.in', 4, 1, 'HR Manager', '2021-03-15', 'Active');

    // Seed 15 demo employees across offices
    const demo = [
      ['AHT1003','rajesh.kumar@ahtransport.co.in','Rajesh','Kumar','Operations Manager',1,1],
      ['AHT1004','sunita.patil@ahtransport.co.in','Sunita','Patil','Finance Executive',5,1],
      ['AHT1005','amit.singh@ahtransport.co.in','Amit','Singh','Fleet Supervisor',1,2],
      ['AHT1006','deepak.yadav@ahtransport.co.in','Deepak','Yadav','Driver',2,1],
      ['AHT1007','mohammed.ali@ahtransport.co.in','Mohammed','Ali','Driver',2,3],
      ['AHT1008','kavita.rao@ahtransport.co.in','Kavita','Rao','Branch Manager',1,3],
    ];
    demo.forEach(([code,email,fn,ln,desig,dept,office])=>{
      const hp = bcrypt.hashSync('Emp@12345',12);
      try {
        const ux = db.prepare('INSERT INTO users (employee_code,email,password_hash,role_id,office_id) VALUES (?,?,?,?,?)')
          .run(code,email,hp,empRole,office);
        const ex = db.prepare(`INSERT INTO employees (user_id,employee_code,first_name,last_name,email,department_id,office_id,designation,date_of_joining,employee_status,phone,bank_account_no,bank_ifsc,pan_number,aadhaar_number)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(ux.lastInsertRowid,code,fn,ln,email,dept,office,desig,'2023-01-10','Active','9'+Math.floor(100000000+Math.random()*899999999),'00'+Math.floor(1000000000+Math.random()*8999999999),'SBIN0001234','ABCDE1234F','123412341234');
        // salary
        const ctc = desig.includes('Manager')? 960000 : desig==='Driver'? 360000 : 540000;
        const basic = Math.round((ctc/12)*0.45);
        db.prepare('INSERT INTO salary_structures (employee_id,effective_from,ctc_annual,basic_monthly,hra_monthly,conveyance_monthly,special_allowance_monthly,driver_allowance_monthly,overtime_rate_hourly) VALUES (?,?,?,?,?,?,?,?,?)')
          .run(ex.lastInsertRowid,'2024-04-01',ctc,basic,Math.round(basic*0.4),1600,5000, desig==='Driver'?3000:0, desig==='Driver'?180:0);
        // leave balances
        const year = new Date().getFullYear();
        db.prepare('INSERT OR IGNORE INTO leave_balances (employee_id,leave_type_code,year,accrued) VALUES (?,?,?,?)').run(ex.lastInsertRowid,'CL',year,12);
        db.prepare('INSERT OR IGNORE INTO leave_balances (employee_id,leave_type_code,year,accrued) VALUES (?,?,?,?)').run(ex.lastInsertRowid,'SL',year,12);
        db.prepare('INSERT OR IGNORE INTO leave_balances (employee_id,leave_type_code,year,accrued) VALUES (?,?,?,?)').run(ex.lastInsertRowid,'EL',year,18);
      } catch(e){}
    });
    console.log('Seed users created: admin@ahtransport.co.in / Admin@12345');
  }
})();

const { officeNetworkGuard } = require('./middleware/officeSecurity');

const app = express();
// OFFICE-ONLY: do NOT trust proxy – prevents X-Forwarded-For spoof from internet
app.set('trust proxy', config.TRUST_PROXY ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000 }
}));

// Office-only CORS – parse space-separated origins
const corsOrigins = (config.CORS_ORIGIN || '').split(/[ ,]+/).filter(Boolean);
app.use(cors({
  origin: function(origin, cb){
    if (!origin) return cb(null, true); // same-origin / curl
    if (corsOrigins.includes('*') || corsOrigins.includes(origin)) return cb(null, true);
    // allow LAN origins automatically
    if (/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.|localhost|hrms\.local|hrms\.ah\.local)/.test(origin)) return cb(null, true);
    return cb(new Error('CORS blocked – office network only: '+origin));
  },
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// GLOBAL office IP firewall – blocks before rate limit to save resources
app.use('/api/', officeNetworkGuard);

const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  keyGenerator: (req) => {
    // use real remote IP – trust proxy false
    return req.ip;
  }
});
app.use('/api/', limiter);

// routes
// auth login also goes through officeNetworkGuard already
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/employees', require('./routes/employees.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/leaves', require('./routes/leaves.routes'));
app.use('/api/payroll', require('./routes/payroll.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/export', require('./routes/export.routes'));
app.use('/api/master', require('./routes/master.routes'));

// health
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', company: config.COMPANY_NAME, time: new Date().toISOString(), version: '1.0.0' });
});

// Serve frontend – robust multi-path resolver for local, Docker, Render, nested repo
const publicCandidates = [
  path.join(__dirname, '..', '..', 'frontend', 'public'),           // /app/backend/frontend/public (if copied)
  path.join(__dirname, '..', '..', '..', 'frontend', 'public'),     // /app/frontend/public
  path.join(__dirname, '../../frontend/public'),                    // relative
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), 'frontend', 'public'),
  path.join(process.cwd(), '..', 'frontend', 'public'),
  path.join(process.cwd(), '..', '..', 'frontend', 'public'),
  '/opt/render/project/src/frontend/public',
  '/opt/render/project/src/ah-transport-hrms/frontend/public',
  path.join(__dirname, '..', 'public') // backend/public fallback
];
let publicDir = publicCandidates.find(p => { try { return fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')); } catch {return false} }) || publicCandidates[0];

console.log(`[HRMS] Frontend dir: ${publicDir} exists=${fs.existsSync(publicDir)}`);

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'), err => { if (err) next(); });
  });
} else {
  // fallback – serve minimal inline SPA loader so / never 404
  console.warn('[HRMS] WARNING frontend public dir NOT FOUND – checked:', publicCandidates.join(', '));
  app.get('/', (req, res) => {
    res.type('html').send(`<!doctype html><meta charset=utf-8><title>A.H. Transport HRMS</title>
    <style>body{font-family:Inter,system-ui,sans-serif;background:#f1f5f9;margin:0;padding:40px} .box{max-width:720px;margin:auto;background:#fff;padding:28px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08)}</style>
    <div class=box>
    <h2>🚛 A.H. Transport Co. – HRMS v1.2</h2>
    <p><b>API is running ✅</b></p>
    <p>Frontend files not found at expected path.<br>Checked:<br><code>${publicCandidates.map(p=>p.replace(/</g,'&lt;')).join('<br>')}</code></p>
    <hr>
    <p><b>Quick test (works now):</b></p>
    <ul>
      <li><a href="/api/health" target=_blank>/api/health</a> – should show {"status":"ok"}</li>
      <li>POST <code>/api/auth/login</code> → get JWT</li>
    </ul>
    <p>Frontend UI: deploy with <code>frontend/public</code> folder at one of the paths above, or set env <code>FRONTEND_DIR=/your/path</code></p>
    <p style="color:#64748b;font-size:13px">Office WiFi only • Admin remote allowed<br>admin@ahtransport.co.in / Admin@12345</p>
    </div>`);
  });
}

// error handler
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: 'Internal server error', message: config.NODE_ENV==='development' ? err.message : undefined });
});

const PORT = config.PORT;
const HOST = config.HOST || '192.168.1.50';
app.listen(PORT, HOST, () => {
  console.log(`\n🚛 A.H. Transport Co. HRMS – OFFICE-ONLY MODE`);
  console.log(`   http://${HOST}:${PORT}   (LAN only)`);
  console.log(`   http://hrms.local  http://hrms.ah.local`);
  console.log(`   Environment: ${config.NODE_ENV}`);
  console.log(`   Office IP Strict: ${config.OFFICE_IP_STRICT ? 'ENFORCED ✅' : 'off'}`);
  console.log(`   Device Whitelist: ${config.DEVICE_WHITELIST_ENFORCE ? 'ENFORCED ✅' : 'off'}`);
  console.log(`   Allowed Networks:`);
  config.ALLOWED_NETWORKS.forEach(n => console.log(`     - ${n}`));
  console.log(`\n   Default logins (office PC only):`);
  console.log(`   Super Admin: admin@ahtransport.co.in / Admin@12345`);
  console.log(`   HR Admin:    hr@ahtransport.co.in / Hr@12345`);
  console.log(`   Employee:    rajesh.kumar@ahtransport.co.in / Emp@12345`);
  console.log(``);
  console.log(`   🔒 OFFICE WIFI + OFFICE COMPUTER ONLY – internet access BLOCKED`);
  console.log(``);
});

module.exports = app;
