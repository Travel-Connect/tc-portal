<#
.SYNOPSIS
    TC Portal Webhook 送信スクリプト
.DESCRIPTION
    タスクの実行結果を TC Portal の /api/monitor/report に送信します。
    送信失敗時もエラーを出力するだけで、exit code は 0 を返します。
.PARAMETER TaskKey
    タスクの一意識別子（必須）
.PARAMETER TaskName
    UI表示名（必須）
.PARAMETER Kind
    タスク種別: 'bat' または 'python'（必須）
.PARAMETER Status
    実行結果: 'success' または 'failed'（必須）
.PARAMETER ExitCode
    終了コード（省略可）
.PARAMETER Message
    メッセージ/エラー詳細（省略可）
.PARAMETER StartedAt
    開始日時 ISO8601形式（省略可）
.PARAMETER FinishedAt
    終了日時 ISO8601形式（省略可）
.PARAMETER DurationMs
    実行時間ミリ秒（省略可）
.PARAMETER LogUrl
    ログファイルのパス/URL（省略可）
.PARAMETER MachineName
    実行PC名（省略時: $env:COMPUTERNAME）
.EXAMPLE
    .\tcportal-monitor.ps1 -TaskKey "nightly_import" -TaskName "ナイトリー取込" -Kind "bat" -Status "success" -ExitCode 0
.NOTES
    環境変数:
      TC_PORTAL_BASE_URL      - ポータルURL（省略時: https://tc-portal.vercel.app）
      TC_PORTAL_WEBHOOK_SECRET - Webhookシークレット（必須）
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$TaskKey,

    [Parameter(Mandatory=$true)]
    [string]$TaskName,

    [Parameter(Mandatory=$true)]
    [ValidateSet('bat', 'python')]
    [string]$Kind,

    [Parameter(Mandatory=$true)]
    [ValidateSet('success', 'failed')]
    [string]$Status,

    [Parameter(Mandatory=$false)]
    [int]$ExitCode,

    [Parameter(Mandatory=$false)]
    [string]$Message,

    [Parameter(Mandatory=$false)]
    [string]$StartedAt,

    [Parameter(Mandatory=$false)]
    [string]$FinishedAt,

    [Parameter(Mandatory=$false)]
    [int]$DurationMs,

    [Parameter(Mandatory=$false)]
    [string]$LogUrl,

    [Parameter(Mandatory=$false)]
    [string]$MachineName = $env:COMPUTERNAME
)

# 環境変数の取得（プロセス環境変数がなければシステム環境変数をチェック）
$baseUrl = $env:TC_PORTAL_BASE_URL
if (-not $baseUrl) {
    $baseUrl = [Environment]::GetEnvironmentVariable('TC_PORTAL_BASE_URL', 'Machine')
}
if (-not $baseUrl) {
    $baseUrl = "https://tc-portal.vercel.app"
}

$secret = $env:TC_PORTAL_WEBHOOK_SECRET
if (-not $secret) {
    $secret = [Environment]::GetEnvironmentVariable('TC_PORTAL_WEBHOOK_SECRET', 'Machine')
}
if (-not $secret) {
    Write-Error "[TC Portal] TC_PORTAL_WEBHOOK_SECRET が設定されていません"
    exit 0  # 送信失敗でもジョブは継続
}

# エンドポイントURL
$url = "$baseUrl/api/monitor/report"

# ペイロード組み立て
$payload = @{
    task_key = $TaskKey
    task_name = $TaskName
    kind = $Kind
    status = $Status
    machine_name = $MachineName
}

# オプションパラメータを追加
if ($PSBoundParameters.ContainsKey('ExitCode')) {
    $payload['exit_code'] = $ExitCode
}
if ($Message) {
    $payload['message'] = $Message
}
if ($StartedAt) {
    $payload['started_at'] = $StartedAt
}
if ($FinishedAt) {
    $payload['finished_at'] = $FinishedAt
}
if ($PSBoundParameters.ContainsKey('DurationMs')) {
    $payload['duration_ms'] = $DurationMs
}
if ($LogUrl) {
    $payload['log_url'] = $LogUrl
}

# JSON変換（UTF-8）
$jsonBody = $payload | ConvertTo-Json -Compress

try {
    # ヘッダー設定
    $headers = @{
        'Content-Type' = 'application/json; charset=utf-8'
        'X-TC-Portal-Secret' = $secret
    }

    # Webhook送信
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody)) -TimeoutSec 10

    if ($response.ok) {
        Write-Host "[TC Portal] 報告成功: $Status (monitor_id: $($response.monitor_id))"
    } else {
        Write-Warning "[TC Portal] 報告失敗: $($response | ConvertTo-Json -Compress)"
    }
}
catch {
    Write-Error "[TC Portal] 送信エラー: $_"
    # 送信失敗でもジョブは継続（exit code 0）
}

exit 0
