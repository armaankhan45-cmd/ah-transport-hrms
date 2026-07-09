# Office WiFi + Office Computer ONLY – Implementation Guide
A.H. Transport Co. HRMS v1.0.1 – Office Lockdown Edition
Date: 5 July 2026

## What is enforced

1. **Network Layer – IP CIDR whitelist**
   - Default ALLOWED_NETWORKS:
     - `192.168.1.0/24` – your current office WiFi (you are 192.168.1.29)
     - `192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12` – private RFC1918
     - `127.0.0.1/32`, `::1/128`, `fe80::/10` – loopback/link-local
     - `2400:7f60:207::/48` – your Airtel / Mumbai IPv6 office prefix
       - current addresses seen:
         - `2400:7f60:207:e2dd:9654:d30c:730c:1e1`
         - `2400:7f60:207:22df:d0eb:bedf:a81f:e9ee`
   - Any IP outside → 403 `OFFICE_IP_REQUIRED`, audit logged severity=high
   - Config: `OFFICE_IP_STRICT=true` (default)

2. **Server bind – LAN only**
   - `HOST=192.168.1.50` – change to your HRMS server LAN IP
   - Node listens ONLY on 192.168.1.50:8080 – not 0.0.0.0
   - No internet exposure

3. **CORS – office origins only**
   - `CORS_ORIGIN=http://192.168.1.50:8080 http://hrms.local http://hrms.ah.local`
   - `TRUST_PROXY=false` – prevents X-Forwarded-For spoof

4. **Device whitelist – office computers only**
   - New table: `device_whitelist (fingerprint, mac_address, label, ...)`
   - Fingerprint = SHA256(IP + User-Agent [+ X-Device-ID header])
   - `DEVICE_WHITELIST_ENFORCE=true` (default)
   - First SUPER_ADMIN login auto-approves that PC
   - All other devices → 403 `DEVICE_NOT_WHITELISTED` + critical audit
   - Admin API:
     - `GET /api/master/my-device` → get your fingerprint
     - `GET /api/master/devices` → list
     - `POST /api/master/devices {label, mac_address, fingerprint?, assigned_user_id, office_id}`
     - `DELETE /api/master/devices/:id`
   - Pre-seed your PC:
     - MAC: `10-FF-E0-4E-C3-3D`
     - IP: `192.168.1.29`
     - IPv6: `2400:7f60:207::/48`
     - Use: login once as admin → device auto-approved → then lock down via UI

5. **Nginx / UFW – second wall**
```
allow 192.168.1.0/24;
allow 2400:7f60:207::/48;
deny all;
```
+ `ufw allow from 192.168.1.0/24 to any port 80`

## Quick Install – Office Locked

```bash
# on office server, e.g. 192.168.1.50
cd /opt/ah-transport-hrms/backend
cp ../.env.example .env
# edit HOST=192.168.1.50
npm ci --only=production
npm run migrate
pm2 start src/server.js --name ah-hrms
```

Browse from your office PC (192.168.1.29):
http://192.168.1.50:8080
Login admin@ahtransport.co.in / Admin@12345
→ first device auto-whitelisted

Then:
- Admin → API `GET /api/master/my-device` → copy fingerprint
- POST to `/api/master/devices` to pre-approve other office PCs with their MACs
- Example:
```json
{
  "label": "HR-Desktop-01 – Mumbai HO",
  "mac_address": "10-FF-E0-4E-C3-3D",
  "office_id": 1,
  "assigned_user_id": 2
}
```

## Verification

Office WiFi (192.168.1.29):
`curl http://192.168.1.50:8080/api/health` → 200 ok

4G / outside:
→ 403 `Access denied – Office network only`

Non-whitelisted laptop on office WiFi:
→ Login works, but next API call → 403 `This computer is not authorized`

## Emergency bypass

If locked out:
```bash
sqlite3 database/hrms.sqlite
UPDATE device_whitelist SET is_active=1;
-- or
UPDATE users SET is_locked=0 WHERE email='admin@ahtransport.co.in';
```
Or temporarily: `DEVICE_WHITELIST_ENFORCE=false` in .env → pm2 restart

Production recommended: keep ENFORCE=true, OFFICE_IP_STRICT=true

Contact: it@ahtransport.co.in
