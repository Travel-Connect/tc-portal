"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import type { ToolType, IconMode } from "@/types/database";

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
}

export async function createTool(data: ToolFormData) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "権限がありません" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tools")
    .insert({
      name: data.name,
      category_id: data.category_id,
      tool_type: data.tool_type,
      description: data.description || null,
      target: data.target || null,
      icon_mode: data.icon_mode,
      icon_key: data.icon_key || null,
      icon_path: data.icon_path || null,
      is_archived: data.is_archived || false,
    });

  if (error) {
    console.error("Error creating tool:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/tools");
  revalidatePath("/admin/tools");
  return { success: true };
}

export async function updateTool(id: string, data: Partial<ToolFormData>) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "権限がありません" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tools")
    .update({
      ...data,
      description: data.description || null,
      target: data.target || null,
      icon_key: data.icon_key || null,
      icon_path: data.icon_path || null,
    })
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
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "権限がありません" };
  }

  const supabase = await createClient();
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

export async function uploadToolIcon(toolId: string, file: File) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "権限がありません" };
  }

  const supabase = await createClient();

  // Generate unique filename
  const ext = file.name.split(".").pop();
  const filename = `${toolId}.${ext}`;
  const path = `icons/${filename}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("tool-icons")
    .upload(path, file, { upsert: true });

  if (uploadError) {
    console.error("Error uploading icon:", uploadError);
    return { success: false, error: uploadError.message };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("tool-icons")
    .getPublicUrl(path);

  // Update tool with icon path
  const { error: updateError } = await supabase
    .from("tools")
    .update({
      icon_mode: "upload",
      icon_path: publicUrl,
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
  return { success: true, iconPath: publicUrl };
}
