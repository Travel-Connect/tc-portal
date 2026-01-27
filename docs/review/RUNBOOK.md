# TC Portal - 運用ガイド (Runbook)

## 1. Runner Agent（Windows常駐）

### 概要

Runner Agentは、ポータルからの実行依頼（PAD/Python）をポーリングして実行するPythonスクリプトです。

### 起動方法

```bash
cd runner

# 仮想環境を有効化
.venv\Scripts\activate

# 起動
python agent.py
```

### 起動確認

正常に起動すると以下のログが表示されます:

```
[2026-01-16 12:00:00] TC Portal Runner Agent starting...
[2026-01-16 12:00:00] Portal URL: https://tc-portal.vercel.app
[2026-01-16 12:00:00] Poll interval: 5 seconds
```

### Windows起動時に自動実行

1. `start_runner.bat` を作成:

```batch
@echo off
cd /d C:\path\to\tc-portal\runner
call .venv\Scripts\activate
python agent.py
```

2. タスクスケジューラーで「ログオン時」に実行設定

### 設定ファイル (config.json)

| キー | 説明 | 例 |
|------|------|-----|
| `portal_url` | ポータルURL | `https://tc-portal.vercel.app` |
| `machine_key` | 認証キー | `your-secret-key` |
| `poll_interval_sec` | ポーリング間隔（秒） | `5` |
| `execution_timeout` | 実行タイムアウト（秒） | `3600` |
| `python_exe` | Pythonパス | `python` |
| `scripts_base_path` | スクリプト基準パス | `C:\Scripts` |
| `pad_exe` | PAD実行ファイル | `C:\Program Files (x86)\Power Automate Desktop\PAD.Console.Host.exe` |
| `log_dir` | ログ出力先 | `C:\TcPortalLogs` |

### PC別設定ファイル

複数PCでRunnerを運用する場合、PC名ごとの設定ファイルを使用できます:

- `config-{COMPUTERNAME}.json` が優先的に読み込まれる
- 存在しない場合は `config.json` にフォールバック
- 例: `config-DESKTOP-MH86LUK.json`, `config-KAMIZATO-PC.json`

これにより、OneDrive同期フォルダにRunnerを配置しても各PCで別々のマシンキーを使用できます。

### 複数Runner運用（実行先マシン指定）

複数のPCでRunnerを起動している場合、PAD/Python実行時に実行先マシンを指定できます。

#### 仕組み

1. **Heartbeat**: 各Runnerは定期的に `/api/runner/heartbeat` を呼び出し、オンライン状態を通知
2. **マシン選択UI**: 実行確認ダイアログでオンラインのRunnerを選択可能
3. **target_machine_id**: 選択されたマシンのみがそのrunをclaim可能

#### 設定ファイルの追加項目

| キー | 説明 | デフォルト |
|------|------|-----------|
| `heartbeat_interval_sec` | ハートビート送信間隔（秒） | `30` |

#### 動作

1. Runnerは起動時と `heartbeat_interval_sec` 間隔でハートビートを送信
2. ハートビートにより `machines.last_seen_at` と `machines.hostname` が更新
3. ポータルUIは `last_seen_at` が2分以内のマシンを「オンライン」と判定
4. ユーザーが実行先マシンを選択すると、`runs.target_machine_id` に保存
5. 選択されたマシンのRunnerのみがそのrunをclaimできる
6. 「自動」を選択した場合は `target_machine_id = NULL` となり、どのRunnerでもclaim可能

#### localStorage による選択記憶

実行先マシンの選択は `localStorage` に保存されます:

- キー: `tcportal.default_machine_id`
- PC別のブラウザで異なるデフォルトを設定可能
- オフラインのマシンが保存されていた場合は「自動」にリセット

---

## 2. Windows Helper（tcportal://プロトコル）

### 概要

Windows Helperは、`tcportal://` URLスキームを処理してローカルファイル/アプリを起動するElectronアプリです。

### インストール

1. Helperのインストーラーを実行
2. インストール後、`tcportal://` がシステムに登録される

### 動作確認

ブラウザで以下のURLにアクセス:

```
tcportal://open?payload=eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnMifQ
```

※ 上記はBase64URLエンコードされた `{"action":"open_folder","path":"C:\\Users"}`

### サポートするアクション

