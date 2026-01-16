import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

interface ReportBody {
  run_id: string;
  status: "success" | "failed";
  summary?: string;
  error_message?: string;
  log_path?: string;
  log_url?: string;
}

/**
 * POST /api/runner/report
 * Runner が実行結果を報告するエンドポイント
 *
 * Headers:
 *   X-Machine-Key: マシンキー（必須）
 *
 * Body:
 *   run_id: 実行ID
 *   status: "success" | "failed"
 *   summary?: 要約
 *   error_message?: エラーメッセージ
 *   log_path?: ログファイルパス
 *   log_url?: ログURL
 *
 * Response:
 *   200: 更新成功
 *   400: 不正なリクエスト
 *   401: 認証失敗
 *   403: マシンが無効または権限なし
 *   500: サーバーエラー
 */
export async function POST(request: NextRequest) {
  const machineKey = request.headers.get("X-Machine-Key");

  if (!machineKey) {
    return NextResponse.json(
      { error: "X-Machine-Key header is required" },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  // マシンキーをハッシュ化して照合
  const keyHash = createHash("sha256").update(machineKey).digest("hex");

  const { data: machine, error: machineError } = await supabase
    .from("machines")
    .select("id, name, enabled")
    .eq("key_hash", keyHash)
    .single();

  if (machineError || !machine) {
    return NextResponse.json(
      { error: "Invalid machine key" },
      { status: 401 }
    );
  }

  if (!machine.enabled) {
    return NextResponse.json(
      { error: "Machine is disabled" },
      { status: 403 }
    );
  }

  // リクエストボディをパース
  let body: ReportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { run_id, status, summary, error_message, log_path, log_url } = body;

  if (!run_id || !status) {
    return NextResponse.json(
      { error: "run_id and status are required" },
      { status: 400 }
    );
  }

  if (!["success", "failed"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'success' or 'failed'" },
      { status: 400 }
    );
  }

  // runの存在確認とマシンIDの照合
  const { data: run, error: runError } = await supabase
    .from("runs")
    .select("id, machine_id, status")
    .eq("id", run_id)
    .single();

  if (runError || !run) {
    return NextResponse.json(
      { error: "Run not found" },
      { status: 404 }
    );
  }

  // このマシンが実行したrunかどうか確認
  if (run.machine_id !== machine.id) {
    return NextResponse.json(
      { error: "This run was not claimed by this machine" },
      { status: 403 }
    );
  }

  // runningのみ更新可能
  if (run.status !== "running") {
    return NextResponse.json(
      { error: "Only running status can be updated" },
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
      log_path: log_path || null,
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
