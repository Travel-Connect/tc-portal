# TC Portal タスク監視システム仕様書

## 1. 概要

### 1.1 目的

Windowsタスクスケジューラで定期実行されるPython/BATスクリプトの実行結果を
TC Portalで一元監視する。異常があればWebUIで即座に確認できるようにする。

### 1.2 システム構成

```
┌─────────────────────────────────────────────────────────────┐
│  Windows PC (タスクスケジューラ)                              │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ wrap-and-report │───▶│ 既存BAT/Python  │                │
│  │     .bat        │    │   スクリプト     │                │
│  └────────┬────────┘    └─────────────────┘                │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                        │
│  │ tcportal-monitor│                                        │
│  │     .ps1        │                                        │
│  └────────┬────────┘                                        │
│           │ HTTPS POST                                      │
└───────────┼─────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│  TC Portal (Vercel)                                         │
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ /api/monitor/   │───▶│   Supabase      │                │
│  │    report       │    │  task_monitors  │                │
│  └─────────────────┘    │  task_monitor_  │                │
│                         │     runs        │                │
│                         └─────────────────┘                │
│                                                             │
│  ┌─────────────────┐                                        │
│  │  /incidents     │◀── 失敗タスク一覧表示                   │
│  │    ページ       │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 設計方針

1. **非侵入的**: 既存スクリプトを変更せずラッパーで監視
2. **障害耐性**: 監視送信失敗でも元スクリプトの動作に影響なし
3. **マルチPC対応**: 同一タスクを複数PCで実行しても区別可能
4. **履歴保持**: 実行履歴をDBに保存しトレンド分析可能

---

## 2. データベーススキーマ

### 2.1 task_monitors テーブル

タスクの最新状態を保持するマスターテーブル。

```sql
CREATE TABLE public.task_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key TEXT NOT NULL,           -- タスク識別子 (例: "nightly_import")
  task_name TEXT NOT NULL,          -- 表示名 (例: "ナイトリー取込")
  kind TEXT NOT NULL,               -- "python" | "bat"
  machine_name TEXT NULL,           -- 実行PC名 (COMPUTERNAME)
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_status TEXT NULL,            -- "success" | "failed" | NULL
  last_started_at TIMESTAMPTZ NULL,
  last_finished_at TIMESTAMPTZ NULL,
  last_exit_code INT NULL,
  last_message TEXT NULL,
  last_log_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ユニーク制約: task_key + kind + machine_name の組み合わせ
-- machine_name が NULL の場合も考慮
CREATE UNIQUE INDEX idx_task_monitors_unique
  ON public.task_monitors(task_key, kind, COALESCE(machine_name, ''));
```

**ユニークキーの考え方**:
- `task_key`: タスクの論理名（英数字・アンダースコア推奨）
- `kind`: python または bat
- `machine_name`: PCのCOMPUTERNAME（NULL許可）

同じタスクが複数PCで実行される場合、machine_nameで区別される。

### 2.2 task_monitor_runs テーブル

実行履歴を保持する詳細テーブル。

```sql
CREATE TABLE public.task_monitor_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES task_monitors(id) ON DELETE CASCADE,
  status TEXT NOT NULL,             -- "success" | "failed"
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  duration_ms INT NULL,             -- 実行時間（ミリ秒）
  exit_code INT NULL,
  message TEXT NULL,
  log_url TEXT NULL,
  raw JSONB NULL,                   -- 受信したペイロード全体（デバッグ用）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_task_monitor_runs_monitor_id
  ON task_monitor_runs(monitor_id, created_at DESC);
```

### 2.3 RLSポリシー

```sql
-- 認証済みユーザーは閲覧可能
ALTER TABLE task_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_monitor_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view task_monitors"
  ON task_monitors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view task_monitor_runs"
  ON task_monitor_runs FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE はサービスロール（API）のみ
```

---

## 3. Webhook API 仕様

### 3.1 エンドポイント

```
POST /api/monitor/report
```

### 3.2 認証

シークレットキーによる認証。

```
Header: X-TC-Portal-Secret: <TC_PORTAL_WEBHOOK_SECRET>
```

- サーバー側の環境変数 `TC_PORTAL_WEBHOOK_SECRET` と一致すること
- 不一致または未指定の場合は `401 Unauthorized`

### 3.3 リクエストボディ

```typescript
interface MonitorReportRequest {
  // 必須フィールド
  task_key: string;      // タスク識別子（英数字・アンダースコア推奨）
  task_name: string;     // UI表示名（日本語OK）
  kind: "python" | "bat";
  status: "success" | "failed";

