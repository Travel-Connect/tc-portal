import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash, randomBytes } from "crypto";

/**
 * POST /api/runner/claim
 * Runner がキューから実行待ちのタスクを取得するエンドポイント
 *
 * Headers:
 *   X-Machine-Key: マシンキー（必須）
 *
 * Response:
 *   200: タスクを取得成功
 *   204: キューにタスクがない
 *   401: 認証失敗
 *   403: マシンが無効
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

  // claim_run関数を呼び出してキューからタスクを取得
  const { data: claimed, error: claimError } = await supabase
    .rpc("claim_run", { p_machine_id: machine.id });

  if (claimError) {
    console.error("Error claiming run:", claimError);
    return NextResponse.json(
      { error: "Failed to claim run" },
      { status: 500 }
    );
  }

  // タスクがない場合
  if (!claimed || claimed.length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const task = claimed[0];

  // run_tokenを生成してDBに保存（コールバック用）
  const runToken = randomBytes(32).toString("hex");
  const runTokenHash = createHash("sha256").update(runToken).digest("hex");

  // run_token_hashを更新（claim_run関数では更新していないため）
  await supabase
    .from("runs")
    .update({ run_token_hash: runTokenHash })
    .eq("id", task.run_id);

  // ポータルのベースURL（環境変数から取得）
  const portalBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return NextResponse.json({
    run_id: task.run_id,
    run_token: runToken,
    tool: {
      id: task.tool_id,
      name: task.tool_name,
      tool_type: task.tool_type,
      target: task.tool_target,
      run_config: task.run_config,
    },
    payload: task.payload,
    callback_url: `${portalBaseUrl}/api/runs/callback`,
  });
}
