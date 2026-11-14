# SamOS Windows Electron development launcher (real backend, no fake boot)
$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
$desktopRoot = Join-Path $repoRoot 'apps\desktop'

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw 'pnpm was not found. From the repository root run: . .\activate.ps1 ; pnpm install --frozen-lockfile'
}

Write-Host 'Starting SamOS Windows Electron development shell...' -ForegroundColor Cyan
Write-Host 'Existing Electron applications will not be terminated.' -ForegroundColor Gray

Push-Location $desktopRoot
try {
  & pnpm run dev
  if ($LASTEXITCODE -ne 0) {
    throw "SamOS desktop development process exited with code $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}
