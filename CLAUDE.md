# CLAUDE.md - プロジェクト仕様

## 技術スタック
- Next.js 15（App Router）
- Tailwind CSS v3
- shadcn/ui（Radix UI）
- Supabase（Auth + Postgres + Edge Functions）
- **重要**: プロジェクトパスはASCII文字のみ使用（日本語パス非対応）

## UI仕様（SPEC_LOCK）

### Home画面
- タイル表示: アイコン + タイトルのみ（タイムスタンプ・説明なし）
- 構成: ピン留め → お気に入り → カテゴリショートカット
- 「おすすめ」は廃止 → お気に入り（⭐）に統一
- 全ツールはTools画面で確認可能

### ツール種別と状態追跡
| 種別 | 追跡内容 |
|------|----------|
| Python/PAD | 最終実行 + 成功/失敗 |
| Web/BI/Sheet/Excel | 最終利用（任意） |
| EXE | 最終更新（リリース日）のみ、**成功/失敗は追わない** |

### データ設計
- お気に入り（⭐）: ユーザー固有
- ピン留め（📌）: ユーザー固有
- カテゴリ追加/編集: 管理画面から行う

### 管理画面
- ツール並び順: ドラッグ＆ドロップで編集

### 実行安全
- すべての実行/起動は**確認モーダル必須**

## カテゴリ（8つ固定）
1. 全体の健康診断
2. 料金変動の時に使うもの
3. その他
4. コッシー
5. 玉城
6. 大城
7. 神里
8. ヒラリー

## 認証
| 対象 | 方式 |
|------|------|
| ブラウザ | Supabase Auth（JWT） |
| Runner/Helper | X-Machine-Key |
| PAD | X-Run-Token（ワンタイム） |

## 開発ルール
- 既存アーキテクチャに従う（勝手に書き換えない）
- インクリメンタルな変更、コミットしやすい単位
- シークレットはハードコードしない（`.env.example`更新）
- **`.env.local` を絶対にリセット・上書き・削除しない**。git stash/checkout/reset 等で `.env.local` が巻き戻ると、E2E認証情報やSupabase接続情報が消失する。`.env.local` はgit管理外だが、ブランチ操作時に意図せず消える場合があるため注意

## 新しいツール種別を追加する際のチェックリスト

新しい `tool_type` を追加する場合、以下の**すべて**を更新する必要がある：

1. **DBマイグレーション** - `tools.tool_type` の CHECK 制約に追加
   ```sql
   ALTER TABLE public.tools DROP CONSTRAINT tools_tool_type_check;
   ALTER TABLE public.tools ADD CONSTRAINT tools_tool_type_check
     CHECK (tool_type IN ('url', 'sheet', 'excel', 'bi', 'exe', 'python_runner', 'pad', 'folder_set', 'folder', 'shortcut', 'bat', '新しい種別'));
   ```

2. **型定義** - `src/types/database.ts`
   - `ToolType` 型に追加
   - `TOOL_TYPE_LABELS` に追加
   - `TOOL_TYPE_VARIANTS` に追加
   - `TOOL_TYPE_OPTIONS` に追加（管理画面のセレクト用）

3. **実行可能判定** - Runner経由で実行する場合
   - `src/components/tools/ToolCard.tsx` の `EXECUTABLE_TOOL_TYPES` に追加
   - `src/lib/actions/runs.ts` の `executableTypes` に追加

4. **Runner実装** - `runner/agent.py`
   - 実行関数を追加（例: `execute_bat`）
   - `process_task` の分岐に追加

⚠️ **よくあるミス**: DBのCHECK制約を忘れて「invalid input value for enum」エラーになる

## Python実行の注意点

### venv環境のPythonスクリプト
- 直接 `python script.py` では動かないことが多い
- `.venv\Scripts\python.exe -m module_name` 形式が必要な場合がある
- `target` に `プロジェクトパス|モジュール名` 形式を使用

### コンソール表示
- `subprocess.run()` ではコンソールが表示されない
- `subprocess.Popen()` + `CREATE_NEW_CONSOLE` フラグで表示される
  ```python
  process = subprocess.Popen(
      cmd,
      cwd=cwd,
      creationflags=subprocess.CREATE_NEW_CONSOLE,
  )
  returncode = process.wait(timeout=timeout)
  ```

### BATファイル実行
- `/k` フラグ: CMDウィンドウが開いたまま残る
- `/c` フラグ: 実行後にCMDウィンドウが自動で閉じる
  ```python
  cmd = ["cmd", "/c", bat_path]  # 自動終了
  ```

## 環境変数の展開

`runner/agent.py` では以下の環境変数を自動展開：
- `%OneDrive%` → 実際のOneDriveパス
- その他の `%VAR%` 形式

```python
def expand_env_vars(path: str) -> str:
    return os.path.expandvars(path)
```

## 設計ミス・教訓

### DialogTrigger を Link 内で使う場合（2026-01）

**問題**: `<Link>` の中に `<DialogTrigger asChild>` を配置すると、ダイアログが開いた瞬間に Link の遷移も発生する

**原因**: DialogTrigger の `asChild` は子要素の onClick をマージするが、イベント伝播の制御が不十分

