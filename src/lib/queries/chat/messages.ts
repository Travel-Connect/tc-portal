import { createClient } from "@/lib/supabase/server";
import type { ChatMessageWithAuthor, ChatAttachment } from "@/types/database";

/**
 * スレッド内のメッセージ（返信）を取得
 * @param threadId スレッド（親メッセージ）ID
 * @param limit 取得件数
 * @param offset オフセット
 */
export async function getThreadMessages(
  threadId: string,
  limit = 100,
  offset = 0
): Promise<ChatMessageWithAuthor[]> {
  const supabase = await createClient();

  // 返信メッセージを取得
  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select(
      `
      *,
      profiles (id, email, display_name, role)
    `
    )
    .eq("parent_id", threadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching thread messages:", error);
    return [];
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // メッセージIDリスト
  const messageIds = messages.map((m) => m.id);

  // 添付ファイルを取得
  const { data: attachments } = await supabase
    .from("chat_attachments")
    .select("*")
    .in("message_id", messageIds);

  const attachmentMap = new Map<string, ChatAttachment[]>();
  attachments?.forEach((a) => {
    const existing = attachmentMap.get(a.message_id) || [];
    existing.push(a);
    attachmentMap.set(a.message_id, existing);
  });

  // メンションを取得
  const { data: mentions } = await supabase
    .from("chat_message_mentions")
    .select("*")
    .in("message_id", messageIds);

  const mentionMap = new Map<string, typeof mentions>();
  mentions?.forEach((m) => {
    const existing = mentionMap.get(m.message_id) || [];
    existing.push(m);
    mentionMap.set(m.message_id, existing);
  });

  return messages.map((message) => ({
    ...message,
    attachments: attachmentMap.get(message.id) || [],
    mentions: mentionMap.get(message.id) || [],
  }));
}

/**
 * メッセージIDでメッセージを取得
 */
export async function getMessageById(messageId: string): Promise<ChatMessageWithAuthor | null> {
  const supabase = await createClient();

  const { data: message, error } = await supabase
    .from("chat_messages")
    .select(
      `
      *,
      profiles (id, email, display_name, role)
    `
    )
    .eq("id", messageId)
    .single();

  if (error) {
    console.error("Error fetching message:", error);
    return null;
  }

  // 添付ファイルを取得
  const { data: attachments } = await supabase
    .from("chat_attachments")
    .select("*")
    .eq("message_id", messageId);

  // メンションを取得
  const { data: mentions } = await supabase
    .from("chat_message_mentions")
    .select("*")
    .eq("message_id", messageId);

  return {
    ...message,
    attachments: attachments || [],
    mentions: mentions || [],
  };
}

/**
 * ユーザーへのメンションを含むメッセージを取得
 */
export async function getMentionsForUser(limit = 50): Promise<ChatMessageWithAuthor[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  // メンションを取得
  const { data: mentions, error } = await supabase
    .from("chat_message_mentions")
    .select(
      `
      message_id,
      chat_messages (
        *,
        profiles (id, email, display_name, role)
      )
    `
    )
    .eq("mentioned_user_id", user.id)
    .order("message_id", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching mentions:", error);
    return [];
  }

  // chat_messages を展開
  return (
    mentions
      ?.filter((m) => m.chat_messages)
      .map((m) => m.chat_messages as unknown as ChatMessageWithAuthor) || []
  );
}
