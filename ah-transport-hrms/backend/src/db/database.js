const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

let db;

function getDb() {
  if (db) return db;
  const dir = path.dirname(config.DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(config.DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  return db;
}

function initSchema() {
  const database = getDb();
  const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  database.exec(schema);
}

function runMigrations() {
  initSchema();
}

module.exports = { getDb, initSchema, runMigrations };
