require('dotenv').config();
const path = require('path');

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: parseInt(process.env.PORT || '8080', 10),
  HOST: process.env.HOST || '0.0.0.0',
  JWT_SECRET: process.env.JWT_SECRET || 'ah-transport-super-secure-change-me-in-prod-2026!',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', '..', '..', 'database', 'hrms.sqlite'),
  BCRYPT_ROUNDS: 12,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,
  RATE_LIMIT_MAX: 300,
  // OFFICE-ONLY MODE – A.H. Transport Co.
  // CORS – allow all by default for cloud hosting – lock down via env in office LAN
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production',
  COMPANY_NAME: 'A.H. Transport Co.',
  COMPANY_ADDRESS: 'Plot 45, Transport Nagar, Wadala East, Mumbai 400037',
  COMPANY_GSTIN: '27AAHFA1234H1Z9',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  SESSION_TIMEOUT_MIN: 480,
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 30,
  // Office network lockdown
  OFFICE_IP_STRICT: process.env.OFFICE_IP_STRICT !== 'false', // default TRUE
  OFFICE_ONLY_MODE: true,
  ALLOWED_NETWORKS: (process.env.ALLOWED_NETWORKS || '192.168.1.0/24,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,127.0.0.1/32,::1/128,fe80::/10,2400:7f60:207::/48,103.175.191.0/24,103.160.126.0/24').split(','),
  // Device whitelist – office computers only – auto-bypass for admins
  DEVICE_WHITELIST_ENFORCE: process.env.DEVICE_WHITELIST_ENFORCE === 'true', // default FALSE for cloud – enable in office LAN via env=true
  ALLOW_DEVICE_REGISTRATION: process.env.ALLOW_DEVICE_REGISTRATION === 'true'
};
