const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { deviceFingerprint, normalizeIp } = require('../middleware/officeSecurity');
const router = express.Router();
router.use(authenticate);

router.get('/offices', (req, res) => {
  const db = getDb();
  res.json({ data: db.prepare('SELECT * FROM offices WHERE is_active=1 ORDER BY name').all() });
});
router.get('/departments', (req, res) => {
  const db = getDb();
  const office_id = req.query.office_id;
  let sql='SELECT d.*, o.code as office_code FROM departments d LEFT JOIN offices o ON o.id=d.office_id';
  const params=[];
  if (office_id) { sql+=' WHERE d.office_id=?'; params.push(office_id); }
  sql+=' ORDER BY d.name';
  res.json({ data: db.prepare(sql).all(...params) });
});
router.get('/shifts', (req, res) => {
  const db = getDb();
  res.json({ data: db.prepare('SELECT * FROM shifts').all() });
});

// Device whitelist – office computers only
router.get('/devices', authorize(['employee.read']), (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT dw.*, u.email as assigned_email, o.name as office_name
      FROM device_whitelist dw
      LEFT JOIN users u ON u.id = dw.assigned_user_id
      LEFT JOIN offices o ON o.id = dw.office_id
      ORDER BY dw.last_seen_at DESC
    `).all();
    res.json({ data: rows });
  } catch(e) {
    res.json({ data: [] });
  }
});

router.post('/devices', authorize('*'), (req, res) => {
  const db = getDb();
  const { label, mac_address, assigned_user_id, office_id, fingerprint } = req.body;
  // ensure table
  db.exec(`CREATE TABLE IF NOT EXISTS device_whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fingerprint TEXT UNIQUE NOT NULL,
    label TEXT,
    mac_address TEXT,
    ip_address TEXT,
    user_agent TEXT,
    assigned_user_id INTEGER,
    office_id INTEGER,
    is_active INTEGER DEFAULT 1,
    last_seen_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER
  )`);
  const fp = fingerprint || deviceFingerprint(req);
  try {
    const r = db.prepare(`INSERT INTO device_whitelist 
      (fingerprint, label, mac_address, ip_address, user_agent, assigned_user_id, office_id, created_by, is_active, last_seen_at)
      VALUES (?,?,?,?,?,?,?,?,1,CURRENT_TIMESTAMP)`)
      .run(
        fp,
        label || 'Office PC',
        mac_address || null,
        normalizeIp(req),
        (req.get('user-agent')||'').substring(0,250),
        assigned_user_id || req.user.id,
        office_id || req.user.office_id,
        req.user.id
      );
    res.status(201).json({ id: r.lastInsertRowid, fingerprint: fp });
  } catch(e) {
    if (String(e).includes('UNIQUE')) return res.status(400).json({ error: 'Device already whitelisted', fingerprint: fp });
    res.status(400).json({ error: e.message });
  }
});

router.delete('/devices/:id', authorize('*'), (req, res) => {
  const db = getDb();
  db.prepare('UPDATE device_whitelist SET is_active=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// my current device info – for IT admin to copy fingerprint
router.get('/my-device', (req, res) => {
  const fp = deviceFingerprint(req);
  const ip = normalizeIp(req);
  res.json({
    fingerprint: fp,
    ip_address: ip,
    user_agent: req.get('user-agent') || '',
    office_strict: true,
    allowed_networks: require('../config/env').ALLOWED_NETWORKS,
    message: 'Give this fingerprint to IT Admin to whitelist your office computer.'
  });
});

module.exports = router;
