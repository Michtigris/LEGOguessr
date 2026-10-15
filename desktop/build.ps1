# Build LEGO Guessr.exe (Windows)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "==> Build frontend..." -ForegroundColor Cyan
Set-Location "$Root\frontend"
npm install
npm run build
Set-Location $Root

Write-Host "==> Install deps build..." -ForegroundColor Cyan
python -m pip install -r backend\requirements.txt "uvicorn[standard]" pywebview pyinstaller

Write-Host "==> PyInstaller (onefile)..." -ForegroundColor Cyan
python -m PyInstaller desktop\lego_guessr.spec --noconfirm --clean --distpath dist-desktop --workpath build-desktop

$exe = Join-Path $Root "dist-desktop\LEGO Guessr.exe"
if (Test-Path $exe) {
    Write-Host ""
    Write-Host "OK - executable pret :" -ForegroundColor Green
    Write-Host "  $exe"
    Write-Host ""
    Write-Host "Sauvegardes (listes) :" -ForegroundColor Yellow
    Write-Host "  $env:LOCALAPPDATA\LEGO Guessr\"
    Write-Host "Copie juste le .exe pour tes amis (double-clic)."
} else {
    Write-Host "Echec : exe introuvable" -ForegroundColor Red
    exit 1
}
