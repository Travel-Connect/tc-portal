import { createClient } from "@/lib/supabase/server";
import type { ChatThreadWithDetails, ChatTag } from "@/types/database";

export interface SearchOptions {
  query?: string;
  channelId?: string;
  tagIds?: string[];
  limit?: number;
  offset?: number;
}

/**
 * スレッドを検索（本文 + タグで絞り込み）
 * LIKE検索を使用（FTSは将来拡張）
 */
export async function searchThreads(options: SearchOptions): Promise<ChatThreadWithDetails[]> {
  const { query, channelId, tagIds, limit = 50, offset = 0 } = options;
  const supabase = await createClient();

  // タグで絞り込む場合、対象スレッドIDを先に取得
  let threadIdsFromTags: string[] | null = null;
  if (tagIds && tagIds.length > 0) {
    const { data: taggedThreads } = await supabase
      .from("chat_thread_tags")
      .select("thread_id")
      .in("tag_id", tagIds);

    if (taggedThreads && taggedThreads.length > 0) {
      threadIdsFromTags = [...new Set(taggedThreads.map((t) => t.thread_id))];
    } else {
      // タグ指定があるが該当なし → 空配列を返す
      return [];
    }
  }

  // クエリ構築
  let dbQuery = supabase
    .from("chat_messages")
    .select(
      `
      *,
      profiles (id, email, display_name, role)
    `
    )
    .is("parent_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // チャンネルで絞り込み
  if (channelId) {
    dbQuery = dbQuery.eq("channel_id", channelId);
  }

  // タグで絞り込み
  if (threadIdsFromTags) {
    dbQuery = dbQuery.in("id", threadIdsFromTags);
  }

  // 本文検索（ILIKE）
  if (query && query.trim()) {
    dbQuery = dbQuery.ilike("body", `%${query.trim()}%`);
  }

  const { data: threads, error } = await dbQuery;

  if (error) {
    console.error("Error searching threads:", error);
    return [];
  }

  if (!threads || threads.length === 0) {
    return [];
  }

  // スレッドの追加情報を取得
  const threadIds = threads.map((t) => t.id);

  // 返信数
  const { data: replyCounts } = await supabase
    .from("chat_messages")
    .select("parent_id")
    .in("parent_id", threadIds)
    .is("deleted_at", null);

  const replyCountMap = new Map<string, number>();
  replyCounts?.forEach((r) => {
    if (r.parent_id) {
      replyCountMap.set(r.parent_id, (replyCountMap.get(r.parent_id) || 0) + 1);
    }
  });

  // タグ
  const { data: threadTags } = await supabase
    .from("chat_thread_tags")
    .select(
      `
      thread_id,
      chat_tags (*)
    `
    )
    .in("thread_id", threadIds);

  const tagMap = new Map<string, ChatTag[]>();
  threadTags?.forEach((tt) => {
    const existing = tagMap.get(tt.thread_id) || [];
    if (tt.chat_tags) {
      existing.push(tt.chat_tags as unknown as ChatTag);
    }
    tagMap.set(tt.thread_id, existing);
  });

  return threads.map((thread) => ({
    ...thread,
    reply_count: replyCountMap.get(thread.id) || 0,
    tags: tagMap.get(thread.id) || [],
  }));
}

/**
 * メンション候補のユーザーを検索
 * display_name または email で部分一致検索
 */
export async function searchMentionCandidates(
  query: string,
  limit = 10
): Promise<{ id: string; display_name: string | null; email: string }[]> {
  const supabase = await createClient();

  if (!query.trim()) {
    return [];
  }

  const searchTerm = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .or(`display_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
    .limit(limit);

  if (error) {
    console.error("Error searching mention candidates:", error);
    return [];
  }

  return data || [];
}
