@echo off
echo ===== AH Transport HRMS – Node Diagnostic =====
echo.
echo Computer: %COMPUTERNAME%
echo User: %USERNAME%
echo.
echo --- Checking node ---
where node
if %errorlevel%==0 (
  node -v
  echo [OK] node found
) else (
  echo [MISSING] node NOT in PATH
)
echo.
echo --- Checking npm ---
where npm
if %errorlevel%==0 (
  call npm -v
  echo [OK] npm found
) else (
  echo [MISSING] npm NOT in PATH
)
echo.
echo --- PATH ---
echo %PATH%
echo.
echo --- If npm not recognized ---
echo 1. Install Node: https://nodejs.org  (green LTS button)
echo 2. Restart PC after install
echo 3. Open NEW black window (cmd) – old window will NOT work
echo 4. OR just double-click START-PORTABLE-NO-INSTALL.bat – no install needed
echo.
echo --- Network info (your office) ---
ipconfig | findstr /i "IPv4 IPv6 Physical"
echo.
pause
