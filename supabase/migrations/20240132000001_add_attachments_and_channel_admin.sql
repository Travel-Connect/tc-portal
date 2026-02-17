-- =====================================================
-- TC Portal Chat - 添付ファイル & チャンネル管理機能
-- =====================================================

-- =====================================================
-- 1. chat_channels に description カラムを追加
-- =====================================================
ALTER TABLE public.chat_channels
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.chat_channels.description IS 'チャンネルの説明';

-- =====================================================
-- 2. chat_channels の RLS ポリシーを更新（admin のみ作成/更新可能に）
-- =====================================================

-- 既存ポリシーを削除（旧名 "Authenticated can ..." と新名 "Admin can ..." の両方を削除）
DROP POLICY IF EXISTS "Authenticated can insert channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Authenticated can update channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Authenticated can delete channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Admin can insert channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Admin can update channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Admin can delete channels" ON public.chat_channels;

-- admin のみがチャンネルを作成可能
CREATE POLICY "Admin can insert channels"
  ON public.chat_channels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- admin のみがチャンネルを更新可能
CREATE POLICY "Admin can update channels"
  ON public.chat_channels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- admin のみがチャンネルを削除可能
CREATE POLICY "Admin can delete channels"
  ON public.chat_channels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 3. chat-attachments Storage バケットを作成
-- =====================================================
-- Note: この SQL は Supabase Dashboard から実行するか、
-- supabase CLI を使用してください。
-- バケットの作成は通常の SQL では直接できないため、
-- Dashboard の Storage セクションで作成してください:
--   - バケット名: chat-attachments
--   - パブリック: false (private)
--   - ファイルサイズ制限: 25MB (26214400 bytes)
--   - 許可するMIMEタイプ: 後述のポリシーで制御

-- Storage RLS ポリシー（Dashboard から設定）:
-- 1. SELECT: authenticated ユーザーがダウンロード可能
-- 2. INSERT: authenticated ユーザーが chat/ フォルダ内にアップロード可能
-- 3. DELETE: アップロードした本人のみ削除可能

-- =====================================================
-- 4. 添付ファイル関連のインデックス追加（必要に応じて）
-- =====================================================
-- 既にインデックスは 20240130000002 で作成済み
