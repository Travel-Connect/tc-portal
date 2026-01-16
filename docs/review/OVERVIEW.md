# TC Portal - システム概要

## 何ができるポータルか

TC Portalは、社内ツール（Excel、Python、PAD、BATなど）を一元管理・実行できるWebポータルです。

### 主な機能

- **ツール管理**: 社内ツールをカテゴリ別に整理・検索
- **ワンクリック実行**: ツールをポータルから直接起動
- **実行履歴**: 誰がいつ何を実行したかを記録
- **ピン留め**: よく使うツールをホームに固定

---

## 実行モデル（3種類）

TC Portalでは、ツールの種類に応じて3つの実行モデルを使い分けます。

### 1. Open（URLを開く）

```
ブラウザ → 外部URL/詳細ページ
```

| 対象 | 動作 |
|------|------|
| `url` | 外部URLを新しいタブで開く |
| `sheet` | Google Spreadsheetを新しいタブで開く |

### 2. Helper（ローカル即実行）

```
ブラウザ → tcportal://プロトコル → Windows Helper → ローカルPC
```

| 対象 | 動作 |
|------|------|
| `excel` | Excelファイルを開く |
| `bi` | Power BIファイルを開く |
| `folder` | フォルダを開く |
| `folder_set` | 複数フォルダを一括で開く |
| `exe` | EXEを実行 |
| `bat` | BATを実行 |

**特徴:**
- ユーザーのローカルPCで即時実行
- Windows Helperのインストールが必要
- 実行結果は即座に `success` として記録

### 3. Queue/Runner（キュー経由実行）

```
ブラウザ → Supabase(runs) → Runner Agent → ローカルPC
```

| 対象 | 動作 |
|------|------|
| `python_runner` | Pythonスクリプトを実行 |
| `pad` | Power Automate Desktopフローを実行 |

**特徴:**
- 常駐Runner Agentがキューを監視
- 実行状態を追跡可能（queued → running → success/failed）
- ログファイルを保存可能

---

## 主要な画面

### Home（`/`）
- ピン留めしたツールを表示
- 全ツールを表示（並べ替え可能）

### Tools（`/tools`）
- 全ツール一覧
- カテゴリ・タグでフィルタ
- 検索機能

### Runs（`/runs`）
- 実行履歴一覧
- ステータス（待機中/実行中/成功/失敗/キャンセル）
- ログファイルへのリンク

### Admin（`/admin`）
- ツール管理（追加/編集/削除/アーカイブ）
- カテゴリ管理
- ※全ログインユーザーがアクセス可能

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| UI | shadcn/ui |
| Backend | Next.js API Routes (Server Actions) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Magic Link) |
| Storage | Supabase Storage (ツールアイコン) |
| Runner | Python (Windows常駐) |
| Helper | Electron (tcportal://スキーム) |

---

## ディレクトリ構成

```
tc-portal/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # 認証関連ページ
│   │   ├── (main)/       # メインページ群
│   │   └── api/          # API Routes
│   ├── components/       # UIコンポーネント
│   ├── lib/              # ユーティリティ
│   │   ├── actions/      # Server Actions
│   │   ├── queries/      # データ取得関数
│   │   └── supabase/     # Supabaseクライアント
│   └── types/            # TypeScript型定義
├── supabase/
│   ├── migrations/       # DBマイグレーション
│   └── seed.sql          # 初期データ
├── runner/               # Windows Runner Agent
│   ├── agent.py
│   ├── config.example.json
│   └── requirements.txt
├── helper/               # Windows Helper (別リポジトリ推奨)
└── e2e/                  # E2Eテスト (Playwright)
```

---

## データモデル

### 主要テーブル

| テーブル | 説明 |
|---------|------|
| `tools` | ツール定義 |
| `categories` | カテゴリ |
| `runs` | 実行履歴 |
| `machines` | Runner Agent登録 |
| `user_pins` | ユーザーのピン留め |
| `user_tool_sort_order` | ユーザーの並び順 |
| `profiles` | ユーザープロフィール |

### tools.tool_type 一覧

| タイプ | 説明 | 実行モデル |
|--------|------|-----------|
| `url` | WebサイトURL | open |
| `sheet` | Google Spreadsheet | open |
| `excel` | Excelファイル | helper |
| `bi` | Power BIファイル | helper |
| `folder` | フォルダ | helper |
| `folder_set` | 複数フォルダ | helper |
| `exe` | 実行ファイル | helper |
| `bat` | バッチファイル | helper |
| `python_runner` | Pythonスクリプト | queue |
| `pad` | Power Automate Desktop | queue |

### tools.execution_mode

| モード | 説明 |
|--------|------|
| `open` | 詳細ページへ移動 / URLを開く |
| `helper` | Windows Helperで即実行 |
| `queue` | Runnerキューに登録 |

※ `execution_mode` はカードクリック時の動作を制御
※ 実行ボタン（▶）クリック時は `tool_type` で動作が決まる
