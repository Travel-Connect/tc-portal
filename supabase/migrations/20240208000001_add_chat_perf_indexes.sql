-- =====================================================
-- TC Portal Chat - パフォーマンス向上用インデックス
-- =====================================================

-- RPC の相関サブクエリ用 (get_threads_with_unread, get_channel_unread_counts)
-- WHERE parent_id = t.id AND deleted_at IS NULL の MAX(created_at) を高速化
CREATE INDEX IF NOT EXISTS idx_chat_messages_replies_active
  ON public.chat_messages (parent_id, created_at DESC)
  WHERE parent_id IS NOT NULL AND deleted_at IS NULL;

-- getMessagesReactions() の .in("message_id", ids) 高速化
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message_emoji
  ON public.chat_message_reactions (message_id, emoji);
