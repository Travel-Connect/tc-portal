-- =====================================================
-- TC Portal - 未読お知らせ件数取得用 RPC関数
-- =====================================================
-- getUndismissedAnnouncementCount の 2クエリ（dismissals取得 → count）を
-- 1クエリに統合し、パフォーマンスを改善する

CREATE OR REPLACE FUNCTION public.get_undismissed_announcement_count(
  p_user_id UUID
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM announcements a
  WHERE a.status = 'published'
    AND NOT EXISTS (
      SELECT 1
      FROM announcement_dismissals d
      WHERE d.user_id = p_user_id
        AND d.announcement_id = a.id
    );
$$;

-- 権限設定
GRANT EXECUTE ON FUNCTION public.get_undismissed_announcement_count TO authenticated;
