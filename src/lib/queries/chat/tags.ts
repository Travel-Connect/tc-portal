import { createClient } from "@/lib/supabase/server";
import type { ChatTag } from "@/types/database";

/**
 * 全タグを取得
 */
export async function getTags(): Promise<ChatTag[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_tags")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching tags:", error);
    return [];
  }

  return data || [];
}

/**
 * タグ名で検索（部分一致）
 */
export async function searchTags(query: string): Promise<ChatTag[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_tags")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Error searching tags:", error);
    return [];
  }

  return data || [];
}

/**
 * スレッドに付けられたタグを取得
 */
export async function getTagsByThreadId(threadId: string): Promise<ChatTag[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_thread_tags")
    .select(
      `
      chat_tags (*)
    `
    )
    .eq("thread_id", threadId);

  if (error) {
    console.error("Error fetching thread tags:", error);
    return [];
  }

  return data?.map((t) => t.chat_tags as unknown as ChatTag).filter(Boolean) || [];
}

/**
 * 特定タグが付いたスレッドIDリストを取得
 */
export async function getThreadIdsByTag(tagId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_thread_tags")
    .select("thread_id")
    .eq("tag_id", tagId);

  if (error) {
    console.error("Error fetching threads by tag:", error);
    return [];
  }

  return data?.map((t) => t.thread_id) || [];
}