| アクション | 説明 | ペイロード例 |
|-----------|------|-------------|
| `open_file` | ファイルを開く | `{"action":"open_file","path":"C:\\file.xlsx"}` |
| `open_folder` | フォルダを開く | `{"action":"open_folder","path":"C:\\folder"}` |
| `open_folders` | 複数フォルダを開く | `{"action":"open_folders","paths":["C:\\a","C:\\b"]}` |
| `run_exe` | EXEを実行 | `{"action":"run_exe","path":"C:\\app.exe"}` |
| `run_bat` | BATを実行 | `{"action":"run_bat","path":"C:\\script.bat"}` |

### Helperがインストールされていない場合

ポータルから実行しようとすると「プロトコルを開くアプリケーションがありません」エラーが表示されます。

---

## 3. よくあるトラブルと対処法

### 3.1 認証・権限関連

#### ログインできない

**症状:** ログインボタンを押してもエラー、またはリダイレクトが失敗

**対処:**
1. Supabase Dashboard → Authentication → URL Configuration を確認
2. Site URL と Redirect URLs が正しく設定されているか確認
3. `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` を確認

#### 403エラーが表示される

**症状:** 特定のページで「アクセス権限がありません」

**対処:**
1. ログイン状態を確認（ログアウト→再ログイン）
2. Middleware設定を確認 (`src/middleware.ts`)

### 3.2 RLS (Row Level Security) 関連

#### ツールが表示されない

**症状:** ツール一覧が空、または特定のツールが見えない

**対処:**
1. Supabase Dashboard → Table Editor → tools でデータ確認
2. `is_archived = false` のデータがあるか確認
3. RLSポリシーを確認:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'tools';
   ```

#### runs が作成できない

**症状:** 実行ボタンを押してもエラー

**対処:**
1. RLSポリシーを確認:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'runs';
   ```
2. `requested_by = auth.uid()` の条件が正しいか確認

### 3.3 Storage (バケット) 関連

#### ツールアイコンがアップロードできない

**症状:** アイコンアップロードでエラー

**対処:**
1. `tool-icons` バケットが存在するか確認
2. バケットがPublicになっているか確認
3. Storageポリシーを確認:
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'tool-icons';
   ```

#### アイコンが表示されない

**症状:** アップロード成功だが画像が表示されない

**対処:**
1. 画像URLが正しいか確認（ブラウザで直接アクセス）
2. CORSポリシーを確認

### 3.4 Runner関連

#### Runner が 401 Invalid machine key

**症状:** Runnerログに `401 Invalid machine key` が表示

**対処:**
1. `machines` テーブルにレコードがあるか確認:
   ```sql
   SELECT * FROM machines;
   ```
2. `key_hash` が正しいか確認（SHA256ハッシュ）:
   ```javascript
   // Node.jsで計算
   require('crypto').createHash('sha256').update('your-key').digest('hex')
   ```
3. 重複するkey_hashがないか確認（`.single()` が失敗する）

#### タスクがキューから取得されない

**症状:** runs に `queued` があるがRunnerが取得しない

**対処:**
1. `claim_run` RPC関数が存在するか確認
2. Runnerが正しいマシンIDで認証されているか確認
3. `machines.enabled = true` になっているか確認

### 3.5 URLスキーム関連

#### tcportal:// が動作しない

**症状:** Helper起動時に何も起きない、またはエラー

**対処:**
1. Windows Helperがインストールされているか確認
2. レジストリに `tcportal` が登録されているか確認:
   ```
   HKEY_CLASSES_ROOT\tcportal
   ```
3. ブラウザのポップアップブロックを確認

#### 「このサイトは tcportal を開こうとしています」が表示されない

**症状:** プロトコルハンドラーが登録されていない

**対処:**
1. Helperを再インストール
2. Windowsの「既定のアプリ」→「プロトコルに関連付けられた既定のアプリ」を確認

---

## 4. ログの確認方法

### Runnerログ

- コンソール出力（リアルタイム）
- ファイル: `<log_dir>/run-<run_id>.log`

### Vercelログ（本番）

1. Vercel Dashboard → プロジェクト → Logs
2. API Routes のエラーを確認

### Supabaseログ

1. Supabase Dashboard → Logs → Postgres
2. RLSエラーやクエリエラーを確認

---

## 5. レビュー用ファイルのエクスポート

### 5.1 レビューパックの生成

外部レビュー（ChatGPT等）にコードを渡す際に使用します。

```powershell
.\scripts\export-review-pack.ps1
```

**出力:** `tc-portal-review-pack.zip`

**含まれるファイル:**
- `docs/review/` - レビュー用ドキュメント
- `supabase/` - DBマイグレーション
- `src/` - Next.jsソースコード
- `tests/` - E2Eテスト
- `runner/` - Windows Runner Agent
- `helper/` - TC Portal Helper
- 設定ファイル（package.json, tsconfig.json等）
- `CLAUDE.md` - プロジェクト仕様

**含まれないファイル:**
- `node_modules/`, `.next/` - ビルド成果物
- `.venv/`, `__pycache__/` - Python仮想環境
- `.auth/` - 認証情報
- `*.log` - ログファイル

### 5.2 Playwrightレポートのエクスポート

E2Eテスト実行後のHTMLレポートをZIP化します。

```powershell
# まずテストを実行
npx playwright test

