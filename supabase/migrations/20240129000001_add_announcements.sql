-- =====================================================
-- お知らせ（Announcements）テーブル + 非表示管理
-- =====================================================

-- announcements テーブル
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- announcement_dismissals テーブル（ユーザーごとの非表示管理）
CREATE TABLE public.announcement_dismissals (
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

-- =====================================================
-- RLS 有効化
-- =====================================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- announcements RLS ポリシー
-- 全認証ユーザーに開放（tools/categories と同じパターン）
-- アクセス制御はアプリレベルで実施
-- =====================================================

CREATE POLICY "Authenticated users can view all announcements"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert announcements"
  ON public.announcements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update announcements"
  ON public.announcements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete announcements"
  ON public.announcements FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- announcement_dismissals RLS ポリシー
-- =====================================================

-- ユーザーは自分の非表示設定を閲覧可能
CREATE POLICY "Users can view own dismissals"
  ON public.announcement_dismissals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ユーザーは自分の非表示設定を作成可能
CREATE POLICY "Users can insert own dismissals"
  ON public.announcement_dismissals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の非表示設定を削除可能
CREATE POLICY "Users can delete own dismissals"
  ON public.announcement_dismissals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- インデックス
-- =====================================================
CREATE INDEX idx_announcements_status_published
  ON public.announcements (published_at DESC)
  WHERE status = 'published';
