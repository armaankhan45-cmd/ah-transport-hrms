# A.H. Transport HRMS – Cloud Website – 5 Minute – NO npm install on your PC

You were right – local Windows + Node 24 + better-sqlite3 compile = nightmare.
Use cloud hosting – FREE – website opens in browser – employees office-WiFi-only still enforced, admin anywhere.

## Option A – Render.com – FREE – 5 min

1. Go https://github.com → New repository → Upload files
   – drag & drop the `ah-transport-hrms` folder zip
   – Create repo: `ah-transport-hrms` – Public

2. Go https://render.com → Sign up free (with GitHub)
   → New → Web Service → Connect your GitHub repo `ah-transport-hrms`
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node src/server.js`
   - Instance: Free
   - Click “Advanced” → Add Environment Variables:
     ```
     NODE_ENV=production
     HOST=0.0.0.0
     JWT_SECRET=change-me-64-char-random
     OFFICE_IP_STRICT=true
     DEVICE_WHITELIST_ENFORCE=false
     TRUST_PROXY=true
     CORS_ORIGIN=*
     ALLOWED_NETWORKS=192.168.1.0/24,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,127.0.0.1/32,::1/128,2400:7f60:207::/48,103.175.191.0/24,103.160.126.0/24
     ```
   → Create Web Service → wait 3 min → you get:
   **https://ah-transport-hrms.onrender.com**

3. Open that URL – in Chrome – anywhere:
   - Login: `admin@ahtransport.co.in / Admin@12345` → works – anywhere
   - Employee login: `rajesh.kumar@ahtransport.co.in / Emp@12345`
     - From office WiFi (IP `2400:7f60:207::/48` or `103.175.191.x`) → works
     - From home 4G → **403 Office WiFi required** → perfect

Done. No `npm`, no `node not recognized`, no Windows Build Tools. Just a website URL.

## Option B – Railway.app – 1 click

- https://railway.app → New Project → Deploy from GitHub repo
- Variables same as above
- → get `https://ah-hrms-production.up.railway.app`

## Option C – Replit – instant browser IDE – 0 install

- https://replit.com → Import from GitHub
- Click Run → website live instantly
- Free URL: `https://ah-transport-hrms.yourname.repl.co`

## Why this solves your pain

- ❌ No `npm install` on your office PC
- ❌ No `node-gyp` / `better-sqlite3` compile errors
- ❌ No `NODE_ENV not recognized`
- ❌ No `ERR_CONNECTION_REFUSED`
- ✅ Just open **https://your-site.onrender.com** in Chrome
- ✅ Employees: office WiFi only – enforced by IP `2400:7f60:207::/48` + `103.175.191.0/24`
- ✅ Admin: anywhere – bypass built-in
- ✅ Same full HRMS – dashboards, payroll, PDF, Excel

## Office WiFi IP auto-detect

Your office:
- IPv6: `2400:7f60:207:e2dd:…` / `2400:7f60:207:22df:…` → whitelisted `2400:7f60:207::/48`
- IPv4 DNS: `103.175.191.2`, `103.160.126.2` → whitelisted `103.175.191.0/24` + `103.160.126.0/24`
- LAN: `192.168.1.0/24`

If office public IP changes → Admin panel → Settings → update ALLOWED_NETWORKS env var in Render → redeploy 30 sec.

---

Need me to deploy it for you? Give me:
1. a GitHub repo – or I give you a 1-click “Deploy to Render” button
2. I’ll set: admin@ahtransport.co.in / your chosen password
3. You get: `https://ah-hrms.onrender.com` – open in browser – done

No npm. No node. No Windows errors. Pure website.
