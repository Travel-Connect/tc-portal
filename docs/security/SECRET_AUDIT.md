# SECRET_AUDIT.md — 秘密情報棚卸しレポート

> 監査日: 2026-01-28
> 対象: Travel-Connect/tc-portal (PUBLIC リポジトリ)
> 監査者: セキュリティ棚卸し担当

---

## 1. service_role / env 関連ファイル一覧（HEAD）

### 1-1. アプリケーションコード（`os.environ` / `process.env` 経由 — 安全）

| ファイル | 行 | 環境変数 |
|----------|-----|----------|
| `src/lib/supabase/admin.ts` | 9-10 | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `src/lib/supabase/client.ts` | 5-6 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `src/lib/supabase/middleware.ts` | 10-11 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `src/lib/supabase/server.ts` | 8-9 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `src/lib/supabase/storage.ts` | 3 | `NEXT_PUBLIC_SUPABASE_URL` |
| `scripts/db-healthcheck.ts` | 30-31 | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `src/app/api/monitor/report/route.ts` | 32 | `TC_PORTAL_WEBHOOK_SECRET` |
| `src/app/api/monitor/job-report/route.ts` | 27 | `TC_PORTAL_WEBHOOK_SECRET` |
| `runner/agent.py` | 69, 91, 139 | `config["machine_key"]`（config.json経由） |
| `monitoring/windows/tcportal-monitor.ps1` | 84-86 | `TC_PORTAL_WEBHOOK_SECRET` |

### 1-2. E2E テストコード（`os.environ[]` 経由 — 安全）

| ファイル | 行 | 環境変数 |
|----------|-----|----------|
| `e2e/check_helper_tools.py` | 16-17 | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `e2e/scripts/check_folder_set.py` | 16-17 | 同上 |
| `e2e/scripts/check_sheet_tools.py` | 16-17 | 同上 |
| `e2e/scripts/fix_folder_set.py` | 16-17 | 同上 |
| `e2e/tests/test_bat_open.py` | 13-14 | 同上 |
| `e2e/tests/test_bi_open.py` | 9-10 | 同上 |
| `e2e/tests/test_excel_execution.py` | 10-11 | 同上 |
| `e2e/tests/test_excel_specific.py` | 10-11 | 同上 |
| `e2e/tests/test_folder_open.py` | 13-14 | 同上 |
| `e2e/tests/test_helper_launch.py` | 14-15 | 同上 |
| `e2e/tests/test_pad_open.py` | 9-10 | 同上 |
| `e2e/tests/test_python_open.py` | 9-10 | 同上 |

### 1-3. ドキュメント・設定テンプレート（プレースホルダのみ — 安全）

| ファイル | 行 | 内容 |
|----------|-----|------|
| `.env.example` | 14-15, 19, 33, 36 | 空のテンプレート（値なし） |
| `docs/review/SETUP.md` | 297-300 | `xxx-staging-anon-key` 等のダミー値 |
| `runner/config.example.json` | 3 | `"your-machine-key-here"` |

### 1-4. ドキュメント（変数名の言及のみ — 安全）

| ファイル | 概要 |
|----------|------|
| `docs/db-healthcheck-guide.md` | `${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}` 形式で参照 |
| `docs/review/RUNBOOK.md` | 変数名のみ記載、実値なし |
| `docs/review/SETUP.md` | セットアップ手順の変数名列挙 |
| `docs/monitoring/SPEC.md` | `TC_PORTAL_WEBHOOK_SECRET` の仕様記載 |
| `docs/monitoring/setup-guide.md` | 同上 |
| `docs/monitoring/python-job-report.md` | 同上 |

---

## 2. 危険混入ヒット一覧（HEAD）

### HEAD の作業ツリー: 実値のハードコードなし

| 種別 | 検出数 | 詳細 |
|------|:------:|------|
| JWT トークン（service_role / anon_key） | **0** | 全て `os.environ` / `process.env` 経由に修正済み |
| PASSWORD= 実値 | **0** | `.env.local` のみ（gitignored） |
| SECRET= 実値 | **0** | 同上 |
| Supabase プロジェクト URL ハードコード | **0** | 修正済み |
| `machine_key` 実値 | **0** | `runner/config.json` は未追跡 |
| tcportal:// ペイロード（Base64 JSON） | 数件 | テストデータ。秘密情報ではない（`{"action":"open_folder",...}`） |

---

## 3. git 履歴に残存する秘密情報

### 3-1. Supabase service_role JWT（P0 — 最重要）

**現在も有効なキーが PUBLIC リポジトリの git 履歴に存在**

| コミット | ファイル | 種別 |
|----------|----------|------|
| `587e776` (Initial commit) | `e2e/check_helper_tools.py` | service_role JWT ハードコード |
| `587e776` | `e2e/scripts/check_folder_set.py` | 同上 |
| `587e776` | `e2e/scripts/check_sheet_tools.py` | 同上 |
| `587e776` | `e2e/scripts/fix_folder_set.py` | 同上 |
| `587e776` | `e2e/tests/test_bat_open.py` | 同上 |
| `587e776` | `e2e/tests/test_bi_open.py` | 同上 |
| `587e776` | `e2e/tests/test_excel_execution.py` | 同上 |
| `587e776` | `e2e/tests/test_excel_specific.py` | 同上 |
| `587e776` | `e2e/tests/test_folder_open.py` | 同上 |
| `587e776` | `e2e/tests/test_pad_open.py` | 同上 |
| `587e776` | `e2e/tests/test_python_open.py` | 同上 |
| `587e776` | `e2e/tests/__pycache__/*.pyc` (7件) | バイナリに JWT 埋め込み |
| `d71a654` | 上記 e2e/ ファイル全て + `docs/review/RUNBOOK.md` | 同上 |
| `19eab78` | 上記 + `docs/review/SMOKE_TEST_OTHER_PC.md` (※) | 同上 |

