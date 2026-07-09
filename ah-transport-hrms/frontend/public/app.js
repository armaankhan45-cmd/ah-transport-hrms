// A.H. Transport Co. HRMS - Frontend SPA v1.0
const API_BASE = '';
let state = {
  token: localStorage.getItem('aht_token') || null,
  user: JSON.parse(localStorage.getItem('aht_user') || 'null'),
  view: 'dashboard',
  loading: false
};

function api(path, opts={}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers||{}) };
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  return fetch(API_BASE + '/api' + path, { ...opts, headers })
    .then(async r => {
      const text = await r.text();
      let data; try { data = JSON.parse(text); } catch { data = { raw:text } }
      if (!r.ok) throw data;
      return data;
    });
}

function setView(v){ state.view=v; render(); window.scrollTo(0,0); }

function logout(){ localStorage.clear(); state.token=null; state.user=null; render(); }

function money(n){ return '₹ ' + Number(n||0).toLocaleString('en-IN'); }

function loginScreen(){
  return `<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
  <div class="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
    <div class="text-white p-6 hidden md:block">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center text-slate-900 font-bold text-xl">AH</div>
        <div><div class="text-2xl font-bold">A.H. Transport Co.</div><div class="text-blue-200 text-sm">Enterprise HRMS v1.0</div></div>
      </div>
      <h1 class="text-4xl font-bold leading-tight mb-4">Transport Workforce<br/>Management, Simplified.</h1>
      <p class="text-blue-100 text-lg mb-8">Attendance • Payroll • Compliance • Analytics — built for 1,000+ drivers, operators and office staff across India.</p>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="bg-white/10 rounded-xl p-4 glass"><div class="text-2xl font-bold">6</div><div class="text-blue-200">Branch Offices</div></div>
        <div class="bg-white/10 rounded-xl p-4 glass"><div class="text-2xl font-bold">1000+</div><div class="text-blue-200">Employee Ready</div></div>
        <div class="bg-white/10 rounded-xl p-4 glass"><div class="text-2xl font-bold">99.9%</div><div class="text-blue-200">Uptime SLA</div></div>
        <div class="bg-white/10 rounded-xl p-4 glass"><div class="text-2xl font-bold">ISO</div><div class="text-blue-200">Secure & Audited</div></div>
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-2xl p-8">
      <div class="md:hidden flex items-center gap-3 mb-6">
        <div class="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center font-bold">AH</div>
        <div class="font-bold">A.H. Transport HRMS</div>
      </div>
      <h2 class="text-2xl font-semibold mb-1">Welcome back</h2>
      <p class="text-slate-500 mb-6 text-sm">Sign in to your workforce console</p>
      <form id="loginForm" class="space-y-4">
        <div>
          <label class="text-sm font-medium">Email</label>
          <input name="email" type="email" required value="admin@ahtransport.co.in" class="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-600 outline-none" />
        </div>
        <div>
          <label class="text-sm font-medium">Password</label>
          <input name="password" type="password" required value="Admin@12345" class="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-600 outline-none" />
        </div>
        <button class="w-full bg-blue-700 hover:bg-blue-800 text-white rounded-lg py-3 font-medium">Sign in Securely</button>
        <div id="loginErr" class="text-red-600 text-sm hidden"></div>
      </form>
      <div class="mt-6 text-xs text-slate-500 border-t pt-4">
        Demo accounts:<br/>
        <b>admin@ahtransport.co.in / Admin@12345</b><br/>
        hr@ahtransport.co.in / Hr@12345<br/>
        rajesh.kumar@ahtransport.co.in / Emp@12345
      </div>
    </div>
  </div>
</div>`;
}

function layout(inner){
  const u = state.user || {};
  const nav = [
    ['dashboard','Dashboard','layout-dashboard'],
    ['employees','Employees','users'],
    ['attendance','Attendance','clock'],
    ['leaves','Leave','calendar'],
    ['payroll','Payroll','wallet'],
    ['reports','Reports','bar-chart-3'],
    ['audit','Audit','shield-check'],
  ];
  return `<div class="min-h-screen flex">
  <aside class="w-64 bg-slate-900 text-slate-200 hidden lg:flex flex-col no-print">
    <div class="px-5 py-5 border-b border-slate-800 flex items-center gap-3">
      <div class="w-9 h-9 bg-amber-400 rounded-lg flex items-center justify-center text-slate-900 font-extrabold">AH</div>
      <div><div class="font-semibold leading-tight">A.H. Transport</div><div class="text-xs text-slate-400">HRMS Enterprise</div></div>
    </div>
    <nav class="flex-1 py-4 px-3 space-y-1 text-sm">
      ${nav.map(([k,label,icon])=>`
        <button onclick="setView('${k}')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${state.view===k?'bg-blue-600 text-white':'hover:bg-slate-800 text-slate-300'}">
          <i data-lucide="${icon}" class="w-4 h-4"></i>${label}
        </button>`).join('')}
    </nav>
    <div class="p-4 border-t border-slate-800 text-xs text-slate-400">
      Office: ${u.office_name||'HO-MUM'}<br/>v1.0.0 • Mumbai IST
    </div>
  </aside>
  <div class="flex-1 flex flex-col min-w-0">
    <header class="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-30 no-print">
      <div class="flex items-center gap-3">
        <button class="lg:hidden" onclick="document.getElementById('mob').classList.toggle('hidden')"><i data-lucide="menu"></i></button>
        <div class="font-semibold">${{dashboard:'Command Center', employees:'Employee Master', attendance:'Attendance', leaves:'Leave Management', payroll:'Payroll', reports:'Analytics & Reports', audit:'Audit & Security'}[state.view]||'HRMS'}</div>
        <span class="hidden md:inline text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">Live</span>
      </div>
      <div class="flex items-center gap-4">
        <button onclick="setView('leaves')" class="text-slate-500 hover:text-slate-800"><i data-lucide="bell" class="w-5 h-5"></i></button>
        <div class="text-right text-sm">
          <div class="font-medium">${u.email||''}</div>
          <div class="text-xs text-slate-500">${u.role_name||u.role_code||''}</div>
        </div>
        <button onclick="logout()" class="text-xs px-3 py-1.5 border rounded-lg hover:bg-slate-50">Logout</button>
      </div>
    </header>
    <div id="mob" class="lg:hidden bg-slate-900 text-slate-200 px-3 py-3 space-y-1 hidden no-print">
      ${nav.map(([k,l])=>`<button onclick="setView('${k}');document.getElementById('mob').classList.add('hidden')" class="block w-full text-left px-3 py-2 rounded ${state.view===k?'bg-blue-600':''}">${l}</button>`).join('')}
    </div>
    <main class="flex-1 p-4 lg:p-7 bg-slate-50">${inner}</main>
    <footer class="text-center text-xs text-slate-400 py-4 border-t bg-white no-print">© 2026 A.H. Transport Co. • ISO 27001 aligned • Audit logged • Mumbai • Delhi • Bangalore • Chennai • Kolkata • Nagpur</footer>
  </div>
</div>`;
}

