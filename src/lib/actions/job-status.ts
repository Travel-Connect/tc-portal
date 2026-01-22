"use server";

import { createClient } from "@/lib/supabase/server";
import type { JobStatus, JobStatusWithTool } from "@/types/database";

/**
 * すべてのジョブステータスを取得（エラーを先頭、完了日時降順）
 */
export async function getJobStatuses(): Promise<JobStatusWithTool[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_status")
    .select(`
      *,
      tools (id, name)
    `)
    .order("last_status", { ascending: true }) // error が先（alphabetically）
    .order("last_finished_at", { ascending: false });

  if (error) {
    console.error("Error fetching job statuses:", error);
    return [];
  }

  return data as JobStatusWithTool[];
}

/**
 * エラー状態のジョブ数を取得（サイドバーのバッジ用）
 */
export async function getJobErrorCount(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("job_status")
    .select("*", { count: "exact", head: true })
    .eq("last_status", "error");

  if (error) {
    console.error("Error counting job errors:", error);
    return 0;
  }

  return count || 0;
}

/**
 * 特定のジョブステータスを取得
 */
export async function getJobStatus(jobKey: string): Promise<JobStatus | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_status")
    .select("*")
    .eq("job_key", jobKey)
    .single();

  if (error) {
    if (error.code !== "PGRST116") {
      // Not found is ok
      console.error("Error fetching job status:", error);
    }
    return null;
  }

  return data as JobStatus;
}
