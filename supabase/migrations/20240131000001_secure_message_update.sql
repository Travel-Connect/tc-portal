-- =====================================================
-- chat_messages UPDATE ポリシーの強化
-- 削除済みメッセージは編集できないようにする
-- =====================================================

-- 既存のUPDATEポリシーを削除
DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;

-- 新しいUPDATEポリシー: 削除済みでない自分のメッセージのみ更新可能
CREATE POLICY "Users can update own messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = created_by);
