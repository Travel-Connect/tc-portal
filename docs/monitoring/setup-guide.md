# Python ジョブ監視機能 セットアップガイド

## 概要

タスクスケジューラで実行されるPythonスクリプトの実行結果をTC Portalに報告し、
障害ページで監視できるようにする機能。

## 構成

```
[Pythonスクリプト] ---(HTTP POST)---> [/api/monitor/job-report] ---> [job_status テーブル]
                                              ↓
                                    [/incidents ページで表示]
                                    [サイドバーにエラーバッジ]
```

---

## 1. データベース

### マイグレーション

ファイル: `supabase/migrations/20240125000001_add_job_status.sql`

```sql
CREATE TABLE public.job_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tool_id UUID NULL REFERENCES public.tools(id) ON DELETE SET NULL,
  last_status TEXT NOT NULL CHECK (last_status IN ('success', 'error')),
  last_finished_at TIMESTAMPTZ NOT NULL,
  last_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_status_last_status ON public.job_status(last_status);
CREATE INDEX idx_job_status_last_finished_at ON public.job_status(last_finished_at DESC);

ALTER TABLE public.job_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view job_status"
  ON public.job_status FOR SELECT
  TO authenticated
  USING (true);
```

### 適用方法

```bash
npx supabase db push
```

---

## 2. 型定義

ファイル: `src/types/database.ts`

```typescript
export type JobStatusValue = "success" | "error";

export interface JobStatus {
  id: string;
  job_key: string;
  title: string;
  tool_id: string | null;
  last_status: JobStatusValue;
  last_finished_at: string;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobStatusWithTool extends JobStatus {
  tools?: Tool | null;
}
```

---

## 3. API エンドポイント

ファイル: `src/app/api/monitor/job-report/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  // シークレットの検証
  const webhookSecret = process.env.TC_PORTAL_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("X-TC-Portal-Webhook-Secret");

  if (!webhookSecret) {
    console.error("TC_PORTAL_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  if (!providedSecret || providedSecret !== webhookSecret) {
    return NextResponse.json({ error: "Invalid or missing webhook secret" }, { status: 401 });
  }

  // リクエストボディをパース
  let body: {
    job_key?: string;
    title?: string;
    status?: string;
    finished_at?: string;
    tool_id?: string;
    message?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { job_key, title, status, finished_at, tool_id, message } = body;

  // バリデーション
  if (!job_key || typeof job_key !== "string") {
    return NextResponse.json({ error: "job_key is required" }, { status: 400 });
  }
  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (status !== "success" && status !== "error") {
    return NextResponse.json({ error: "status must be 'success' or 'error'" }, { status: 400 });
  }
  if (!finished_at) {
    return NextResponse.json({ error: "finished_at is required" }, { status: 400 });
  }

  const finishedDate = new Date(finished_at);
  if (isNaN(finishedDate.getTime())) {
    return NextResponse.json({ error: "finished_at must be valid ISO 8601" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("job_status")
    .upsert({
      job_key,
      title,
      last_status: status,
      last_finished_at: finishedDate.toISOString(),
      last_message: message || null,
      tool_id: tool_id || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "job_key" })
    .select("id, job_key")
    .single();

  if (error) {
    console.error("Error upserting job_status:", error);
    return NextResponse.json({ error: "Failed to update job status" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id, job_key: data.job_key });
}
```

---

## 4. Middleware 設定

ファイル: `src/lib/supabase/middleware.ts`

`/api/monitor/` を認証バイパスに追加：

```typescript
const isMonitorApi = request.nextUrl.pathname.startsWith("/api/monitor/");

// Allow Runner API, runs callback, and monitor API (uses custom authentication)
if (isRunnerApi || isRunsCallbackApi || isMonitorApi) {
  return supabaseResponse;
}
```

---

## 5. Server Actions

ファイル: `src/lib/actions/job-status.ts`

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import type { JobStatus, JobStatusWithTool } from "@/types/database";

export async function getJobStatuses(): Promise<JobStatusWithTool[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_status")
    .select("*, tools(id, name)")
    .order("last_finished_at", { ascending: false });

  if (error) {
    console.error("Error fetching job statuses:", error);
    return [];
  }
  return data || [];
}

export async function getJobErrorCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("job_status")
    .select("*", { count: "exact", head: true })
    .eq("last_status", "error");

  if (error) {
    console.error("Error fetching job error count:", error);
    return 0;
  }
  return count || 0;
}
```

---

## 6. UI コンポーネント

### レイアウト (`src/app/(main)/layout.tsx`)

```typescript
import { getJobErrorCount } from "@/lib/actions/job-status";

