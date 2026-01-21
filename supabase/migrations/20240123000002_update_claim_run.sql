-- =====================================================
-- claim_run() を更新: target_machine_id フィルタを追加
-- =====================================================

-- claim_run() を再定義
-- 変更点: WHERE句に target_machine_id フィルタを追加
--   - target_machine_id IS NULL → どのRunnerでもclaim可能（従来互換）
--   - target_machine_id = p_machine_id → 指定されたマシンのみclaim可能
CREATE OR REPLACE FUNCTION public.claim_run(p_machine_id UUID)
RETURNS TABLE (
  run_id UUID,
  tool_id UUID,
  tool_name TEXT,
  tool_type TEXT,
  tool_target TEXT,
  run_config JSONB,
  payload JSONB
) AS $$
DECLARE
  v_run_id UUID;
BEGIN
  -- 1件のqueuedなrunを取得してrunningに更新（競合を避ける）
  -- target_machine_id が NULL または 自分のマシンIDと一致するもののみ対象
  UPDATE public.runs r
  SET
    status = 'running',
    started_at = now(),
    machine_id = p_machine_id
  WHERE r.id = (
    SELECT r2.id
    FROM public.runs r2
    WHERE r2.status = 'queued'
      AND (r2.target_machine_id IS NULL OR r2.target_machine_id = p_machine_id)
    ORDER BY r2.requested_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING r.id INTO v_run_id;

  -- 取得できなかった場合は空を返す
  IF v_run_id IS NULL THEN
    RETURN;
  END IF;

  -- run情報とtool情報を結合して返す
  RETURN QUERY
  SELECT
    r.id AS run_id,
    t.id AS tool_id,
    t.name AS tool_name,
    t.tool_type,
    t.target AS tool_target,
    t.run_config,
    r.payload
  FROM public.runs r
  JOIN public.tools t ON r.tool_id = t.id
  WHERE r.id = v_run_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- セキュリティ設定（既存の設定を維持）
ALTER FUNCTION public.claim_run(UUID) SET search_path = public;
