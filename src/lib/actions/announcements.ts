"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AnnouncementStatus } from "@/types/database";

export interface AnnouncementFormData {
  title: string;
  body: string;
  status?: AnnouncementStatus;
}

/**
 * お知らせを非表示にする
 */
export async function dismissAnnouncement(announcementId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const { error } = await supabase
    .from("announcement_dismissals")
    .upsert(
      { announcement_id: announcementId, user_id: user.id },
      { onConflict: "announcement_id,user_id" }
    );

  if (error) {
    console.error("Error dismissing announcement:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/announcements");
  return { success: true };
}

/**
 * お知らせを作成する（admin用）
 */
export async function createAnnouncement(data: AnnouncementFormData): Promise<{
  success: boolean;
  id?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const status = data.status || "draft";

  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      title: data.title,
      body: data.body,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating announcement:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/announcements");
  revalidatePath("/admin/announcements");
  return { success: true, id: announcement.id };
}

/**
 * お知らせを更新する（admin用）
 */
export async function updateAnnouncement(
  id: string,
  data: AnnouncementFormData
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const { error } = await supabase
    .from("announcements")
    .update({
      title: data.title,
      body: data.body,
      status: data.status,
      published_at: data.status === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error updating announcement:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/announcements");
  revalidatePath("/admin/announcements");
  return { success: true };
}

/**
 * お知らせを公開する（admin用）
 */
export async function publishAnnouncement(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const { error } = await supabase
    .from("announcements")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error publishing announcement:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/announcements");
  revalidatePath("/admin/announcements");
  return { success: true };
}

/**
 * お知らせを下書きに戻す（admin用）
 */
export async function unpublishAnnouncement(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const { error } = await supabase
    .from("announcements")
    .update({
      status: "draft",
      published_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error unpublishing announcement:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/announcements");
  revalidatePath("/admin/announcements");
  return { success: true };
}

/**
 * お知らせを削除する（admin用）
 */
export async function deleteAnnouncement(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "認証が必要です" };
  }

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting announcement:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/announcements");
  revalidatePath("/admin/announcements");
  return { success: true };
}
