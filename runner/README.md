# TC Portal Windows Runner Agent

Windowsマシンで常駐し、ポータルからの実行依頼をポーリングして実行するエージェント。

## セットアップ

### 1. Python環境の準備

```powershell
cd runner
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 設定ファイルの作成

```powershell
copy config.example.json config.json
```

`config.json` を編集:

| 設定項目 | 説明 |
|---------|------|
| `portal_url` | ポータルのURL (例: `https://tc-portal.vercel.app`) |
| `machine_key` | マシンキー (Supabaseの`machines`テーブルで生成) |
| `poll_interval_sec` | ポーリング間隔（秒） |
| `execution_timeout` | 実行タイムアウト（秒） |
| `python_exe` | Python実行ファイルパス |
| `scripts_base_path` | スクリプトのベースパス |
| `pad_exe` | Power Automate Desktop実行ファイルパス |

### 3. マシンの登録

Supabase Studio または SQL で `machines` テーブルにマシンを登録:

```sql
-- マシンキーのハッシュを生成（SHA-256）
-- 例: "my-secret-key" → hashを計算してkey_hashに保存

INSERT INTO machines (name, key_hash, enabled)
VALUES (
  'runner-pc-01',
  'ハッシュ値をここに',
  true
);
```

**ハッシュの生成方法** (Python):
```python
import hashlib
key = "your-machine-key"
hash = hashlib.sha256(key.encode()).hexdigest()
print(hash)
```

### 4. 起動

```powershell
.venv\Scripts\activate
python agent.py
```

## 動作フロー

1. `poll_interval_sec` 間隔で `/api/runner/claim` をポーリング
2. キューにタスクがあれば取得（`status: queued` → `running` に更新）
3. `tool_type` に応じて実行:
   - `python_runner`: Pythonスクリプトを実行
   - `pad`: Power Automate Desktop フローを起動
   - `exe`: 実行ファイルを起動
4. `/api/runner/report` で結果を報告

## PADフローからのコールバック

PADフローは実行完了時に `/api/runs/callback` を呼び出して結果を報告:

```
POST /api/runs/callback
Content-Type: application/json

{
  "run_id": "{{run_id}}",
  "run_token": "{{run_token}}",
  "status": "success",
  "summary": "処理完了"
}
```

PADフロー内で `run_id` と `run_token` を受け取り、HTTP要求アクションでコールバックを送信。

## Windowsサービス化（オプション）

NSSM (Non-Sucking Service Manager) を使用:

```powershell
# NSSMをインストール
choco install nssm

# サービスとして登録
nssm install TCPortalRunner "C:\path\to\runner\.venv\Scripts\python.exe" "C:\path\to\runner\agent.py"
nssm set TCPortalRunner AppDirectory "C:\path\to\runner"
nssm start TCPortalRunner
```

## トラブルシューティング

### タスクが取得できない
- `machines.enabled` が `true` か確認
- `machine_key` と `key_hash` が一致しているか確認
- ポータルURLが正しいか確認

### 実行が失敗する
- `scripts_base_path` が正しいか確認
- Python実行ファイルのパスが正しいか確認
- スクリプトに実行権限があるか確認
