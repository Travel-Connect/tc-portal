# Python ジョブ監視スニペット

既存のタスクスケジューラで実行されている Python スクリプトに追記して、
TC Portal に実行結果を報告するための最小スニペットです。

## セットアップ

### 1. 環境変数の設定

Windows のシステム環境変数、またはタスクスケジューラの「操作」で設定してください。

```
TC_PORTAL_MONITOR_URL=https://tc-portal.vercel.app/api/monitor/job-report
TC_PORTAL_WEBHOOK_SECRET=<シークレット値>
TC_PORTAL_JOB_KEY=daily-price-sync
TC_PORTAL_JOB_TITLE=価格同期処理
```

| 変数 | 説明 | 例 |
|------|------|-----|
| `TC_PORTAL_MONITOR_URL` | Webhook URL | `https://tc-portal.vercel.app/api/monitor/job-report` |
| `TC_PORTAL_WEBHOOK_SECRET` | 認証シークレット | Vercel環境変数と同じ値 |
| `TC_PORTAL_JOB_KEY` | ジョブの一意識別子 | `daily-price-sync` |
| `TC_PORTAL_JOB_TITLE` | UI表示名 | `価格同期処理` |

### 2. スクリプトに追記

以下のスニペットを既存スクリプトに追記してください。
**追加依存はゼロ**（標準ライブラリのみ使用）。

```python
# ============================================================
# TC Portal 監視通知 - スニペット
# ============================================================
import os
import json
import urllib.request
from datetime import datetime, timezone

def report_job_status(status: str, message: str | None = None) -> None:
    """
    TC Portal にジョブ結果を報告する

    Args:
        status: "success" または "error"
        message: オプションのメッセージ（エラー詳細など）
    """
    url = os.environ.get("TC_PORTAL_MONITOR_URL")
    secret = os.environ.get("TC_PORTAL_WEBHOOK_SECRET")
    job_key = os.environ.get("TC_PORTAL_JOB_KEY")
    job_title = os.environ.get("TC_PORTAL_JOB_TITLE")

    # 環境変数が設定されていない場合はスキップ（ローカル開発時など）
    if not all([url, secret, job_key, job_title]):
        print("[TC Portal] 環境変数が未設定のためスキップ")
        return

    payload = {
        "job_key": job_key,
        "title": job_title,
        "status": status,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "message": message,
    }

    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-TC-Portal-Webhook-Secret": secret,
    }

    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                print(f"[TC Portal] 報告成功: {status}")
            else:
                print(f"[TC Portal] 報告失敗: HTTP {resp.status}")
    except Exception as e:
        # 報告失敗してもジョブ自体は継続
        print(f"[TC Portal] 報告エラー: {e}")

# ============================================================
```

### 3. 既存スクリプトへの組み込み

```python
def main():
    try:
        # === 既存の処理 ===
        process_data()
        sync_database()
        # ...

        # 成功を報告
        report_job_status("success", "処理完了")

    except Exception as e:
        # エラーを報告
        report_job_status("error", str(e))
        raise  # 必要に応じて再スロー

if __name__ == "__main__":
    main()
```

## 動作確認

### curlでテスト

```bash
curl -X POST https://tc-portal.vercel.app/api/monitor/job-report \
  -H "Content-Type: application/json" \
  -H "X-TC-Portal-Webhook-Secret: YOUR_SECRET" \
  -d '{
    "job_key": "test-job",
    "title": "テストジョブ",
    "status": "success",
    "finished_at": "2024-01-25T10:00:00Z",
    "message": "テスト報告"
  }'
```

### PowerShellでテスト

```powershell
$body = @{
    job_key = "test-job"
    title = "テストジョブ"
    status = "error"
    finished_at = (Get-Date).ToUniversalTime().ToString("o")
    message = "テストエラー"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://tc-portal.vercel.app/api/monitor/job-report" `
  -Method POST `
  -Headers @{
    "Content-Type" = "application/json"
    "X-TC-Portal-Webhook-Secret" = "YOUR_SECRET"
  } `
  -Body $body
```

## レスポンス

| ステータス | 意味 |
|-----------|------|
| 200 | 成功 |
| 400 | リクエスト不正（必須フィールド欠け等） |
| 401 | 認証失敗（シークレット不一致） |
| 500 | サーバーエラー |

成功時のレスポンス例:
```json
{
  "success": true,
  "id": "uuid",
  "job_key": "daily-price-sync"
}
```

## ポータルでの確認

1. TC Portal にログイン
2. 左メニュー「障害」をクリック
3. 「Python監視」セクションにジョブ一覧が表示される
4. エラーがある場合、左メニューの「障害」に赤いバッジが表示される

## 注意事項

- 報告が失敗してもジョブ自体は継続します（報告はベストエフォート）
- `job_key` が同じ場合、最新の結果で上書きされます
- タイムアウトは10秒に設定されています
- 環境変数が未設定の場合、報告をスキップします（ローカル開発に便利）