  // オプションフィールド
  started_at?: string;   // ISO 8601形式 (例: "2026-01-22T09:00:00Z")
  finished_at?: string;  // ISO 8601形式
  duration_ms?: number;  // 実行時間（ミリ秒）
  exit_code?: number;    // プロセス終了コード
  message?: string;      // メッセージ/エラー詳細
  log_url?: string;      // ログファイルのパス/URL
  machine_name?: string; // 実行PC名（省略時はサーバー側でnull）
}
```

### 3.4 レスポンス

**成功時 (200)**:
```json
{
  "ok": true,
  "monitor_id": "550e8400-e29b-41d4-a716-446655440000",
  "task_key": "nightly_import"
}
```

**認証エラー (401)**:
```json
{
  "error": "Invalid or missing secret"
}
```

**バリデーションエラー (400)**:
```json
{
  "error": "task_key is required and must be a string"
}
```

**サーバーエラー (500)**:
```json
{
  "error": "Failed to create task monitor"
}
```

### 3.5 サーバー側処理フロー

```
1. X-TC-Portal-Secret ヘッダーを検証
2. リクエストボディをJSONパース
3. 必須フィールド (task_key, task_name, kind, status) を検証
4. task_monitors を UPSERT:
   - task_key + kind + machine_name が一致するレコードを検索
   - 存在すれば UPDATE、なければ INSERT
5. task_monitor_runs に履歴レコードを INSERT
6. レスポンスを返却
```

---

## 4. クライアントスクリプト

### 4.1 tcportal-monitor.ps1 (PowerShell)

Webhook送信専用スクリプト。

**パラメータ**:
```powershell
param(
  [Parameter(Mandatory=$true)]  [string]$TaskKey,
  [Parameter(Mandatory=$true)]  [string]$TaskName,
  [Parameter(Mandatory=$true)]  [ValidateSet('bat','python')] [string]$Kind,
  [Parameter(Mandatory=$true)]  [ValidateSet('success','failed')] [string]$Status,
  [Parameter(Mandatory=$false)] [int]$ExitCode,
  [Parameter(Mandatory=$false)] [string]$Message,
  [Parameter(Mandatory=$false)] [string]$StartedAt,
  [Parameter(Mandatory=$false)] [string]$FinishedAt,
  [Parameter(Mandatory=$false)] [int]$DurationMs,
  [Parameter(Mandatory=$false)] [string]$LogUrl,
  [Parameter(Mandatory=$false)] [string]$MachineName = $env:COMPUTERNAME
)
```

**環境変数**:
- `TC_PORTAL_WEBHOOK_SECRET` (必須): 認証シークレット
- `TC_PORTAL_BASE_URL` (任意): ポータルURL（デフォルト: https://tc-portal.vercel.app）

**環境変数の取得優先順位**:
1. プロセス環境変数 (`$env:VAR_NAME`)
2. システム環境変数 (`[Environment]::GetEnvironmentVariable('VAR_NAME', 'Machine')`)

**戻り値**:
- 常に `exit 0` を返す（送信失敗でもジョブを継続させるため）

**使用例**:
```powershell
.\tcportal-monitor.ps1 `
  -TaskKey "daily_sync" `
  -TaskName "日次同期" `
  -Kind "python" `
  -Status "success" `
  -ExitCode 0 `
  -Message "処理完了: 100件" `
  -StartedAt "2026-01-22T09:00:00Z" `
  -FinishedAt "2026-01-22T09:05:30Z" `
  -DurationMs 330000
```

### 4.2 wrap-and-report.bat (BATラッパー)

既存BATファイルを変更せずに監視するラッパースクリプト。

**引数**:
```
wrap-and-report.bat <TASK_KEY> <TASK_NAME> <PATH_TO_BAT> [LOG_DIR]
```

| 引数 | 必須 | 説明 |
|------|------|------|
| TASK_KEY | ○ | タスク識別子（英数字・アンダースコア） |
| TASK_NAME | ○ | UI表示名（日本語OK） |
| PATH_TO_BAT | ○ | 監視対象BATのフルパス |
| LOG_DIR | - | ログ出力ディレクトリ（指定時はログ保存） |

