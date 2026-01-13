# /commit - コミット作成コマンド

以下の手順でコミットを作成してください：

## 1. 変更確認

```bash
git status
git diff --staged
git diff
```

## 2. 変更内容の要約

変更ファイルと内容を箇条書きで提示：
- 追加: `path/to/file` - 説明
- 変更: `path/to/file` - 説明
- 削除: `path/to/file` - 説明

## 3. コミットメッセージ案

```
<type>: <subject>

<body（任意）>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### type一覧
- `feat`: 新機能
- `fix`: バグ修正
- `chore`: 設定・ツール変更
- `refactor`: リファクタリング
- `docs`: ドキュメント
- `style`: フォーマット
- `test`: テスト

## 4. ユーザー確認後にコミット

```bash
git add -A
git commit -m "..."
```
