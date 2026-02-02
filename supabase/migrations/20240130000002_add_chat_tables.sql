-- =====================================================
-- TC Portal Chat Feature - Tables, Indexes, RLS
-- =====================================================

-- =====================================================
-- 1. chat_channels テーブル
-- =====================================================
CREATE TABLE public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_channels IS 'チャットチャンネル';
COMMENT ON COLUMN public.chat_channels.slug IS 'URL用のスラッグ（例: general, incident, pricing）';

-- =====================================================
-- 2. chat_messages テーブル
-- =====================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.chat_messages IS 'チャットメッセージ（parent_id=NULL: スレッド親、NOT NULL: 返信）';
COMMENT ON COLUMN public.chat_messages.parent_id IS 'NULL=スレッド親、NOT NULL=返信（1階層のみ）';
COMMENT ON COLUMN public.chat_messages.deleted_at IS '論理削除日時';

-- updated_at 自動更新トリガー
CREATE TRIGGER chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 3. chat_tags テーブル
-- =====================================================
CREATE TABLE public.chat_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_tags IS 'スレッドに付けるタグ';

-- =====================================================
-- 4. chat_thread_tags テーブル
-- =====================================================
CREATE TABLE public.chat_thread_tags (
  thread_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.chat_tags(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, tag_id)
);

COMMENT ON TABLE public.chat_thread_tags IS 'スレッドとタグの関連（親メッセージのみ対象）';

-- =====================================================
-- 5. chat_thread_reads テーブル（既読管理）
-- =====================================================
CREATE TABLE public.chat_thread_reads (
  thread_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

COMMENT ON TABLE public.chat_thread_reads IS 'スレッドの既読状態（ユーザーごと）';
COMMENT ON COLUMN public.chat_thread_reads.last_read_at IS 'この時刻以前のメッセージは既読扱い';

-- =====================================================
-- 6. chat_message_mentions テーブル
-- =====================================================
CREATE TABLE public.chat_message_mentions (
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, mentioned_user_id)
);

COMMENT ON TABLE public.chat_message_mentions IS 'メッセージ内のメンション';

-- =====================================================
-- 7. chat_attachments テーブル
-- =====================================================
CREATE TABLE public.chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL DEFAULT 'chat-attachments',
  object_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_attachments IS 'メッセージの添付ファイルメタ情報';
COMMENT ON COLUMN public.chat_attachments.bucket_id IS 'Supabase Storageのバケット名';
COMMENT ON COLUMN public.chat_attachments.object_path IS 'バケット内のオブジェクトパス';

-- =====================================================
-- インデックス
-- =====================================================

-- chat_messages: チャンネル内のメッセージ取得用
CREATE INDEX idx_chat_messages_channel_created
  ON public.chat_messages (channel_id, created_at DESC);

-- chat_messages: スレッド内の返信取得用
CREATE INDEX idx_chat_messages_parent_created
  ON public.chat_messages (parent_id, created_at ASC)
  WHERE parent_id IS NOT NULL;

-- chat_messages: スレッド一覧（親メッセージのみ）
CREATE INDEX idx_chat_messages_threads
  ON public.chat_messages (channel_id, created_at DESC)
  WHERE parent_id IS NULL AND deleted_at IS NULL;

-- chat_thread_reads: ユーザーの未読チェック用
CREATE INDEX idx_chat_thread_reads_user
  ON public.chat_thread_reads (user_id, last_read_at DESC);

-- chat_thread_tags: タグでの絞り込み用
CREATE INDEX idx_chat_thread_tags_tag
  ON public.chat_thread_tags (tag_id);

-- chat_message_mentions: ユーザーへのメンション検索用
CREATE INDEX idx_chat_message_mentions_user
  ON public.chat_message_mentions (mentioned_user_id);

-- chat_attachments: メッセージの添付ファイル取得用
CREATE INDEX idx_chat_attachments_message
  ON public.chat_attachments (message_id);

-- =====================================================
-- RLS 有効化
-- =====================================================
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_thread_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- chat_channels RLS ポリシー（全員が作成・編集可能）
-- =====================================================
CREATE POLICY "Authenticated can view channels"
  ON public.chat_channels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert channels"
  ON public.chat_channels FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update channels"
  ON public.chat_channels FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE は基本使わない（is_archived で論理削除）
CREATE POLICY "Authenticated can delete channels"
  ON public.chat_channels FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- chat_messages RLS ポリシー
-- =====================================================
CREATE POLICY "Authenticated can view messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- UPDATE は自分の投稿のみ（編集機能用）
CREATE POLICY "Users can update own messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- DELETE は論理削除を推奨するため、物理削除は自分のメッセージのみ
CREATE POLICY "Users can delete own messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- =====================================================
-- chat_tags RLS ポリシー（全員が作成可能）
-- =====================================================
CREATE POLICY "Authenticated can view tags"
  ON public.chat_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert tags"
  ON public.chat_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- タグの更新・削除は作成者のみ
CREATE POLICY "Users can update own tags"
  ON public.chat_tags FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own tags"
  ON public.chat_tags FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- =====================================================
-- chat_thread_tags RLS ポリシー（全員が付け外し可能）
-- =====================================================
CREATE POLICY "Authenticated can view thread_tags"
  ON public.chat_thread_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert thread_tags"
  ON public.chat_thread_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete thread_tags"
  ON public.chat_thread_tags FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- chat_thread_reads RLS ポリシー（自分のみ操作可能）
-- =====================================================
CREATE POLICY "Users can view own reads"
  ON public.chat_thread_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reads"
  ON public.chat_thread_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reads"
  ON public.chat_thread_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reads"
  ON public.chat_thread_reads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- chat_message_mentions RLS ポリシー（全員が閲覧可能）
-- =====================================================
CREATE POLICY "Authenticated can view mentions"
  ON public.chat_message_mentions FOR SELECT
  TO authenticated
  USING (true);

-- INSERT はメッセージ作成時にサーバーサイドで行う想定だが、
-- created_by と紐づけるなら投稿者のみに制限も可能
CREATE POLICY "Authenticated can insert mentions"
  ON public.chat_message_mentions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete mentions"
  ON public.chat_message_mentions FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- chat_attachments RLS ポリシー
-- =====================================================
CREATE POLICY "Authenticated can view attachments"
  ON public.chat_attachments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert attachments"
  ON public.chat_attachments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 添付ファイルの削除は作成者のみ
CREATE POLICY "Users can delete own attachments"
  ON public.chat_attachments FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- =====================================================
-- Realtime 用の publication 追加
-- Supabase では supabase_realtime publication にテーブルを追加
-- =====================================================
-- 注意: Supabase Dashboardで Realtime を有効化する場合は
-- Database > Replication から chat_messages を追加してください
--
-- 手動で追加する場合:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
