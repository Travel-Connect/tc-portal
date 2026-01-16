-- =====================================================
-- Step 7: execution_mode に helper を追加
-- =====================================================

-- 既存の制約を削除
ALTER TABLE public.tools DROP CONSTRAINT IF EXISTS tools_execution_mode_check;

-- 新しい制約を追加（helper を含む）
ALTER TABLE public.tools ADD CONSTRAINT tools_execution_mode_check
  CHECK (execution_mode IN ('open', 'queue', 'helper'));

-- コメント更新
COMMENT ON COLUMN public.tools.execution_mode IS 'open: URL/リンクを開くだけ, queue: Runsに積んでRunnerで実行, helper: tcportal://でローカルHelper起動';
