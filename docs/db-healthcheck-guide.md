# TC Portal データベースヘルスチェック ガイド

## 概要

TC Portalのデータベース状態を確認するための2つの方法があります：

1. **自動スクリプト** (`scripts/db-healthcheck.ts`) - Node.jsで実行、結果をMarkdownに出力
2. **手動SQL** (`supabase/db-healthcheck-extra.sql`) - Supabase SQL Editorで実行

---

## 1. 自動スクリプトの実行

### 前提条件

- Node.js 18以上
- `.env.local` に以下が設定済み：
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### 実行方法

```powershell
cd c:\Users\tckam\projects\tc-portal
npx tsx scripts/db-healthcheck.ts
```

### 出力

- **ファイル**: `docs/db-healthcheck.md` に結果が保存されます
- **コンソール**: サマリーと警告が表示されます

### チェック内容

| セクション | 内容 |
|-----------|------|
| 1. tools by tool_type | ツールタイプ別の件数 |
| 2. tools by execution_mode | 実行モード別の件数 |
| 3. runs by status | 実行ステータス別の件数 |
| 4. runs by tool_type and status | ツールタイプ・ステータス別の件数 |
| 5. anomalous runs | finished_atがNULLの異常run |
| 6. currently pending runs | 現在queued/runningのrun |
| 7. latest exe runs | 最新のEXE実行10件 |
| 8. machines | マシン一覧 |
| 9. categories | カテゴリ一覧とツール数 |
| 10. tool_last_success | 最終成功日時TOP20 |
| 11. runs.log_url統計 | log_urlがNOT NULLの件数 |
| 12. runs.machine_id統計 | machine_idがNULLの件数 |
| 13. execution_mode整合性 | tool_typeと期待されるexecution_modeの不一致 |
| 14. Summary Statistics | 全体統計 |

### 期待されるexecution_mode

| tool_type | 期待されるexecution_mode |
|-----------|-------------------------|
| python_runner | queue |
| pad | queue |
| exe | queue または helper |
| excel | helper |
| bi | helper |
| folder | helper |
| folder_set | helper |
| shortcut | helper |
| bat | helper |
| url | open |
| sheet | open |

---

## 2. 手動SQLの実行

### 実行方法

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. TC Portalプロジェクトを選択
3. 左メニューから **SQL Editor** を開く
4. `supabase/db-healthcheck-extra.sql` の内容をコピー＆ペースト
5. 必要なクエリを選択して実行

### クエリ一覧

| # | クエリ | 用途 |
|---|--------|------|
| 1-1 | RLS有効/無効状態 | テーブル別のRow Level Security設定確認 |
| 1-2 | RLSポリシー一覧 | 定義されているポリシーの詳細 |
| 2-1 | CHECK制約一覧 | すべてのCHECK制約 |
| 2-2 | execution_mode制約 | execution_modeの値制約 |
| 2-3 | status制約 | runs.statusの値制約 |
| 3 | 外部キー制約 | テーブル間の参照関係 |
| 4 | インデックス一覧 | 定義されているインデックス |
| 5-1〜5-3 | カラム定義 | NOT NULL、デフォルト値の確認 |
| 6 | VIEW一覧 | 定義されているVIEW |
| 7-1〜7-5 | データ整合性 | 孤立レコード、長時間待機の検出 |
| 8-1〜8-2 | テーブル統計 | サイズ、行数概算 |
| 9 | execution_mode整合性 | 不一致の詳細リスト |
| 10-1〜10-2 | runs詳細統計 | log_url、machine_idの統計 |

---

## 3. トラブルシューティング

### 警告: anomalous runs detected

`finished_at` がNULLなのに終了ステータス（success/failed/canceled）になっているrunがあります。

**対処法**:
```sql
UPDATE runs
SET finished_at = COALESCE(started_at, requested_at)
WHERE finished_at IS NULL
  AND status IN ('success', 'failed', 'canceled');
```

### 警告: execution_mode mismatch

tool_typeに対して想定外のexecution_modeが設定されています。

**対処法**:
```sql
-- Helper対象ツールをhelperモードに修正
UPDATE tools
SET execution_mode = 'helper'
WHERE tool_type IN ('excel', 'bi', 'folder', 'folder_set', 'shortcut', 'bat')
  AND execution_mode != 'helper';

-- Python/PADをqueueモードに修正
UPDATE tools
SET execution_mode = 'queue'
WHERE tool_type IN ('python_runner', 'pad')
  AND execution_mode != 'queue';
```

### 警告: long-running tasks

1時間以上`running`または`queued`のままのrunがあります。

**対処法**:
1. Runnerが正常に動作しているか確認
2. 必要に応じて手動でステータスを更新
```sql
UPDATE runs
SET status = 'failed',
    finished_at = NOW(),
    error_message = '手動キャンセル: タイムアウト'
WHERE id = '<run_id>';
```

---

## 4. 定期実行の推奨

- **週次**: 自動スクリプトを実行してMarkdownレポートを確認
- **問題発生時**: 手動SQLで詳細調査

### GitHub Actionsでの自動実行（オプション）

```yaml
# .github/workflows/db-healthcheck.yml
name: DB Health Check
on:
  schedule:
    - cron: '0 9 * * 1'  # 毎週月曜9時
  workflow_dispatch:

jobs:
  healthcheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx tsx scripts/db-healthcheck.ts
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      - uses: actions/upload-artifact@v4
        with:
          name: healthcheck-report
          path: docs/db-healthcheck.md
```
