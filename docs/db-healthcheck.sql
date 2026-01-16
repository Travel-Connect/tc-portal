-- =====================================================
-- TC Portal Database Health Check
-- Supabase SQL Editorで実行して確認
-- =====================================================

-- =====================================================
-- 1. スキーマ概要
-- =====================================================
/*
■ tools テーブル
  - id, category_id, name, description, tool_type, icon_mode, icon_key, icon_path
  - is_archived, created_at, updated_at, target, execution_mode, run_config

  tool_type: 'url', 'sheet', 'excel', 'bi', 'exe', 'python_runner', 'pad',
             'folder_set', 'folder', 'shortcut', 'bat'
  execution_mode: 'open', 'queue'

■ runs テーブル
  - id, tool_id, requested_by, requested_at, status, started_at, finished_at
  - summary, error_message, log_path, log_url, machine_id, run_token_hash, payload

  status: 'queued', 'running', 'success', 'failed', 'canceled'

■ machines テーブル
  - id, name, key_hash, enabled, last_seen_at, created_at

■ categories テーブル
  - id, name, sort_index, created_at

■ favorites / pins テーブル
  - user_id, tool_id, created_at

■ tool_orders テーブル
  - user_id, tool_id, sort_index, updated_at

■ profiles テーブル
  - id, email, role, created_at
*/

-- =====================================================
-- 2. tools: tool_type 別の件数
-- =====================================================
SELECT
  '2. tools by tool_type' AS section,
  tool_type,
  COUNT(*) AS count
FROM public.tools
GROUP BY tool_type
ORDER BY count DESC;

-- =====================================================
-- 3. tools: execution_mode 別の件数
-- =====================================================
SELECT
  '3. tools by execution_mode' AS section,
  execution_mode,
  COUNT(*) AS count
FROM public.tools
GROUP BY execution_mode
ORDER BY count DESC;

-- =====================================================
-- 4. tools: tool_type × execution_mode クロス集計
-- =====================================================
SELECT
  '4. tools cross-tab' AS section,
  tool_type,
  execution_mode,
  COUNT(*) AS count
FROM public.tools
GROUP BY tool_type, execution_mode
ORDER BY tool_type, execution_mode;

-- =====================================================
-- 5. runs: status 別の件数
-- =====================================================
SELECT
  '5. runs by status' AS section,
  status,
  COUNT(*) AS count
FROM public.runs
GROUP BY status
ORDER BY
  CASE status
    WHEN 'queued' THEN 1
    WHEN 'running' THEN 2
    WHEN 'success' THEN 3
    WHEN 'failed' THEN 4
    WHEN 'canceled' THEN 5
  END;

-- =====================================================
-- 6. runs: tool_type別のstatus分布
-- =====================================================
SELECT
  '6. runs by tool_type and status' AS section,
  t.tool_type,
  r.status,
  COUNT(*) AS count
FROM public.runs r
JOIN public.tools t ON r.tool_id = t.id
GROUP BY t.tool_type, r.status
ORDER BY t.tool_type, r.status;

-- =====================================================
-- 7. runs: finished_at が NULL で status が終了状態のもの（異常検出）
-- =====================================================
SELECT
  '7. runs with NULL finished_at (anomaly)' AS section,
  status,
  COUNT(*) AS count
FROM public.runs
WHERE finished_at IS NULL
  AND status NOT IN ('queued', 'running')
GROUP BY status;

-- 詳細（最大10件）
SELECT
  '7b. runs detail with NULL finished_at' AS section,
  r.id,
  t.name AS tool_name,
  t.tool_type,
  r.status,
  r.requested_at,
  r.started_at,
  r.error_message
FROM public.runs r
JOIN public.tools t ON r.tool_id = t.id
WHERE r.finished_at IS NULL
  AND r.status NOT IN ('queued', 'running')
LIMIT 10;

