<#
.SYNOPSIS
    TC Portal スモークテスト用環境情報収集スクリプト

.DESCRIPTION
    Helper/Runnerの動作確認に必要な環境情報を収集し、ログファイルに保存します。
    問題発生時の原因切り分けに使用します。

.EXAMPLE
    .\collect-env.ps1
    # logs/smoke-20260120-153000.txt に結果が保存されます
#>

$ErrorActionPreference = "Continue"

# ログファイルのパス
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptRoot)
$logsDir = Join-Path $projectRoot "logs"
$logFile = Join-Path $logsDir "smoke-$timestamp.txt"

# logsディレクトリがなければ作成
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

function Write-Log {
    param([string]$Message)
    $Message | Tee-Object -FilePath $logFile -Append
}

function Write-Section {
    param([string]$Title)
    Write-Log ""
    Write-Log "=" * 60
    Write-Log " $Title"
    Write-Log "=" * 60
}

function Test-UrlReachable {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ==================================================
# 収集開始
# ==================================================

Write-Log "TC Portal Smoke Test - Environment Collection"
Write-Log "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Log "Log File: $logFile"

# --------------------------------------------------
# 1. OS情報
# --------------------------------------------------
Write-Section "1. OS Information"

$os = Get-CimInstance -ClassName Win32_OperatingSystem
Write-Log "OS Name: $($os.Caption)"
Write-Log "OS Version: $($os.Version)"
Write-Log "OS Build: $($os.BuildNumber)"
Write-Log "Computer Name: $env:COMPUTERNAME"
Write-Log "User Name: $env:USERNAME"

# --------------------------------------------------
# 2. OneDrive検出
# --------------------------------------------------
Write-Section "2. OneDrive Detection"

# 標準的なOneDriveパス
$standardOneDrive = $env:OneDrive
Write-Log "Standard OneDrive (%OneDrive%): $standardOneDrive"

if ($standardOneDrive -and (Test-Path $standardOneDrive)) {
    Write-Log "  -> EXISTS"
} else {
    Write-Log "  -> NOT FOUND or NOT SET"
}

# 法人OneDrive（トラベルコネクト）
$corporateOneDrivePaths = @(
    "$env:USERPROFILE\OneDrive - トラベルコネクト",
    "$env:USERPROFILE\OneDrive - Travel Connect",
    "C:\Users\$env:USERNAME\OneDrive - トラベルコネクト"
)

Write-Log ""
Write-Log "Corporate OneDrive Paths:"
foreach ($path in $corporateOneDrivePaths) {
    if (Test-Path $path) {
        Write-Log "  [FOUND] $path"
    } else {
        Write-Log "  [NOT FOUND] $path"
    }
}

# OneDrive関連の環境変数をすべて表示
Write-Log ""
Write-Log "OneDrive-related Environment Variables:"
Get-ChildItem env: | Where-Object { $_.Name -like "*OneDrive*" -or $_.Value -like "*OneDrive*" } | ForEach-Object {
    Write-Log "  $($_.Name) = $($_.Value)"
}

# --------------------------------------------------
# 3. tcportal:// プロトコル登録状況
# --------------------------------------------------
Write-Section "3. tcportal:// Protocol Registration"

$protocolPath = "HKCU:\Software\Classes\tcportal"
$commandPath = "HKCU:\Software\Classes\tcportal\shell\open\command"

if (Test-Path $protocolPath) {
    Write-Log "Protocol Key: EXISTS"

    try {
        $urlProtocol = Get-ItemProperty -Path $protocolPath -Name "URL Protocol" -ErrorAction SilentlyContinue
        Write-Log "URL Protocol Flag: $($urlProtocol.'URL Protocol' -ne $null)"
    } catch {
        Write-Log "URL Protocol Flag: NOT SET"
    }

    if (Test-Path $commandPath) {
        $command = (Get-ItemProperty -Path $commandPath).'(default)'
        Write-Log "Command: $command"

        # コマンドからexeパスを抽出して存在確認
        if ($command -match '"([^"]+)"') {
            $exePath = $matches[1]
            if (Test-Path $exePath) {
                Write-Log "Executable: EXISTS at $exePath"
            } else {
                Write-Log "Executable: NOT FOUND at $exePath"
            }
        }
    } else {
        Write-Log "Command Key: NOT FOUND"
    }
} else {
    Write-Log "Protocol Key: NOT REGISTERED"
    Write-Log "  -> Run install-protocol.ps1 to register"
}

# --------------------------------------------------
# 4. Helper関連
# --------------------------------------------------
Write-Section "4. Helper Files"

$helperPaths = @(
    (Join-Path $projectRoot "helper\dist\tcportal-helper.exe"),
    (Join-Path $projectRoot "helper\dist-shared\tcportal-helper.exe"),
    "$env:USERPROFILE\OneDrive - トラベルコネクト\tc-portal-helper\tcportal-helper.exe"
)

Write-Log "Checking Helper executable locations:"
foreach ($path in $helperPaths) {
    if (Test-Path $path) {
        $fileInfo = Get-Item $path
        Write-Log "  [FOUND] $path"
        Write-Log "          Size: $($fileInfo.Length) bytes"
        Write-Log "          Modified: $($fileInfo.LastWriteTime)"
    } else {
        Write-Log "  [NOT FOUND] $path"
    }
}

# Helper config
$helperConfigPaths = @(
    (Join-Path $projectRoot "helper\config.json"),
    (Join-Path $projectRoot "helper\dist\config.json")
)

Write-Log ""
Write-Log "Checking Helper config locations:"
foreach ($path in $helperConfigPaths) {
    if (Test-Path $path) {
        Write-Log "  [FOUND] $path"
    } else {
        Write-Log "  [NOT FOUND] $path"
    }
}

# --------------------------------------------------
# 5. Runner関連
# --------------------------------------------------
Write-Section "5. Runner Files"

$runnerAgentPath = Join-Path $projectRoot "runner\agent.py"
$runnerConfigPath = Join-Path $projectRoot "runner\config.json"
$runnerVenvPath = Join-Path $projectRoot "runner\.venv"

Write-Log "Runner Agent: $(if (Test-Path $runnerAgentPath) { 'EXISTS' } else { 'NOT FOUND' })"
Write-Log "Runner Config: $(if (Test-Path $runnerConfigPath) { 'EXISTS' } else { 'NOT FOUND' })"
Write-Log "Runner Venv: $(if (Test-Path $runnerVenvPath) { 'EXISTS' } else { 'NOT FOUND' })"

if (Test-Path $runnerConfigPath) {
    Write-Log ""
    Write-Log "Runner Config Contents (sanitized):"
    try {
        $config = Get-Content $runnerConfigPath | ConvertFrom-Json
        Write-Log "  portal_url: $($config.portal_url)"
        Write-Log "  machine_key: $(if ($config.machine_key) { '***SET***' } else { 'NOT SET' })"
        Write-Log "  poll_interval_sec: $($config.poll_interval_sec)"
        Write-Log "  execution_timeout: $($config.execution_timeout)"
        Write-Log "  python_exe: $($config.python_exe)"
        Write-Log "  scripts_base_path: $($config.scripts_base_path)"
        Write-Log "  pad_exe: $($config.pad_exe)"

        # パスの存在確認
        Write-Log ""
        Write-Log "  Path Validation:"
        if ($config.python_exe -and (Test-Path $config.python_exe)) {
            Write-Log "    python_exe: EXISTS"
        } else {
            Write-Log "    python_exe: NOT FOUND or NOT SET"
        }
        if ($config.scripts_base_path -and (Test-Path $config.scripts_base_path)) {
            Write-Log "    scripts_base_path: EXISTS"
        } else {
            Write-Log "    scripts_base_path: NOT FOUND or NOT SET"
        }
        if ($config.pad_exe -and (Test-Path $config.pad_exe)) {
            Write-Log "    pad_exe: EXISTS"
        } else {
            Write-Log "    pad_exe: NOT FOUND or NOT SET (OK if PAD not used)"
        }
    } catch {
        Write-Log "  Error reading config: $_"
    }
}

# --------------------------------------------------
# 6. Python環境
# --------------------------------------------------
Write-Section "6. Python Environment"

try {
    $pythonVersion = & python --version 2>&1
    Write-Log "Python (system): $pythonVersion"
} catch {
    Write-Log "Python (system): NOT FOUND in PATH"
}

$runnerPython = Join-Path $projectRoot "runner\.venv\Scripts\python.exe"
if (Test-Path $runnerPython) {
    try {
        $venvPythonVersion = & $runnerPython --version 2>&1
        Write-Log "Python (runner venv): $venvPythonVersion"
    } catch {
        Write-Log "Python (runner venv): Error getting version"
    }
} else {
    Write-Log "Python (runner venv): NOT FOUND"
}

# --------------------------------------------------
# 7. ネットワーク疎通
# --------------------------------------------------
Write-Section "7. Network Connectivity"

$urls = @(
    "https://tc-portal.vercel.app",
    "https://tc-portal.vercel.app/api/health",
    "https://yqgsyyjjnqnidnwfkqms.supabase.co"
)

foreach ($url in $urls) {
    Write-Log -NoNewline "Testing $url ... "
    if (Test-UrlReachable $url) {
        Write-Log "OK"
    } else {
        Write-Log "FAILED"
    }
}

# --------------------------------------------------
# 8. Power Automate Desktop
# --------------------------------------------------
Write-Section "8. Power Automate Desktop"

$padPaths = @(
    "C:\Program Files (x86)\Power Automate Desktop\PAD.Console.Host.exe",
    "C:\Program Files\Power Automate Desktop\PAD.Console.Host.exe"
)

Write-Log "Checking PAD installation:"
$padFound = $false
foreach ($path in $padPaths) {
    if (Test-Path $path) {
        Write-Log "  [FOUND] $path"
        $padFound = $true
    }
}
if (-not $padFound) {
    Write-Log "  PAD not found (OK if not using PAD tools)"
}

# --------------------------------------------------
# 完了
# --------------------------------------------------
Write-Section "Collection Complete"
Write-Log ""
Write-Log "Results saved to: $logFile"
Write-Log ""
Write-Log "If you encounter issues, please share this log file."

# コンソールにも最終メッセージを表示
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Green
Write-Host " Smoke Test Environment Collection Complete" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Green
Write-Host ""
Write-Host "Log saved to: $logFile" -ForegroundColor Cyan
Write-Host ""
