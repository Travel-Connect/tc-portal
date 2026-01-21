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

## 6. 監視・アラート

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
