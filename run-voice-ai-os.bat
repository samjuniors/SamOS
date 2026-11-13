@echo off
title Hermes Voice AI OS
echo ===================================================
echo Starting Hermes Voice AI OS (Windows Desktop Shell)
echo ===================================================

cd /d "%~dp0apps\desktop"

set HERMES_DESKTOP_DEV_SERVER=http://127.0.0.1:5174
set HERMES_DESKTOP_BOOT_FAKE=1

echo [1/3] Checking for running Electron instances...
tasklist /fi "imagename eq electron.exe" 2>nul | find /i /n "electron.exe" >nul
if "%ERRORLEVEL%"=="0" (
    echo [!] Previous Electron instance detected. Terminating for fresh restart...
    taskkill /f /im electron.exe /t >nul 2>&1
    timeout /t 1 /nobreak >nul
    echo [*] Previous Electron instance stopped successfully.
) else (
    echo [*] No conflicting Electron instances found.
)

echo [2/3] Checking Electron Main bundle...
call node scripts\bundle-electron-main.mjs --dev

echo [3/3] Checking Vite Dev Server ^& Launching App...
netstat -ano | findstr ":5174" | findstr "LISTENING" >nul
if "%ERRORLEVEL%"=="0" (
    echo [*] Vite Dev Server is already running on port 5174.
) else (
    echo [*] Launching Vite Dev Server in background...
    start "Hermes Vite Server" cmd /k "corepack pnpm@12.15.0 exec vite --host 127.0.0.1 --port 5174"
    timeout /t 3 /nobreak >nul
)

echo [*] Launching fresh Electron Desktop Window...
call .\node_modules\.bin\electron.cmd .