export default async function MainLayout({ children }) {
  const jobErrorCount = await getJobErrorCount();

  return (
    <AppShell jobErrorCount={jobErrorCount}>
      {children}
    </AppShell>
  );
}
```

### サイドバー (`src/components/layout/Sidebar.tsx`)

```typescript
interface SidebarProps {
  jobErrorCount?: number;
}

// navItems に badgeKey を追加
{ href: "/incidents", label: "障害", icon: <AlertTriangle />, badgeKey: "jobError" }

// バッジ表示
{badgeCount > 0 && (
  <span className="px-1.5 py-0.5 text-xs font-semibold bg-destructive text-destructive-foreground rounded-full">
    {badgeCount}
  </span>
)}
```

### 障害ページ (`src/app/(main)/incidents/page.tsx`)

```typescript
import { getJobStatuses } from "@/lib/actions/job-status";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

export default async function IncidentsPage() {
  const jobStatuses = await getJobStatuses();
  const errorJobs = jobStatuses.filter((job) => job.last_status === "error");
  const successJobs = jobStatuses.filter((job) => job.last_status === "success");

  return (
    <div>
      <h1>障害情報</h1>
      <section>
        <h2>Python監視</h2>
        {errorJobs.map((job) => <JobStatusCard key={job.id} job={job} />)}
        {successJobs.map((job) => <JobStatusCard key={job.id} job={job} />)}
      </section>
    </div>
  );
}
```

---

## 7. 環境変数

### Vercel に設定

```bash
# シークレット生成
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

# Vercel に追加
npx vercel env add TC_PORTAL_WEBHOOK_SECRET production
```

### Windows システム環境変数

タスクスケジューラで実行するPCに設定：

| 変数名 | 値 |
|--------|-----|
| `TC_PORTAL_MONITOR_URL` | `https://tc-portal.vercel.app/api/monitor/job-report` |
| `TC_PORTAL_WEBHOOK_SECRET` | `<Vercelと同じシークレット>` |
| `TC_PORTAL_JOB_KEY` | `<ジョブの識別子>` (例: `minpaku-in-report`) |
| `TC_PORTAL_JOB_TITLE` | `<表示名>` (例: `minpaku-IN レポート作成`) |

設定方法：
1. `Win + R` → `sysdm.cpl` → 詳細設定 → 環境変数
2. システム環境変数で「新規」をクリック
3. 上記の変数を追加

---

## 8. Pythonスクリプトへの組み込み

既存スクリプトに以下を追加（標準ライブラリのみ使用）：

```python
import os
import json
import urllib.request
from datetime import datetime, timezone

def report_job_status(status: str, message: str = None) -> None:
    """TC Portal にジョブ結果を報告する"""
    url = os.environ.get("TC_PORTAL_MONITOR_URL")
    secret = os.environ.get("TC_PORTAL_WEBHOOK_SECRET")
    job_key = os.environ.get("TC_PORTAL_JOB_KEY", "default-job")
    job_title = os.environ.get("TC_PORTAL_JOB_TITLE", "Default Job")

    if not url or not secret:
        print("[TC Portal] 環境変数未設定のためスキップ")
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
        print(f"[TC Portal] 報告エラー: {e}")


# メイン処理を try/except でラップ
if __name__ == "__main__":
    try:
        main()
        report_job_status("success", "処理完了")
    except Exception as e:
        report_job_status("error", str(e))
        raise
```

---

## 9. デプロイ

```bash
# Vercelにデプロイ
npx vercel --prod

# マイグレーション適用
npx supabase db push
```

---

## 10. 動作確認

### APIテスト（Node.js）

```javascript
const https = require('https');

const data = JSON.stringify({
  job_key: 'test-job',
  title: 'テストジョブ',
  status: 'success',
  finished_at: new Date().toISOString(),
  message: 'テスト報告'
});

const options = {
  hostname: 'tc-portal.vercel.app',
  path: '/api/monitor/job-report',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'X-TC-Portal-Webhook-Secret': '<シークレット>',
    'Content-Length': Buffer.byteLength(data, 'utf8')
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(res.statusCode, body));
});

req.write(data, 'utf8');
req.end();
```

**注意**: Git Bash の curl では日本語が文字化けするため、Node.js を使用すること。

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| 401 エラー | シークレット不一致 | Vercel環境変数を確認、再デプロイ |
| 405 エラー | Middleware がブロック | `isMonitorApi` の追加を確認 |
| 500 エラー | DB テーブルなし | マイグレーション適用 |
| 文字化け | エンコーディング問題 | Node.js で UTF-8 送信 |
| 環境変数が効かない | PC再起動が必要 | システム環境変数設定後に再起動 |
