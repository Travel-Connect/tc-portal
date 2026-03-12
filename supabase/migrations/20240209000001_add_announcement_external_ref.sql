-- =====================================================
-- announcements に external_ref カラム追加
-- 外部システム（OTAログインツール等）からの自動お知らせの
-- 重複防止用ユニークキー
-- =====================================================

ALTER TABLE public.announcements
  ADD COLUMN external_ref TEXT;

-- external_ref が設定されている場合のみユニーク制約
CREATE UNIQUE INDEX idx_announcements_external_ref
  ON public.announcements (external_ref)
  WHERE external_ref IS NOT NULL;

-- service_role からの直接書き込みを許可する RLS ポリシー
-- （Webhook API は createAdminClient を使うため RLS バイパス済みだが念のため）