# レポートをエクスポート
.\scripts\export-playwright-report.ps1
```

**出力:** `playwright-report-YYYYMMDD-HHMMSS.zip`

**使い方:**
1. ZIPを展開
2. `index.html` をブラウザで開く

---

## 6. タスク監視（Python/BAT）

### 概要

タスクスケジューラで定期実行される既存のPython/BATスクリプトの実行結果を監視する機能です。
異常があれば障害ページに表示され、サイドバーの「障害」メニューにバッジが表示されます。

### Webhook API

**エンドポイント:** `POST /api/monitor/report`

**ヘッダー:**
```
X-TC-Portal-Secret: <TC_PORTAL_WEBHOOK_SECRET>
Content-Type: application/json
```

**ペイロード:**
```json
{
  "task_key": "nightly_import",
  "task_name": "ナイトリー取込",
  "kind": "python",
  "status": "success",
  "started_at": "2026-01-22T01:00:00Z",
  "finished_at": "2026-01-22T01:02:30Z",
  "duration_ms": 150000,
  "exit_code": 0,
  "message": "OK",
  "log_url": null,
  "machine_name": "PC-B"
}
```

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `task_key` | ○ | タスクの一意識別子 |
| `task_name` | ○ | UI表示名 |
| `kind` | ○ | `python` または `bat` |
| `status` | ○ | `success` または `failed` |
| `started_at` | - | 開始日時（ISO 8601） |
| `finished_at` | - | 終了日時（ISO 8601） |
| `duration_ms` | - | 実行時間（ミリ秒） |
| `exit_code` | - | 終了コード |
| `message` | - | メッセージ（エラー詳細等） |
| `log_url` | - | ログファイルのパス/URL |
| `machine_name` | - | 実行PC名（COMPUTERNAME） |

### 環境変数

**Vercel側:**
```
TC_PORTAL_WEBHOOK_SECRET=<シークレット値>
```

**実行PC側（Windows環境変数）:**
```
TC_PORTAL_WEBHOOK_SECRET=<Vercelと同じ値>
```

### curlでテスト（Node.js推奨）

Git Bashのcurlでは日本語が文字化けするため、Node.jsを使用してください:

```javascript
const https = require('https');

const data = JSON.stringify({
  task_key: 'test-task',
  task_name: 'テストタスク',
  kind: 'python',
  status: 'success',
  finished_at: new Date().toISOString(),
  exit_code: 0,
  message: 'OK',
  machine_name: process.env.COMPUTERNAME
});

const req = https.request({
  hostname: 'tc-portal.vercel.app',
  path: '/api/monitor/report',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-TC-Portal-Secret': process.env.TC_PORTAL_WEBHOOK_SECRET,
    'Content-Length': Buffer.byteLength(data, 'utf8')
  }
}, (res) => {
  res.on('data', d => console.log(d.toString()));
});

req.write(data, 'utf8');
req.end();
```

### Python/BATへの組み込み

#### Pythonの場合

```python
import os
import json
import urllib.request
from datetime import datetime, timezone

def report_task_status(task_key, task_name, status, message=None, exit_code=0):
    url = "https://tc-portal.vercel.app/api/monitor/report"
    secret = os.environ.get("TC_PORTAL_WEBHOOK_SECRET")

    if not secret:
        print("[TC Portal] 環境変数未設定のためスキップ")
        return

    payload = {
        "task_key": task_key,
        "task_name": task_name,
        "kind": "python",
        "status": status,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "exit_code": exit_code,
        "message": message,
        "machine_name": os.environ.get("COMPUTERNAME"),
    }

    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-TC-Portal-Secret": secret,
    }

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            print(f"[TC Portal] 報告{'成功' if resp.status == 200 else '失敗'}")
    except Exception as e:
        print(f"[TC Portal] 報告エラー: {e}")


if __name__ == "__main__":
    try:
        main()
        report_task_status("my-task", "マイタスク", "success", "処理完了")
    except Exception as e:
        report_task_status("my-task", "マイタスク", "failed", str(e), exit_code=1)
        raise
