import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/monitor/job-report
 * スケジュール実行されたPythonジョブの結果を報告するWebhook
 *
 * Headers:
 *   X-TC-Portal-Webhook-Secret: Webhook シークレット（必須）
 *
 * Body (JSON):
 *   job_key: string      - ジョブの一意識別子（例: "daily-price-sync"）
 *   title: string        - UI表示名
 *   status: "success" | "error"
 *   finished_at: string  - ISO 8601形式の完了日時
 *   tool_id?: string     - 関連ツールID（任意）
 *   message?: string     - メッセージやエラー詳細（任意）
 *
 * Response:
 *   200: 成功
 *   400: バリデーションエラー
 *   401: 認証失敗
 *   500: サーバーエラー
 */
export async function POST(request: NextRequest) {
  // シークレットの検証
  const webhookSecret = process.env.TC_PORTAL_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("X-TC-Portal-Webhook-Secret");

  if (!webhookSecret) {
    console.error("TC_PORTAL_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!providedSecret || providedSecret !== webhookSecret) {
    return NextResponse.json(
      { error: "Invalid or missing webhook secret" },
      { status: 401 }
    );
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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // 必須フィールドのバリデーション
  const { job_key, title, status, finished_at, tool_id, message } = body;

  if (!job_key || typeof job_key !== "string") {
    return NextResponse.json(
      { error: "job_key is required and must be a string" },
      { status: 400 }
    );
  }

  if (!title || typeof title !== "string") {
    return NextResponse.json(
      { error: "title is required and must be a string" },
      { status: 400 }
    );
  }

  if (status !== "success" && status !== "error") {
    return NextResponse.json(
      { error: "status must be 'success' or 'error'" },
      { status: 400 }
    );
  }

  if (!finished_at || typeof finished_at !== "string") {
    return NextResponse.json(
      { error: "finished_at is required and must be an ISO 8601 string" },
      { status: 400 }
    );
  }

  // finished_at の形式チェック
  const finishedDate = new Date(finished_at);
  if (isNaN(finishedDate.getTime())) {
    return NextResponse.json(
      { error: "finished_at must be a valid ISO 8601 date" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // job_key で upsert
  const { data, error } = await supabase
    .from("job_status")
    .upsert(
      {
        job_key,
        title,
        last_status: status,
        last_finished_at: finishedDate.toISOString(),
        last_message: message || null,
        tool_id: tool_id || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "job_key",
      }
    )
    .select("id, job_key")
    .single();

  if (error) {
    console.error("Error upserting job_status:", error);
    return NextResponse.json(
      { error: "Failed to update job status" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    id: data.id,
    job_key: data.job_key,
  });
}
