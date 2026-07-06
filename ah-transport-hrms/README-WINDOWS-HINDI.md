# A.H. Transport HRMS – Windows Office Install – 5 Minute

Aapke office computer: 
- IP: 192.168.1.29
- MAC: 10-FF-E0-4E-C3-3D
- WiFi: Office LAN

## Problem: `npm is not recognized`

Iska matlab: **Node.js install nahi hai** – bilkul normal, 2 min me fix.

---

## STEP 1 – Node.js install (1 time only)

1. Open Chrome → https://nodejs.org
2. Click big green button: **“20 LTS – Download”**
   - File: `node-v20.xx.x-x64.msi` ~30 MB
3. Double-click → Next → Next → Next → **✓ “Automatically install necessary tools” – TICK karein** → Install
4. Computer restart maangega – **Restart karein**
5. Fir se: Start Menu → type `cmd` → Enter
   ```
   node -v
   ```
   → `v20.xx.x` dikhna chahiye
   ```
   npm -v
   ```
   → `10.xx.x` dikhna chahiye
→ Done! Ab npm command chalega.

Agar fir bhi `npm not recognized`:
- Start Menu → “Edit system environment variables”
- Path me check: `C:\Program Files\nodejs\` hona chahiye
- Naya CMD open karein (purana band karke)

---

## STEP 2 – HRMS Website start

1. ZIP extract karein: `C:\ah-hrms\`
2. Folder me double-click: **`start-hrms.bat`**
   - Pehli baar: `npm install` automatic – 2 minute lagega
   - Fir likhega:
     ```
     🚛 A.H. Transport Co. HRMS – OFFICE-ONLY MODE
        http://192.168.1.50:8080   (LAN only)
     ```
3. Chrome open karein:
   ```
   http://localhost:8080
   ```
   → HRMS website khul jayegi!

---

## STEP 3 – Employees kaise use karenge

- Office ke sab computers → Chrome me:
  ```
  http://192.168.1.50:8080
  ya
  http://hrms.local
  ```
- Login: apna email / password
- Office WiFi PE HI chalega
- Ghar / 4G / mobile data PE → **“Office WiFi required”** – automatic block

## STEP 4 – Admin kaise anywhere se access karega

- Double-click: **`START-ADMIN-REMOTE.bat`**
- 10 second me ek link milega:
  ```
  https://something.trycloudflare.com
  ```
- Ye link sirf Admin/HR ko bheje
- Admin ghar se / mobile se open kar sakta hai
- Employee us link se bhi try karega → **fir bhi block** – kyunki code check karta hai: role = EMPLOYEE → office IP mandatory

---

## Quick Fix Checklist

`npm is not recognized` →
→ Node.js install karein https://nodejs.org → restart PC → new CMD open

`better-sqlite3 build failed` →
→ Node installer me “install necessary tools” tick kiya tha? Nahi to:
  Start Menu → “Install Additional Tools for Node.js” → chalaye → wait 10 min → fir `npm install` dubara

`EADDRINUSE :8080` →
→ Port already use ho raha hai
→ `start-hrms.bat` me PORT=8081 karke save karein

`Access denied – Office IP required` →
→ Sahi hai! Employee bahar se try kar raha hai – system kaam kar raha hai
→ Admin login use karein: `admin@ahtransport.co.in`

Server ka IP change karna ho:
→ `backend\src\config\env.js` me `HOST: '192.168.1.29'` kar de – aapka current PC IP

---

Support: it@ahtransport.co.in
Made for A.H. Transport Co., Mumbai
