#!/usr/bin/env node
/**
 * Bulk employee generator – 1000 employees stress test
 * Usage: node scripts/bulk_import.js 1000
 */
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const dbPath = process.argv[3] || path.join(__dirname, '..', 'database', 'hrms.sqlite');
const count = parseInt(process.argv[2] || '1000', 10);
const db = new Database(dbPath);

const offices = db.prepare('SELECT id FROM offices').all().map(r=>r.id);
const depts = db.prepare('SELECT id FROM departments').all().map(r=>r.id);
const empRole = db.prepare("SELECT id FROM roles WHERE code='EMPLOYEE'").get().id;

const first = ['Amit','Rajesh','Sunita','Priya','Vikram','Anita','Suresh','Kavita','Mohan','Deepak','Ravi','Pooja','Sanjay','Neha','Arjun'];
const last = ['Kumar','Singh','Patil','Sharma','Yadav','Rao','Verma','Gupta','Ali','Khan','Reddy','Nair','Joshi','Mehta','Iyer'];
const desigs = [['Driver','Driver',360000], ['Helper','Operations & Fleet',300000], ['Fleet Supervisor','Operations & Fleet',540000], ['Accountant','Finance & Accounts',480000], ['HR Executive','Human Resources',520000]];

const insertUser = db.prepare('INSERT INTO users (employee_code, email, password_hash, role_id, office_id) VALUES (?,?,?,?,?)');
const insertEmp = db.prepare(`INSERT INTO employees 
(user_id, employee_code, first_name, last_name, email, phone, department_id, office_id, designation, employment_type, date_of_joining, employee_status, pan_number, aadhaar_number, bank_account_no, bank_ifsc)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const insertSal = db.prepare('INSERT INTO salary_structures (employee_id, effective_from, ctc_annual, basic_monthly, hra_monthly, conveyance_monthly, special_allowance_monthly) VALUES (?,?,?,?,?,?,?)');

const hash = bcrypt.hashSync('Emp@12345', 12);
let startCode = db.prepare('SELECT COUNT(*) as c FROM employees').get().c + 1001;

const tx = db.transaction((n)=>{
  for(let i=0;i<n;i++){
    const code = 'AHT' + (startCode+i);
    const fn = first[Math.floor(Math.random()*first.length)];
    const ln = last[Math.floor(Math.random()*last.length)];
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${startCode+i}@ahtransport.co.in`;
    const office = offices[Math.floor(Math.random()*offices.length)];
    const dept = depts[Math.floor(Math.random()*depts.length)];
    const [desig, , ctc] = desigs[Math.floor(Math.random()*desigs.length)];
    try{
      const u = insertUser.run(code, email, hash, empRole, office);
      const emp = insertEmp.run(u.lastInsertRowid, code, fn, ln, email, '9'+Math.floor(100000000+Math.random()*899999999), dept, office, desig, desig==='Driver'?'Driver':'Permanent', '2023-06-01', 'Active', 'ABCDE1234F', '123412341234', '00'+Math.floor(1000000000+Math.random()*9000000000), 'SBIN0001234');
      const basic = Math.round((ctc/12)*0.45);
      insertSal.run(emp.lastInsertRowid, '2024-04-01', ctc, basic, Math.round(basic*0.4), 1600, 4000);
    }catch(e){}
  }
});
tx(count);
console.log(`Bulk import attempted: ${count} – check DB count`);
