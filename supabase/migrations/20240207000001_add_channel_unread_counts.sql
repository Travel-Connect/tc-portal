-- =====================================================
-- TC Portal Chat - チャンネル別未読スレッド数取得用 RPC関数
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_channel_unread_counts(
  p_user_id UUID
)
RETURNS TABLE (
  channel_id UUID,
  unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.channel_id,
    COUNT(*)::BIGINT AS unread_count
  FROM chat_messages t
  LEFT JOIN chat_thread_reads ctr
    ON ctr.thread_id = t.id AND ctr.user_id = p_user_id
  WHERE t.parent_id IS NULL
    AND t.deleted_at IS NULL
    AND (
      ctr.last_read_at IS NULL
      OR COALESCE(
        GREATEST(
          t.created_at,
          (SELECT MAX(r.created_at) FROM chat_messages r WHERE r.parent_id = t.id AND r.deleted_at IS NULL)
        ),
        t.created_at
      ) > ctr.last_read_at
    )
  GROUP BY t.channel_id;
END;
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION public.get_channel_unread_counts TO authenticated;
