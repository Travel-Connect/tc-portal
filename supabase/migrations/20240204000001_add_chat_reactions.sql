-- =====================================================
-- チャットリアクション機能
-- =====================================================

-- リアクションテーブル
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 同一メッセージに同一ユーザーが同一絵文字は1つだけ
  UNIQUE(message_id, user_id, emoji)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message_id ON chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_user_id ON chat_message_reactions(user_id);

-- profilesテーブルとのリレーション用の外部キー制約を追加
-- user_id を profiles(id) に対する外部キーとして扱えるようにする
-- ※ auth.users と profiles は1:1の関係（profiles.id は auth.users.id を参照）
-- Supabaseのクエリで profiles をJOINできるように明示的な制約を追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_message_reactions_profiles'
  ) THEN
    ALTER TABLE chat_message_reactions
      ADD CONSTRAINT fk_chat_message_reactions_profiles
      FOREIGN KEY (user_id)
      REFERENCES profiles(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- RLS ポリシー
-- =====================================================

ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- 既存ポリシーを削除してから再作成
DROP POLICY IF EXISTS "chat_message_reactions_select" ON chat_message_reactions;
DROP POLICY IF EXISTS "chat_message_reactions_insert" ON chat_message_reactions;
DROP POLICY IF EXISTS "chat_message_reactions_delete" ON chat_message_reactions;

-- SELECT: 認証済みユーザーは全て閲覧可能
CREATE POLICY "chat_message_reactions_select" ON chat_message_reactions
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: 自分のリアクションのみ追加可能
CREATE POLICY "chat_message_reactions_insert" ON chat_message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- DELETE: 自分のリアクションのみ削除可能
CREATE POLICY "chat_message_reactions_delete" ON chat_message_reactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
