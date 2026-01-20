# 別PCでのHelper/Runnerスモークテスト手順

TC PortalのHelper（tcportal://プロトコル）とRunner（queueベースの実行）が、別PCで正しく動作することを検証するための手順書です。

---

## A) 事前条件

### 必須環境
- **OS**: Windows 10/11
- **OneDrive**: 「OneDrive - トラベルコネクト」で同期済み
- **ブラウザ**: Chrome, Edge, または Firefox
- **Python**: 3.10以上（Runnerを使う場合）

### 必要なアカウント
- TC Portalにログインできるアカウント
- Supabaseの`machines`テーブルに登録されたマシンキー（Runnerを使う場合）

### 確認すべきパス
| 項目 | 想定パス |
|------|---------|
| OneDrive同期フォルダ | `C:\Users\<user>\OneDrive - トラベルコネクト` |
| Helper配置先 | OneDrive内の共有フォルダ or 各PC個別 |
| Runner配置先 | OneDrive内の共有フォルダ or 各PC個別 |

---

## B) Helper導入手順

### 1. Helper実行ファイルの配置

Helperは2つの方法で配置できます:

**方法A: OneDrive共有（推奨）**
```
OneDrive - トラベルコネクト\
  └─ tc-portal-helper\
       ├─ tcportal-helper.exe
       └─ config.json（あれば）
```

**方法B: 各PCにビルド**
```powershell
cd helper
.\build.ps1
# dist\tcportal-helper.exe が生成される
```

### 2. URLスキーム登録

```powershell
# helperフォルダで実行
.\install-protocol.ps1

# または、OneDrive共有の場合
& "C:\Users\<user>\OneDrive - トラベルコネクト\tc-portal-helper\install-protocol.ps1"
```

### 3. 登録確認

以下のコマンドで`tcportal://`プロトコルが登録されているか確認:

```powershell
# レジストリ確認
Get-ItemProperty -Path "HKCU:\Software\Classes\tcportal\shell\open\command" -ErrorAction SilentlyContinue

# 期待される出力例:
# (Default) : "C:\...\tcportal-helper.exe" "%1"
```

または、スモークスクリプトを実行:
```powershell
.\scripts\smoke\collect-env.ps1
```

### 4. 手動テスト

ブラウザで以下のURLを開く:
```
tcportal://open?payload=eyJhY3Rpb24iOiJvcGVuX2ZvbGRlciIsInBhdGgiOiJDOlxcVXNlcnMifQ==
```

**成功条件**: `C:\Users` フォルダがエクスプローラーで開く

---

## C) Runner導入手順

### 1. Python環境の準備

```powershell
cd runner
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. マシンキーの取得・登録

1. Supabaseの`machines`テーブルで新しいマシンを登録
2. マシンキーのハッシュを生成:
   ```python
   import hashlib
   key = "your-machine-key"
   print(hashlib.sha256(key.encode()).hexdigest())
   ```
3. ハッシュを`machines.key_hash`に保存

### 3. 設定ファイルの作成

```powershell
copy config.example.json config.json
```

`config.json`を編集:
```json
{
  "portal_url": "https://tc-portal.vercel.app",
  "machine_key": "your-machine-key",
  "poll_interval_sec": 5,
  "execution_timeout": 300,
  "python_exe": "C:\\Python312\\python.exe",
  "scripts_base_path": "C:\\Users\\<user>\\OneDrive - トラベルコネクト\\scripts",
  "pad_exe": "C:\\Program Files (x86)\\Power Automate Desktop\\PAD.Console.Host.exe"
}
```

### 4. Runnerの起動

```powershell
.venv\Scripts\activate
python agent.py
```

**起動成功の確認**:
- コンソールに「Polling for tasks...」などのログが表示される
- エラーがなければOK

---

## D) 実行確認の手順

### 検証シナリオ一覧

| # | タイプ | ツール例 | 期待動作 |
|---|--------|---------|---------|
| 1 | helper | folder | エクスプローラーが開く |
| 2 | helper | folder_set | 複数フォルダが開く |
| 3 | helper | bat | バッチが実行される |
| 4 | queue | python_runner | Runnerが取得→実行 |
| 5 | queue | pad | PADフローが起動 |

---

### シナリオ1: Helper - folder（フォルダを開く）

1. TC Portalにログイン
2. `folder`タイプのツールをクリック
3. 確認ダイアログで「実行」をクリック

**成功条件**:
- エクスプローラーが開く
- `/runs`ページに実行履歴が記録される（status: success）

**失敗時の確認**:
- ブラウザの「外部プロトコルの許可」ダイアログでブロックしていないか
- `tcportal://`プロトコルが登録されているか

---

### シナリオ2: Helper - folder_set（複数フォルダを開く）

1. TC Portalにログイン
2. `folder_set`タイプのツールをクリック
3. 確認ダイアログで「実行」をクリック

**成功条件**:
- 複数のエクスプローラーウィンドウが開く
- または、タブで複数フォルダが開く（Windows 11のみ）

---

### シナリオ3: Helper - bat（バッチ実行）