async function viewDashboard(){
  try{
    const s = await api('/dashboard/stats');
    const a = await api('/dashboard/analytics');
    return `<div class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        ${[
          ['Total Employees', s.total_employees, 'users','blue'],
          ['Present Today', s.present_today, 'check-circle','emerald'],
          ['On Leave', s.on_leave_today, 'calendar','amber'],
          ['Attendance', s.attendance_rate+'%', 'trending-up','indigo']
        ].map(([t,v,ic,c])=>`
          <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
            <div class="text-slate-500 text-sm">${t}</div>
            <div class="text-3xl font-bold mt-1">${v}</div>
            <div class="text-xs text-${c}-600 mt-2 flex items-center gap-1"><i data-lucide="${ic}" class="w-3 h-3"></i> live</div>
          </div>`).join('')}
      </div>
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 bg-white rounded-2xl border p-5">
          <div class="font-semibold mb-3">Attendance – Last 7 days</div>
          <canvas id="attChart" height="110"></canvas>
        </div>
        <div class="bg-white rounded-2xl border p-5">
          <div class="font-semibold mb-3">Headcount by Department</div>
          <ul class="space-y-2 text-sm">
            ${(s.by_department||[]).map(d=>`<li class="flex justify-between"><span>${d.name||'Unassigned'}</span><b>${d.count}</b></li>`).join('')||'<li class="text-slate-400">No data</li>'}
          </ul>
          <div class="mt-4 text-xs text-slate-500">Payroll ${s.payroll_month?.pay_month||'-'}/${s.payroll_month?.pay_year||''}: <b>${money(s.payroll_month?.net_total||0)}</b></div>
        </div>
      </div>
      <div class="bg-white rounded-2xl border p-5">
        <div class="font-semibold mb-2">Payroll Trend</div>
        <canvas id="payChart" height="80"></canvas>
        <script> setTimeout(()=>{
          const ctx=document.getElementById('attChart'); if(ctx){ new Chart(ctx, { type:'line', data:{ labels:${JSON.stringify((s.attendance_trend||[]).map(x=>x.date.slice(5)))}, datasets:[{ label:'Present', data:${JSON.stringify((s.attendance_trend||[]).map(x=>x.present))}, tension:.35, fill:true, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.12)'}] }, options:{ plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}} } });}
          const ctx2=document.getElementById('payChart'); if(ctx2){ new Chart(ctx2,{type:'bar', data:{labels:${JSON.stringify((a.payroll_trend||[]).map(p=>p.pay_month+'/'+String(p.pay_year).slice(2)))}, datasets:[{label:'Net Pay', data:${JSON.stringify((a.payroll_trend||[]).map(p=>p.net_total||0))}, backgroundColor:'#0ea5e9'}]}, options:{plugins:{legend:{display:false}}}});}
        },30); <\/script>
      </div>
      <div class="grid md:grid-cols-3 gap-4">
        <button onclick="quickCheck('in')" class="bg-emerald-600 text-white rounded-xl p-4 text-left hover:bg-emerald-700"><div class="text-sm opacity-90">Quick Action</div><div class="font-semibold text-lg">Check In</div></button>
        <button onclick="quickCheck('out')" class="bg-slate-800 text-white rounded-xl p-4 text-left hover:bg-slate-900"><div class="text-sm opacity-80">Quick Action</div><div class="font-semibold text-lg">Check Out</div></button>
        <button onclick="setView('payroll')" class="bg-amber-500 text-slate-900 rounded-xl p-4 text-left hover:bg-amber-400"><div class="text-sm">Finance</div><div class="font-semibold text-lg">Run Payroll →</div></button>
      </div>
    </div>`;
  }catch(e){ return `<div class="text-red-600">Failed to load dashboard: ${e.error||e.message}</div>`}
}

