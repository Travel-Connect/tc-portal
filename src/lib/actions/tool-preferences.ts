"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ToolUserPreference, ColorPreset } from "@/types/database";

/**
 * 現在ログイン中ユーザーの全ツール設定を取得
 */
export async function getUserToolPreferences(): Promise<{
  success: boolean;
  preferences?: Record<string, ToolUserPreference>;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const { data, error } = await supabase
    .from("tool_user_preferences")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("[getUserToolPreferences] Error:", error);
    return { success: false, error: "設定の取得に失敗しました" };
  }

  // tool_id をキーにしたマップに変換
  const preferencesMap: Record<string, ToolUserPreference> = {};
  for (const pref of data || []) {
    preferencesMap[pref.tool_id] = pref;
  }

  return { success: true, preferences: preferencesMap };
}

/**
 * 特定ツールの設定を取得
 */
export async function getToolPreference(toolId: string): Promise<{
  success: boolean;
  preference?: ToolUserPreference | null;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const { data, error } = await supabase
    .from("tool_user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .eq("tool_id", toolId)
    .maybeSingle();

  if (error) {
    console.error("[getToolPreference] Error:", error);
    return { success: false, error: "設定の取得に失敗しました" };
  }

  return { success: true, preference: data };
}

/**
 * ツールの色設定を保存（upsert）
 */
export async function setToolColor(
  toolId: string,
  colorHex: string | null,
  colorPreset: ColorPreset | null
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // 色がどちらもnullの場合は設定を削除
  if (colorHex === null && colorPreset === null) {
    const { error } = await supabase
      .from("tool_user_preferences")
      .delete()
      .eq("user_id", user.id)
      .eq("tool_id", toolId);

    if (error) {
      console.error("[setToolColor] Delete error:", error);
      return { success: false, error: "設定の削除に失敗しました" };
    }
  } else {
    // upsert
    const { error } = await supabase
      .from("tool_user_preferences")
      .upsert(
        {
          user_id: user.id,
          tool_id: toolId,
          color_hex: colorHex,
          color_preset: colorPreset,
        },
        {
          onConflict: "user_id,tool_id",
        }
      );

    if (error) {
      console.error("[setToolColor] Upsert error:", error);
      return { success: false, error: "設定の保存に失敗しました" };
    }
  }

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/tools");

  return { success: true };
}

/**
 * ツールの色設定をクリア
 */
export async function clearToolColor(toolId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  return setToolColor(toolId, null, null);
}
