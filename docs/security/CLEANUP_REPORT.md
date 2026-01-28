# CLEANUP_REPORT.md — リポジトリ清掃レポート

> 調査日: 2026-01-28
> 対象: Travel-Connect/tc-portal (257 tracked files, 5.2 MB)

---

## 分類ルール

| アクション | 基準 |
|-----------|------|
| **Delete** | 参照ゼロ + 生成物 / 一時ファイル。git rm で削除 |
| **Move** | 参照なし、今後の資料価値あり → `docs/examples/` or `tests/fixtures/` |
| **Keep** | 運用・CI・監視で必要（理由を明記） |
| **Gitignore** | 実行時生成物。git rm --cached + .gitignore 追記 |

---

## 1. サイズ上位ファイル

| # | ファイル | サイズ | 種別 |
|---|---------|--------|------|
| 1 | `package-lock.json` | 294 KB | Keep（npm 依存ロック） |
| 2 | `e2e/screenshots/*.png` (52 files) | **4.1 MB** | 要判断（後述） |
| 3 | `e2e/uv.lock` | — | Keep（Python 依存ロック） |

> **スクリーンショット 52 件が追跡ファイル全体の 77%** を占めている。

---

## 2. 一時ファイル候補 — `temp_*.json` (9 files)

| ファイル | サイズ | 内容 | 参照元 | アクション |
|----------|--------|------|--------|-----------|
| `temp_bat_tool.json` | 242 B | Supabase ツール登録用テストデータ | **0件** | **Delete** |
| `temp_bi_tool.json` | 282 B | 同上 | **0件** | **Delete** |
| `temp_folder_update.json` | 31 B | tool_type 更新リクエスト | **0件** | **Delete** |
| `temp_pad_tool.json` | 314 B | PAD ツール登録用テストデータ | **0件** | **Delete** |
| `temp_python_test_tool.json` | 259 B | Python ツール登録用テストデータ | **0件** | **Delete** |
| `temp_python_tool.json` | 325 B | Python ツール登録用テストデータ | **0件** | **Delete** |
| `temp_python_update.json` | 126 B | target フィールド更新リクエスト | **0件** | **Delete** |
| `temp_python_venv_tool.json` | 343 B | Python venv ツール登録用テストデータ | **0件** | **Delete** |
| `temp_sheet_tool.json` | 319 B | スプレッドシートツール登録テストデータ | **0件** | **Delete** |

**理由:** 全て手動 curl / Supabase API テストで作った1回限りの JSON ペイロード。どこからも参照されていない。今後再利用する場合は `tests/fixtures/` に整理して配置する方が適切。

---

## 3. ログ関連 — `logs/`

| ファイル | 参照元 | アクション |
|----------|--------|-----------|
| `logs/.gitkeep` | `.gitignore` に `/logs/*.txt` あり。`collect-env.ps1` が `logs/smoke-*.txt` を出力。`SMOKE_TEST_OTHER_PC.md` が参照 | **Keep** |

**理由:** `.gitkeep` はログディレクトリの空構造を維持するために必要。ログ出力先として `scripts/smoke/collect-env.ps1` が使用。

---

## 4. E2E テスト二重構造

### 現状

| ディレクトリ | 技術スタック | CI 統合 | ファイル数 |
|-------------|-------------|---------|-----------|
| **`tests/e2e/`** | Playwright (TypeScript) | **YES** (`.github/workflows/e2e.yml`) | 8 |
| **`e2e/`** | pytest (Python) | **NO** | 76 (うち screenshots 52) |

### `e2e/` 内の分類

| パス | 参照元 | アクション | 理由 |
|------|--------|-----------|------|
| `e2e/tests/*.py` (14 files) | **0件**（CI 未使用） | **Keep** | ローカル手動テスト用。Supabase REST API を直接叩く統合テスト。Playwright では代替不可。セキュリティ修正済み（os.environ 化） |
| `e2e/conftest.py` | `e2e/tests/*.py` から暗黙参照（pytest） | **Keep** | pytest の設定ファイル |
| `e2e/run_tests.py` | **0件** | **Delete** | pytest ラッパー。`pytest` コマンドで直接実行可能 |
| `e2e/check_helper_tools.py` | **0件** | **Keep** | Helper ツール存在確認の単発スクリプト。運用時に有用 |
| `e2e/scripts/*.py` (3 files) | **0件** | **Keep** | データ修正・確認用の運用スクリプト（check_folder_set, check_sheet_tools, fix_folder_set） |
| `e2e/pytest.ini` | pytest が自動読み込み | **Keep** | pytest 設定 |
| `e2e/pyproject.toml` | uv/pip が使用 | **Keep** | Python プロジェクト設定 |
| `e2e/.python-version` | uv/pyenv が使用 | **Keep** | Python バージョン指定 |
| `e2e/uv.lock` | uv が使用 | **Keep** | Python 依存ロック |
| `e2e/screenshots/*.png` (52 files, 4.1 MB) | **0件**（CI 未使用、ドキュメント未参照） | **Gitignore** | pytest 実行時に自動生成されるスクリーンショット。手動テストの記録だが、git 追跡は不要 |

### 未追跡スクリーンショット（ディスク上のみ）

