# TC Portal Helper - ビルドスクリプト
# PyInstallerを使用して単体EXEを生成
#
# 使用方法:
#   PowerShellで実行: .\build.ps1

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Building TC Portal Helper..." -ForegroundColor Cyan

# Python仮想環境の確認・作成
$venvPath = Join-Path $scriptDir ".venv"
$venvPython = Join-Path $venvPath "Scripts\python.exe"
$venvPip = Join-Path $venvPath "Scripts\pip.exe"

if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $venvPath
}

# 依存パッケージをインストール
Write-Host "Installing dependencies..." -ForegroundColor Yellow
& $venvPip install -r requirements.txt --quiet

# PyInstallerでビルド
Write-Host "Running PyInstaller..." -ForegroundColor Yellow
$mainPy = Join-Path $scriptDir "app\main.py"

& $venvPython -m PyInstaller `
    --onefile `
    --name "tcportal-helper" `
    --distpath "dist" `
    --workpath "build" `
    --specpath "build" `
    --clean `
    --noconfirm `
    --hidden-import "win32com" `
    --hidden-import "win32com.client" `
    --hidden-import "pythoncom" `
    --hidden-import "pywintypes" `
    $mainPy

# 結果確認
$exePath = Join-Path $scriptDir "dist\tcportal-helper.exe"
if (Test-Path $exePath) {
    $fileInfo = Get-Item $exePath
    Write-Host ""
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host "Output: $exePath" -ForegroundColor Gray
    Write-Host "Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run .\install-protocol.ps1 to register the URL scheme" -ForegroundColor Gray
    Write-Host "  2. Test by clicking a tcportal:// link in the portal" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Build failed! EXE not found." -ForegroundColor Red
    exit 1
}
