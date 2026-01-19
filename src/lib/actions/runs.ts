"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes, createHash } from "crypto";
import { HELPER_SUCCESS_MESSAGES } from "@/lib/helper";

/**
 * 実行依頼を作成する
 * @param toolId ツールID
 * @returns 作成結果
 */
export async function createRun(toolId: string): Promise<{
  success: boolean;
  runId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // ツールの存在確認
  const { data: tool, error: toolError } = await supabase
    .from("tools")
    .select("id, name, tool_type, execution_mode")
    .eq("id", toolId)
    .single();

  if (toolError || !tool) {
    return { success: false, error: "ツールが見つかりません" };
  }

  // execution_mode が queue でない場合は実行依頼を作成しない
  if (tool.execution_mode !== "queue") {
    return { success: false, error: `このツールはRunner経由の実行対象ではありません（execution_mode: ${tool.execution_mode}）` };
  }

  // run_token を生成（平文はDBに保存しない）
  const runToken = randomBytes(32).toString("hex");
  const runTokenHash = createHash("sha256").update(runToken).digest("hex");

  // runs に挿入
  console.log("[createRun] Creating run for tool:", toolId, "user:", user.id);

  const { data: run, error: insertError } = await supabase
    .from("runs")
    .insert({
      tool_id: toolId,
      requested_by: user.id,
      status: "queued",
      run_token_hash: runTokenHash,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[createRun] Insert error:", insertError);
    return { success: false, error: `実行依頼の作成に失敗しました: ${insertError.message}` };
  }

  if (!run || !run.id) {
    console.error("[createRun] No run ID returned after insert");
    return { success: false, error: "実行依頼の作成に失敗しました（IDなし）" };
  }

  console.log("[createRun] Success! Run ID:", run.id);

  revalidatePath("/runs");
  revalidatePath("/tools");
  revalidatePath("/");

  return { success: true, runId: run.id };
}

/**
 * Helper経由でのローカル起動を記録する（成功固定）
 * tcportal://スキームで起動した際に、runsにsuccess固定で記録を残す
 *
 * @param toolId ツールID
 * @returns 作成結果
 */
export async function createHelperRun(toolId: string): Promise<{
  success: boolean;
  runId?: string;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // ツールの存在確認
  const { data: tool, error: toolError } = await supabase
    .from("tools")
    .select("id, name, tool_type, execution_mode")
    .eq("id", toolId)
    .single();

  if (toolError || !tool) {
    return { success: false, error: "ツールが見つかりません" };
  }

  // execution_mode が helper でない場合は記録を作成しない
  if (tool.execution_mode !== "helper") {
    return { success: false, error: `このツールはHelper起動対象ではありません（execution_mode: ${tool.execution_mode}）` };
  }

  // run_token を生成（Helper起動でも一応生成）
  const runToken = randomBytes(32).toString("hex");
  const runTokenHash = createHash("sha256").update(runToken).digest("hex");

  // 成功メッセージを取得
  const summary = HELPER_SUCCESS_MESSAGES[tool.tool_type] || "起動しました";

  const now = new Date().toISOString();

  // runs に成功固定で挿入
  console.log("[createHelperRun] Creating helper run for tool:", toolId, "user:", user.id);

  const { data: run, error: insertError } = await supabase
    .from("runs")
    .insert({
      tool_id: toolId,
      requested_by: user.id,
      status: "success",
      started_at: now,
      finished_at: now,
      summary,
      run_token_hash: runTokenHash,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[createHelperRun] Insert error:", insertError);
    return { success: false, error: `記録の作成に失敗しました: ${insertError.message}` };
  }

  if (!run || !run.id) {
    console.error("[createHelperRun] No run ID returned after insert");
    return { success: false, error: "記録の作成に失敗しました（IDなし）" };
  }

  console.log("[createHelperRun] Success! Run ID:", run.id);

  revalidatePath("/runs");
  revalidatePath("/tools");
  revalidatePath("/");

  return { success: true, runId: run.id };
}

/**
 * 実行をキャンセルする（queued状態の場合のみ）
 * @param runId 実行ID
 * @returns キャンセル結果
 */
export async function cancelRun(runId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // 自分が作成したrunのみキャンセル可能
  const { data: run, error: fetchError } = await supabase
    .from("runs")
    .select("id, status, requested_by")
    .eq("id", runId)
    .single();

  if (fetchError || !run) {
    return { success: false, error: "実行履歴が見つかりません" };
  }

  if (run.requested_by !== user.id) {
    return { success: false, error: "権限がありません" };
  }

  if (run.status !== "queued") {
    return { success: false, error: "キャンセルできるのは待機中の実行のみです" };
  }

  const { error: updateError } = await supabase
    .from("runs")
    .update({ status: "canceled", finished_at: new Date().toISOString() })
    .eq("id", runId);

  if (updateError) {
    console.error("Error canceling run:", updateError);
    return { success: false, error: "キャンセルに失敗しました" };
  }

  revalidatePath("/runs");

  return { success: true };
}
