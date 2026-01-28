# Legacy E2E Tests (Python / pytest) — 非推奨

> **このディレクトリは非推奨 (deprecated) です。**
> 新しい E2E テストは `tests/e2e/` (Playwright / TypeScript) に追加してください。

## 用途

Supabase REST API を直接叩く統合テスト群です。
Playwright では代替できない以下の検証に使用します:

- ツール登録データの整合性チェック (`test_folder_set.py`, `test_tool_ordering.py`)
- Supabase REST API 経由の CRUD 操作テスト
- Helper プロトコルの存在確認 (`check_helper_tools.py`)

## 実行方法

```bash
cd scripts/legacy-e2e
uv sync          # 依存インストール
uv run pytest    # テスト実行
```

`.env.local`（プロジェクトルート）の `NEXT_PUBLIC_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が必要です。

## 構成

```
scripts/legacy-e2e/
  conftest.py          # .env.local ローダー
  check_helper_tools.py # Helper ツール確認スクリプト
  pytest.ini           # pytest 設定
  pyproject.toml       # Python プロジェクト設定
  scripts/             # 運用スクリプト（データ修正・確認用）
  tests/               # pytest テストファイル
  screenshots/         # テスト実行時の自動生成物（git 管理外）
```

## CI との関係

- CI (GitHub Actions) では **使用されていません**
- CI は `tests/e2e/` (Playwright) のみ実行します
