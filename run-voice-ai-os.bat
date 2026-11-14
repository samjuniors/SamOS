@echo off
setlocal
title SamOS - Windows Electron Development

cd /d "%~dp0apps\desktop"
where pnpm >nul 2>&1
if errorlevel 1 (
  echo ERROR: pnpm not found. Prepare the repository toolchain using activate.ps1.
  exit /b 1
)

echo Starting SamOS Windows Electron development shell...
echo Existing Electron applications will not be terminated.
call pnpm run dev
exit /b %errorlevel%
