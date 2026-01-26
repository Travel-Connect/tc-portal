import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHash } from "crypto";

/**
 * POST /api/runner/heartbeat
 * Runner がハートビートを送信するエンドポイント
 *
 * Headers:
 *   X-Machine-Key: マシンキー（必須）
 *
 * Body (JSON):
 *   hostname?: string  - RunnerのPC名（COMPUTERNAME）
 *   starting?: boolean - 起動直後のハートビート（古いコマンドを無視）
 *
 * Response:
 *   200: 成功（command フィールドにペンディングコマンドを含む場合あり）
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

  // リクエストボディを取得（オプション）
  let hostname: string | null = null;
  let starting = false;
  try {
    const body = await request.json();
    hostname = body.hostname || null;
    starting = body.starting === true;
  } catch {
    // ボディがない場合は無視
  }

  const supabase = createAdminClient();

  // マシンキーをハッシュ化して照合
  const keyHash = createHash("sha256").update(machineKey).digest("hex");

  const { data: machine, error: machineError } = await supabase
    .from("machines")
    .select("id, name, enabled, pending_command")
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

  // last_seen_at と hostname を更新
  const updateData: { last_seen_at: string; hostname?: string } = {
    last_seen_at: new Date().toISOString(),
  };

  // hostname が指定されていて、現在の値と異なる場合のみ更新
  if (hostname) {
    updateData.hostname = hostname;
  }

  const { error: updateError } = await supabase
    .from("machines")
    .update(updateData)
    .eq("id", machine.id);

  if (updateError) {
    console.error("Error updating machine:", updateError);
    return NextResponse.json(
      { error: "Failed to update machine status" },
      { status: 500 }
    );
  }

  // pending_command の処理
  let command: string | null = null;
  if (machine.pending_command) {
    // 起動直後のハートビートでは古いコマンドを無視（クリアのみ）
    if (!starting) {
      command = machine.pending_command;
    }
    // コマンドをクリア
    await supabase
      .from("machines")
      .update({ pending_command: null })
      .eq("id", machine.id);
  }

  return NextResponse.json({
    success: true,
    machine_id: machine.id,
    machine_name: machine.name,
    command,
  });
}