| パス | アクション |
|------|-----------|
| `e2e/screenshots/debug_login_1.png` | Gitignore 対象（上記に含まれる） |
| `e2e/screenshots/debug_login_2.png` | 同上 |
| `e2e/screenshots/debug_login_3.png` | 同上 |

---

## 5. Runner テストファイル

| ファイル | 参照元 | アクション | 理由 |
|----------|--------|-----------|------|
| `runner/test_bat.bat` | **0件** | **Move** → `tests/fixtures/` | Runner の BAT 実行テスト用サンプル。テストフィクスチャとして価値あり |
| `runner/test_python.py` | **0件** | **Move** → `tests/fixtures/` | Runner の Python 実行テスト用サンプル。同上 |

---

## 6. ドキュメント重複 / 生成物

| ファイル | 参照元 | アクション | 理由 |
|----------|--------|-----------|------|
| `docs/db-healthcheck.md` | `scripts/db-healthcheck.ts` が出力先として参照 | **Gitignore** | `db-healthcheck.ts` の実行結果（生成物）。日時入り。git 追跡不要 |
| `docs/db-healthcheck.sql` | **0件** | **Keep** | 手動実行用 SQL クエリ集。ドキュメントとして価値あり |
| `docs/db-healthcheck-guide.md` | **0件** | **Keep** | ヘルスチェック運用ガイド |
| `docs/helper-setup.md` | **0件** | **Delete** | `docs/review/SETUP.md` にヘルパー設定手順が統合済み。内容が古い（tcportal:// ペイロード例が旧形式） |
| `helper/config.example.json` | **0件** | **Keep** | テンプレート（プレースホルダ値） |
| `helper/uninstall-protocol.ps1` | **0件** | **Keep** | プロトコルハンドラーのアンインストール用。運用で必要 |

---

## 7. 提案サマリー

### Delete（git rm で削除）

| # | ファイル | 理由 |
|---|---------|------|
| 1 | `temp_bat_tool.json` | 参照ゼロ、1回限りのテストデータ |
| 2 | `temp_bi_tool.json` | 同上 |
| 3 | `temp_folder_update.json` | 同上 |
| 4 | `temp_pad_tool.json` | 同上 |
| 5 | `temp_python_test_tool.json` | 同上 |
| 6 | `temp_python_tool.json` | 同上 |
| 7 | `temp_python_update.json` | 同上 |
| 8 | `temp_python_venv_tool.json` | 同上 |
| 9 | `temp_sheet_tool.json` | 同上 |
| 10 | `e2e/run_tests.py` | 参照ゼロ、pytest で直接実行可能 |
| 11 | `docs/helper-setup.md` | `docs/review/SETUP.md` に統合済み、内容が古い |

### Move（`tests/fixtures/` へ移動）

| # | ファイル | 移動先 | 理由 |
|---|---------|--------|------|
| 1 | `runner/test_bat.bat` | `tests/fixtures/test_bat.bat` | Runner テスト用サンプル BAT |
| 2 | `runner/test_python.py` | `tests/fixtures/test_python.py` | Runner テスト用サンプル Python |

### Gitignore（git rm --cached + .gitignore 追記）

| # | ファイル/パターン | 理由 |
|---|-----------------|------|
| 1 | `e2e/screenshots/*.png` (52 files, 4.1 MB) | テスト実行時の自動生成物。リポジトリサイズの 77% を占有 |
| 2 | `docs/db-healthcheck.md` | スクリプト実行結果（生成物） |

### Keep（削除しない）

| # | ファイル | 理由 |
|---|---------|------|
| 1 | `e2e/tests/*.py` | ローカル手動テスト（Supabase REST API 直接テスト） |
| 2 | `e2e/scripts/*.py` | データ修正・確認用運用スクリプト |
| 3 | `e2e/check_helper_tools.py` | Helper ツール確認スクリプト |
| 4 | `e2e/conftest.py`, `pytest.ini`, `pyproject.toml`, `.python-version`, `uv.lock` | Python テスト環境設定 |
| 5 | `logs/.gitkeep` | ログディレクトリ構造維持 |
| 6 | `docs/db-healthcheck.sql` | 手動 SQL クエリ集 |
| 7 | `docs/db-healthcheck-guide.md` | ヘルスチェック運用ガイド |
| 8 | `runner/config.example.json` | テンプレート |
| 9 | `helper/uninstall-protocol.ps1` | 運用ツール |
| 10 | `tests/e2e/*.ts` | CI 統合済み Playwright テスト |

---

## 8. 推奨 .gitignore 追記案

```gitignore
# E2E screenshots (generated by pytest/Playwright)
e2e/screenshots/

# DB healthcheck output (generated by scripts/db-healthcheck.ts)
docs/db-healthcheck.md

# Temp JSON (manual API test payloads)
temp_*.json
```

---

## 9. 影響見積もり

| メトリクス | 現在 | 清掃後 |
|-----------|------|--------|
| 追跡ファイル数 | 257 | 192 (-65) |
| リポジトリサイズ（追跡ファイル） | 5.2 MB | ~1.0 MB (-80%) |
| `git clone` 時間 | — | 大幅短縮（バイナリ PNG 除去による） |

> **注意:** `e2e/screenshots/` を gitignore にしても、git 履歴にはバイナリが残る。
> 完全な削減には `git filter-repo` が必要だが、ROTATION.md の Phase 2 と合わせて実施可能。
