# TC Portal - Playwright Report Export Script
# Creates a ZIP file of the Playwright test report
#
# Usage: .\scripts\export-playwright-report.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

Write-Host "TC Portal - Playwright Report Export" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if playwright-report exists
$reportDir = Join-Path $projectRoot "playwright-report"
if (-not (Test-Path $reportDir)) {
    Write-Host "Error: playwright-report directory not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run tests first:" -ForegroundColor Yellow
    Write-Host "  npx playwright test" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Output file
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "playwright-report-$timestamp.zip"

# Clean up previous (with same timestamp pattern)
Get-ChildItem "playwright-report-*.zip" -ErrorAction SilentlyContinue | Remove-Item -Force

Write-Host "Creating ZIP archive..." -ForegroundColor Yellow

# Create ZIP
Compress-Archive -Path "$reportDir\*" -DestinationPath $zipName -Force

# Show result
$zipInfo = Get-Item $zipName
$sizeMB = [math]::Round($zipInfo.Length / 1MB, 2)

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Export complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Output: $zipName" -ForegroundColor Cyan
Write-Host "Size: $sizeMB MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view the report:" -ForegroundColor Yellow
Write-Host "  1. Extract the ZIP"
Write-Host "  2. Open index.html in a browser"
Write-Host ""
Write-Host "Or serve it locally:" -ForegroundColor Yellow
Write-Host "  npx playwright show-report" -ForegroundColor Gray
Write-Host ""