-- =====================================================
-- 8. runs: 現在 queued/running の件数（滞留チェック）
-- =====================================================
SELECT
  '8. currently pending runs' AS section,
  status,
  COUNT(*) AS count,
  MIN(requested_at) AS oldest_requested_at,
  MAX(requested_at) AS newest_requested_at
FROM public.runs
WHERE status IN ('queued', 'running')
GROUP BY status;

-- =====================================================
-- 9. runs: exe タイプの最新10件（status/summary確認）
-- =====================================================
SELECT
  '9. latest exe runs' AS section,
  r.id,
  t.name AS tool_name,
  r.status,
  r.summary,
  r.error_message,
  r.requested_at,
  r.finished_at
FROM public.runs r
JOIN public.tools t ON r.tool_id = t.id
WHERE t.tool_type = 'exe'
ORDER BY r.requested_at DESC
LIMIT 10;

-- =====================================================
-- 10. runs: 直近24時間の実行状況
-- =====================================================
SELECT
  '10. runs in last 24h' AS section,
  t.tool_type,
  r.status,
  COUNT(*) AS count
FROM public.runs r
JOIN public.tools t ON r.tool_id = t.id
WHERE r.requested_at > NOW() - INTERVAL '24 hours'
GROUP BY t.tool_type, r.status
ORDER BY t.tool_type, r.status;

-- =====================================================
-- 11. machines: 一覧と最終確認日時
-- =====================================================
SELECT
  '11. machines list' AS section,
  id,
  name,
  enabled,
  last_seen_at,
  created_at,
  CASE
    WHEN last_seen_at IS NULL THEN 'Never connected'
    WHEN last_seen_at > NOW() - INTERVAL '5 minutes' THEN 'Online'
    WHEN last_seen_at > NOW() - INTERVAL '1 hour' THEN 'Recent'
    ELSE 'Offline'
  END AS status
FROM public.machines
ORDER BY last_seen_at DESC NULLS LAST;

-- =====================================================
-- 12. RLSポリシー一覧
-- =====================================================
SELECT
  '12. RLS policies' AS section,
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
  AND tablename IN ('tools', 'runs', 'categories', 'favorites', 'pins', 'machines', 'profiles', 'tool_orders')
ORDER BY tablename, policyname;

-- =====================================================
-- 13. categories: 一覧
-- =====================================================
SELECT
  '13. categories list' AS section,
  id,
  name,
  sort_index,
  (SELECT COUNT(*) FROM public.tools t WHERE t.category_id = c.id) AS tool_count
FROM public.categories c
ORDER BY sort_index;

-- =====================================================
-- 14. tool_last_success VIEW 確認
-- =====================================================
SELECT
  '14. tool_last_success view' AS section,
  tls.tool_id,
  t.name AS tool_name,
  t.tool_type,
  tls.last_success_at
FROM public.tool_last_success tls
JOIN public.tools t ON tls.tool_id = t.id
ORDER BY tls.last_success_at DESC
LIMIT 20;

-- =====================================================
-- 15. サマリー統計
-- =====================================================
SELECT '15. Summary Statistics' AS section;

SELECT 'Total tools' AS metric, COUNT(*)::TEXT AS value FROM public.tools
UNION ALL
SELECT 'Active tools (not archived)', COUNT(*)::TEXT FROM public.tools WHERE NOT is_archived
UNION ALL
SELECT 'Archived tools', COUNT(*)::TEXT FROM public.tools WHERE is_archived
UNION ALL
SELECT 'Total runs', COUNT(*)::TEXT FROM public.runs
UNION ALL
SELECT 'Successful runs', COUNT(*)::TEXT FROM public.runs WHERE status = 'success'
UNION ALL
SELECT 'Failed runs', COUNT(*)::TEXT FROM public.runs WHERE status = 'failed'
UNION ALL
SELECT 'Total categories', COUNT(*)::TEXT FROM public.categories
UNION ALL
SELECT 'Total machines', COUNT(*)::TEXT FROM public.machines
UNION ALL
SELECT 'Enabled machines', COUNT(*)::TEXT FROM public.machines WHERE enabled;