```

#### BATの場合

PowerShellを使って報告します:

```batch
@echo off
setlocal

REM メイン処理
call :main
set EXIT_CODE=%ERRORLEVEL%

REM 結果を報告
if %EXIT_CODE%==0 (
    powershell -Command "& { $body = @{task_key='my-batch';task_name='マイバッチ';kind='bat';status='success';finished_at=(Get-Date).ToUniversalTime().ToString('o');exit_code=0;message='OK';machine_name=$env:COMPUTERNAME} | ConvertTo-Json; Invoke-RestMethod -Uri 'https://tc-portal.vercel.app/api/monitor/report' -Method POST -Headers @{'Content-Type'='application/json';'X-TC-Portal-Secret'=$env:TC_PORTAL_WEBHOOK_SECRET} -Body $body }"
) else (
    powershell -Command "& { $body = @{task_key='my-batch';task_name='マイバッチ';kind='bat';status='failed';finished_at=(Get-Date).ToUniversalTime().ToString('o');exit_code=%EXIT_CODE%;message='処理失敗';machine_name=$env:COMPUTERNAME} | ConvertTo-Json; Invoke-RestMethod -Uri 'https://tc-portal.vercel.app/api/monitor/report' -Method POST -Headers @{'Content-Type'='application/json';'X-TC-Portal-Secret'=$env:TC_PORTAL_WEBHOOK_SECRET} -Body $body }"
)

exit /b %EXIT_CODE%

:main
REM ここに実際の処理を書く
echo 処理実行中...
exit /b 0
```

### 障害ページの見方

1. TC Portal にログイン
2. 左メニュー「障害」をクリック
3. 「タスク監視」セクションにタスク一覧が表示
4. 失敗があれば赤背景で表示され、サイドバーにもバッジ表示

### テーブル構成

**task_monitors**: タスクの最新状態
- `(task_key, kind, machine_name)` でユニーク
- 同じタスクが複数PCで動く場合は別々に管理

**task_monitor_runs**: 実行履歴
- 各報告ごとに1レコード挿入
- `raw` カラムに受信ペイロードを保存（デバッグ用）

### BATラッパースクリプト（既存BAT監視用）

既存のBATスクリプトを変更せずに監視するためのラッパースクリプトを提供しています。

**ファイル構成:**
```
monitoring/windows/
├── wrap-and-report.bat    # ラッパースクリプト
└── tcportal-monitor.ps1   # Webhook送信用PowerShell
```

#### セットアップ手順

1. **ファイル配置**
   - `monitoring/windows/` フォルダを任意の場所にコピー
   - 例: `C:\TcPortalMonitor\`

2. **環境変数設定**
   - システム環境変数に `TC_PORTAL_WEBHOOK_SECRET` を設定
   - コントロールパネル → システム → システムの詳細設定 → 環境変数

3. **タスクスケジューラ設定**
   - 既存のタスクを編集
   - 「操作」タブで以下のように変更:

   | 項目 | 設定値 |
   |------|--------|
   | プログラム/スクリプト | `cmd.exe` |
   | 引数の追加 | `/c "C:\TcPortalMonitor\wrap-and-report.bat nightly_import ナイトリー取込 C:\Scripts\original.bat"` |

   **引数の形式:**
   ```
   /c "C:\TcPortalMonitor\wrap-and-report.bat <TASK_KEY> <TASK_NAME> <元のBATのパス> [LOG_DIR]"
   ```

   - `TASK_KEY`: タスクの一意識別子（英数字、アンダースコア推奨）
   - `TASK_NAME`: 障害ページに表示する日本語名
   - 元のBATのパス: 監視対象の既存BATファイル
   - LOG_DIR: (オプション) ログ出力先ディレクトリ

4. **動作確認**
   - タスクを手動実行
   - TC Portal の「障害」ページで結果を確認

#### ラッパーの動作

1. 開始時刻を記録
2. 指定されたBATを実行
3. 終了コードを取得（0=success、それ以外=failed）
4. TC Portal Webhook に結果を送信
5. **元のBATの終了コードをそのまま返す**（重要）

#### ログ出力

`LOG_DIR` を指定すると、対象BATの出力がログファイルに保存されます:
- ファイル名: `<TASK_KEY>_<YYYYMMDD>_<HHMMSS>.log`
- ログURLは `file:///` 形式でWebhookに送信

#### トラブルシューティング

**Webhook送信失敗しても元のBATは正常終了扱い:**
- `tcportal-monitor.ps1` は常に exit code 0 を返す
- 監視送信の失敗がタスクスケジューラのエラーハンドリングに影響しない

