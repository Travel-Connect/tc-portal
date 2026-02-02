"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  ChatThreadWithDetails,
  ChatMessageWithAuthor,
  ChatTag,
  ChatSearchResult,
} from "@/types/database";

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
 * メッセージを編集
 */
export async function updateMessage(
  messageId: string,
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

  const trimmedBody = body.trim();
  if (!trimmedBody) {
    return { success: false, error: "メッセージを入力してください" };
  }

  // 自分の削除されていないメッセージか確認
  const { data: message, error: fetchError } = await supabase
    .from("chat_messages")
    .select("id, created_by, deleted_at")
    .eq("id", messageId)
    .single();

  if (fetchError || !message) {
    return { success: false, error: "メッセージが見つかりません" };
  }

  if (message.created_by !== user.id) {
    return { success: false, error: "自分のメッセージのみ編集できます" };
  }

  if (message.deleted_at) {
    return { success: false, error: "削除されたメッセージは編集できません" };
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .update({ body: trimmedBody })
    .eq("id", messageId)
    .select(`
      *,
      profiles (id, email, display_name, role)
    `)
    .single();

  if (error) {
    console.error("Error updating message:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/messages");
  return { success: true, message: data };
}

// ========== タグ操作 ==========

/**
 * 新規タグを作成
 */
export async function createTag(
  name: string
): Promise<{
  success: boolean;
  tag?: ChatTag;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: "タグ名を入力してください" };
  }

  // 既存タグの確認
  const { data: existing } = await supabase
    .from("chat_tags")
    .select("*")
    .ilike("name", trimmedName)
    .single();

  if (existing) {
    return { success: true, tag: existing };
  }

  const { data, error } = await supabase
    .from("chat_tags")
    .insert({ name: trimmedName })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating tag:", error);
    return { success: false, error: error.message };
  }

  return { success: true, tag: data };
}

/**
 * スレッドにタグを付与
 */
export async function addTagToThread(
  threadId: string,
  tagId: string
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

  const { error } = await supabase
    .from("chat_thread_tags")
    .upsert(
      { thread_id: threadId, tag_id: tagId },
      { onConflict: "thread_id,tag_id" }
    );

  if (error) {
    console.error("Error adding tag to thread:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/messages");
  return { success: true };
}

/**
 * スレッドからタグを削除
 */
export async function removeTagFromThread(
  threadId: string,
  tagId: string
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

  const { error } = await supabase
    .from("chat_thread_tags")
    .delete()
    .eq("thread_id", threadId)
    .eq("tag_id", tagId);

  if (error) {
    console.error("Error removing tag from thread:", error);
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

// ========== 添付ファイル操作 ==========

import {
  MAX_FILE_SIZE,
  MAX_ATTACHMENTS,
  ALLOWED_EXTENSIONS,
  CHAT_ATTACHMENTS_BUCKET,
  getFileExtension,
  formatFileSize,
} from "@/lib/config/attachments";
import type { ChatAttachment, ChatChannel } from "@/types/database";

/**
 * 添付ファイルをアップロード
 * メッセージ作成後に呼び出す
 */
export async function uploadAttachment(
  messageId: string,
  channelId: string,
  threadId: string,
  file: File
): Promise<{
  success: boolean;
  attachment?: ChatAttachment;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `ファイルサイズが大きすぎます（最大${formatFileSize(MAX_FILE_SIZE)}）`,
    };
  }

  // 拡張子チェック
  const ext = getFileExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as typeof ALLOWED_EXTENSIONS[number])) {
    return {
      success: false,
      error: `許可されていないファイル形式です（許可: ${ALLOWED_EXTENSIONS.join(", ")}）`,
    };
  }

  // 既存添付数チェック
  const { count: existingCount } = await supabase
    .from("chat_attachments")
    .select("*", { count: "exact", head: true })
    .eq("message_id", messageId);

  if ((existingCount || 0) >= MAX_ATTACHMENTS) {
    return {
      success: false,
      error: `添付ファイルは最大${MAX_ATTACHMENTS}件までです`,
    };
  }

  // ファイルパスを生成（一意のUUIDを付与）
  const uuid = crypto.randomUUID();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `chat/${channelId}/${threadId}/${messageId}/${uuid}_${sanitizedFileName}`;

  // Storageにアップロード
  const { error: uploadError } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading file:", uploadError);
    return { success: false, error: uploadError.message };
  }

  // メタ情報をDBに保存
  const { data, error: insertError } = await supabase
    .from("chat_attachments")
    .insert({
      message_id: messageId,
      bucket_id: CHAT_ATTACHMENTS_BUCKET,
      object_path: objectPath,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (insertError) {
    console.error("Error inserting attachment record:", insertError);
    // Storageからも削除を試みる
    await supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).remove([objectPath]);
    return { success: false, error: insertError.message };
  }

  return { success: true, attachment: data };
}

/**
 * メッセージの添付ファイル一覧を取得
 */
export async function getAttachments(
  messageId: string
): Promise<ChatAttachment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_attachments")
    .select("*")
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching attachments:", error);
    return [];
  }

  return data || [];
}

// ========== チャンネル管理（admin専用） ==========

/**
 * 全チャンネルを取得（アーカイブ含む）
 */
export async function getAllChannels(): Promise<ChatChannel[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_channels")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching channels:", error);
    return [];
  }

  return data || [];
}

/**
 * チャンネルを作成（admin専用）
 */
export async function createChannel(
  slug: string,
  name: string,
  description?: string
): Promise<{
  success: boolean;
  channel?: ChatChannel;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // admin チェック
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "管理者のみチャンネルを作成できます" };
  }

  const trimmedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const trimmedName = name.trim();

  if (!trimmedSlug || !trimmedName) {
    return { success: false, error: "スラッグと名前は必須です" };
  }

  const { data, error } = await supabase
    .from("chat_channels")
    .insert({
      slug: trimmedSlug,
      name: trimmedName,
      description: description?.trim() || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating channel:", error);
    if (error.code === "23505") {
      return { success: false, error: "このスラッグは既に使用されています" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/channels");
  revalidatePath("/messages");
  return { success: true, channel: data };
}

/**
 * チャンネルを更新（admin専用）
 */
export async function updateChannel(
  channelId: string,
  updates: {
    name?: string;
    description?: string;
    is_archived?: boolean;
  }
): Promise<{
  success: boolean;
  channel?: ChatChannel;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "ログインが必要です" };
  }

  // admin チェック
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, error: "管理者のみチャンネルを編集できます" };
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) {
    updateData.name = updates.name.trim();
  }
  if (updates.description !== undefined) {
    updateData.description = updates.description.trim() || null;
  }
  if (updates.is_archived !== undefined) {
    updateData.is_archived = updates.is_archived;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "更新する項目がありません" };
  }

  const { data, error } = await supabase
    .from("chat_channels")
    .update(updateData)
    .eq("id", channelId)
    .select("*")
    .single();

  if (error) {
    console.error("Error updating channel:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/channels");
  revalidatePath("/messages");
  return { success: true, channel: data };
}
