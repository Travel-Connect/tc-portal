-- =====================================================
-- インライン画像対応: message_id を NULL 許可に変更
-- =====================================================
-- インライン画像はメッセージ作成前にアップロードされるため、
-- message_id を一時的に NULL にする必要がある。
-- メッセージ作成後に message_id を更新する。

-- message_id の NOT NULL 制約を削除
ALTER TABLE public.chat_attachments
  ALTER COLUMN message_id DROP NOT NULL;

COMMENT ON COLUMN public.chat_attachments.message_id IS 'メッセージID（インライン画像の場合、アップロード時はNULL、メッセージ作成後に更新）';
