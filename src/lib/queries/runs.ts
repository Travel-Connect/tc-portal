import { createClient } from "@/lib/supabase/server";
import type { RunWithDetails } from "@/types/database";

/**
 * 実行履歴を取得する（最新順）
 * @param limit 取得件数（デフォルト50）
 * @returns 実行履歴
 */
export async function getRuns(limit: number = 50): Promise<RunWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("runs")
    .select(`
      *,
      tools (id, name, tool_type)
    `)
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching runs:", error);
    return [];
  }

  // profilesは別途取得が必要な場合があるため、ここでは省略
  // 必要に応じてprofiles情報を追加
  return (data || []).map(run => ({
    ...run,
    profiles: null, // profiles情報は後で追加可能
  })) as RunWithDetails[];
}

/**
 * 特定ツールの実行履歴を取得する
 * @param toolId ツールID
 * @param limit 取得件数（デフォルト20）
 * @returns 実行履歴
 */
export async function getRunsByToolId(toolId: string, limit: number = 20): Promise<RunWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("runs")
    .select(`
      *,
      tools (id, name, tool_type)
    `)
    .eq("tool_id", toolId)
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching runs for tool:", error);
    return [];
  }

  return (data || []).map(run => ({
    ...run,
    profiles: null,
  })) as RunWithDetails[];
}

/**
 * ツールの最終成功日時を取得する
 * @param toolId ツールID
 * @returns 最終成功日時（なければnull）
 */
export async function getToolLastSuccess(toolId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tool_last_success")
    .select("last_success_at")
    .eq("tool_id", toolId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.last_success_at;
}

/**
 * 複数ツールの最終成功日時をまとめて取得する
 * @param toolIds ツールIDの配列
 * @returns ツールID -> 最終成功日時のマップ
 */
export async function getToolsLastSuccess(toolIds: string[]): Promise<Map<string, string>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tool_last_success")
    .select("tool_id, last_success_at")
    .in("tool_id", toolIds);

  const map = new Map<string, string>();

  if (error || !data) {
    return map;
  }

  for (const row of data) {
    if (row.last_success_at) {
      map.set(row.tool_id, row.last_success_at);
    }
  }

  return map;
}
