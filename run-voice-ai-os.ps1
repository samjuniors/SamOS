# Hermes Voice AI OS - PowerShell Launcher
$ErrorActionPreference = "SilentlyContinue"
Set-Location "$PSScriptRoot\apps\desktop"

$env:HERMES_DESKTOP_DEV_SERVER = "http://127.0.0.1:5174"
$env:HERMES_DESKTOP_BOOT_FAKE = "1"

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Launching Hermes Voice AI OS (Windows Desktop)   " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Kill any existing Electron instances for a clean restart
$existingElectron = Get-Process -Name "electron" -ErrorAction SilentlyContinue
if ($existingElectron) {
    Write-Host "[!] Existing Electron instance detected ($($existingElectron.Count) processes)." -ForegroundColor Yellow
    Write-Host "[*] Terminating previous Electron processes for clean restart..." -ForegroundColor Yellow
    Stop-Process -Name "electron" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 1000
    Write-Host "[*] Previous Electron instances terminated." -ForegroundColor Green
} else {
    Write-Host "[*] No conflicting Electron instances running." -ForegroundColor Gray
}

# 2. Bundle Electron main
Write-Host "[1/2] Bundling Electron main process..." -ForegroundColor Gray
node scripts\bundle-electron-main.mjs --dev

# 3. Check if Vite server is already running on port 5174
$portListening = Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue
if (-not $portListening) {
    Write-Host "[2/2] Starting Vite Dev Server on port 5174..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\apps\desktop'; corepack pnpm@12.15.0 exec vite --host 127.0.0.1 --port 5174"
    Start-Sleep -Seconds 3
} else {
    Write-Host "[2/2] Vite Dev Server is already active on port 5174." -ForegroundColor Green
}

Write-Host "Opening fresh Electron Desktop Window..." -ForegroundColor Cyan
& ".\node_modules\.bin\electron.cmd" .
