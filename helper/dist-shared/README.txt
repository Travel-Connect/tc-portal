TC Portal Helper - 共有フォルダ配布版
======================================

【配置場所】
  OneDrive - トラベルコネクト\014.ポータルサイト\tcportal-helper.exe

【セットアップ手順（各PC）】

1. このフォルダ内の install.ps1 を右クリック
2. 「PowerShell で実行」を選択
3. 完了メッセージを確認

※ 管理者権限は不要です（ユーザー権限で登録されます）

【動作確認】

ブラウザで以下のURLを開いてテスト:
  tcportal://open?payload=eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnMifQ==

C:\Users フォルダが開けば成功です。

【アンインストール】

PowerShellで以下を実行:
  Remove-Item -Path "HKCU:\Software\Classes\tcportal" -Recurse -Force

【トラブルシューティング】

Q: 「OneDriveが見つかりません」と表示される
A: OneDriveアプリでサインインし、同期が完了していることを確認してください

Q: ツール実行時に「パスが見つかりません」と表示される
A: tcportal-helper.log を確認してください（EXEと同じフォルダに出力されます）

【管理者向け情報】

- Helper EXE のビルド: helper\build.ps1 を実行
- ソースコード: helper\app\main.py
- OneDriveパス解決機能搭載（異なるPCのOneDriveパスを自動変換）
