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

## Claude Code

プロジェクト仕様は `CLAUDE.md` を参照してください。

カスタムコマンド:
- `/verify` - lint, typecheck, build を実行
- `/commit` - 変更確認後にコミット作成