async function viewEmployees(){
  const data = await api('/employees?page=1&limit=50').catch(()=>({data:[],total:0}));
  const offices = await api('/master/offices').catch(()=>({data:[]}));
  const depts = await api('/master/departments').catch(()=>({data:[]}));
  return `<div class="space-y-4">
    <div class="flex flex-wrap gap-3 items-center justify-between">
      <h2 class="text-xl font-semibold">Employees <span class="text-slate-400 text-sm">(${data.total||data.data.length})</span></h2>
      <div class="flex gap-2">
        <a href="/api/export/employees/csv" class="px-3 py-2 border rounded-lg bg-white text-sm" target="_blank">Export CSV</a>
        <button onclick="openEmpModal()" class="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm">+ Add Employee</button>
      </div>
    </div>
    <div class="bg-white rounded-2xl border overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-slate-500"><tr>
          <th class="text-left px-4 py-3">Code</th><th class="text-left px-4 py-3">Name</th><th class="text-left px-4 py-3">Designation</th><th class="text-left px-4 py-3">Office</th><th class="text-left px-4 py-3">Department</th><th class="text-left px-4 py-3">DOJ</th><th class="px-4 py-3">Status</th><th></th>
        </tr></thead>
        <tbody>
          ${(data.data||[]).map(emp=>`
            <tr class="border-t hover:bg-slate-50">
              <td class="px-4 py-3 font-mono text-xs">${emp.employee_code}</td>
              <td class="px-4 py-3"><div class="font-medium">${emp.first_name} ${emp.last_name}</div><div class="text-xs text-slate-500">${emp.email||''}</div></td>
              <td class="px-4 py-3">${emp.designation||'-'}</td>
              <td class="px-4 py-3">${emp.office_code||''}</td>
              <td class="px-4 py-3">${emp.department_name||'-'}</td>
              <td class="px-4 py-3">${emp.date_of_joining||''}</td>
              <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded-full ${emp.employee_status==='Active'?'bg-emerald-50 text-emerald-700':'bg-slate-100'}">${emp.employee_status}</span></td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5">
                  <button onclick='viewEmp(${emp.id})' class="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 hover:bg-slate-50" title="View">👁️ View</button>
                  <button onclick='editEmp(${emp.id})' class="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100" title="Edit">✏️ Edit</button>
                  <button onclick='deleteEmp(${emp.id})' class="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Delete / Exit">🗑️ Delete</button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div id="empModal" class="hidden fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <form id="empForm" class="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-auto" onsubmit="return saveEmp(event)">
        <div class="flex justify-between items-center mb-4"><h3 class="text-lg font-semibold">New Employee</h3><button type="button" onclick="closeEmpModal()" class="text-slate-400">✕</button></div>
        <div class="grid md:grid-cols-3 gap-3 text-sm">
          <div><label>First Name*</label><input name="first_name" required class="w-full border rounded-lg px-3 py-2"></div>
          <div><label>Last Name*</label><input name="last_name" required class="w-full border rounded-lg px-3 py-2"></div>
          <div><label>Email*</label><input name="email" type="email" required class="w-full border rounded-lg px-3 py-2"></div>
          <div><label>Phone</label><input name="phone" class="w-full border rounded-lg px-3 py-2"></div>
          <div><label>Designation*</label><input name="designation" required class="w-full border rounded-lg px-3 py-2"></div>
          <div><label>DOJ*</label><input name="date_of_joining" type="date" required class="w-full border rounded-lg px-3 py-2" value="2025-04-01"></div>
          <div><label>Office*</label><select name="office_id" class="w-full border rounded-lg px-3 py-2">${offices.data.map(o=>`<option value="${o.id}">${o.code} - ${o.city}</option>`).join('')}</select></div>
          <div><label>Department*</label><select name="department_id" class="w-full border rounded-lg px-3 py-2">${depts.data.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div>
          <div><label>Employment</label><select name="employment_type" class="w-full border rounded-lg px-3 py-2"><option>Permanent</option><option>Driver</option><option>Contract</option><option>Probation</option></select></div>
          <div><label>CTC Annual</label><input name="ctc_annual" type="number" class="w-full border rounded-lg px-3 py-2" placeholder="600000"></div>
          <div><label>PAN</label><input name="pan_number" class="w-full border rounded-lg px-3 py-2"></div>
          <div><label>Aadhaar</label><input name="aadhaar_number" class="w-full border rounded-lg px-3 py-2"></div>
        </div>
        <div class="mt-5 flex justify-end gap-2"><button type="button" onclick="closeEmpModal()" class="px-4 py-2 border rounded-lg">Cancel</button><button class="px-5 py-2 bg-blue-700 text-white rounded-lg">Save Employee</button></div>
        <div id="empErr" class="text-red-600 text-sm mt-2 hidden"></div>
      </form>
    </div>
    <div id="empView" class="hidden fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"><div class="bg-white rounded-2xl max-w-2xl w-full p-6" id="empViewBody"></div></div>
  </div>`;
}

async function viewAttendance(){
  const today = new Date().toISOString().slice(0,10);
  const list = await api('/attendance?date='+today).catch(()=>({data:[]}));
  const my = await api('/attendance/my').catch(()=>({data:[]}));
  return `<div class="grid lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-4">
      <div class="flex items-center justify-between"><h2 class="text-xl font-semibold">Today's Attendance – ${today}</h2>
        <div class="flex gap-2"><button onclick="quickCheck('in')" class="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm">Check In</button><button onclick="quickCheck('out')" class="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm">Check Out</button></div>
      </div>
      <div class="bg-white rounded-2xl border overflow-auto">
        <table class="min-w-full text-sm"><thead class="bg-slate-50"><tr><th class="px-3 py-2 text-left">Emp</th><th class="px-3 py-2">In</th><th class="px-3 py-2">Out</th><th class="px-3 py-2">Hours</th><th class="px-3 py-2">Status</th></tr></thead>
        <tbody>${(list.data||[]).map(a=>`<tr class="border-t"><td class="px-3 py-2">${a.employee_name}<div class="text-xs text-slate-500">${a.employee_code}</div></td><td class="px-3 py-2">${a.check_in_time? new Date(a.check_in_time).toLocaleTimeString(): '-'}</td><td class="px-3 py-2">${a.check_out_time? new Date(a.check_out_time).toLocaleTimeString(): '-'}</td><td class="px-3 py-2">${a.work_hours||'-'}</td><td class="px-3 py-2">${a.status}</td></tr>`).join('') || `<tr><td colspan=5 class="px-3 py-6 text-center text-slate-400">No check-ins yet</td></tr>`}</tbody>
        </table>
      </div>
    </div>
    <div class="space-y-4">
      <div class="bg-white rounded-2xl border p-5">
        <div class="font-semibold mb-2">My Month</div>
        <div class="text-sm space-y-1 max-h-80 overflow-auto">
          ${(my.data||[]).map(m=>`<div class="flex justify-between border-b py-1"><span>${m.attendance_date}</span><span class="${m.status==='Present'?'text-emerald-600':m.status==='Late'?'text-amber-600':'text-slate-500'}">${m.status} ${m.work_hours? '('+m.work_hours+'h)':''}</span></div>`).join('')||'No records'}
        </div>
      </div>
      <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-900">
        Office geo-fence & IP restriction is active. Check-in is allowed only from registered office networks / 200m radius.
      </div>
    </div>
  </div>`;
}

async function viewLeaves(){
  const list = await api('/leaves').catch(()=>({data:[]}));
  const bal = await api('/leaves/balance/my').catch(()=>({data:[]}));
  const types = await api('/leaves/types/list').catch(()=>({data:[]}));
  return `<div class="grid lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 bg-white rounded-2xl border p-5">
      <div class="flex justify-between items-center mb-3"><h2 class="text-lg font-semibold">Leave Requests</h2><button onclick="document.getElementById('leaveModal').classList.remove('hidden')" class="px-3 py-2 bg-blue-700 text-white rounded-lg text-sm">+ Apply Leave</button></div>
      <div class="overflow-auto">
        <table class="min-w-full text-sm"><thead class="bg-slate-50"><tr><th class="px-3 py-2 text-left">Employee</th><th class="px-3 py-2">Type</th><th class="px-3 py-2">Dates</th><th class="px-3 py-2">Days</th><th class="px-3 py-2">Status</th><th></th></tr></thead>
        <tbody>${(list.data||[]).map(l=>`<tr class="border-t"><td class="px-3 py-2">${l.employee_name}<div class="text-xs text-slate-500">${l.employee_code}</div></td><td class="px-3 py-2">${l.leave_type_name}</td><td class="px-3 py-2">${l.start_date} → ${l.end_date}</td><td class="px-3 py-2">${l.total_days}</td><td class="px-3 py-2"><span class="px-2 py-1 rounded-full text-xs ${l.status==='Approved'?'bg-emerald-50 text-emerald-700':l.status==='Pending'?'bg-amber-50 text-amber-700':'bg-red-50 text-red-700'}">${l.status}</span></td>
        <td class="px-3 py-2">${l.status==='Pending' ? `<button onclick="approveLeave(${l.id},true)" class="text-emerald-700 text-xs mr-2">Approve</button><button onclick="approveLeave(${l.id},false)" class="text-red-600 text-xs">Reject</button>`:''}</td></tr>`).join('')}</tbody></table>
      </div>
    </div>
    <div class="space-y-4">
      <div class="bg-white rounded-2xl border p-5">
        <div class="font-semibold mb-2">My Leave Balance – ${new Date().getFullYear()}</div>
        ${(bal.data||[]).map(b=>`<div class="flex justify-between text-sm py-1 border-b"><span>${b.leave_type_name}</span><b>${b.balance}</b></div>`).join('')||'<div class="text-slate-400 text-sm">No balance data</div>'}
      </div>
      <div class="bg-white rounded-2xl border p-5 text-sm">
        <div class="font-semibold mb-2">Policy quick view</div>
        <ul class="list-disc ml-4 space-y-1 text-slate-600">
          <li>CL: 12 / yr</li><li>SL: 12 / yr</li><li>EL: 18 / yr, encashable</li><li>Driver comp-off enabled</li>
        </ul>
      </div>
    </div>
  </div>
  <div id="leaveModal" class="hidden fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
    <form class="bg-white rounded-2xl p-6 w-full max-w-lg" onsubmit="return submitLeave(event)">
      <div class="flex justify-between mb-3"><h3 class="font-semibold">Apply Leave</h3><button type="button" onclick="document.getElementById('leaveModal').classList.add('hidden')">✕</button></div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div class="col-span-2"><label>Type</label><select name="leave_type_code" class="w-full border rounded-lg px-3 py-2">${types.data.map(t=>`<option value="${t.code}">${t.name}</option>`).join('')}</select></div>
        <div><label>Start</label><input type="date" name="start_date" required class="w-full border rounded-lg px-3 py-2"></div>
        <div><label>End</label><input type="date" name="end_date" required class="w-full border rounded-lg px-3 py-2"></div>
        <div class="col-span-2"><label>Reason</label><textarea name="reason" required class="w-full border rounded-lg px-3 py-2" rows="3"></textarea></div>
        <div><label>Contact</label><input name="contact_phone" class="w-full border rounded-lg px-3 py-2"></div>
        <div><label>Address during leave</label><input name="address_during_leave" class="w-full border rounded-lg px-3 py-2"></div>
      </div>
      <div class="mt-4 flex justify-end gap-2"><button type="button" onclick="document.getElementById('leaveModal').classList.add('hidden')" class="px-4 py-2 border rounded-lg">Cancel</button><button class="px-4 py-2 bg-blue-700 text-white rounded-lg">Submit</button></div>
      <div id="leaveErr" class="text-red-600 text-sm mt-2 hidden"></div>
    </form>
  </div>`;
}

async function viewPayroll(){
  const runs = await api('/payroll/runs').catch(()=>({data:[]}));
  const slips = await api('/payroll/my-slips').catch(()=>({data:[]}));
  return `<div class="grid lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-4">
      <div class="flex justify-between items-center"><h2 class="text-xl font-semibold">Payroll Runs</h2>
        <button onclick="document.getElementById('prModal').classList.remove('hidden')" class="px-4 py-2 bg-amber-500 rounded-lg text-sm font-medium">+ Generate Run</button>
      </div>
      <div class="bg-white rounded-2xl border overflow-auto">
        <table class="min-w-full text-sm"><thead class="bg-slate-50"><tr><th class="px-3 py-2 text-left">Run</th><th>Period</th><th>Employees</th><th>Gross</th><th>Net</th><th>Status</th><th></th></tr></thead>
        <tbody>${(runs.data||[]).map(r=>`<tr class="border-t"><td class="px-3 py-2 font-mono">${r.run_code}</td><td class="px-3 py-2">${r.pay_month}/${r.pay_year}</td><td class="px-3 py-2">${r.employee_count}</td><td class="px-3 py-2">${money(r.gross_total)}</td><td class="px-3 py-2 font-semibold">${money(r.net_total)}</td><td class="px-3 py-2">${r.status}</td><td class="px-3 py-2"><button onclick="openRun(${r.id})" class="text-blue-700">Open</button></td></tr>`).join('')||'<tr><td colspan=7 class="text-center py-6 text-slate-400">No runs yet – generate first payroll</td></tr>'}</tbody></table>
      </div>
      <div id="runDetail" class="hidden bg-white rounded-2xl border p-5"></div>
    </div>
    <div class="bg-white rounded-2xl border p-5">
      <div class="font-semibold mb-2">My Payslips</div>
      <div class="space-y-2 max-h-[520px] overflow-auto text-sm">
        ${(slips.data||[]).map(s=>`<div class="border rounded-lg p-3 flex justify-between items-center"><div><div class="font-medium">${s.pay_month}/${s.pay_year}</div><div class="text-slate-500">${money(s.net_pay)} net</div></div><a class="text-blue-700 text-xs" href="/api/export/payslip/${s.id}/pdf" target="_blank">PDF</a></div>`).join('')||'No payslips'}
      </div>
    </div>
  </div>
  <div id="prModal" class="hidden fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
    <form class="bg-white rounded-2xl p-6 w-full max-w-md" onsubmit="return generatePayroll(event)">
      <h3 class="font-semibold mb-3">Generate Payroll Run</h3>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div><label>Month</label><input type="number" name="pay_month" min="1" max="12" value="${new Date().getMonth()+1}" class="w-full border rounded-lg px-3 py-2" required></div>
        <div><label>Year</label><input type="number" name="pay_year" value="${new Date().getFullYear()}" class="w-full border rounded-lg px-3 py-2" required></div>
        <div class="col-span-2"><label>Office (optional – leave blank for all)</label><input type="number" name="office_id" placeholder="1 = Mumbai HO" class="w-full border rounded-lg px-3 py-2"></div>
      </div>
      <div class="mt-4 flex justify-end gap-2"><button type="button" onclick="document.getElementById('prModal').classList.add('hidden')" class="px-4 py-2 border rounded-lg">Cancel</button><button class="px-4 py-2 bg-amber-500 rounded-lg font-medium">Generate</button></div>
      <div id="prErr" class="text-red-600 text-sm mt-2 hidden"></div>
    </form>
  </div>`;
}

async function viewReports(){
  const hc = await api('/reports/headcount').catch(()=>({data:[]}));
  const att = await api('/reports/attendance-summary?start=2026-06-01&end=2026-06-30').catch(()=>({start:'',end:'',data:[]}));
  return `<div class="space-y-6">
    <h2 class="text-xl font-semibold">Analytics & Reports</h2>
    <div class="grid md:grid-cols-2 gap-6">
      <div class="bg-white rounded-2xl border p-5">
        <div class="font-semibold mb-3">Headcount by Office</div>
        <table class="w-full text-sm"><thead><tr class="text-slate-500"><th class="text-left py-1">Office</th><th>Permanent</th><th>Drivers</th><th>Total</th></tr></thead>
        <tbody>${hc.data.map(h=>`<tr class="border-t"><td class="py-2">${h.office_name||'—'}</td><td class="text-center">${h.permanent||0}</td><td class="text-center">${h.drivers||0}</td><td class="text-center font-semibold">${h.total||0}</td></tr>`).join('')}</tbody></table>
      </div>
      <div class="bg-white rounded-2xl border p-5">
        <div class="font-semibold mb-2">Export Center</div>
        <div class="space-y-2 text-sm">
          <a href="/api/export/employees/csv" target="_blank" class="block px-3 py-2 border rounded-lg hover:bg-slate-50">⬇ Employees CSV</a>
          <button onclick="alert('Select a payroll run first, then export Excel from run detail.')" class="w-full text-left px-3 py-2 border rounded-lg hover:bg-slate-50">⬇ Payroll Excel</button>
          <button onclick="window.print()" class="w-full text-left px-3 py-2 border rounded-lg hover:bg-slate-50">🖨 Print Report</button>
        </div>
      </div>
    </div>
    <div class="bg-white rounded-2xl border p-5 overflow-auto">
      <div class="font-semibold mb-2">Attendance Summary – ${att.start} to ${att.end}</div>
      <table class="min-w-full text-xs"><thead class="bg-slate-50"><tr><th class="px-2 py-2 text-left">Emp</th><th>Present</th><th>Late</th><th>Absent</th><th>Leave</th><th>Work Hrs</th><th>OT Hrs</th></tr></thead>
      <tbody>${(att.data||[]).slice(0,80).map(r=>`<tr class="border-t"><td class="px-2 py-1">${r.employee_code} – ${r.name}</td><td class="text-center">${r.present||0}</td><td class="text-center">${r.late||0}</td><td class="text-center">${r.absent||0}</td><td class="text-center">${r.leave_days||0}</td><td class="text-center">${Math.round(r.work_hours||0)}</td><td class="text-center">${Math.round(r.ot_hours||0)}</td></tr>`).join('')}</tbody></table>
    </div>
  </div>`;
}

async function viewAudit(){
  const logs = await api('/reports/audit-logs').catch(()=>({data:[]}));
  return `<div class="bg-white rounded-2xl border p-5">
    <h2 class="text-lg font-semibold mb-3">Security Audit Log – Last 500 events</h2>
    <div class="overflow-auto max-h-[70vh] text-xs">
      <table class="min-w-full"><thead class="bg-slate-50 sticky top-0"><tr><th class="px-2 py-2 text-left">Time</th><th class="px-2 py-2 text-left">Actor</th><th>Action</th><th>Entity</th><th>IP</th><th>Severity</th></tr></thead>
      <tbody>${(logs.data||[]).map(l=>`<tr class="border-t"><td class="px-2 py-1">${(l.created_at||'').replace('T',' ').slice(0,19)}</td><td class="px-2 py-1">${l.actor_email||'-'}</td><td class="px-2 py-1">${l.action}</td><td class="px-2 py-1">${l.entity_type||''} ${l.entity_id||''}</td><td class="px-2 py-1">${l.ip_address||''}</td><td class="px-2 py-1">${l.severity}</td></tr>`).join('')}</tbody></table>
    </div>
  </div>`;
}

// helpers
async function quickCheck(dir){
  try{
    const r = await api('/attendance/check'+dir, { method:'POST', body:'{}' });
    alert((dir==='in'?'Checked in: ':'Checked out: ') + JSON.stringify(r));
    render();
  }catch(e){ alert(e.error||'Failed'); }
}
function openEmpModal(){ document.getElementById('empModal').classList.remove('hidden'); }
function closeEmpModal(){ document.getElementById('empModal').classList.add('hidden'); }
async function saveEmp(ev){
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const body = Object.fromEntries(fd.entries());
  body.department_id=parseInt(body.department_id); body.office_id=parseInt(body.office_id);
  if(body.ctc_annual) body.ctc_annual=parseFloat(body.ctc_annual);
  try{
    await api('/employees', { method:'POST', body: JSON.stringify(body) });
    closeEmpModal(); setView('employees');
  }catch(e){
    const el=document.getElementById('empErr'); el.textContent = e.error || JSON.stringify(e); el.classList.remove('hidden');
  }
  return false;
}
async function viewEmp(id){
  const emp = await api('/employees/'+id);
  document.getElementById('empViewBody').innerHTML = `<div class="flex justify-between items-start mb-3"><h3 class="text-lg font-semibold">${emp.first_name} ${emp.last_name} <span class="text-slate-400 text-sm">${emp.employee_code}</span></h3>
    <div class="flex gap-2">
      <button onclick='editEmp(${emp.id});document.getElementById("empView").classList.add("hidden")' class="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg">✏️ Edit</button>
      <button onclick="document.getElementById('empView').classList.add('hidden')" class="text-slate-400">✕</button>
    </div></div>
  <div class="grid md:grid-cols-2 gap-3 text-sm">
    <div><b>Designation:</b> ${emp.designation||''}</div>
    <div><b>Department:</b> ${emp.department_name||''}</div>
    <div><b>Office:</b> ${emp.office_name||''}</div>
    <div><b>Email:</b> ${emp.email||''}</div>
    <div><b>Phone:</b> ${emp.phone||''}</div>
    <div><b>DOJ:</b> ${emp.date_of_joining||''}</div>
    <div><b>PAN:</b> ${emp.pan_number||''}</div>
    <div><b>Aadhaar:</b> ${emp.aadhaar_number||''}</div>
    <div><b>Bank:</b> ${emp.bank_name||''} ${emp.bank_account_no||''}</div>
    <div><b>Status:</b> ${emp.employee_status}</div>
  </div>
  ${emp.salary?`<div class="mt-4 bg-slate-50 p-3 rounded-lg text-sm"><b>CTC:</b> ${money(emp.salary.ctc_annual)} / yr • Basic ${money(emp.salary.basic_monthly)}/mo</div>`:''}
  <div class="mt-4 flex gap-2 justify-end border-t pt-3">
    <button onclick='editEmp(${emp.id});document.getElementById("empView").classList.add("hidden")' class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Edit Employee</button>
    <button onclick='deleteEmp(${emp.id},"${(emp.first_name+" "+emp.last_name).replace(/'/g,"")}");document.getElementById("empView").classList.add("hidden")' class="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm">Delete / Exit</button>
  </div>
  `;
  document.getElementById('empView').classList.remove('hidden');
}

// --- v1.4 UI: Edit / Delete – multi-tasking ---
let editEmpId = null;
async function editEmp(id){
  try{
    const emp = await api('/employees/'+id);
    editEmpId = id;
    // open modal in edit mode
    const modal = document.getElementById('empModal');
    if(!modal){ alert('Employee form not loaded – open Employees page first'); return; }
    modal.classList.remove('hidden');
    const form = document.getElementById('empForm');
    if(form){
      const titleEl = form.querySelector('h3');
      if(titleEl) titleEl.textContent = 'Edit Employee – ' + emp.employee_code;
      const submitBtn = form.querySelector('button[type="submit"]');
      if(submitBtn) submitBtn.textContent = 'Update Employee';
      form.onsubmit = function(ev){ return updateEmp(ev, id); };
      // fill fields
      ['first_name','last_name','email','phone','designation','date_of_joining','pan_number','aadhaar_number','bank_name','bank_account_no','bank_ifsc','city','state','pincode','address_line1'].forEach(k=>{
        const el = form.querySelector(`[name="${k}"]`);
        if(el && emp[k] != null) el.value = emp[k];
      });
      const setSel = (name,val)=>{ const el=form.querySelector(`[name="${name}"]`); if(el && val) el.value = val; };
      setSel('department_id', emp.department_id);
      setSel('office_id', emp.office_id);
      setSel('employment_type', emp.employment_type);
    }
    showToast('Editing '+emp.first_name+' '+emp.last_name+' – multi-task panel open', 'info');
  }catch(e){ alert('Edit load failed: '+(e.error||e.message)); }
}

async function updateEmp(ev, id){
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const body = {};
  ['first_name','last_name','phone','designation','department_id','office_id','employment_type','address_line1','city','state','pincode','bank_name','bank_account_no','bank_ifsc','pan_number','aadhaar_number','employee_status'].forEach(k=>{
    const v = fd.get(k);
    if(v !== null && v !== '') body[k] = v;
  });
  if(body.department_id) body.department_id = parseInt(body.department_id);
  if(body.office_id) body.office_id = parseInt(body.office_id);
  try{
    await api('/employees/'+id, { method:'PUT', body: JSON.stringify(body) });
    closeEmpModal();
    showToast('Employee updated successfully ✅','success');
    // reset form back to Add mode
    const form = document.getElementById('empForm');
    if(form){ form.reset(); form.onsubmit = function(ev){ return saveEmp(ev); };
      const titleEl = form.querySelector('h3'); if(titleEl) titleEl.textContent='New Employee';
      const btn = form.querySelector('button[type="submit"]'); if(btn) btn.textContent='Save Employee';
    }
    editEmpId = null;
    setView('employees');
  }catch(e){
    const el=document.getElementById('empErr'); if(el){el.textContent=e.error||'Update failed'; el.classList.remove('hidden');}
    showToast(e.error||'Update failed','error');
  }
  return false;
}

async function deleteEmp(id, name){
  const displayName = name || 'this employee';
  // multi-layer confirm dialog
  const ok1 = confirm(`🗑️ Delete / Exit Employee\n\n${displayName} (ID ${id})\n\nThis will mark employee as Exited (soft delete, auditable, recoverable).\n\nProceed?`);
  if(!ok1) return;
  const reason = prompt('Exit reason / notes (optional – will be audit logged):', 'Resigned – HR approved');
  if(reason === null) return; // cancelled
  try{
    await api('/employees/'+id, { method:'DELETE', body: JSON.stringify({}) });
    showToast(displayName+' marked as Exited – audit logged','success');
    // refresh list – multi-tasking: stay on same page
    if(state.view==='employees') setView('employees');
  }catch(e){
    alert('Delete failed: '+(e.error||e.message));
    showToast('Delete failed','error');
  }
}

// --- Multi-tasking UI helpers – toast / split panel ---
function showToast(msg, type='info'){
  let t = document.getElementById('ahtoast');
  if(!t){
    t = document.createElement('div');
    t.id='ahtoast';
    t.style.cssText='position:fixed;right:18px;bottom:18px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(t);
  }
  const colors = {info:'bg-slate-900',success:'bg-emerald-600',warning:'bg-amber-500',error:'bg-red-600'};
  const n = document.createElement('div');
  n.className = (colors[type]||colors.info)+' text-white px-4 py-3 rounded-xl shadow-2xl text-sm max-w-sm';
  n.textContent = msg;
  t.appendChild(n);
  setTimeout(()=>{ n.style.opacity='0'; n.style.transition='opacity .4s'; setTimeout(()=>n.remove(),400)}, 3200);
}

// quick multitask dock – shows last opened employees
const taskDock = [];
function pushTask(label, fn){
  taskDock.unshift({label, fn, t:Date.now()});
  if(taskDock.length>5) taskDock.pop();
  renderTaskDock();
}
function renderTaskDock(){
  let d = document.getElementById('taskdock');
  if(!d && taskDock.length){
    d = document.createElement('div');
    d.id='taskdock';
    d.className='fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-2 text-xs flex gap-2 items-center z-40 no-print';
    d.innerHTML = '<span class="text-slate-500 mr-2">🧩 Multi-task:</span><span id="taskdock-items" class="flex gap-2 flex-wrap"></span><button onclick="this.parentElement.remove()" class="ml-auto text-slate-400">×</button>';
    document.body.appendChild(d);
  }
  const items = document.getElementById('taskdock-items');
  if(items) items.innerHTML = taskDock.map((x,i)=>`<button onclick="(${x.fn})()" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-full">${x.label}</button>`).join('');
}
// patch viewEmp to push to task dock
const _origViewEmp = viewEmp;
viewEmp = async function(id){ pushTask('Emp #'+id, ()=>viewEmp(id)); return _origViewEmp(id); };

