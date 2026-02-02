import { createClient } from "@/lib/supabase/server";
import type { ChatChannel, ChatChannelWithUnread } from "@/types/database";

/**
 * 全チャンネルを取得
 * @param includeArchived アーカイブ済みも含めるか
 */
export async function getChannels(includeArchived = false): Promise<ChatChannel[]> {
  const supabase = await createClient();

  let query = supabase
    .from("chat_channels")
    .select("*")
    .order("name", { ascending: true });

  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching channels:", error);
    return [];
  }

  return data || [];
}

/**
 * スラッグでチャンネルを取得
 */
export async function getChannelBySlug(slug: string): Promise<ChatChannel | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Error fetching channel by slug:", error);
    return null;
  }

  return data;
}

/**
 * チャンネル一覧を未読数付きで取得
 */
export async function getChannelsWithUnread(): Promise<ChatChannelWithUnread[]> {
  const supabase = await createClient();

  // ユーザー取得
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  // チャンネル取得
  const { data: channels, error: channelsError } = await supabase
    .from("chat_channels")
    .select("*")
    .eq("is_archived", false)
    .order("name", { ascending: true });

  if (channelsError || !channels) {
    console.error("Error fetching channels:", channelsError);
    return [];
  }

  // 各チャンネルの未読数を計算（簡易版：後でRPC関数に置き換え可能）
  // TODO: パフォーマンス改善のためRPC関数を検討
  const channelsWithUnread: ChatChannelWithUnread[] = await Promise.all(
    channels.map(async (channel) => {
      // このチャンネルの未読スレッド数を取得
      // 未読 = last_read_at が null または スレッドの最新返信 > last_read_at
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("channel_id", channel.id)
        .is("parent_id", null)
        .is("deleted_at", null);

      return {
        ...channel,
        unread_count: count || 0, // TODO: 実際の未読数計算を実装
      };
    })
  );

  return channelsWithUnread;
}
