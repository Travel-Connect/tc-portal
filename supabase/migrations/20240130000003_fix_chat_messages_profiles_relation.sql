-- =====================================================
-- Fix: chat_messages と profiles の関係を追加
-- =====================================================

-- 既存の auth.users への外部キーを削除（存在する場合）
ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_created_by_fkey;

-- profiles テーブルへの外部キーを追加
ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 同様に他のテーブルも修正
ALTER TABLE public.chat_channels
DROP CONSTRAINT IF EXISTS chat_channels_created_by_fkey;

ALTER TABLE public.chat_channels
ADD CONSTRAINT chat_channels_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.chat_tags
DROP CONSTRAINT IF EXISTS chat_tags_created_by_fkey;

ALTER TABLE public.chat_tags
ADD CONSTRAINT chat_tags_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.chat_thread_tags
DROP CONSTRAINT IF EXISTS chat_thread_tags_created_by_fkey;

ALTER TABLE public.chat_thread_tags
ADD CONSTRAINT chat_thread_tags_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.chat_attachments
DROP CONSTRAINT IF EXISTS chat_attachments_created_by_fkey;

ALTER TABLE public.chat_attachments
ADD CONSTRAINT chat_attachments_created_by_fkey
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- chat_thread_reads と chat_message_mentions は user_id が auth.users を参照するのでそのまま