※ `SMOKE_TEST_OTHER_PC.md` の JWT は tcportal:// ペイロードのみ（service_role ではない）

### 3-2. Supabase プロジェクト URL / project-ref（P1）

| コミット | ファイル | 種別 |
|----------|----------|------|
| `587e776` | e2e/ Python 全ファイル | `https://[PROJECT_REF].supabase.co` ハードコード |
| `d71a654` | 同上 | 同上 |
| `19eab78` | 同上 + `supabase/.temp/project-ref` | project-ref 値 |
| `19eab78` | `supabase/.temp/pooler-url` | PostgreSQL pooler 接続先 |

### 3-3. その他

| コミット | ファイル | 種別 |
|----------|----------|------|
| `587e776` - `19eab78` | `supabase/.temp/*` (8件) | CLI バージョン情報等（低リスク） |

### 3-4. 安全確認済み（git 履歴にも存在しない）

| 項目 | 状態 |
|------|------|
| `.env.local` | 一度も追跡されていない |
| `runner/config.json` | 一度も追跡されていない |
| `runner/config-*.json` | 一度も追跡されていない |
| E2E パスワード（旧: `zzzz1111`） | git 履歴に存在しない |
| E2E パスワード（新） | git 履歴に存在しない |
| `TC_PORTAL_WEBHOOK_SECRET` 実値 | git 履歴に存在しない |
| `RUNNER_MACHINE_KEY` 実値 | git 履歴に存在しない |

---

## 4. 優先順位と対応方針

### P0: 緊急（第三者がいつでも悪用可能）

| 問題 | 影響 | 対応 |
|------|------|------|
| **service_role JWT が git 履歴に存在** | このキーで Supabase の全データ（auth.users 含む）に管理者アクセス可能。リポジトリが PUBLIC のため、誰でも `git clone` → `git log` で取得可能 | **Supabase JWT Secret ローテーション**（Dashboard → Project Settings → API → Regenerate JWT Secret）。ローテーション後、anon_key / service_role_key が再生成されるため、`.env.local`、Vercel 環境変数、Runner config を全て差し替え |
| **git 履歴のクリーニング** | ローテーション後も旧キーが履歴に残るが、無効化済みなら実害なし。ただし衛生管理として除去推奨 | `git filter-repo --replace-text expressions.txt` でJWT・project-ref を除去し、`git push --force` |

### P1: 重要（直接の悪用リスクは低いが対応推奨）

| 問題 | 影響 | 対応 |
|------|------|------|
| **Supabase プロジェクト URL / project-ref が git 履歴に存在** | プロジェクト識別子の露出。単体では認証不可だが、service_role JWT と組み合わせると攻撃に使える | JWT ローテーション実施で実質無害化。`git filter-repo` で合わせて除去 |
| **PostgreSQL pooler URL が git 履歴に存在** | DB 接続先の露出。パスワードなしでは接続不可 | `git filter-repo` で合わせて除去 |

### P2: 低リスク（対応任意）

| 問題 | 影響 | 対応 |
|------|------|------|
| `supabase/.temp/` のバージョン情報が git 履歴に存在 | CLI バージョン等の情報のみ、秘密情報ではない | 不要。`git filter-repo` 実行時に合わせて除去しても良い |
| `helper/README.md` に tcportal:// ペイロードの Base64 例示 | テストデータ（`{"action":"open_folder","path":"..."}`）であり秘密情報ではない | 対応不要 |

---

## 5. 対応手順（概要）

### Phase 1: JWT Secret ローテーション（P0）

1. Supabase Dashboard → Project Settings → API → **Regenerate JWT Secret**
2. 新しい `anon_key` と `service_role_key` を取得
3. 以下を全て更新:
   - `.env.local`（ローカル開発）
   - Vercel 環境変数（本番）
   - `runner/config.json`（各 Runner PC）
   - GitHub Secrets（CI/CD）
4. アプリケーション・Runner・E2E テストの動作確認

### Phase 2: git 履歴クリーニング（P0）

1. `expressions.txt` を作成（旧 service_role JWT → `[REDACTED]`、project-ref → `[REDACTED]`）
2. `git filter-repo --replace-text expressions.txt`
3. `git push --force --all`
4. 全チームメンバーに `git clone` し直しを通知

### Phase 3: 検証

1. E2E テスト全パス確認
2. 本番アプリのログイン・API 動作確認
3. Runner の疎通確認
4. `git log` で旧キーが除去されたことを確認

---

## 6. 現在の防御状態まとめ

| レイヤー | 状態 |
|----------|------|
| HEAD（最新コード） | **安全** — 全ての秘密情報が `os.environ` / `process.env` 経由 |
| `.gitignore` | **安全** — `.env.local`, `runner/config*.json`, `supabase/.temp/`, `__pycache__/` を除外 |
| `export-review-pack.ps1` | **安全** — ZIP 生成前にシークレットスキャン実施 |
| RUNBOOK セキュリティポリシー | **安全** — Section 8 に管理ポリシー記載 |
| git 履歴 | **危険** — service_role JWT が PUBLIC 履歴に残存（P0） |
| Supabase JWT Secret | **危険** — 未ローテーション（git 履歴の値がそのまま有効） |
