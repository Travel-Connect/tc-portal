"use server";

import { createClient } from "@/lib/supabase/server";
import type { TaskMonitor, TaskMonitorRun } from "@/types/database";

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
