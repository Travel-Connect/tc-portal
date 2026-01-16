import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

interface CallbackBody {
  run_id: string;
  run_token: string;
  status: "success" | "failed";
  summary?: string;
  error_message?: string;
  log_url?: string;
}

/**
 * POST /api/runs/callback
 * PAD等から実行結果を報告するためのコールバックエンドポイント
 *
 * Body:
 *   run_id: 実行ID
 *   run_token: 実行トークン（平文）
 *   status: "success" | "failed"
 *   summary?: 要約
 *   error_message?: エラーメッセージ
 *   log_url?: ログURL
 *
 * Response:
 *   200: 更新成功
 *   400: 不正なリクエスト
 *   401: 認証失敗（トークン不正）
 *   404: 実行が見つからない
 *   500: サーバーエラー
 */
export async function POST(request: NextRequest) {
  // リクエストボディをパース
  let body: CallbackBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { run_id, run_token, status, summary, error_message, log_url } = body;

  if (!run_id || !run_token || !status) {
    return NextResponse.json(
      { error: "run_id, run_token, and status are required" },
      { status: 400 }
    );
  }

  if (!["success", "failed"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'success' or 'failed'" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // run_tokenをハッシュ化して照合
  const tokenHash = createHash("sha256").update(run_token).digest("hex");

  // runの存在確認とトークン照合
  const { data: run, error: runError } = await supabase
    .from("runs")
    .select("id, status, run_token_hash")
    .eq("id", run_id)
    .single();

  if (runError || !run) {
    return NextResponse.json(
      { error: "Run not found" },
      { status: 404 }
    );
  }

  // トークンの照合
  if (run.run_token_hash !== tokenHash) {
    return NextResponse.json(
      { error: "Invalid run token" },
      { status: 401 }
    );
  }

  // 既に完了している場合はエラー
  if (run.status === "success" || run.status === "failed" || run.status === "canceled") {
    return NextResponse.json(
      { error: "Run is already completed" },
      { status: 400 }
    );
  }

  // 実行結果を更新
  const { error: updateError } = await supabase
    .from("runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      summary: summary || null,
      error_message: error_message || null,
      log_url: log_url || null,
    })
    .eq("id", run_id);

  if (updateError) {
    console.error("Error updating run:", updateError);
    return NextResponse.json(
      { error: "Failed to update run" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