**処理フロー**:
```
1. 引数チェック
2. 対象BATの存在確認
3. 開始時刻を記録 (PowerShellで ISO 8601形式を生成)
4. 対象BATを実行 (LOG_DIR指定時はリダイレクト)
5. 終了コードを取得
6. 終了時刻を記録
7. 実行時間を計算 (ミリ秒)
8. ステータス判定 (exit_code == 0 ? success : failed)
9. tcportal-monitor.ps1 を呼び出してWebhook送信
10. 元BATの終了コードを返す
```

**重要な設計ポイント**:
- `chcp 65001`: UTF-8コードページに設定（日本語対応）
- `setlocal EnableDelayedExpansion`: 遅延環境変数展開を有効化
- 最終行で `endlocal & exit /b %BAT_EXIT_CODE%`: 元BATの終了コードを維持

**使用例**:
```batch
REM ログなし
wrap-and-report.bat nightly_import "ナイトリー取込" "C:\Scripts\import.bat"

REM ログあり
wrap-and-report.bat nightly_import "ナイトリー取込" "C:\Scripts\import.bat" "C:\Logs"
```

---

## 5. Python統合例

既存Pythonスクリプトに監視を組み込む例。

### 5.1 関数定義

```python
import os
import json
import urllib.request
from datetime import datetime, timezone

def report_task_status(
    task_key: str,
    task_name: str,
    status: str,  # "success" | "failed"
    message: str = None,
    exit_code: int = 0,
    started_at: datetime = None,
    finished_at: datetime = None,
    duration_ms: int = None,
    log_url: str = None
):
    """
    TC Portal にタスク実行結果を報告する。
    送信失敗時はログ出力のみでエラーを投げない。
    """
    base_url = os.environ.get("TC_PORTAL_BASE_URL", "https://tc-portal.vercel.app")
    secret = os.environ.get("TC_PORTAL_WEBHOOK_SECRET")

    if not secret:
        print("[TC Portal] TC_PORTAL_WEBHOOK_SECRET が未設定、スキップ")
        return

    url = f"{base_url}/api/monitor/report"

    payload = {
        "task_key": task_key,
        "task_name": task_name,
        "kind": "python",
        "status": status,
        "machine_name": os.environ.get("COMPUTERNAME"),
    }

    if message:
        payload["message"] = message
    if exit_code is not None:
        payload["exit_code"] = exit_code
    if started_at:
        payload["started_at"] = started_at.isoformat()
    if finished_at:
        payload["finished_at"] = finished_at.isoformat()
    if duration_ms is not None:
        payload["duration_ms"] = duration_ms
    if log_url:
        payload["log_url"] = log_url

    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "X-TC-Portal-Secret": secret,
    }

    try:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if result.get("ok"):
                print(f"[TC Portal] 報告成功: {status}")
            else:
                print(f"[TC Portal] 報告失敗: {result}")
    except Exception as e:
        print(f"[TC Portal] 送信エラー: {e}")
```

### 5.2 使用パターン

```python
from datetime import datetime, timezone

def main():
    started_at = datetime.now(timezone.utc)

    try:
        # メイン処理
        result = do_something()

        finished_at = datetime.now(timezone.utc)
        duration_ms = int((finished_at - started_at).total_seconds() * 1000)

        report_task_status(
            task_key="my_task",
            task_name="マイタスク",
            status="success",
            message=f"処理完了: {result}",
            exit_code=0,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=duration_ms,
        )

    except Exception as e:
        finished_at = datetime.now(timezone.utc)
        duration_ms = int((finished_at - started_at).total_seconds() * 1000)

        report_task_status(
            task_key="my_task",
            task_name="マイタスク",
            status="failed",
            message=str(e),
            exit_code=1,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=duration_ms,
        )
        raise

if __name__ == "__main__":
    main()
```

---

## 6. タスクスケジューラ設定

### 6.1 BATラッパー使用時

**操作タブ設定**:

| 項目 | 値 |
|------|-----|
| プログラム/スクリプト | `cmd.exe` |
| 引数の追加 | `/c "C:\TcPortalMonitor\wrap-and-report.bat <TASK_KEY> <TASK_NAME> <BATパス>"` |
| 開始（オプション） | `C:\TcPortalMonitor` |

