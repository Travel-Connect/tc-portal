-- =====================================================
-- Step 6: 実行基盤（Runs）+ Windows Runner（Pull型）
-- =====================================================

-- =====================================================
-- 1. machines テーブル
-- =====================================================
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. tools に execution_mode と run_config を追加
-- =====================================================
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS execution_mode TEXT NOT NULL DEFAULT 'open' CHECK (execution_mode IN ('open', 'queue')),
  ADD COLUMN IF NOT EXISTS run_config JSONB NULL;

COMMENT ON COLUMN public.tools.execution_mode IS 'open: URL/リンクを開くだけ, queue: Runsに積んでRunnerで実行';
COMMENT ON COLUMN public.tools.run_config IS 'python_runner: {"script": "path"}, pad: {"flow_name": "xxx", "command": "..."}';

-- =====================================================
-- 3. runs テーブル
-- =====================================================
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'canceled')),
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  summary TEXT NULL,
  error_message TEXT NULL,
  log_path TEXT NULL,
  log_url TEXT NULL,
  machine_id UUID NULL REFERENCES public.machines(id) ON DELETE SET NULL,
  run_token_hash TEXT NOT NULL,
  payload JSONB NULL
);

-- =====================================================
-- 4. 最終成功日時を取得するVIEW
-- =====================================================
CREATE OR REPLACE VIEW public.tool_last_success AS
SELECT
  tool_id,
  MAX(finished_at) AS last_success_at
FROM public.runs
WHERE status = 'success'
GROUP BY tool_id;

-- =====================================================
-- 5. インデックス
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_runs_tool_id ON public.runs(tool_id);
CREATE INDEX IF NOT EXISTS idx_runs_status ON public.runs(status);
CREATE INDEX IF NOT EXISTS idx_runs_requested_at ON public.runs(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_queued ON public.runs(status) WHERE status = 'queued';

-- =====================================================
-- 6. RLS有効化
-- =====================================================
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- runs: 認証済みユーザーは全件閲覧可能
CREATE POLICY "Authenticated can view all runs"
  ON public.runs FOR SELECT
  TO authenticated
  USING (true);

-- runs: 認証済みユーザーは自分のrunを作成可能
CREATE POLICY "Authenticated can create own runs"
  ON public.runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requested_by);

-- machines: 通常ユーザーはアクセス不可（Runner APIはservice roleを使用）
-- service role はRLSをバイパスするため、ポリシー不要

-- =====================================================
-- 7. Runner用の安全なclaim関数（FOR UPDATE SKIP LOCKED）
-- =====================================================
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
  UPDATE public.runs r
  SET
    status = 'running',
    started_at = now(),
    machine_id = p_machine_id
  WHERE r.id = (
    SELECT r2.id
    FROM public.runs r2
    WHERE r2.status = 'queued'
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

-- =====================================================
-- 8. machines.last_seen_at 更新用トリガー関数
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_machine_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  -- runがrunningになったときにmachineのlast_seen_atを更新
  IF NEW.machine_id IS NOT NULL AND NEW.status = 'running' THEN
    UPDATE public.machines
    SET last_seen_at = now()
    WHERE id = NEW.machine_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_machine_last_seen
  AFTER UPDATE ON public.runs
  FOR EACH ROW
  WHEN (NEW.status = 'running' AND NEW.machine_id IS NOT NULL)
  EXECUTE FUNCTION public.update_machine_last_seen();
