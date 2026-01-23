"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TaskMonitor, TaskMonitorRun, TaskKind } from "@/types/database";

/**
 * 有効な全タスクモニターを取得
 */
export async function getTaskMonitors(): Promise<TaskMonitor[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("task_monitors")
    .select("*")
    .eq("enabled", true)
    .order("last_finished_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("Error fetching task monitors:", error);
    return [];
  }

  return data || [];
}

/**
 * 失敗しているタスク（enabled=true かつ last_status='failed'）の件数を取得
 */
export async function getFailedTaskCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("task_monitors")
    .select("*", { count: "exact", head: true })
    .eq("enabled", true)
    .eq("last_status", "failed");

  if (error) {
    console.error("Error fetching failed task count:", error);
    return 0;
  }

  return count || 0;
}

/**
 * 特定のタスクモニターの実行履歴を取得
 */
export async function getTaskMonitorRuns(
  monitorId: string,
  limit: number = 10
): Promise<TaskMonitorRun[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("task_monitor_runs")
    .select("*")
    .eq("monitor_id", monitorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching task monitor runs:", error);
    return [];
  }

  return data || [];
}

/**
 * タスクモニターをIDで取得
 */
export async function getTaskMonitor(id: string): Promise<TaskMonitor | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("task_monitors")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching task monitor:", error);
    return null;
  }

  return data;
}

// ============================================================
// Admin用アクション（service_role でRLSバイパス）
// ============================================================

/**
 * 全タスクモニターを取得（enabled/disabled両方、管理画面用）
 */
export async function getAllTaskMonitorsAdmin(): Promise<TaskMonitor[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("task_monitors")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching all task monitors:", error);
    return [];
  }

  return data || [];
}

/**
 * タスクモニターを新規作成（COALESCE unique index 対応）
 */
export async function createTaskMonitor(input: {
  task_key: string;
  task_name: string;
  kind: TaskKind;
  machine_name: string | null;
  enabled: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  const supabase = createAdminClient();

  // 1. 既存チェック（COALESCE unique index 対応）
  let query = supabase
    .from("task_monitors")
    .select("id")
    .eq("task_key", input.task_key)
    .eq("kind", input.kind);

  if (input.machine_name) {
    query = query.eq("machine_name", input.machine_name);
  } else {
    query = query.is("machine_name", null);
  }

  const { data: existing, error: selectError } = await query.maybeSingle();

  if (selectError) {
    console.error("Error checking existing monitor:", selectError);
    return { success: false, error: "既存チェックに失敗しました" };
  }

  if (existing) {
    return { success: false, error: "同じキーの監視が既に存在します" };
  }

  // 2. INSERT
  const { data: created, error: insertError } = await supabase
    .from("task_monitors")
    .insert({
      task_key: input.task_key,
      task_name: input.task_name,
      kind: input.kind,
      machine_name: input.machine_name || null,
      enabled: input.enabled,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error creating task monitor:", insertError);
    return { success: false, error: "作成に失敗しました" };
  }

  return { success: true, id: created.id };
}

/**
 * タスクモニターを更新（task_name, enabled のみ変更可）
 */
export async function updateTaskMonitor(
  id: string,
  input: { task_name?: string; enabled?: boolean }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.task_name !== undefined) {
    updateData.task_name = input.task_name;
  }
  if (input.enabled !== undefined) {
    updateData.enabled = input.enabled;
  }

  const { error } = await supabase
    .from("task_monitors")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating task monitor:", error);
    return { success: false, error: "更新に失敗しました" };
  }

  return { success: true };
}
