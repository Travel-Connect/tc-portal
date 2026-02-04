<#
.SYNOPSIS
    TC Portal Completion Log - JSONL書き込みユーティリティ
.DESCRIPTION
    タスクの完了状態を <StatusDir>\<TaskKey>.jsonl に1行JSONとして追記する。
    wrap-and-report.bat はこのログを読み取り、真の成功/失敗を判定する。
.PARAMETER TaskKey
    タスク識別子（必須）
.PARAMETER TaskName
    UI表示名（必須）
.PARAMETER Kind
    タスク種別: 'bat' | 'python'（必須）
.PARAMETER Status
    実行結果: 'success' | 'failed'（必須）
.PARAMETER RunId
    実行ID（wrap-and-report.bat が生成して環境変数で渡す）
.PARAMETER ExitCode
    終了コード（省略可）
.PARAMETER Message
    メッセージ/エラー詳細（省略可）
.PARAMETER StartedAt
    開始日時 ISO8601 UTC形式（省略可、省略時は現在時刻）
.PARAMETER FinishedAt
    終了日時 ISO8601 UTC形式（省略可、省略時は現在時刻）
.PARAMETER DurationMs
    実行時間ミリ秒（省略可）
.PARAMETER LogUrl
    ログファイルのパス/URL（省略可）
.PARAMETER StatusDir
    JSONL出力ディレクトリ（省略時: C:\TcPortalMonitor\status）
.EXAMPLE
    .\tcportal-tasklog.ps1 -TaskKey "my_task" -TaskName "マイタスク" -Kind "bat" -Status "success" -RunId "abc-123"
.NOTES
    このスクリプトは常に exit 0 を返す（書き込み失敗でもジョブに影響させない）。
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
    [string]$RunId,

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
    [string]$StatusDir = "C:\TcPortalMonitor\status"
)

try {
    # ディレクトリ作成
    if (-not (Test-Path $StatusDir)) {
        New-Item -Path $StatusDir -ItemType Directory -Force | Out-Null
    }

    # RunId が未指定の場合は環境変数から取得
    if (-not $RunId) {
        $RunId = $env:TC_PORTAL_RUN_ID
    }
    if (-not $RunId) {
        $RunId = [System.Guid]::NewGuid().ToString()
    }

    # タイムスタンプのデフォルト値
    $now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    if (-not $StartedAt) { $StartedAt = $now }
    if (-not $FinishedAt) { $FinishedAt = $now }

    # ログエントリ組み立て
    $entry = [ordered]@{
        v            = 1
        task_key     = $TaskKey
        task_name    = $TaskName
        kind         = $Kind
        machine_name = $env:COMPUTERNAME
        run_id       = $RunId
        status       = $Status
        started_at   = $StartedAt
        finished_at  = $FinishedAt
    }

    # オプションフィールド
    if ($PSBoundParameters.ContainsKey('DurationMs')) {
        $entry['duration_ms'] = $DurationMs
    }
    if ($PSBoundParameters.ContainsKey('ExitCode')) {
        $entry['exit_code'] = $ExitCode
    }
    if ($Message) {
        $entry['message'] = $Message
    }
    if ($LogUrl) {
        $entry['log_url'] = $LogUrl
    }

    # JSON 1行に変換
    $jsonLine = $entry | ConvertTo-Json -Compress

    # JSONL ファイルに追記（UTF-8 BOMなし）
    $filePath = Join-Path $StatusDir "$TaskKey.jsonl"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::AppendAllText($filePath, "$jsonLine`n", $utf8NoBom)

    Write-Host "[TC Portal TaskLog] $Status -> $filePath (run_id: $RunId)"
}
catch {
    Write-Error "[TC Portal TaskLog] 書き込みエラー: $_"
    # 書き込み失敗でもジョブは継続
}

exit 0
