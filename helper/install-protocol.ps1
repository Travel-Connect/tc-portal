# TC Portal Helper - URLスキーム登録スクリプト
# HKCU (ユーザー権限) でtcportal://スキームを登録
#
# 使用方法:
#   PowerShellで実行: .\install-protocol.ps1

$ErrorActionPreference = "Stop"

# Helper EXEのパス（このスクリプトと同じディレクトリのdistフォルダ内）
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$helperPath = Join-Path $scriptDir "dist\tcportal-helper.exe"

# EXEが存在するか確認
if (-not (Test-Path $helperPath)) {
    Write-Host "Error: Helper EXE not found at: $helperPath" -ForegroundColor Red
    Write-Host "Please run build.ps1 first to create the executable." -ForegroundColor Yellow
    exit 1
}

Write-Host "Registering tcportal:// URL scheme..." -ForegroundColor Cyan
Write-Host "Helper path: $helperPath" -ForegroundColor Gray

# レジストリパス
$regPath = "HKCU:\Software\Classes\tcportal"

try {
    # tcportal キーを作成
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }

    # 基本プロパティを設定
    Set-ItemProperty -Path $regPath -Name "(Default)" -Value "URL:TC Portal Helper"
    Set-ItemProperty -Path $regPath -Name "URL Protocol" -Value ""

    # shell\open\command パスを作成
    $commandPath = "$regPath\shell\open\command"
    if (-not (Test-Path $commandPath)) {
        New-Item -Path $commandPath -Force | Out-Null
    }

    # コマンドを設定（%1 でURLを受け取る）
    Set-ItemProperty -Path $commandPath -Name "(Default)" -Value "`"$helperPath`" `"%1`""

    Write-Host ""
    Write-Host "Success! tcportal:// URL scheme has been registered." -ForegroundColor Green
    Write-Host ""
    Write-Host "You can test it by opening the following URL in a browser:" -ForegroundColor Cyan
    Write-Host "  tcportal://open?payload=eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnMifQ==" -ForegroundColor Gray
    Write-Host ""
    Write-Host "(This will open C:\Users folder)" -ForegroundColor Gray

} catch {
    Write-Host "Error: Failed to register URL scheme" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
