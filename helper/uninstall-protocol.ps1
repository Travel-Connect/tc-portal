# TC Portal Helper - URLスキーム削除スクリプト
# HKCU (ユーザー権限) からtcportal://スキームを削除
#
# 使用方法:
#   PowerShellで実行: .\uninstall-protocol.ps1

$ErrorActionPreference = "Stop"

Write-Host "Unregistering tcportal:// URL scheme..." -ForegroundColor Cyan

# レジストリパス
$regPath = "HKCU:\Software\Classes\tcportal"

try {
    if (Test-Path $regPath) {
        Remove-Item -Path $regPath -Recurse -Force
        Write-Host ""
        Write-Host "Success! tcportal:// URL scheme has been removed." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "tcportal:// URL scheme was not registered." -ForegroundColor Yellow
    }

} catch {
    Write-Host "Error: Failed to unregister URL scheme" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