1. TC Portalにログイン
2. `bat`タイプのツールをクリック
3. 確認ダイアログで「実行」をクリック

**成功条件**:
- コマンドプロンプトが開き、バッチが実行される
- `/runs`ページに実行履歴が記録される

---

### シナリオ4: Queue - python_runner（Runner経由のPython実行）

**前提**: Runnerが起動していること

1. TC Portalにログイン
2. `python_runner`タイプのツールをクリック
3. 確認ダイアログで「実行」をクリック

**成功条件**:
- `/runs`ページでステータスが `queued` → `running` → `success/failed` に遷移
- `machine_id`が記録される
- `started_at`と`finished_at`が記録される

**Runner未起動の場合**:
- ステータスが`queued`のまま残る（これは正常動作）

---

### シナリオ5: Queue - pad（Power Automate Desktop）

**前提**:
- Runnerが起動していること
- PADがインストールされていること

1. TC Portalにログイン
2. `pad`タイプのツールをクリック
3. 確認ダイアログで「実行」をクリック

**成功条件**:
- PADフローが起動する
- `/runs`ページでステータスが更新される
- PADフローからのコールバックで`status`が`success/failed`になる

---

## E) 成功判定チェックリスト

### Helper系

| 項目 | 確認方法 | 期待値 |
|------|---------|-------|
| プロトコル登録 | レジストリ確認 | `HKCU:\Software\Classes\tcportal` が存在 |
| 実行ファイル | ファイル存在確認 | `tcportal-helper.exe` がある |
| runsレコード | `/runs`ページ | 実行履歴が表示される |
| ステータス | runsのstatus | `success` |

### Runner系

| 項目 | 確認方法 | 期待値 |
|------|---------|-------|
| Runner起動 | コンソールログ | エラーなく起動 |
| タスク取得 | コンソールログ | 「Claimed task: xxx」 |
| machine_id | runsレコード | 実行したマシンのIDが入る |
| started_at | runsレコード | 実行開始時刻が入る |
| finished_at | runsレコード | 実行終了時刻が入る |
| status | runsレコード | `success` または `failed` |

---

## F) トラブルシューティング

### Helper関連

#### tcportal:// が動作しない
1. レジストリを確認:
   ```powershell
   Get-ItemProperty -Path "HKCU:\Software\Classes\tcportal" -ErrorAction SilentlyContinue
   ```
2. `install-protocol.ps1`を再実行
3. ブラウザを再起動
4. ブラウザの「外部プロトコルを開く」設定を確認

#### OneDriveパスが解決できない
1. `%OneDrive%`環境変数を確認:
   ```powershell
   $env:OneDrive
   ```
2. 法人OneDriveの場合は別の環境変数名の可能性あり:
   ```powershell
   Get-ChildItem env: | Where-Object { $_.Value -like "*OneDrive*" }
   ```

#### ファイルが見つからない
1. パスに日本語や空白が含まれていないか確認
2. UNCパス（`\\server\share`）ではなくローカルパスを使用

---

### Runner関連

#### 401 Unauthorized
- `config.json`の`machine_key`が正しいか確認
- `machines`テーブルの`key_hash`がキーのSHA-256ハッシュと一致するか確認
- `machines.enabled`が`true`か確認

#### タスクが取得できない（queued のまま）
1. Runnerが起動しているか確認
2. マシンキーが正しいか確認
3. ネットワーク接続を確認

#### claim_run エラー
- Runnerのバージョンが古い可能性
- APIの`/api/runner/claim`エンドポイントを確認

#### RLSエラー
- Supabaseのポリシー設定を確認
- `service_role`キーが必要な操作でないか確認

#### Python/PADの実行が失敗
1. `config.json`のパス設定を確認:
   - `python_exe`: Pythonインストールパス
   - `scripts_base_path`: スクリプト配置先
   - `pad_exe`: PADインストールパス
2. 対象ファイルの存在を確認
3. 実行権限を確認

---

## G) ログの保存先

### スモークテストログ
```
logs/smoke-YYYYMMDD-HHMMSS.txt
```
`scripts/smoke/collect-env.ps1`を実行すると自動生成されます。

### Runnerログ
Runnerのコンソール出力。必要に応じてファイルにリダイレクト:
```powershell
python agent.py 2>&1 | Tee-Object -FilePath runner.log
```

### Helperログ
Helperは現在stdout出力のみ。OneDrive同期フォルダにログを出力する場合は、Helper起動時にリダイレクト:
```powershell
# レジストリのコマンドを変更する場合（上級者向け）
```

---

## H) 環境収集スクリプトの使用方法

```powershell
cd tc-portal
.\scripts\smoke\collect-env.ps1
```

これにより`logs/smoke-YYYYMMDD-HHMMSS.txt`に以下が記録されます:
- OS情報
- OneDrive検出結果
- tcportal://プロトコル登録状況
- Helper実行ファイルの存在確認
- Runner設定ファイルの存在確認
- ネットワーク疎通確認

失敗時はこのログファイルを共有してください。
