-- =====================================================
-- Secure SECURITY DEFINER functions
-- claim_run() を service_role のみに制限
-- =====================================================

-- claim_run() は Runner API からのみ呼び出される
-- service_role (サーバーサイド) からのみ実行可能にする
-- PUBLIC からも REVOKE が必要（PostgreSQL はデフォルトで PUBLIC に EXECUTE を付与するため）
REVOKE EXECUTE ON FUNCTION public.claim_run(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_run(UUID) TO service_role;

-- search_path を固定してセキュリティを向上
ALTER FUNCTION public.claim_run(UUID) SET search_path = public;

-- is_admin() は RLS ポリシーで使用されるため、authenticated からの呼び出しが必要
-- 変更不要だが、search_path を固定
ALTER FUNCTION public.is_admin() SET search_path = public;

-- handle_new_user() は auth.users のトリガーから呼び出される
-- Supabase 内部で実行されるため変更不要だが、search_path を固定
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- update_updated_at() は汎用トリガー関数
ALTER FUNCTION public.update_updated_at() SET search_path = public;

-- update_tool_orders_updated_at() も同様
ALTER FUNCTION public.update_tool_orders_updated_at() SET search_path = public;

-- update_machine_last_seen() も同様
ALTER FUNCTION public.update_machine_last_seen() SET search_path = public;
