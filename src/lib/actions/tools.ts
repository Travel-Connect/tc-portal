"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ToolType, IconMode, RunConfig, ExcelOpenMode } from "@/types/database";
import { getExecutionModeForToolType } from "@/types/database";

export interface ToolFormData {
  name: string;
  category_id: string;
  tool_type: ToolType;
  description?: string;
  target?: string;
  icon_mode: IconMode;
  icon_key?: string;
  icon_path?: string;
  is_archived?: boolean;
  run_config?: RunConfig | null;
  tags?: string[];
  // Excel専用
  excel_open_mode?: ExcelOpenMode;
  excel_folder_path?: string;
}

export async function createTool(data: ToolFormData) {
  const supabase = await createClient();

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }
  // tool_type から execution_mode を自動決定
  const execution_mode = getExecutionModeForToolType(data.tool_type);

  const { data: newTool, error } = await supabase
    .from("tools")
    .insert({
      name: data.name,
      category_id: data.category_id,
      tool_type: data.tool_type,
      execution_mode,
      description: data.description || null,
      target: data.target || null,
      icon_mode: data.icon_mode,
      icon_key: data.icon_key || null,
      icon_path: data.icon_path || null,
      is_archived: data.is_archived || false,
      run_config: data.run_config || null,
      tags: data.tags || [],
      // Excel専用フィールド
      excel_open_mode: data.excel_open_mode || "file",
      excel_folder_path: data.excel_folder_path || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating tool:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/tools");
  return { success: true, id: newTool.id };
}

export async function updateTool(id: string, data: Partial<ToolFormData>) {
  const supabase = await createClient();

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  // run_config が undefined の場合は更新しない
  const updateData: Record<string, unknown> = {
    ...data,
    description: data.description || null,
    target: data.target || null,
    icon_key: data.icon_key || null,
    icon_path: data.icon_path || null,
  };

  // tool_type が変更された場合、execution_mode も自動で矯正
  if (data.tool_type) {
    updateData.execution_mode = getExecutionModeForToolType(data.tool_type);
  }

  // run_config が明示的に渡された場合のみ更新
  if (data.run_config !== undefined) {
    updateData.run_config = data.run_config;
  }

  // tags が明示的に渡された場合のみ更新
  if (data.tags !== undefined) {
    updateData.tags = data.tags;
  }

  // Excel専用フィールド
  if (data.excel_open_mode !== undefined) {
    updateData.excel_open_mode = data.excel_open_mode;
  }
  if (data.excel_folder_path !== undefined) {
    updateData.excel_folder_path = data.excel_folder_path || null;
  }

  const { error } = await supabase
    .from("tools")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating tool:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/tools");
  revalidatePath(`/tools/${id}`);
  return { success: true };
}

export async function archiveTool(id: string, archived: boolean) {
  const supabase = await createClient();

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }
  const { error } = await supabase
    .from("tools")
    .update({ is_archived: archived })
    .eq("id", id);

  if (error) {
    console.error("Error archiving tool:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/tools");
  return { success: true };
}

// Allowed icon file types
const ALLOWED_ICON_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_ICON_SIZE = 2 * 1024 * 1024; // 2MB

export async function uploadToolIcon(toolId: string, file: File) {
  // Validate file type
  if (!ALLOWED_ICON_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "対応していないファイル形式です。PNG, JPEG, WebPのみ対応しています。",
    };
  }

  // Validate file size
  if (file.size > MAX_ICON_SIZE) {
    return {
      success: false,
      error: "ファイルサイズが大きすぎます。2MB以下にしてください。",
    };
  }

  const supabase = await createClient();

  // Get current user for authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  // Generate unique filename with timestamp to avoid cache issues
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const timestamp = Date.now();
  const filename = `${toolId}_${timestamp}.${ext}`;
  const storagePath = `icons/${filename}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("tool-icons")
    .upload(storagePath, file, { upsert: true });

  if (uploadError) {
    console.error("Error uploading icon:", uploadError);
    return { success: false, error: `アップロードエラー: ${uploadError.message}` };
  }

  // Update tool with icon path (store path, not full URL)
  const { error: updateError } = await supabase
    .from("tools")
    .update({
      icon_mode: "upload",
      icon_path: storagePath,
      icon_key: null,
    })
    .eq("id", toolId);

  if (updateError) {
    console.error("Error updating tool icon:", updateError);
    return { success: false, error: updateError.message };
  }

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/tools");
  revalidatePath(`/tools/${toolId}`);
  return { success: true, iconPath: storagePath };
}
