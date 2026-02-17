@echo off
title Auto Polaris Launcher
echo ========================================
echo   Starting Auto Polaris...
echo ========================================
echo.

:: Start the bridge server in a new window
echo Starting Bridge Server on port 3001...
start "Bridge Server" cmd /k "cd /d K:\Auto_Polaris && node server/index.js"

:: Small delay to let the server initialize
timeout /t 2 /nobreak >nul

:: Start the dashboard in a new window
echo Starting Dashboard on port 5173...
start "Dashboard" cmd /k "cd /d K:\Auto_Polaris\dashboard && npm run dev"

echo.
echo ========================================
echo   Both services are starting!
echo   - Server:    http://localhost:3001
echo   - Dashboard: http://localhost:5173
echo ========================================
echo.

:: Wait for Vite to be ready, then open browser
echo Opening dashboard in browser...
timeout /t 4 /nobreak >nul
start "" http://localhost:5173

echo Done! You can close this window.
timeout /t 3