async function submitLeave(ev){
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const body = Object.fromEntries(fd.entries());
  try{
    await api('/leaves', { method:'POST', body: JSON.stringify(body) });
    document.getElementById('leaveModal').classList.add('hidden');
    setView('leaves');
  }catch(e){ const el=document.getElementById('leaveErr'); el.textContent=e.error||'Failed'; el.classList.remove('hidden'); }
  return false;
}
async function approveLeave(id, ok){
  try{
    await api(`/leaves/${id}/${ok?'approve':'reject'}`, { method:'PUT', body: JSON.stringify({ reason: ok?'Approved':'Rejected' }) });
    setView('leaves');
  }catch(e){ alert(e.error||'Failed'); }
}
async function generatePayroll(ev){
  ev.preventDefault();
  const fd=new FormData(ev.target); const body=Object.fromEntries(fd.entries());
  body.pay_month=parseInt(body.pay_month); body.pay_year=parseInt(body.pay_year);
  if(body.office_id) body.office_id=parseInt(body.office_id); else delete body.office_id;
  try{ await api('/payroll/generate', { method:'POST', body: JSON.stringify(body) }); document.getElementById('prModal').classList.add('hidden'); setView('payroll'); }
  catch(e){ const el=document.getElementById('prErr'); el.textContent=e.error||'Failed'; el.classList.remove('hidden'); }
  return false;
}
async function openRun(id){
  const d = await api(`/payroll/runs/${id}`);
  const box=document.getElementById('runDetail');
  box.classList.remove('hidden');
  box.innerHTML = `<div class="flex justify-between items-center mb-3"><div class="font-semibold">Run ${d.run.run_code} – ${d.run.pay_month}/${d.run.pay_year} • ${d.items.length} employees • Net ${money(d.run.net_total)}</div>
    <div class="flex gap-2"><a href="/api/export/payroll/${id}/excel" target="_blank" class="px-3 py-1.5 border rounded-lg text-sm">Export Excel</a>
    ${d.run.status==='Draft'?`<button onclick="approveRun(${id})" class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm">Approve Run</button>`: `<span class="text-emerald-700 text-sm">${d.run.status}</span>`}
    </div></div>
    <div class="overflow-auto max-h-96 text-xs">
      <table class="min-w-full"><thead class="bg-slate-50"><tr><th class="px-2 py-1 text-left">Emp</th><th>Days</th><th>Gross</th><th>Ded</th><th>Net</th><th>Slip</th></tr></thead>
      <tbody>${d.items.map(it=>`<tr class="border-t"><td class="px-2 py-1">${it.employee_code} ${it.employee_name}</td><td class="text-center">${it.pay_days}</td><td class="text-right">${money(it.gross_earnings)}</td><td class="text-right">${money(it.total_deductions)}</td><td class="text-right font-semibold">${money(it.net_pay)}</td><td class="text-center"><a class="text-blue-700" target="_blank" href="/api/export/payslip/${it.id}/pdf">PDF</a></td></tr>`).join('')}</tbody></table>
    </div>`;
}
async function approveRun(id){ await api(`/payroll/runs/${id}/approve`, { method:'POST', body:'{}' }); openRun(id); }

// render
async function render(){
  const root = document.getElementById('app');
  if(!state.token){
    root.innerHTML = loginScreen();
    const f=document.getElementById('loginForm');
    if(f) f.onsubmit = async (e)=>{
      e.preventDefault();
      const fd=new FormData(f);
      try{
        const r=await api('/auth/login', { method:'POST', body: JSON.stringify(Object.fromEntries(fd)) });
        state.token=r.token; state.user=r.user;
        localStorage.setItem('aht_token', r.token);
        localStorage.setItem('aht_user', JSON.stringify(r.user));
        render();
      }catch(err){
        const el=document.getElementById('loginErr'); el.textContent=err.error||'Login failed'; el.classList.remove('hidden');
      }
    };
    return;
  }
  // fetch me to enrich
  try{ const me=await api('/auth/me'); state.user={...state.user, ...me}; }catch{}
  let body='Loading...';
  try{
    if(state.view==='dashboard') body=await viewDashboard();
    else if(state.view==='employees') body=await viewEmployees();
    else if(state.view==='attendance') body=await viewAttendance();
    else if(state.view==='leaves') body=await viewLeaves();
    else if(state.view==='payroll') body=await viewPayroll();
    else if(state.view==='reports') body=await viewReports();
    else if(state.view==='audit') body=await viewAudit();
    else body='<div>Not implemented</div>';
  }catch(e){ body=`<div class="text-red-600">Error: ${e.error||e.message}</div>`}
  root.innerHTML = layout(body);
  if(window.lucide) lucide.createIcons();
}
render();
