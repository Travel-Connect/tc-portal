-- TC Portal DB Health Check Extra SQL
-- Supabase SQL Editor で手動実行するためのクエリ集
-- RLS、制約、インデックス、関数セキュリティの確認用

-- =====================================================
-- 1. RLS (Row Level Security) 設定確認
-- =====================================================

-- 1-1. テーブル別のRLS有効/無効状態
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 1-2. RLSポリシー一覧
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- 2. CHECK制約の確認
-- =====================================================

-- 2-1. すべてのCHECK制約
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- 2-2. tools.execution_mode制約の確認
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%execution_mode%';

-- 2-3. runs.status制約の確認
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%status%' OR check_clause LIKE '%status%';

-- =====================================================
-- 3. 外部キー制約の確認
-- =====================================================

SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 4. インデックスの確認
-- =====================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 5. カラム定義の確認（NOT NULL、デフォルト値）
-- =====================================================

-- 5-1. toolsテーブル
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tools'
ORDER BY ordinal_position;

-- 5-2. runsテーブル
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'runs'
ORDER BY ordinal_position;

-- 5-3. machinesテーブル
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'machines'
ORDER BY ordinal_position;

-- =====================================================
-- 6. VIEWの確認
-- =====================================================

SELECT
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public';

-- =====================================================
-- 7. データ整合性チェック
-- =====================================================

-- 7-1. 孤立したruns（存在しないtool_idを参照）
SELECT r.id, r.tool_id, r.status, r.requested_at
FROM runs r
LEFT JOIN tools t ON r.tool_id = t.id
WHERE t.id IS NULL;

-- 7-2. 孤立したruns（存在しないmachine_idを参照）
SELECT r.id, r.machine_id, r.status, r.requested_at
FROM runs r
LEFT JOIN machines m ON r.machine_id = m.id
WHERE r.machine_id IS NOT NULL AND m.id IS NULL;

-- 7-3. 孤立したtools（存在しないcategory_idを参照）
SELECT t.id, t.name, t.category_id
FROM tools t
LEFT JOIN categories c ON t.category_id = c.id
WHERE c.id IS NULL;

-- 7-4. 実行中のまま長時間経過しているruns
SELECT
  r.id,
  r.status,
  r.started_at,
  t.name as tool_name,
  EXTRACT(EPOCH FROM (NOW() - r.started_at)) / 3600 as hours_running
FROM runs r
JOIN tools t ON r.tool_id = t.id
WHERE r.status = 'running'
  AND r.started_at < NOW() - INTERVAL '1 hour'
ORDER BY r.started_at;

-- 7-5. キュー待ちのまま長時間経過しているruns
SELECT
  r.id,
  r.status,
  r.requested_at,
  t.name as tool_name,
  EXTRACT(EPOCH FROM (NOW() - r.requested_at)) / 3600 as hours_waiting
FROM runs r
JOIN tools t ON r.tool_id = t.id
WHERE r.status = 'queued'
  AND r.requested_at < NOW() - INTERVAL '1 hour'
ORDER BY r.requested_at;

-- =====================================================
-- 8. 統計情報
-- =====================================================

-- 8-1. テーブルサイズ
SELECT
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size
FROM pg_catalog.pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

-- 8-2. 行数概算
SELECT
  relname as table_name,
  n_live_tup as row_count_estimate
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- =====================================================
-- 9. execution_mode整合性チェック（詳細）
-- =====================================================

-- 想定: python_runner/pad → queue, excel/bi/folder/folder_set/shortcut/bat → helper, url/sheet → open
SELECT
  t.id,
  t.name,
  t.tool_type,
  t.execution_mode,
  CASE
    WHEN t.tool_type IN ('python_runner', 'pad') AND t.execution_mode != 'queue' THEN 'Expected: queue'
    WHEN t.tool_type IN ('excel', 'bi', 'folder', 'folder_set', 'shortcut', 'bat') AND t.execution_mode != 'helper' THEN 'Expected: helper'
    WHEN t.tool_type IN ('url', 'sheet') AND t.execution_mode != 'open' THEN 'Expected: open'
    ELSE 'OK'
  END as check_result
FROM tools t
WHERE
  (t.tool_type IN ('python_runner', 'pad') AND t.execution_mode != 'queue')
  OR (t.tool_type IN ('excel', 'bi', 'folder', 'folder_set', 'shortcut', 'bat') AND t.execution_mode != 'helper')
  OR (t.tool_type IN ('url', 'sheet') AND t.execution_mode != 'open');

-- =====================================================
-- 10. runs詳細統計
-- =====================================================

-- 10-1. log_url NOT NULL件数（tool_type別）
SELECT
  t.tool_type,
  COUNT(*) as total_runs,
  COUNT(r.log_url) as with_log_url,
  ROUND(100.0 * COUNT(r.log_url) / COUNT(*), 1) as percent_with_log_url
FROM runs r
JOIN tools t ON r.tool_id = t.id
GROUP BY t.tool_type
ORDER BY t.tool_type;

-- 10-2. machine_id NULL件数（tool_type別）
SELECT
  t.tool_type,
  COUNT(*) as total_runs,
  COUNT(r.machine_id) as with_machine_id,
  COUNT(*) - COUNT(r.machine_id) as without_machine_id
FROM runs r
JOIN tools t ON r.tool_id = t.id
GROUP BY t.tool_type
ORDER BY t.tool_type;

-- =====================================================
-- 11. SECURITY DEFINER 関数のセキュリティ確認
-- =====================================================

-- 11-1. SECURITY DEFINER 関数一覧
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prosecdef AS is_security_definer,
  current_setting('search_path') AS search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- 11-2. 関数の権限一覧（誰が実行可能か）
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  r.rolname AS granted_to,
  CASE
    WHEN has_function_privilege(r.oid, p.oid, 'EXECUTE') THEN 'YES'
    ELSE 'NO'
  END AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
CROSS JOIN pg_roles r
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY p.proname, r.rolname;

-- 11-3. claim_run の権限確認（service_roleのみが期待値）
SELECT
  p.proname AS function_name,
  r.rolname AS role,
  CASE
    WHEN has_function_privilege(r.oid, p.oid, 'EXECUTE') THEN 'CAN EXECUTE'
    ELSE 'CANNOT EXECUTE'
  END AS permission
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
CROSS JOIN pg_roles r
WHERE n.nspname = 'public'
  AND p.proname = 'claim_run'
  AND r.rolname IN ('anon', 'authenticated', 'service_role');

-- 11-4. 関数定義の確認（search_path設定を含む）
SELECT
  p.proname AS function_name,
  p.proconfig AS config_settings,
  LEFT(pg_get_functiondef(p.oid), 500) AS definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

-- =====================================================
-- 12. マイグレーション整合性チェック
-- =====================================================

-- 12-1. tool_orders の実際のカラム（context列の有無を確認）
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tool_orders'
ORDER BY ordinal_position;

-- 12-2. tool_orders の主キー構成
SELECT
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'tool_orders'
  AND tc.constraint_type = 'PRIMARY KEY'
ORDER BY kcu.ordinal_position;

-- 12-3. 重複RLSポリシーの検出
SELECT
  tablename,
  COUNT(*) as policy_count,
  ARRAY_AGG(policyname ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 4
ORDER BY policy_count DESC;
