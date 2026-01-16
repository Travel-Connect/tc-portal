-- =====================================================
-- Step 8-D: ツール管理＋カテゴリ管理を全ユーザーに付与
--
-- 全ログインユーザーがツールとカテゴリの管理ができるようにRLSポリシーを変更
-- =====================================================

-- =====================================================
-- tools テーブル: 既存のadmin専用ポリシーを削除し、全認証ユーザーに開放
-- =====================================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Admins can insert tools" ON public.tools;
DROP POLICY IF EXISTS "Admins can update tools" ON public.tools;
DROP POLICY IF EXISTS "Admins can delete tools" ON public.tools;

-- 新しいポリシー: 認証済みユーザーならINSERT/UPDATE/DELETE可能
CREATE POLICY "Authenticated users can insert tools"
  ON public.tools FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tools"
  ON public.tools FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tools"
  ON public.tools FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- categories テーブル: 既存のadmin専用ポリシーを削除し、全認証ユーザーに開放
-- =====================================================

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;

-- 新しいポリシー: 認証済みユーザーならINSERT/UPDATE/DELETE可能
CREATE POLICY "Authenticated users can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (true);
