# TC Portal Windows Helper セットアップガイド

## 概要

TC Portal Windows Helperは、ポータルからローカルのファイル・フォルダ・アプリを起動するためのWindowsアプリケーションです。

`tcportal://` URLスキームを使用して、ブラウザからローカルアプリを安全に起動します。

## 対応するツールタイプ

| ツールタイプ | アクション |
|------------|----------|
| Excel | Excelファイルを開く |
| BI | Power BIファイル(.pbix)を開く |
| フォルダ | フォルダをエクスプローラーで開く |
| フォルダセット | 複数フォルダを開く |
| ショートカット | .lnkファイルを実行 |
| EXE | 実行ファイルを起動 |
| BAT | バッチファイルを実行 |

## インストール手順

### 1. Helperのビルド

```powershell
cd helper
.\build.ps1
```

ビルドが成功すると `helper/dist/tcportal-helper.exe` が生成されます。

### 2. URLスキームの登録

```powershell
.\install-protocol.ps1
```

このスクリプトはユーザー権限（HKCU）でURLスキームを登録するため、管理者権限は不要です。

### 3. 動作確認

ブラウザで以下のURLを開いてテスト:

```
tcportal://open?payload=eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnMifQ==
```

`C:\Users` フォルダが開けば成功です。

## アンインストール

```powershell
cd helper
.\uninstall-protocol.ps1
```

## ポータルからの使用方法

1. ポータルにログイン
2. Helper対象のツール（Excel/BI/フォルダなど）で実行ボタン（▶）をクリック
3. 確認ダイアログで「起動する」をクリック
4. Helperがローカルでアプリ/フォルダを開く

## 記録の仕組み

Helper起動は以下のように記録されます:

- **ステータス**: 常に `success` として記録
- **サマリー**: ツールタイプに応じた固定メッセージ
  - フォルダ: "フォルダを開きました"
  - Excel: "Excelを開きました"
  - など

実際にアプリが開いたかどうかは追跡しません（ローカル側の問題として扱う）。

## トラブルシューティング

### Helperが起動しない

1. URLスキームが登録されているか確認
   ```powershell
   Get-ItemProperty "HKCU:\Software\Classes\tcportal"
   ```

2. tcportal-helper.exe のパスが正しいか確認
   ```powershell
   Get-ItemProperty "HKCU:\Software\Classes\tcportal\shell\open\command"
   ```

3. install-protocol.ps1 を再実行

### ファイル/フォルダが開かない

1. ファイルパスが正しいか確認
2. 環境変数（%OneDrive%など）が正しく設定されているか確認
3. ファイルの関連付けが設定されているか確認

### ブラウザがURLスキームをブロックする

一部のブラウザは初回アクセス時に確認ダイアログを表示します。「常に開く」を選択してください。

## 技術詳細

### payloadフォーマット

```json
{
  "action": "open_folder",
  "path": "C:\\Users\\Documents"
}
```

または複数パスの場合:

```json
{
  "action": "open_folders",
  "paths": ["C:\\path1", "C:\\path2"]
}
```

payloadはJSONをBase64URLエンコードしてURLに含めます。

### URL形式

```
tcportal://open?payload=<base64url_encoded_json>
```

### 環境変数

パスには以下の環境変数が使用できます:

- `%OneDrive%` - OneDriveフォルダ
- `%USERPROFILE%` - ユーザーフォルダ
- `%APPDATA%` - アプリケーションデータフォルダ
- その他のWindows環境変数
