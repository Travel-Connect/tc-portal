import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/types/database";

/**
 * 公開済みかつユーザーが非表示にしていないお知らせを取得
 * @param userId ユーザーID
 * @param limit 取得件数（デフォルト: 全件）
 */
export async function getUndismissedAnnouncements(
  userId: string,
  limit?: number
): Promise<Announcement[]> {
  const supabase = await createClient();

  // 1. ユーザーが非表示にしたお知らせIDを取得
  const { data: dismissals } = await supabase
    .from("announcement_dismissals")
    .select("announcement_id")
    .eq("user_id", userId);

  const dismissedIds = (dismissals || []).map((d) => d.announcement_id);

  // 2. 公開済みお知らせを取得（非表示IDを除外）
  let query = supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (dismissedIds.length > 0) {
    // not.in で除外
    query = query.not("id", "in", `(${dismissedIds.join(",")})`);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching undismissed announcements:", error);
    return [];
  }

  return data || [];
}

/**
 * 公開済みのお知らせ全件を取得（一覧ページ用）
 */
export async function getPublishedAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error fetching published announcements:", error);
    return [];
  }

  return data || [];
}

/**
 * ユーザーが非表示にしたお知らせIDの一覧を取得
 */
export async function getDismissedAnnouncementIds(
  userId: string
): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcement_dismissals")
    .select("announcement_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching dismissed announcements:", error);
    return [];
  }

  return (data || []).map((d) => d.announcement_id);
}

/**
 * 全お知らせを取得（管理画面用、draft含む）
 */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all announcements:", error);
    return [];
  }

  return data || [];
}