**注意**: パスにスペースを含む場合は内部で二重引用符が必要:
```
/c "C:\TcPortalMonitor\wrap-and-report.bat task_key "タスク名" "C:\Path With Space\script.bat""
```

### 6.2 Python直接実行時

Pythonスクリプト内で `report_task_status()` を呼び出す場合、
タスクスケジューラの設定は変更不要。

---

## 7. 障害ページ仕様

### 7.1 表示内容

`/incidents` ページにタスク監視結果をテーブル表示。

| カラム | 内容 |
|--------|------|
| タスクキー | task_key |
| タスク名 | task_name |
| 種別 | kind (python/bat) |
| マシン | machine_name |
| ステータス | last_status (success/failed) |
| 終了コード | last_exit_code |
| メッセージ | last_message |
| 最終実行 | last_finished_at の相対時間 |

### 7.2 バッジ表示

サイドバーの「障害」メニューに失敗タスク数をバッジ表示。

- `last_status = 'failed'` かつ `enabled = true` のタスク数をカウント
- 0件の場合はバッジ非表示

---

## 8. 環境変数一覧

### 8.1 サーバー側 (Vercel)

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `TC_PORTAL_WEBHOOK_SECRET` | ○ | Webhook認証シークレット |

### 8.2 クライアント側 (Windows)

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `TC_PORTAL_WEBHOOK_SECRET` | ○ | サーバーと同じシークレット |
| `TC_PORTAL_BASE_URL` | - | ポータルURL（デフォルト: https://tc-portal.vercel.app）|

**設定方法**:
1. コントロールパネル → システム → システムの詳細設定
2. 環境変数 → システム環境変数 → 新規
3. 変数名と値を入力

---

## 9. エラーハンドリング

### 9.1 送信失敗時の動作

| コンポーネント | 動作 |
|---------------|------|
| tcportal-monitor.ps1 | エラーログ出力、exit 0 で終了 |
| wrap-and-report.bat | 元BATの終了コードをそのまま返却 |
| Python統合 | ログ出力のみ、例外を投げない |

**設計思想**: 監視機能の障害が本来のジョブに影響を与えてはならない。

### 9.2 COALESCE ユニークインデックス対応

`machine_name` が NULL の場合の upsert 処理:

```typescript
// Supabase の upsert は COALESCE インデックスを正しく処理できない場合がある
// その場合は SELECT → INSERT/UPDATE のフォールバック処理を実行

let query = supabase
  .from("task_monitors")
  .select("id")
  .eq("task_key", task_key)
  .eq("kind", kind);

if (machine_name) {
  query = query.eq("machine_name", machine_name);
} else {
  query = query.is("machine_name", null);  // NULL の場合は is() を使用
}
```

---

## 10. ファイル一覧

```
tc-portal/
├── monitoring/
│   └── windows/
│       ├── tcportal-monitor.ps1    # PowerShell送信スクリプト
│       └── wrap-and-report.bat     # BATラッパー
├── src/
│   ├── app/
│   │   ├── (main)/
│   │   │   └── incidents/
│   │   │       └── page.tsx        # 障害ページ
│   │   └── api/
│   │       └── monitor/
│   │           └── report/
│   │               └── route.ts    # Webhook API
│   ├── lib/
│   │   └── actions/
│   │       └── task-monitor.ts     # サーバーアクション
│   └── types/
│       └── database.ts             # 型定義
├── supabase/
│   └── migrations/
│       └── 20240126000001_add_task_monitors.sql
└── docs/
    └── monitoring/
        ├── SPEC.md                 # この仕様書
        └── setup-guide.md          # セットアップガイド
```

---

## 11. 制限事項

1. **認証**: シークレットキーのみ（IP制限なし）
2. **レート制限**: なし（Vercelの制限に依存）
3. **ペイロードサイズ**: message, log_url は TEXT型（実質無制限）
4. **履歴保持期間**: 無期限（手動削除が必要）
5. **リアルタイム通知**: なし（ポーリングベース）

---

## 12. 将来の拡張案

1. **Slack/Teams通知**: 失敗時に即座に通知
2. **履歴自動削除**: 古い task_monitor_runs を定期削除
3. **ダッシュボード**: 成功率グラフ、実行時間トレンド
4. **アラートルール**: N回連続失敗でエスカレーション
