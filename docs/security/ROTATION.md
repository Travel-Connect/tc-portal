# JWT Secret ローテーション & 履歴クリーニング手順

> 前提: [SECRET_AUDIT.md](SECRET_AUDIT.md) の P0 対応手順
> 対象: Supabase service_role JWT が PUBLIC git 履歴に残存している問題

---

## 0. ローテーション前の注意

- **リポジトリは PUBLIC** — git 履歴の JWT は**今この瞬間も**誰でも取得可能
- ローテーションを先送りにするほどリスクが増大する
- ローテーション完了まで、**新しいシークレットを git にコミットしない**こと
- 作業は**メンテナンスウィンドウ不要**（ダウンタイムは数分程度）

---

## Phase 1: Supabase JWT Secret ローテーション

### 1-1. ローテーション実行（Supabase Dashboard）

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 対象プロジェクトを選択
3. **Project Settings** → **API** に移動
4. 「JWT Secret」セクションの **「Generate a new JWT secret」** をクリック
5. 確認ダイアログで **「Generate」** を押す

> これにより `anon_key` と `service_role_key` が**両方とも再生成**される。
> 旧キーは**即座に無効化**される。

### 1-2. 新キーの取得

ローテーション直後に同じ API ページから:
- **`anon` (public)** キーをコピー
- **`service_role` (secret)** キーをコピー

### 1-3. 差し替え対象一覧

| # | 場所 | 変数 | 更新方法 |
|---|------|------|----------|
| 1 | **`.env.local`**（ローカル開発） | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | テキストエディタで直接書き換え |
| 2 | **Vercel 環境変数**（本番） | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Vercel Dashboard → Settings → Environment Variables |
| 3 | **GitHub Secrets**（CI/CD） | `SUPABASE_ANON_KEY` ※存在する場合 | `gh secret set SUPABASE_ANON_KEY` |
| 4 | **Runner config.json**（各 Runner PC） | — (直接は含まない。API 経由で使用) | Runner が Supabase を直接呼ばない場合は不要 |
| 5 | **他チームメンバーの `.env.local`** | 上記と同じ | Slack DM 等で新キーを共有 |

### 1-4. Vercel の再デプロイ

環境変数更新後、Vercel を再デプロイ:

```bash
# Vercel CLI がある場合
npx vercel --prod

# または Vercel Dashboard → Deployments → Redeploy
```

### 1-5. 動作確認チェックリスト

全項目を順番に確認:

- [ ] **ローカルログイン**: `npm run dev` → ブラウザでログイン画面 → ログイン成功
- [ ] **本番ログイン**: `https://tc-portal.vercel.app` → ログイン成功
- [ ] **/tools ページ**: ツール一覧が正常に表示される
- [ ] **Runner queue**: Runner Agent を起動 → ポーリングが正常に動作（ログにエラーなし）
- [ ] **ツール実行**: 任意のツール（フォルダ Open 等）を実行 → status が success になる
- [ ] **Monitor webhook**: `wrap-and-report.bat` を手動実行 → `/api/monitor/report` が 200 を返す
- [ ] **Playwright E2E**: `npx playwright test` → 全テストパス

---

## Phase 2: git 履歴クリーニング（推奨）

> JWT Secret ローテーション完了後に実施する。
> ローテーション済みなら旧キーは無効化されているため、**本 Phase は任意**だが
> セキュリティ衛生管理として実施を推奨する。

### 2-1. バックアップ

```bash
# バックアップブランチを作成
git checkout main
git branch backup/pre-filter-repo-$(date +%Y%m%d)
git push origin backup/pre-filter-repo-$(date +%Y%m%d)
```

### 2-2. expressions.txt の作成

`expressions.txt` を作成（**このファイル自体はコミットしない**）:

```text
# 旧 service_role JWT（全文を記載し ==> 以降に置換後の文字列）
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...(旧service_role全文)==>[REDACTED_SERVICE_ROLE_JWT]

# 旧 anon_key JWT
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...(旧anon_key全文)==>[REDACTED_ANON_KEY_JWT]

# Supabase project-ref（supabase/.temp/project-ref の値）
beopwoevumsduqlxzudu==>PROJECT_REF_REDACTED

# PostgreSQL pooler URL（supabase/.temp/pooler-url の値。ホスト部分を置換）
# 例: aws-0-ap-northeast-1.pooler.supabase.com==>[REDACTED_POOLER_HOST]
```

> `.env.local` から旧キーの全文をコピーして貼り付ける。
> `==>` の左が検索文字列、右が置換文字列。

### 2-3. git filter-repo 実行

```bash
# インストール（未導入の場合）
pip install git-filter-repo

# 実行（ローカルリポジトリで）
git filter-repo --replace-text expressions.txt --force
```

### 2-4. force push

```bash
git push --force --all
git push --force --tags
```

### 2-5. 全チームメンバーへの通知

force push 後、**全員が `git clone` をやり直す**必要がある:

```
⚠️ セキュリティ対応のため git 履歴を書き換えました。
既存のローカルリポジトリは使用できません。
以下の手順で再取得してください:

1. 既存の tc-portal フォルダをバックアップ（未コミットの変更がある場合）
2. 新しい場所に git clone し直す
3. .env.local を再設定する（新しいキーは Slack DM で共有済み）
```

### 2-6. 事後確認

```bash
# 旧キーが履歴から除去されたことを確認
git log --all -S "旧service_roleの先頭20文字"
# → 結果が空であれば OK
```

---

## Phase 3: 事後検証

1. SECRET_AUDIT.md を再実行し、P0 が解消されたことを確認
2. `export-review-pack.ps1` を実行し、シークレット検出が 0 件であることを確認
3. E2E テスト全パス確認

---

## トラブルシューティング

### ローテーション後にログインできない

- `.env.local` / Vercel 環境変数の `NEXT_PUBLIC_SUPABASE_ANON_KEY` が新しい値か確認
- Vercel を**再デプロイ**したか確認
- ブラウザのキャッシュ / Cookie をクリア

### Runner Agent がエラーを出す

- Runner は Supabase を直接呼ばず、`/api/runner/` 経由でアクセスする
- サーバー側（Vercel）の環境変数が更新されていれば Runner 側の変更は不要
- エラーが続く場合は `config.json` の `portal_url` が正しいか確認

### filter-repo 後に push できない

```bash
# リモートとの整合性が壊れた場合
git push --force origin main
```

### チームメンバーが古いリポジトリで作業している

- `git pull --rebase` は失敗する（履歴が書き換わっているため）
- **必ず `git clone` し直し**を依頼する
