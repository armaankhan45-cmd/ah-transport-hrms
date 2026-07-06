const { runMigrations } = require('./database');
const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');

console.log('Running HRMS migrations...');
runMigrations();
console.log('Schema applied.');

// seed core
const db = getDb();
const check = db.prepare('SELECT COUNT(*) as c FROM roles').get();
if (check.c === 0) {
  const seedPath = path.join(__dirname, '..', '..', '..', 'database', 'seeds', '001_core.sql');
  if (fs.existsSync(seedPath)) {
    const sql = fs.readFileSync(seedPath, 'utf8');
    db.exec(sql);
    console.log('Core seed data loaded.');
  }
}
console.log('Migration complete.');
