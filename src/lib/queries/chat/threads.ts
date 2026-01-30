import { createClient } from "@/lib/supabase/server";
import type { ChatThreadWithDetails, ChatTag } from "@/types/database";

/**
 * チャンネル内のスレッド一覧を取得
 * @param channelId チャンネルID
 * @param limit 取得件数
 * @param offset オフセット
 */
export async function getThreadsByChannel(
  channelId: string,
  limit = 50,
  offset = 0
): Promise<ChatThreadWithDetails[]> {
  const supabase = await createClient();

  // ユーザー取得（既読状態確認用）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // スレッド（親メッセージ）を取得
  const { data: threads, error } = await supabase
    .from("chat_messages")
    .select(
      `
      *,
      profiles (id, email, display_name, role)
    `
    )
    .eq("channel_id", channelId)
    .is("parent_id", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching threads:", error);
    return [];
  }

  if (!threads || threads.length === 0) {
    return [];
  }

  // 各スレッドの返信数と最終返信日時を取得
  const threadIds = threads.map((t) => t.id);

  // 返信数を取得
  const { data: replyCounts } = await supabase
    .from("chat_messages")
    .select("parent_id")
    .in("parent_id", threadIds)
    .is("deleted_at", null);

  // 返信数をカウント
  const replyCountMap = new Map<string, number>();
  replyCounts?.forEach((r) => {
    if (r.parent_id) {
      replyCountMap.set(r.parent_id, (replyCountMap.get(r.parent_id) || 0) + 1);
    }
  });

  // 最終返信日時を取得
  const { data: lastReplies } = await supabase
    .from("chat_messages")
    .select("parent_id, created_at")
    .in("parent_id", threadIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const lastReplyMap = new Map<string, string>();
  lastReplies?.forEach((r) => {
    if (r.parent_id && !lastReplyMap.has(r.parent_id)) {
      lastReplyMap.set(r.parent_id, r.created_at);
    }
  });

  // タグを取得
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

  // 既読状態を取得
  const readMap = new Map<string, boolean>();
  if (user) {
    const { data: reads } = await supabase
      .from("chat_thread_reads")
      .select("thread_id, last_read_at")
      .eq("user_id", user.id)
      .in("thread_id", threadIds);

    reads?.forEach((r) => {
      // 最終返信日時と比較して既読判定
      const lastReply = lastReplyMap.get(r.thread_id);
      const threadData = threads.find((t) => t.id === r.thread_id);
      const latestTime = lastReply || threadData?.created_at;

      if (latestTime) {
        readMap.set(r.thread_id, new Date(r.last_read_at) >= new Date(latestTime));
      } else {
        readMap.set(r.thread_id, true);
      }
    });
  }

  return threads.map((thread) => ({
    ...thread,
    reply_count: replyCountMap.get(thread.id) || 0,
    last_reply_at: lastReplyMap.get(thread.id) || null,
    tags: tagMap.get(thread.id) || [],
    is_read: readMap.get(thread.id) ?? false,
  }));
}

/**
 * スレッドIDでスレッドを取得
 */
export async function getThreadById(threadId: string): Promise<ChatThreadWithDetails | null> {
  const supabase = await createClient();

  const { data: thread, error } = await supabase
    .from("chat_messages")
    .select(
      `
      *,
      profiles (id, email, display_name, role)
    `
    )
    .eq("id", threadId)
    .is("parent_id", null)
    .single();

  if (error) {
    console.error("Error fetching thread:", error);
    return null;
  }

  // 返信数を取得
  const { count: replyCount } = await supabase
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", threadId)
    .is("deleted_at", null);

  // タグを取得
  const { data: threadTags } = await supabase
    .from("chat_thread_tags")
    .select(
      `
      chat_tags (*)
    `
    )
    .eq("thread_id", threadId);

  const tags = threadTags?.map((tt) => tt.chat_tags as unknown as ChatTag).filter(Boolean) || [];

  return {
    ...thread,
    reply_count: replyCount || 0,
    tags,
  };
}

/**
 * ユーザーの未読スレッド数を取得
 */
export async function getUnreadThreadCount(channelId?: string): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return 0;
  }

  // TODO: より効率的なクエリに改善
  // 現在は簡易版として、既読テーブルにないスレッドを未読とカウント
  let query = supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .is("parent_id", null)
    .is("deleted_at", null);

  if (channelId) {
    query = query.eq("channel_id", channelId);
  }

  const { count } = await query;

  return count || 0;
}
