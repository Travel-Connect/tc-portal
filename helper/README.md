# TC Portal Windows Helper

TC Portalからローカルのファイル・フォルダ・アプリを起動するためのWindows Helperアプリ。

`tcportal://` URLスキームを使用してブラウザからローカルアプリを安全に起動します。

## セットアップ

### 1. ビルド

```powershell
cd helper
.\build.ps1
```

これにより `dist/tcportal-helper.exe` が生成されます。

### 2. URLスキーム登録

```powershell
.\install-protocol.ps1
```

HKCU (ユーザー権限) で `tcportal://` スキームを登録します。
管理者権限は不要です。

### 3. 動作確認

ブラウザで以下のURLを開いてテスト:

```
tcportal://open?payload=eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnMifQ==
```

`C:\Users` フォルダが開けば成功です。

## アンインストール

```powershell
.\uninstall-protocol.ps1
```

## 対応アクション

| action | 説明 | パラメータ |
|--------|------|----------|
| `open_file` | ファイルを関連付けアプリで開く | `path` |
| `open_folder` | フォルダをエクスプローラーで開く | `path` |
| `open_folders` | 複数フォルダを開く | `paths` (配列) |
| `run_exe` | EXEを新しいコンソールで実行 | `path` |
| `run_bat` | BATファイルを実行（自動終了） | `path` |
| `open_shortcut` | ショートカット(.lnk)を実行 | `path` |
| `open_url` | URLをブラウザで開く | `url` |

## payload形式

payloadはJSONをBase64URLエンコードしたものです。

### 例: フォルダを開く

```json
{
  "action": "open_folder",
  "path": "C:\\Users\\Documents"
}
```

Base64URL: `eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnNcXERvY3VtZW50cyJ9`

URL: `tcportal://open?payload=eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnNcXERvY3VtZW50cyJ9`

### 例: 複数フォルダを開く

```json
{
  "action": "open_folders",
  "paths": ["C:\\Users\\Documents", "C:\\Users\\Downloads"]
}
```

## 環境変数

パスには環境変数を使用できます:

- `%OneDrive%` → OneDriveフォルダ
- `%USERPROFILE%` → ユーザーフォルダ
- その他の `%VAR%` 形式

## トラブルシューティング

### URLスキームが動作しない

1. `install-protocol.ps1` を再実行
2. レジストリエディタで `HKCU\Software\Classes\tcportal` を確認
3. ブラウザを再起動

### ファイルが開かない

1. ファイルパスが正しいか確認
2. 環境変数が正しく展開されているか確認
3. ファイルの拡張子に関連付けられたアプリがあるか確認

### EXEが実行されない

1. EXEのパスが正しいか確認
2. EXEに実行権限があるか確認
3. セキュリティソフトがブロックしていないか確認
