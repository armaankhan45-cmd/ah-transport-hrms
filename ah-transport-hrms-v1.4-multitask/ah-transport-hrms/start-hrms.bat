@echo off
title A.H. Transport Co. - HRMS Website
color 0A
echo.
echo ==============================================
echo  A.H. Transport Co. - HRMS Enterprise v1.1
echo  Office WiFi + Office Computer ONLY
echo  Admin Remote Access ENABLED
echo ==============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js NOT FOUND
  echo.
  echo 1. Open: https://nodejs.org/en/download
  echo 2. Download: "Windows Installer 20 LTS x64 (.msi)"
  echo 3. Install – click NEXT, NEXT, NEXT – keep "Add to PATH" checked
  echo 4. CLOSE this window, reopen, run start-hrms.bat again
  echo.
  pause
  start https://nodejs.org/en/download
  exit /b
)

echo [OK] Node found:
node -v
echo [OK] NPM found:
call npm -v

echo.
echo --- Installing dependencies (first time only, 2 min) ---
cd /d "%~dp0backend"
if not exist "node_modules" (
  echo Running npm install – please wait...
  call npm install
  if %errorlevel% neq 0 (
    echo.
    echo [BUILD TOOLS NEEDED] Installing windows build tools...
    echo This is one-time only.
    call npm install -g node-gyp
    echo Now retrying...
    call npm install
  )
) else (
  echo node_modules already exists – skipping
)

echo.
echo --- Initializing database ---
call npm run migrate

echo.
echo ==============================================
echo  HRMS WEBSITE STARTING...
echo ==============================================
echo.
echo  EMPLOYEES open in Chrome:
echo    http://192.168.1.50:8080
echo    http://hrms.local
echo    http://localhost:8080
echo.
echo  ADMIN – can also open from home / mobile:
echo    (use Cloudflare tunnel – see START-ADMIN-REMOTE.bat)
echo.
echo  Login:
echo    admin@ahtransport.co.in / Admin@12345  (anywhere)
echo    hr@ahtransport.co.in / Hr@12345         (anywhere)
echo    rajesh.kumar@ahtransport.co.in / Emp@12345  (office WiFi only)
echo.
echo  Your office PC:
echo    IP : 192.168.1.29
echo    MAC: 10-FF-E0-4E-C3-3D
echo.
echo  Press Ctrl+C to stop server
echo ==============================================
echo.

REM Set office-only environment
set NODE_ENV=production
set HOST=0.0.0.0
set PORT=8080
set OFFICE_IP_STRICT=true
set DEVICE_WHITELIST_ENFORCE=true
set ALLOWED_NETWORKS=192.168.1.0/24,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,127.0.0.1/32,::1/128,fe80::/10,2400:7f60:207::/48
set CORS_ORIGIN=http://192.168.1.50:8080 http://192.168.1.29:8080 http://localhost:8080 http://hrms.local

node src/server.js

pause
