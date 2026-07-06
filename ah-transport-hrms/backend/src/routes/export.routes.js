const express = require('express');
const { getDb } = require('../db/database');
const { authenticate, authorize, officeScope } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const router = express.Router();
router.use(authenticate, officeScope);

// CSV employees
router.get('/employees/csv', authorize(['employee.read','report.read']), (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT e.employee_code, e.first_name, e.last_name, e.designation, d.name as department, o.name as office,
      e.email, e.phone, e.date_of_joining, e.employee_status
    FROM employees e
    LEFT JOIN departments d ON d.id=e.department_id
    LEFT JOIN offices o ON o.id=e.office_id
    ORDER BY e.employee_code
  `).all();
  const headers = Object.keys(rows[0]||{employee_code:'',first_name:''});
  let csv = headers.join(',')+'\n';
  rows.forEach(r => { csv += headers.map(h => `"${String(r[h]??'').replace(/"/g,'""')}"`).join(',') + '\n'; });
  res.setHeader('Content-Type','text/csv');
  res.setHeader('Content-Disposition','attachment; filename="employees_ah_transport.csv"');
  res.send(csv);
});

// Excel payroll
router.get('/payroll/:runId/excel', authorize(['payroll.read']), async (req, res) => {
  const db = getDb();
  const items = db.prepare(`
    SELECT pi.*, e.employee_code, e.first_name||' '||e.last_name as name
    FROM payroll_items pi JOIN employees e ON e.id=pi.employee_id
    WHERE pi.payroll_run_id=?
  `).all(req.params.runId);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Payroll');
  ws.columns = [
    { header:'Emp Code', key:'employee_code', width:12},
    { header:'Name', key:'name', width:22},
    { header:'Pay Days', key:'pay_days', width:10},
    { header:'Gross', key:'gross_earnings', width:12},
    { header:'PF', key:'pf_employee', width:10},
    { header:'ESI', key:'esi_employee', width:10},
    { header:'PT', key:'professional_tax', width:10},
    { header:'TDS', key:'tds', width:10},
    { header:'Deductions', key:'total_deductions', width:14},
    { header:'Net Pay', key:'net_pay', width:14},
  ];
  items.forEach(i=>ws.addRow(i));
  ws.getRow(1).font = { bold:true };
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=payroll.xlsx');
  await wb.xlsx.write(res);
  res.end();
});

// PDF payslip
router.get('/payslip/:itemId/pdf', async (req, res) => {
  const db = getDb();
  const pi = db.prepare(`
    SELECT pi.*, pr.pay_month, pr.pay_year, pr.pay_period_start, pr.pay_period_end,
           e.employee_code, e.first_name||' '||e.last_name as employee_name, e.designation, e.date_of_joining,
           e.bank_account_no, e.bank_ifsc, e.pan_number, e.uan_number,
           d.name as department_name, o.name as office_name
    FROM payroll_items pi
    JOIN payroll_runs pr ON pr.id=pi.payroll_run_id
    JOIN employees e ON e.id=pi.employee_id
    LEFT JOIN departments d ON d.id=e.department_id
    LEFT JOIN offices o ON o.id=e.office_id
    WHERE pi.id=?
  `).get(req.params.itemId);
  if (!pi) return res.status(404).json({ error: 'Not found' });
  // authorization: self or payroll.read
  const canReadAll = req.user.permissions.includes('*') || req.user.permissions.includes('payroll.read');
  if (!canReadAll) {
    const emp = db.prepare('SELECT id FROM employees WHERE user_id=?').get(req.user.id);
    if (!emp || emp.id !== pi.employee_id) return res.status(403).json({ error: 'Forbidden' });
  }

  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="payslip_${pi.employee_code}_${pi.pay_month}_${pi.pay_year}.pdf"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);
  // Header
  doc.fontSize(18).text('A.H. Transport Co.', { align:'center' });
  doc.fontSize(9).text('Plot 45, Transport Nagar, Wadala East, Mumbai 400037', { align:'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text(`Payslip for ${pi.pay_month}/${pi.pay_year}`, { align:'center' });
  doc.moveDown();
  // Employee info
  doc.fontSize(10);
  const info = [
    ['Employee Code:', pi.employee_code, 'Pay Period:', `${pi.pay_period_start} to ${pi.pay_period_end}`],
    ['Employee Name:', pi.employee_name, 'Designation:', pi.designation||''],
    ['Department:', pi.department_name||'', 'Office:', pi.office_name||''],
    ['Date of Joining:', pi.date_of_joining||'', 'Pay Days:', String(pi.pay_days)],
    ['Bank A/C:', pi.bank_account_no||'', 'IFSC:', pi.bank_ifsc||''],
    ['PAN:', pi.pan_number||'', 'UAN:', pi.uan_number||''],
  ];
  info.forEach(row => {
    doc.text(`${row[0]} ${row[1]}`, { continued: true, width: 250 });
    doc.text(`  ${row[2]} ${row[3]}`);
  });
  doc.moveDown();
  // Earnings / Deductions table
  doc.fontSize(12).text('Earnings', 70, doc.y, { underline: true });
  doc.moveDown(0.3);
  const earnings = [
    ['Basic', pi.basic_earned],
    ['HRA', pi.hra_earned],
    ['Conveyance', pi.conveyance_earned],
    ['Special Allowance', pi.special_allowance_earned],
    ['Driver Allowance', pi.driver_allowance_earned],
    ['Overtime', pi.overtime_earned],
  ];
  earnings.forEach(([k,v])=> { doc.fontSize(10).text(k,70,{continued:true}); doc.text(`₹ ${Number(v).toLocaleString('en-IN')}`,400,{align:'right'}); });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Gross Earnings: ₹ ${Number(pi.gross_earnings).toLocaleString('en-IN')}`, { align:'right' });
  doc.moveDown();
  doc.fontSize(12).text('Deductions', { underline: true });
  const deductions = [
    ['PF Employee', pi.pf_employee],
    ['ESI Employee', pi.esi_employee],
    ['Professional Tax', pi.professional_tax],
    ['TDS', pi.tds],
  ];
  deductions.forEach(([k,v])=> { doc.fontSize(10).text(k,70,{continued:true}); doc.text(`₹ ${Number(v).toLocaleString('en-IN')}`,400,{align:'right'}); });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Total Deductions: ₹ ${Number(pi.total_deductions).toLocaleString('en-IN')}`, { align:'right' });
  doc.moveDown();
  doc.fontSize(14).text(`Net Pay: ₹ ${Number(pi.net_pay).toLocaleString('en-IN')}`, { align:'right' });
  doc.moveDown(2);
  doc.fontSize(9).fillColor('#555').text('This is a computer generated payslip and does not require signature.', { align:'center' });
  doc.text('A.H. Transport Co. - HRMS v1.0', { align:'center' });
  doc.end();
});

module.exports = router;