**NG例**:
```tsx
<Link href={`/tools/${id}`}>
  <Card>
    <DialogTrigger asChild>
      <Button onClick={(e) => e.stopPropagation()}>実行</Button>
    </DialogTrigger>
  </Card>
</Link>
```

**OK例**: div でラップして `preventDefault` + `stopPropagation` を両方呼ぶ
```tsx
<Link href={`/tools/${id}`}>
  <Card>
    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
      <DialogTrigger asChild>
        <Button>実行</Button>
      </DialogTrigger>
    </div>
  </Card>
</Link>
```

**教訓**: Radix UI のコンポーネントを Link 内で使う場合は、親要素でイベントを明示的にブロックする

### Helper型ツールの execution_mode 設定忘れ（2026-01）

**問題**: Helper型ツール（folder, folder_set, excel, bi, shortcut, exe, bat）を作成・更新した際に `execution_mode` が `open` のままだと、カードクリック時に詳細ページに遷移してしまい、ローカルアプリ/フォルダが開かない

**原因**: `execution_mode` のデフォルト値が `open` であり、Helper型ツールには明示的に `helper` を設定する必要がある

**影響を受けるツールタイプ**:
- `folder` - フォルダを開く
- `folder_set` - 複数フォルダを開く
- `excel` - Excelファイルを開く
- `bi` - Power BIを開く
- `shortcut` - ショートカットを実行
- `exe` - EXEを実行（確認ダイアログあり）
- `bat` - BATを実行（確認ダイアログあり）

**チェックリスト**:
1. DBで `tool_type` が Helper型の場合、`execution_mode = 'helper'` になっているか確認
2. 管理画面でツールを作成する際、自動で `execution_mode` を設定する処理があるか確認
3. E2Eテストで `tcportal://` プロトコルが発火することを検証

**確認スクリプト例**:
```sql
-- execution_mode が正しくないHelper型ツールを検索
SELECT id, name, tool_type, execution_mode
FROM tools
WHERE tool_type IN ('folder', 'folder_set', 'excel', 'bi', 'shortcut', 'exe', 'bat')
  AND execution_mode != 'helper';
```

**教訓**: Helper型ツールを追加・修正する際は必ず `execution_mode = 'helper'` を設定すること

### Sheet型ツールのカードクリック処理（2026-01）

**問題**: `sheet`（Google Sheets）タイプのツールをクリックすると、URLが新しいタブで開かず詳細ページに遷移してしまう

**原因**: ToolCard.tsx の `handleCardClick` で `url` タイプのみ新しいタブで開く処理をしていた

**修正**: `sheet` タイプも `url` と同様に扱う
```typescript
// URL/Sheet（Google Sheets）タイプは新しいタブで開く
if ((tool.tool_type === "url" || tool.tool_type === "sheet") && tool.target) {
  window.open(tool.target, "_blank", "noopener,noreferrer");
  return;
}
```

**教訓**: URLベースのツールタイプ（url, sheet）は新しいタブで開く処理を共通化する

### execution_mode の判定ロジック（2026-01）

**問題**: `ExecuteConfirmDialog` が `isHelperTool(tool)` （tool_type をチェック）を使っていたため、PAD/python_runner が誤って helper 経由で実行されていた

**原因**: `tool_type` ではなく `execution_mode` カラムを正として判定すべきだった

**修正**:
```typescript
// NG: tool_type で判定
const isHelper = isHelperTool(tool); // tool_type をチェック

// OK: execution_mode で判定
const isHelper = tool.execution_mode === "helper";
```

**execution_mode の対応表**:
| execution_mode | tool_type | 動作 |
|---------------|-----------|------|
| `open` | url, sheet | 新しいタブでURLを開く |
| `helper` | excel, bi, folder, folder_set, shortcut, bat, exe | tcportal:// でローカルHelper起動 |
| `queue` | pad, python_runner | Runs に積んで Runner で実行 |

**教訓**: 実行フローの判定は `execution_mode` を正とし、`tool_type` は表示ラベルや分類にのみ使用する

## E2Eテスト

### セットアップ

1. `.env.local` に認証情報を設定:
```env
E2E_EMAIL=your-test-user@example.com
E2E_PASSWORD=your-password
E2E_BASE_URL=http://localhost:3000
```

2. テスト実行:
```bash
npx playwright test tests/e2e/execution-mode.spec.ts
```

### テストファイル

| ファイル | テスト内容 |
|---------|-----------|
| `tests/e2e/global-setup.ts` | 認証状態のセットアップ |
| `tests/e2e/execution-mode.spec.ts` | execution_mode ごとの動作検証 |

### execution_mode E2Eテスト

- **Queue Mode (PAD/Python)**: ツールクリック → 確認ダイアログ →「実行する」ボタン → runs に待機中/実行中/成功/失敗のいずれかが表示される
- **Helper Mode (Excel/BAT/Folder等)**: ツールクリック → 確認ダイアログ →「起動する」ボタン → runs に成功が記録される
- **Open Mode (URL/Sheet)**: ツールクリック → 新しいタブが開く（runs は作成されない）
