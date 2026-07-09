@echo off
setlocal EnableDelayedExpansion
title AH Transport HRMS - Portable Website - No Admin Install
color 0A
cd /d "%~dp0"
echo.
echo ==============================================
echo  A.H. Transport HRMS – PORTABLE WEBSITE
echo  Office WiFi + Office Computer ONLY
echo  Admin = anywhere
echo  NO Node install needed – auto download
echo ==============================================
echo.

REM --- Check system node first ---
where node >nul 2>nul
if %errorlevel%==0 (
  echo [Found system Node]
  set NODE_CMD=node
  set NPM_CMD=call npm
  goto :runapp
)

REM --- Use portable node in .\node\ ---
if exist "%~dp0node\node.exe" (
  echo [Found portable Node]
  set NODE_CMD=%~dp0node\node.exe
  set NPM_CMD=%~dp0node\npm.cmd
  goto :runapp
)

echo Node.js NOT FOUND – downloading portable version...
echo This is ONE TIME – 35 MB – 1-2 minute
echo.
if not exist node mkdir node
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host 'Downloading Node 20 LTS portable...'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.1/node-v20.18.1-win-x64.zip' -OutFile '%TEMP%\node.zip'; Expand-Archive -Path '%TEMP%\node.zip' -DestinationPath '%~dp0node_temp' -Force; Move-Item '%~dp0node_temp\node-v20.18.1-win-x64\*' '%~dp0node\' -Force; Remove-Item '%~dp0node_temp' -Recurse -Force; Remove-Item '%TEMP%\node.zip' -Force; Write-Host 'Done!'"

if not exist "%~dp0node\node.exe" (
  echo.
  echo [FAILED] Download failed – check internet
  echo Manual download:
  echo 1. Open https://nodejs.org/dist/v20.18.1/node-v20.18.1-win-x64.zip
  echo 2. Extract ALL files into: %~dp0node\
  echo 3. Run this .bat again
  echo.
  pause
  start https://nodejs.org/dist/v20.18.1/node-v20.18.1-win-x64.zip
  exit /b
)

set NODE_CMD=%~dp0node\node.exe
set NPM_CMD=call %~dp0node\npm.cmd

echo.
echo [OK] Portable Node ready:
%NODE_CMD% -v

:runapp
echo.
echo --- Installing website dependencies (first time 2 min) ---
cd backend
if not exist node_modules (
  %NPM_CMD% install --no-audit --no-fund
) else (
  echo node_modules exists – skipping
)

echo.
echo --- Starting HRMS Website ---
echo.
echo  EMPLOYEES (office WiFi only):
echo    http://localhost:8080
echo    http://192.168.1.29:8080
echo    http://hrms.local
echo.
echo  ADMIN (anywhere):
echo    use START-ADMIN-REMOTE.bat after this starts
echo.
echo  Login:
echo    admin@ahtransport.co.in / Admin@12345   (anywhere)
echo    hr@ahtransport.co.in / Hr@12345
echo    rajesh.kumar@ahtransport.co.in / Emp@12345  (office only)
echo.
echo  Your office PC:
echo    IP  : 192.168.1.29
echo    MAC : 10-FF-E0-4E-C3-3D
echo    IPv6: 2400:7f60:207::/48
echo.
echo  Press Ctrl+C to stop
echo ==============================================

REM Office-only environment
set NODE_ENV=production
set HOST=0.0.0.0
set PORT=8080
set OFFICE_IP_STRICT=true
set DEVICE_WHITELIST_ENFORCE=true
set ALLOWED_NETWORKS=192.168.1.0/24,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,127.0.0.1/32,::1/128,fe80::/10,2400:7f60:207::/48

REM migrate DB
%NODE_CMD% src/db/migrate.js

REM start server
%NODE_CMD% src/server.js

pause
