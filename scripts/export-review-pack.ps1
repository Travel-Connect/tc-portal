# TC Portal - Review Pack Export Script
# Creates a ZIP file for external code review (ChatGPT, etc.)
#
# Usage: .\scripts\export-review-pack.ps1
#        .\scripts\export-review-pack.ps1 -Force   # skip secret check

param(
    [switch]$Force
)

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

            # Remove unwanted files/directories from copied directory
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
                ".DS_Store",
                # Security: exclude config files that may contain secrets
                "config.json",
                "config-*.json",
                ".env",
                ".env.local",
                ".env.*.local",
                "REVIEW_PACK.md",
                "temp_*.json"
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

# --- Secret detection scan ---
Write-Host ""
Write-Host "Scanning for secrets..." -ForegroundColor Yellow

$secretPatterns = @(
    @{ Label = "JWT token";           Pattern = '(?<!payload=)eyJ[A-Za-z0-9_\-]{30,}' },
    @{ Label = "Bearer token";        Pattern = 'Bearer\s+[A-Za-z0-9._\-]{20,}' },
    @{ Label = "PASSWORD with value"; Pattern = '(?i)_PASSWORD\s*[:=]\s*(?!process\.env|\$\{\{|secrets\.|your[\-_]|<|os\.environ)\S{4,}' },
    @{ Label = "SECRET with value";   Pattern = '(?i)_SECRET\s*[:=]\s*(?!process\.env|\$\{\{|secrets\.|<|os\.environ)\S{10,}' },
    @{ Label = "PRIVATE_KEY value";   Pattern = '(?i)PRIVATE_KEY\s*[:=]\s*(?!process\.env|\$\{\{|secrets\.|os\.environ)\S{10,}' },
    @{ Label = "Supabase project URL"; Pattern = 'https://[a-z]{10,}\.supabase\.co' },
    @{ Label = "machine_key value";   Pattern = '"machine_key"\s*:\s*"(?!your[\-_]|<)[^"]{10,}"' }
)

# Lines containing these strings are safe (URL scheme payloads, etc.)
$safeLinePatterns = @(
    'tcportal://'
)

$binaryExts = @('.png','.jpg','.jpeg','.gif','.ico','.woff','.woff2','.ttf','.eot','.zip','.gz','.br','.map')
$hits = @()

$textFiles = Get-ChildItem $tempDir -Recurse -File |
    Where-Object { $binaryExts -notcontains $_.Extension }

foreach ($sp in $secretPatterns) {
    $results = $textFiles |
        Select-String -Pattern $sp.Pattern -ErrorAction SilentlyContinue

    foreach ($r in $results) {
        # Skip lines matching known safe patterns
        $isSafe = $false
        foreach ($safe in $safeLinePatterns) {
            if ($r.Line -match [regex]::Escape($safe)) { $isSafe = $true; break }
        }
        if ($isSafe) { continue }

        $relPath = $r.Path.Replace("$tempDir\", "")
        $linePreview = $r.Line.Trim()
        if ($linePreview.Length -gt 100) {
            $linePreview = $linePreview.Substring(0, 100) + "..."
        }
        $hits += [PSCustomObject]@{
            File    = $relPath
            Line    = $r.LineNumber
            Label   = $sp.Label
            Preview = $linePreview
        }
    }
}

if ($hits.Count -gt 0) {
    Write-Host ""
    Write-Host "!! SECRETS DETECTED !!" -ForegroundColor Red
    Write-Host "======================" -ForegroundColor Red

    foreach ($h in $hits) {
        Write-Host "  [$($h.Label)] $($h.File):$($h.Line)" -ForegroundColor Red
        Write-Host "    $($h.Preview)" -ForegroundColor DarkGray
    }

    Write-Host ""
    Write-Host "Total: $($hits.Count) potential secret(s) found." -ForegroundColor Red

    if (-not $Force) {
        Write-Host ""
        Write-Host "Aborting. Remove secrets or re-run with -Force." -ForegroundColor Yellow
        Remove-Item $tempDir -Recurse -Force
        exit 1
    }

    Write-Host ""
    Write-Host "-Force specified. Continuing despite warnings." -ForegroundColor Yellow
} else {
    Write-Host "  No secrets detected." -ForegroundColor Green
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
