@echo off
echo A.H. Transport HRMS – Admin Remote Access
echo.
echo This creates a SECURE public HTTPS link
echo ONLY for Admin / HR – employees still BLOCKED
echo (employees need office WiFi – code enforces it)
echo.
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
  echo Installing cloudflared...
  echo Downloading...
  powershell -Command "Invoke-WebRequest -Uri https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile %TEMP%\cloudflared.exe"
  move %TEMP%\cloudflared.exe cloudflared.exe
)
echo.
echo Starting secure tunnel...
echo Share the https://...trycloudflare.com link ONLY with Admin/HR
echo.
cloudflared.exe tunnel --url http://localhost:8080
pause