**文字化け対策:**
- PowerShellスクリプトはUTF-8でリクエスト送信
- BATファイルの `setlocal EnableDelayedExpansion` で変数展開を適切に処理

**テスト実行:**
```batch
REM 監視スクリプト単体テスト
powershell -ExecutionPolicy Bypass -File "C:\TcPortalMonitor\tcportal-monitor.ps1" ^
    -TaskKey "test-task" ^
    -TaskName "テストタスク" ^
    -Kind "bat" ^
    -Status "success" ^
    -ExitCode 0 ^
    -Message "テスト送信"
```

---

## 7. 監視・アラート

### 推奨監視項目

| 項目 | 確認方法 | 閾値 |
|------|---------|------|
| Runnerの稼働 | `machines.last_seen_at` | 5分以上更新なし |
| キュー滞留 | `runs WHERE status='queued'` | 10件以上 |
| エラー率 | `runs WHERE status='failed'` | 直近1時間で5件以上 |

### アラート設定（例）

Supabase Edge Functionで定期チェック:

```sql
-- キュー滞留チェック
SELECT COUNT(*) FROM runs
WHERE status = 'queued'
AND requested_at < NOW() - INTERVAL '5 minutes';
```

---

## 8. 秘密情報の管理ポリシー

### 8.1 基本ルール

**共有資料・リポジトリに秘密情報の「値」を絶対に書かない。**

| 書いてよいもの | 書いてはいけないもの |
|-------------|-----------------|
| 変数名（`SUPABASE_SERVICE_ROLE_KEY`） | 実際のキー値（`eyJ...`） |
| プレースホルダー（`your-machine-key-here`） | 実パスワード |
| 取得手順（「Supabase Dashboard → Settings → API」） | メールアドレス+パスワードのセット |
| `config.example.json`（テンプレート） | `config.json`（実設定） |

### 8.2 秘密情報の受け渡し方法

レビュアーやチームメンバーに認証情報を渡す場合:

1. **Slack DM / メール** など、リポジトリ外の経路で共有
2. **GitHub Secrets** に登録（CI/CD用）
3. **1Password / Bitwarden** 等のパスワードマネージャーで共有
4. **絶対に** `.md` ファイル、コミットメッセージ、PR本文、Issue に値を書かない

### 8.3 リポジトリ内で守るべきこと

- `.env.local` は `.gitignore` 対象（コミットしない）
- `runner/config.json`, `runner/config-*.json` は `.gitignore` 対象
- `runner/config.example.json` のみリポジトリに残す（プレースホルダー値）
- マイグレーションファイル (`.sql`) にテスト用クレデンシャルを書かない
- `e2e/` のPythonスクリプトでは `os.environ[]` で環境変数から読む

### 8.4 レビューパック (ZIP) の安全性

`scripts/export-review-pack.ps1` は以下の多層防御で秘密情報の混入を防ぎます:

1. **ファイル除外**: `config.json`, `config-*.json`, `.env.local`, `REVIEW_PACK.md`, `temp_*.json` を自動除外
2. **シークレットスキャン**: ZIP化前に全テキストファイルをパターン検索
   - JWT トークン、パスワード値、サービスキー、Supabase URL を検知
   - 検知時は `exit 1` で中断（`-Force` で強制続行可能）
3. **バイナリ除外**: `.png`, `.jpg` 等はスキャン対象外

### 8.5 漏洩発覚時のローテーション手順

秘密情報がリポジトリに混入した場合:

1. **即座にキーをローテーション**（値を無効化）
   - Supabase: Dashboard → Settings → API → 「Regenerate」
   - Runner machine_key: `machines` テーブルの `key_hash` を更新 + Runner config を差し替え
   - E2Eパスワード: Supabase Auth でパスワード変更 + GitHub Secrets 更新

2. **リポジトリからの除去**
   - 該当ファイルを修正してコミット・プッシュ
   - `.gitignore` に追加（未追加の場合）

3. **Git 履歴からの除去**（必要に応じて）
   - `git filter-repo` または BFG Repo-Cleaner を使用
   - **注意**: 履歴書き換えは force push が必要。チーム全員にリベースを依頼すること
   ```bash
   # git-filter-repo を使用する場合
   pip install git-filter-repo
   git filter-repo --replace-text expressions.txt
   # expressions.txt: 置換対象の文字列を記載
   # 例: eyJhbGci...==>***REMOVED***
   ```
   - 書き換え後、全員が `git clone` し直すのが最も安全
