# TC Portal - Review Pack Export Script
# Creates a ZIP file for external code review (ChatGPT, etc.)
#
# Usage: .\scripts\export-review-pack.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

Write-Host "TC Portal - Review Pack Export" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Output file
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "tc-portal-review-pack.zip"
$tempDir = Join-Path $env:TEMP "tc-portal-review-pack-$timestamp"

# Clean up previous
if (Test-Path $zipName) {
    Remove-Item $zipName -Force
}
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}

# Create temp directory
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Collecting files..." -ForegroundColor Yellow

# Files and directories to include
$includes = @(
    "docs/review",
    "supabase",
    "src",
    "tests",
    "runner",
    "helper/app",
    "helper/requirements.txt",
    "helper/build.ps1",
    "helper/dist-shared/install.ps1",
    "helper/dist-shared/README.txt",
    "playwright.config.ts",
    "package.json",
    "next.config.ts",
    "tsconfig.json",
    "CLAUDE.md",
    ".env.example"
)

# Copy files
foreach ($item in $includes) {
    $sourcePath = Join-Path $projectRoot $item
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $tempDir $item
        $destDir = Split-Path -Parent $destPath

        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }

        if (Test-Path $sourcePath -PathType Container) {
            # Directory - copy recursively, excluding unwanted files
            Copy-Item $sourcePath $destPath -Recurse -Force

            # Remove unwanted files from copied directory
            Get-ChildItem $destPath -Recurse -Include @(
                "node_modules",
                ".next",
                ".venv",
                "__pycache__",
                "*.pyc",
                ".auth",
                "dist",
                "build",
                "*.log",
                ".DS_Store"
            ) -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        } else {
            # File
            Copy-Item $sourcePath $destPath -Force
        }
        Write-Host "  + $item" -ForegroundColor Green
    } else {
        Write-Host "  - $item (not found)" -ForegroundColor Gray
    }
}

# Create ZIP
Write-Host ""
Write-Host "Creating ZIP archive..." -ForegroundColor Yellow

Compress-Archive -Path "$tempDir\*" -DestinationPath $zipName -Force

# Cleanup temp
Remove-Item $tempDir -Recurse -Force

# Show result
$zipInfo = Get-Item $zipName
$sizeMB = [math]::Round($zipInfo.Length / 1MB, 2)

Write-Host ""
Write-Host "===============================" -ForegroundColor Green
Write-Host "Export complete!" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green
Write-Host ""
Write-Host "Output: $zipName" -ForegroundColor Cyan
Write-Host "Size: $sizeMB MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Contents:" -ForegroundColor Yellow
Write-Host "  - docs/review/     : Review documentation"
Write-Host "  - supabase/        : Database migrations & config"
Write-Host "  - src/             : Next.js source code"
Write-Host "  - tests/           : E2E tests"
Write-Host "  - runner/          : Windows Runner agent"
Write-Host "  - helper/          : TC Portal Helper"
Write-Host "  - Config files     : package.json, tsconfig.json, etc."
Write-Host ""
Write-Host "Usage:" -ForegroundColor Yellow
Write-Host "  1. Upload $zipName to ChatGPT or other AI"
Write-Host "  2. Ask for code review or analysis"
Write-Host ""
