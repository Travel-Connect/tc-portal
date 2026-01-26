"use server";

import { createClient } from "@/lib/supabase/server";
import type { Machine } from "@/types/database";

/**
 * オンラインマシン一覧を取得する
 * オンライン判定: last_seen_at が指定時間（デフォルト2分）以内
 *
 * @param thresholdMinutes オンライン判定の閾値（分）
 * @returns マシン一覧
 */
export async function getOnlineMachines(
  thresholdMinutes: number = 2
): Promise<{
  success: boolean;
  machines?: Pick<Machine, "id" | "name" | "hostname" | "last_seen_at">[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user (認証チェック)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // オンライン判定の閾値時刻
  const threshold = new Date();
  threshold.setMinutes(threshold.getMinutes() - thresholdMinutes);
  const thresholdIso = threshold.toISOString();

  // enabled かつ last_seen_at が閾値以降のマシンを取得
  const { data: machines, error } = await supabase
    .from("machines")
    .select("id, name, hostname, last_seen_at")
    .eq("enabled", true)
    .gte("last_seen_at", thresholdIso)
    .order("name");

  if (error) {
    console.error("[getOnlineMachines] Error:", error);
    return { success: false, error: "マシン一覧の取得に失敗しました" };
  }

  return {
    success: true,
    machines: machines || [],
  };
}

/**
 * 有効なマシン一覧を取得する（オンライン状態付き）
 * enabled=true のマシンを全て返し、last_seen_at でオンライン判定可能
 *
 * @returns マシン一覧
 */
export async function getEnabledMachines(): Promise<{
  success: boolean;
  machines?: Pick<Machine, "id" | "name" | "hostname" | "last_seen_at">[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user (認証チェック)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // enabled なマシンを全て取得（オンライン/オフライン問わず）
  const { data: machines, error } = await supabase
    .from("machines")
    .select("id, name, hostname, last_seen_at")
    .eq("enabled", true)
    .order("name");

  if (error) {
    console.error("[getEnabledMachines] Error:", error);
    return { success: false, error: "マシン一覧の取得に失敗しました" };
  }

  return {
    success: true,
    machines: machines || [],
  };
}

/**
 * 全マシン一覧を取得する（管理用）
 *
 * @returns マシン一覧
 */
export async function getAllMachines(): Promise<{
  success: boolean;
  machines?: Pick<Machine, "id" | "name" | "hostname" | "enabled" | "last_seen_at">[];
  error?: string;
}> {
  const supabase = await createClient();

  // Get current user (認証チェック)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const { data: machines, error } = await supabase
    .from("machines")
    .select("id, name, hostname, enabled, last_seen_at")
    .order("name");

  if (error) {
    console.error("[getAllMachines] Error:", error);
    return { success: false, error: "マシン一覧の取得に失敗しました" };
  }

  return {
    success: true,
    machines: machines || [],
  };
}
