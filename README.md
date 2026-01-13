# ツール統合ポータル

社内ツールの統合管理システム

## 技術スタック

- **Next.js 15** (App Router)
- **Tailwind CSS v3**
- **shadcn/ui** (Radix UI)
- **Supabase** (Auth + Postgres + Edge Functions)

> **重要**: プロジェクトパスはASCII文字のみ使用してください。日本語パスはNext.js (Turbopack) と互換性がありません。

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 環境変数

`.env.example` を `.env.local` にコピーして設定してください。

```bash
cp .env.example .env.local
```

## Supabase データベースセットアップ

### 1. マイグレーションの適用

Supabase Dashboard の **SQL Editor** で以下のファイルを順番に実行してください：

1. `supabase/migrations/20240113000001_create_tables.sql` - テーブル作成
2. `supabase/migrations/20240113000002_rls_policies.sql` - RLSポリシー設定

### 2. シードデータの投入

SQL Editor で `supabase/seed.sql` を実行してください。

これにより以下が作成されます：
- 8つのカテゴリ
- 各カテゴリに1つずつサンプルツール（計8件）

### 3. 管理者の設定

最初の管理者を設定するには、SQL Editor で以下を実行してください：

```sql
-- メールアドレスを自分のものに変更してください
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

または、特定のユーザーIDを指定する場合：

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = 'ユーザーのUUID';
```

> **Note**: profiles テーブルは auth.users にユーザーが作成されると自動的にトリガーで作成されます。

## Claude Code

プロジェクト仕様は `CLAUDE.md` を参照してください。

カスタムコマンド:
- `/verify` - lint, typecheck, build を実行
- `/commit` - 変更確認後にコミット作成
