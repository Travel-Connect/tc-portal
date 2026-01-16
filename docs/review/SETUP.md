# TC Portal - セットアップ手順

## 前提条件

- Node.js 20+
- pnpm 8+
- Supabase CLIまたはSupabase Studioへのアクセス
- (オプション) Python 3.10+ (Runner Agent用)

---

## 1. リポジトリのクローン

```bash
git clone https://github.com/Travel-Connect/tc-portal.git
cd tc-portal
```

---

## 2. 依存関係のインストール

```bash
pnpm install
```

---

## 3. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成:

```bash
cp .env.example .env.local
```

`.env.local` に以下の値を設定:

| 変数名 | 説明 | 取得方法 |
|--------|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | サービスロールキー（サーバー用） | 同上 |
| `TC_PORTAL_ADMIN_EMAILS` | 管理者メールアドレス（カンマ区切り） | 任意設定 |
| `RUNNER_MACHINE_KEY` | Runner Agent認証キー | 任意の文字列を設定 |
| `HELPER_MACHINE_KEY` | (将来用) | 任意 |

**注意:** `.env.local` は `.gitignore` に含まれており、コミットされません。

---

## 4. Supabase セットアップ

### 4.1 新規プロジェクト作成（初回のみ）

1. [Supabase Dashboard](https://supabase.com/dashboard) でプロジェクト作成
2. プロジェクトURL・キーを `.env.local` に設定

### 4.2 マイグレーション実行

**方法A: Supabase CLI（推奨）**

```bash
# Supabase CLIをインストール
npm install -g supabase

# ログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref <your-project-ref>

# マイグレーション実行
supabase db push
```

**方法B: Supabase Studio（手動）**

1. Supabase Dashboard → SQL Editor を開く
2. `supabase/migrations/` 内のファイルを**番号順**に実行:
   - `20240113000001_create_tables.sql`
   - `20240113000002_rls_policies.sql`
   - `20240113000003_add_target_and_storage.sql`
   - ... (以降すべて)

### 4.3 シードデータ投入（オプション）

テスト用の初期データを投入:

```bash
# CLIの場合
supabase db seed

# または Supabase Studio で supabase/seed.sql を実行
```

### 4.4 Storage バケット作成

1. Supabase Dashboard → Storage
2. 「New bucket」→ `tool-icons` を作成
3. Public bucket: **有効**

### 4.5 認証URL設定

Supabase Dashboard → Authentication → URL Configuration:

| 項目 | 値 |
|------|-----|
| Site URL | `http://localhost:3000` (開発) / 本番URL |
| Redirect URLs | `http://localhost:3000/**`, 本番URL |

---

## 5. 開発サーバー起動

```bash
pnpm dev
```

http://localhost:3000 でアクセス可能。

---

## 6. テストユーザー作成

### 方法A: Magic Link（メール認証）

1. http://localhost:3000/login にアクセス
2. メールアドレスを入力して「ログイン」
3. メールで届いたリンクをクリック

### 方法B: Supabase Studio（ステージング用）

1. Supabase Dashboard → Authentication → Users
2. 「Add user」→ 「Create new user」
3. Email / Password を設定（「Auto confirm user」を有効に）

### 方法C: E2Eテスト用

`.env.local` に以下を追加:

```
TEST_EMAIL=test@example.com
TEST_PASSWORD=your-test-password
```

Supabase Studioで上記のユーザーを作成しておく。

---

## 7. Runner Agent セットアップ（オプション）

Python/PADツールを実行する場合に必要。

```bash
cd runner

# 仮想環境作成
python -m venv .venv

# 有効化
# Windows:
.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# 依存関係インストール
pip install -r requirements.txt

# 設定ファイル作成
cp config.example.json config.json
```

`config.json` を編集:

```json
{
  "portal_url": "http://localhost:3000",
  "machine_key": "your-runner-key",
  "poll_interval_sec": 5,
  "log_dir": "C:\\TcPortalLogs"
}
```

**注意:** `machine_key` は `.env.local` の `RUNNER_MACHINE_KEY` と一致させる必要があります。

### machines テーブルに登録

Supabase SQLで実行:

```sql
-- machine_keyのSHA256ハッシュを計算して登録
-- Node.js: require('crypto').createHash('sha256').update('your-runner-key').digest('hex')
INSERT INTO machines (name, key_hash, enabled)
VALUES ('local-runner', '<sha256-hash>', true);
```

---

## 8. ビルド・本番起動

```bash
# ビルド
pnpm build

# 本番起動
pnpm start
```

---

## 9. ステージング環境の構築（レビュー用）

ステージング環境を構築して、レビュアーがURLとテストアカウントで動作確認できるようにします。

### 9.1 Supabase ステージングプロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. 「New Project」で新規プロジェクト作成
   - Name: `tc-portal-staging`
   - Database Password: 安全なパスワードを設定
   - Region: 本番と同じリージョン推奨
3. プロジェクト作成後、「Settings」→「API」からキーを取得

### 9.2 マイグレーション適用

Supabase Studio の SQL Editor で、`supabase/migrations/` 内のファイルを**番号順**に実行：

```sql
-- 1つずつ順番に実行
-- 20240113000001_create_tables.sql
-- 20240113000002_rls_policies.sql
-- ... 以降すべて
```

### 9.3 シードデータ投入

```sql
-- supabase/seed.sql の内容を実行
```

または、テスト用のサンプルツールを手動で作成：

```sql
-- カテゴリ作成
INSERT INTO categories (name, sort_order) VALUES
  ('サンプル', 1);

-- サンプルツール作成
INSERT INTO tools (name, tool_type, execution_mode, category_id, description, target)
SELECT
  'サンプルBAT',
  'bat',
  'helper',
  id,
  'テスト用のBATツール',
  'C:\test.bat'
FROM categories WHERE name = 'サンプル';
```

### 9.4 Storage バケット作成

1. Supabase Dashboard → Storage
2. 「New bucket」→ `tool-icons` を作成（Public: 有効）

### 9.5 テストユーザー作成

1. Supabase Dashboard → Authentication → Users
2. 「Add user」→ 「Create new user」
3. 設定：
   - Email: `reviewer@example.com`（共有用）
   - Password: 別経路で共有（Slack、メール等）
   - 「Auto confirm user」を有効に

### 9.6 Vercel ステージング環境

#### 方法A: Preview Deployment（PR毎に自動生成）

VercelはPR作成時に自動でPreview URLを生成します。

1. GitHubでPRを作成
2. VercelがPreview URLを自動生成（例: `tc-portal-xxx-team.vercel.app`）
3. PR画面にURLが表示される

**注意**: Preview DeploymentはPR毎に環境変数を共有します。ステージング用Supabaseを使う場合は、Vercel環境変数を設定してください。

#### 方法B: ステージング用ブランチ（推奨）

1. `staging` ブランチを作成
2. Vercel Dashboard → Settings → Git
3. 「Production Branch」とは別に、`staging` ブランチ用の環境変数を設定

```
# Vercel Dashboard → Settings → Environment Variables
# Preview/Development環境に設定

NEXT_PUBLIC_SUPABASE_URL=https://xxx-staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=xxx-staging-service-key
RUNNER_MACHINE_KEY=staging-runner-key
```

#### 方法C: 別Vercelプロジェクト

1. Vercel Dashboard → 「Add New」→「Project」
2. 同じリポジトリを選択
3. プロジェクト名: `tc-portal-staging`
4. 環境変数にステージングSupabaseのキーを設定

### 9.7 認証URL設定（ステージング）

Supabase Dashboard（ステージング）→ Authentication → URL Configuration:

| 項目 | 値 |
|------|-----|
| Site URL | `https://tc-portal-staging.vercel.app` |
| Redirect URLs | `https://tc-portal-staging.vercel.app/**`, Preview URL パターン |

**Preview URL用のワイルドカード設定**:
```
https://*-travel-connect.vercel.app/**
```

---

## 10. ステージング環境の共有方法

### レビュアーへの情報共有

GitHubのPR本文やSlackで以下を共有：

```
【ステージング環境】
URL: https://tc-portal-staging.vercel.app/
テストアカウント: reviewer@example.com
パスワード: （別経路で共有）
```

**注意事項**:
- パスワードはGitHubに書かない（Slack DM、メール等で共有）
- ステージング環境のデータは本番と分離されている
- レビュー完了後、テストデータは削除してもOK

### GitHub Secrets（E2Eテスト用）

GitHub Actions でE2Eテストを実行する場合：

| Secret | 値 |
|--------|-----|
| `E2E_BASE_URL` | `https://tc-portal-staging.vercel.app` |
| `E2E_EMAIL` | `reviewer@example.com` |
| `E2E_PASSWORD` | （テストユーザーのパスワード） |

---

## トラブルシューティング

### ログインできない

- Supabase Auth の URL設定を確認
- `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` が正しいか確認

### ツールが表示されない

- RLSポリシーが正しく適用されているか確認
- `tools` テーブルにデータがあるか確認

### Runner が 401 エラー

- `machines` テーブルに正しい `key_hash` が登録されているか確認
- ハッシュは `SHA256(machine_key)` で計算

### ツールアイコンがアップロードできない

- `tool-icons` バケットが作成されているか確認
- バケットがPublicになっているか確認
