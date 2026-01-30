-- =====================================================
-- profiles テーブルに display_name を追加（メンション解決用）
-- =====================================================

-- display_name カラムを追加（NULL許容、後から設定可能）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- デフォルト値としてemailのローカルパート（@より前）を設定
UPDATE public.profiles
SET display_name = split_part(email, '@', 1)
WHERE display_name IS NULL;

-- 新規ユーザー作成時のトリガーを更新して display_name も設定
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, display_name)
  VALUES (NEW.id, NEW.email, 'member', split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- display_name での検索用インデックス（メンション候補検索用）
CREATE INDEX IF NOT EXISTS idx_profiles_display_name
  ON public.profiles (display_name);

-- display_name のユニーク制約は設けない（同名ユーザーを許容）
-- 必要に応じて後から追加可能

COMMENT ON COLUMN public.profiles.display_name IS 'ユーザーの表示名。メンション解決や画面表示に使用';
