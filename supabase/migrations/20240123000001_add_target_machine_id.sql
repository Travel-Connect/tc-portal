-- =====================================================
-- Runner実行先マシン指定機能: target_machine_id + hostname
-- =====================================================

-- 1. runs に target_machine_id を追加
-- 指定されたマシンのみがこのrunをclaimできる（NULLならどのマシンでもOK）
ALTER TABLE public.runs
  ADD COLUMN IF NOT EXISTS target_machine_id UUID NULL REFERENCES public.machines(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.runs.target_machine_id IS '実行先マシンID（NULLなら任意のRunnerが実行可能）';

-- 2. インデックス追加
CREATE INDEX IF NOT EXISTS idx_runs_target_machine_id ON public.runs(target_machine_id);
CREATE INDEX IF NOT EXISTS idx_runs_queued_target ON public.runs(status, target_machine_id)
  WHERE status = 'queued';

-- 3. machines に hostname を追加（Runner識別用）
ALTER TABLE public.machines
  ADD COLUMN IF NOT EXISTS hostname TEXT NULL;

COMMENT ON COLUMN public.machines.hostname IS 'RunnerのPC名（COMPUTERNAME）';

-- 4. machines の RLS: authenticated に SELECT を許可
-- ポータルUIでオンラインマシン一覧を表示するために必要
CREATE POLICY "Authenticated can view machines"
  ON public.machines FOR SELECT
  TO authenticated
  USING (true);
