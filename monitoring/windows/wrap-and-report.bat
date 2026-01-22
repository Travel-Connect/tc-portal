@echo off
chcp 65001 >nul
REM ============================================================
REM TC Portal BAT監視ラッパー
REM ============================================================
REM
REM 使い方:
REM   wrap-and-report.bat <TASK_KEY> <TASK_NAME> <PATH_TO_BAT> [LOG_DIR]
REM
REM 例:
REM   wrap-and-report.bat nightly_import "ナイトリー取込" "C:\Scripts\import.bat"
REM   wrap-and-report.bat nightly_import "ナイトリー取込" "C:\Scripts\import.bat" "C:\Logs"
REM
REM 環境変数:
REM   TC_PORTAL_BASE_URL       - ポータルURL（省略時: https://tc-portal.vercel.app）
REM   TC_PORTAL_WEBHOOK_SECRET - Webhookシークレット（必須）
REM
REM 動作:
REM   1. 開始時刻を記録
REM   2. 指定されたBATを実行
REM   3. 終了コードを取得（0=success, それ以外=failed）
REM   4. TC Portal Webhook に結果を送信
REM   5. 元のBATの終了コードをそのまま返す
REM ============================================================

setlocal EnableDelayedExpansion

REM 引数チェック
if "%~1"=="" (
    echo [ERROR] TASK_KEY が指定されていません
    echo 使い方: wrap-and-report.bat ^<TASK_KEY^> ^<TASK_NAME^> ^<PATH_TO_BAT^> [LOG_DIR]
    exit /b 1
)
if "%~2"=="" (
    echo [ERROR] TASK_NAME が指定されていません
    exit /b 1
)
if "%~3"=="" (
    echo [ERROR] PATH_TO_BAT が指定されていません
    exit /b 1
)

set "TASK_KEY=%~1"
set "TASK_NAME=%~2"
set "TARGET_BAT=%~3"
set "LOG_DIR=%~4"

REM 対象BATの存在確認
if not exist "%TARGET_BAT%" (
    echo [ERROR] 対象BATが見つかりません: %TARGET_BAT%
    exit /b 1
)

REM スクリプトのディレクトリを取得
set "SCRIPT_DIR=%~dp0"

REM 開始時刻を記録（ISO8601形式）
for /f "tokens=1-6 delims=/:. " %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy MM dd HH mm ss'"') do (
    set "START_YEAR=%%a"
    set "START_MONTH=%%b"
    set "START_DAY=%%c"
    set "START_HOUR=%%d"
    set "START_MIN=%%e"
    set "START_SEC=%%f"
)
set "STARTED_AT=%START_YEAR%-%START_MONTH%-%START_DAY%T%START_HOUR%:%START_MIN%:%START_SEC%Z"
set "START_MS="
for /f %%t in ('powershell -NoProfile -Command "[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()"') do set "START_MS=%%t"

echo ============================================================
echo [TC Portal Monitor] BAT実行開始
echo   TASK_KEY  : %TASK_KEY%
echo   TASK_NAME : %TASK_NAME%
echo   TARGET_BAT: %TARGET_BAT%
echo   STARTED_AT: %STARTED_AT%
echo ============================================================
echo.

REM ログ出力設定
set "LOG_URL="
set "LOG_FILE="
if not "%LOG_DIR%"=="" (
    if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
    set "LOG_FILE=%LOG_DIR%\%TASK_KEY%_%START_YEAR%%START_MONTH%%START_DAY%_%START_HOUR%%START_MIN%%START_SEC%.log"
)

REM 対象BATを実行
if "%LOG_FILE%"=="" (
    call "%TARGET_BAT%"
) else (
    echo [INFO] ログファイル: %LOG_FILE%
    call "%TARGET_BAT%" > "%LOG_FILE%" 2>&1
    set "LOG_URL=file:///%LOG_FILE:\=/%"
)

REM 終了コードを保持
set "BAT_EXIT_CODE=%ERRORLEVEL%"

REM 終了時刻を記録
for /f "tokens=1-6 delims=/:. " %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy MM dd HH mm ss'"') do (
    set "END_YEAR=%%a"
    set "END_MONTH=%%b"
    set "END_DAY=%%c"
    set "END_HOUR=%%d"
    set "END_MIN=%%e"
    set "END_SEC=%%f"
)
set "FINISHED_AT=%END_YEAR%-%END_MONTH%-%END_DAY%T%END_HOUR%:%END_MIN%:%END_SEC%Z"

REM 実行時間を計算（ミリ秒）
set "END_MS="
for /f %%t in ('powershell -NoProfile -Command "[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()"') do set "END_MS=%%t"
set /a "DURATION_MS=END_MS-START_MS" 2>nul
if "%DURATION_MS%"=="" set "DURATION_MS=0"

REM ステータス判定
if %BAT_EXIT_CODE%==0 (
    set "STATUS=success"
    set "MESSAGE=処理正常終了"
) else (
    set "STATUS=failed"
    set "MESSAGE=終了コード: %BAT_EXIT_CODE%"
)

echo.
echo ============================================================
echo [TC Portal Monitor] BAT実行完了
echo   STATUS     : %STATUS%
echo   EXIT_CODE  : %BAT_EXIT_CODE%
echo   FINISHED_AT: %FINISHED_AT%
echo   DURATION_MS: %DURATION_MS%
echo ============================================================

REM Webhook送信
echo.
echo [TC Portal Monitor] Webhook送信中...

REM PowerShellスクリプトのパス
set "PS_SCRIPT=%SCRIPT_DIR%tcportal-monitor.ps1"

if not exist "%PS_SCRIPT%" (
    echo [WARN] tcportal-monitor.ps1 が見つかりません: %PS_SCRIPT%
    echo [WARN] Webhook送信をスキップします
    goto :end
)

REM PowerShell実行（ログURL有無で分岐）
if "%LOG_URL%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" ^
        -TaskKey "%TASK_KEY%" ^
        -TaskName "%TASK_NAME%" ^
        -Kind "bat" ^
        -Status "%STATUS%" ^
        -ExitCode %BAT_EXIT_CODE% ^
        -Message "%MESSAGE%" ^
        -StartedAt "%STARTED_AT%" ^
        -FinishedAt "%FINISHED_AT%" ^
        -DurationMs %DURATION_MS%
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" ^
        -TaskKey "%TASK_KEY%" ^
        -TaskName "%TASK_NAME%" ^
        -Kind "bat" ^
        -Status "%STATUS%" ^
        -ExitCode %BAT_EXIT_CODE% ^
        -Message "%MESSAGE%" ^
        -StartedAt "%STARTED_AT%" ^
        -FinishedAt "%FINISHED_AT%" ^
        -DurationMs %DURATION_MS% ^
        -LogUrl "%LOG_URL%"
)

:end
REM 元のBATの終了コードを返す（重要）
echo.
echo [TC Portal Monitor] 終了 (exit code: %BAT_EXIT_CODE%)
endlocal & exit /b %BAT_EXIT_CODE%
