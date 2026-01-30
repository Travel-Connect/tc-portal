"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ChatThreadWithDetails, ChatMessageWithAuthor } from "@/types/database";

/**
 * 新規スレッド（親メッセージ）を作成
 */
export async function createThread(
  channelId: string,
  body: string
): Promise<{
  success: boolean;
  thread?: ChatThreadWithDetails;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      channel_id: channelId,
      parent_id: null,
      body,
      created_by: user.id,
    })
    .select(`
      *,
      profiles (id, email, display_name, role)
    `)
    .single();

  if (error) {
    console.error("Error creating thread:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/messages");
  return { success: true, thread: { ...data, reply_count: 0 } };
}

/**
 * スレッドに返信を作成
 */
export async function createReply(
  threadId: string,
  body: string
): Promise<{
  success: boolean;
  message?: ChatMessageWithAuthor;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // 親スレッドの存在確認とチャンネルID取得
  const { data: parentThread, error: parentError } = await supabase
    .from("chat_messages")
    .select("id, channel_id")
    .eq("id", threadId)
    .is("parent_id", null)
    .single();

  if (parentError || !parentThread) {
    return { success: false, error: "スレッドが見つかりません" };
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      channel_id: parentThread.channel_id,
      parent_id: threadId,
      body,
      created_by: user.id,
    })
    .select(`
      *,
      profiles (id, email, display_name, role)
    `)
    .single();

  if (error) {
    console.error("Error creating reply:", error);
    return { success: false, error: error.message };
  }

  return { success: true, message: data };
}

/**
 * スレッドを既読にする
 */
export async function markThreadAsRead(
  threadId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const { error } = await supabase.from("chat_thread_reads").upsert(
    {
      thread_id: threadId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    },
    {
      onConflict: "thread_id,user_id",
    }
  );

  if (error) {
    console.error("Error marking thread as read:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * メッセージを論理削除
 */
export async function deleteMessage(
  messageId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // 自分のメッセージか確認
  const { data: message, error: fetchError } = await supabase
    .from("chat_messages")
    .select("id, created_by")
    .eq("id", messageId)
    .single();

  if (fetchError || !message) {
    return { success: false, error: "メッセージが見つかりません" };
  }

  if (message.created_by !== user.id) {
    return { success: false, error: "自分のメッセージのみ削除できます" };
  }

  const { error } = await supabase
    .from("chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/messages");
  return { success: true };
}

/**
 * ユーザーの未読スレッド数を取得
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return 0;
  }

  // 全スレッド数を取得
  const { count: totalThreads } = await supabase
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .is("parent_id", null)
    .is("deleted_at", null);

  // 既読スレッド数を取得
  const { count: readThreads } = await supabase
    .from("chat_thread_reads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  return Math.max(0, (totalThreads || 0) - (readThreads || 0));
}
