# TC Portal Helper - Install Script for Shared Folder
# Registers tcportal:// URL scheme to run Helper from OneDrive shared folder
#
# Usage: Run in PowerShell: .\install.ps1

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "TC Portal Helper - Shared Folder Installer" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Detect OneDrive Root
# =============================================================================

$orgFolderName = "OneDrive - トラベルコネクト"
$orgRoot = $null

# Collect candidates
$candidates = @()

if ($env:OneDriveCommercial) {
    $candidates += $env:OneDriveCommercial
    $candidates += "$env:OneDriveCommercial\$orgFolderName"
}

if ($env:OneDrive) {
    $candidates += $env:OneDrive
    $candidates += "$env:OneDrive\$orgFolderName"
}

# All OneDrive* environment variables
Get-ChildItem Env: | Where-Object { $_.Name -like "OneDrive*" } | ForEach-Object {
    $candidates += $_.Value
    $candidates += "$($_.Value)\$orgFolderName"
}

# Registry
for ($i = 1; $i -le 9; $i++) {
    $regPath = "HKCU:\Software\Microsoft\OneDrive\Accounts\Business$i"
    if (Test-Path $regPath) {
        try {
            $userFolder = (Get-ItemProperty -Path $regPath -Name "UserFolder" -ErrorAction SilentlyContinue).UserFolder
            if ($userFolder) {
                $candidates += $userFolder
                $candidates += "$userFolder\$orgFolderName"
            }
        }
        catch { }
    }
}

# Validate candidates
Write-Host "Detecting OneDrive root..." -ForegroundColor Yellow
foreach ($candidate in $candidates) {
    if ($candidate -and $candidate.EndsWith($orgFolderName) -and (Test-Path $candidate -PathType Container)) {
        $orgRoot = $candidate
        Write-Host "  Found: $orgRoot" -ForegroundColor Green
        break
    }
}

if (-not $orgRoot) {
    Write-Host "Error: Company OneDrive ($orgFolderName) not found" -ForegroundColor Red
    Write-Host "Please ensure OneDrive is properly synced." -ForegroundColor Yellow
    exit 1
}

# =============================================================================
# Helper EXE Path
# =============================================================================

$helperPath = "$orgRoot\014.ポータルサイト\tcportal-helper.exe"

Write-Host ""
Write-Host "Helper EXE path: $helperPath" -ForegroundColor Gray

if (-not (Test-Path $helperPath)) {
    Write-Host ""
    Write-Host "Warning: Helper EXE not found yet" -ForegroundColor Yellow
    Write-Host "  Expected location: $helperPath" -ForegroundColor Yellow
    Write-Host ""

    $continue = Read-Host "Register URL scheme anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Cancelled. Please run again after EXE is placed." -ForegroundColor Yellow
        exit 0
    }
}

# =============================================================================
# Register URL Scheme
# =============================================================================

Write-Host ""
Write-Host "Registering tcportal:// URL scheme..." -ForegroundColor Yellow

$regPath = "HKCU:\Software\Classes\tcportal"

try {
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }

    Set-ItemProperty -Path $regPath -Name "(Default)" -Value "URL:TC Portal Helper"
    Set-ItemProperty -Path $regPath -Name "URL Protocol" -Value ""

    $commandPath = "$regPath\shell\open\command"
    if (-not (Test-Path $commandPath)) {
        New-Item -Path $commandPath -Force | Out-Null
    }

    Set-ItemProperty -Path $commandPath -Name "(Default)" -Value "`"$helperPath`" `"%1`""

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Registered:" -ForegroundColor Cyan
    Write-Host "  URL Scheme: tcportal://" -ForegroundColor White
    Write-Host "  Helper EXE: $helperPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Test by opening this URL in browser:" -ForegroundColor Cyan
    Write-Host "  tcportal://open?payload=eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnMifQ==" -ForegroundColor White
    Write-Host "  (Should open C:\Users folder)" -ForegroundColor Gray

}
catch {
    Write-Host "Error: Failed to register URL scheme" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
