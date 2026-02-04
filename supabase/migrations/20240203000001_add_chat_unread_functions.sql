-- =====================================================
-- TC Portal Chat - 未読スレッド取得用 RPC関数
-- =====================================================

-- =====================================================
-- 1. get_threads_with_unread: チャンネル内のスレッド一覧（未読情報付き）
-- =====================================================
-- 返値: thread情報 + last_activity_at + unread_count + is_unread
CREATE OR REPLACE FUNCTION public.get_threads_with_unread(
  p_channel_id UUID,
  p_user_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  channel_id UUID,
  parent_id UUID,
  body TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  author_id UUID,
  author_email TEXT,
  author_display_name TEXT,
  author_role TEXT,
  reply_count BIGINT,
  last_activity_at TIMESTAMPTZ,
  unread_count BIGINT,
  is_unread BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH thread_stats AS (
    -- 各スレッドの最終アクティビティ時刻と返信数を計算
    SELECT
      t.id AS thread_id,
      COALESCE(
        GREATEST(
          t.created_at,
          (SELECT MAX(r.created_at) FROM chat_messages r WHERE r.parent_id = t.id AND r.deleted_at IS NULL)
        ),
        t.created_at
      ) AS last_activity,
      COALESCE(
        (SELECT COUNT(*) FROM chat_messages r WHERE r.parent_id = t.id AND r.deleted_at IS NULL),
        0
      ) AS replies
    FROM chat_messages t
    WHERE t.channel_id = p_channel_id
      AND t.parent_id IS NULL
      AND t.deleted_at IS NULL
  ),
  user_reads AS (
    -- ユーザーの既読時刻を取得
    SELECT thread_id, last_read_at
    FROM chat_thread_reads
    WHERE user_id = p_user_id
  ),
  unread_info AS (
    -- 未読情報を計算
    SELECT
      ts.thread_id,
      ts.last_activity,
      ts.replies,
      -- 未読判定: last_read_at が存在しない OR last_activity > last_read_at
      CASE
        WHEN ur.last_read_at IS NULL THEN TRUE
        WHEN ts.last_activity > ur.last_read_at THEN TRUE
        ELSE FALSE
      END AS is_thread_unread,
      -- 未読メッセージ数: last_read_at以降のメッセージ数（親含む）
      CASE
        WHEN ur.last_read_at IS NULL THEN ts.replies + 1
        ELSE COALESCE(
          (SELECT COUNT(*) FROM chat_messages m
           WHERE (m.id = ts.thread_id OR m.parent_id = ts.thread_id)
             AND m.deleted_at IS NULL
             AND m.created_at > ur.last_read_at),
          0
        )
      END AS unread_msgs
    FROM thread_stats ts
    LEFT JOIN user_reads ur ON ur.thread_id = ts.thread_id
  )
  SELECT
    m.id,
    m.channel_id,
    m.parent_id,
    m.body,
    m.created_by,
    m.created_at,
    m.updated_at,
    m.deleted_at,
    p.id AS author_id,
    p.email AS author_email,
    p.display_name AS author_display_name,
    p.role::TEXT AS author_role,
    ui.replies AS reply_count,
    ui.last_activity AS last_activity_at,
    ui.unread_msgs AS unread_count,
    ui.is_thread_unread AS is_unread
  FROM chat_messages m
  JOIN unread_info ui ON ui.thread_id = m.id
  LEFT JOIN profiles p ON p.id = m.created_by
  ORDER BY ui.last_activity DESC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- 2. get_total_unread_thread_count: 全未読スレッド数（左メニュー用）
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_total_unread_thread_count(
  p_user_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  unread_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM (
    SELECT
      t.id AS thread_id,
      COALESCE(
        GREATEST(
          t.created_at,
          (SELECT MAX(r.created_at) FROM chat_messages r WHERE r.parent_id = t.id AND r.deleted_at IS NULL)
        ),
        t.created_at
      ) AS last_activity
    FROM chat_messages t
    WHERE t.parent_id IS NULL
      AND t.deleted_at IS NULL
  ) threads
  LEFT JOIN chat_thread_reads ctr ON ctr.thread_id = threads.thread_id AND ctr.user_id = p_user_id
  WHERE ctr.last_read_at IS NULL OR threads.last_activity > ctr.last_read_at;

  RETURN unread_count;
END;
$$;

-- =====================================================
-- 権限設定
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_threads_with_unread TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_unread_thread_count TO authenticated;
