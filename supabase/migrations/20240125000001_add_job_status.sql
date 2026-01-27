-- Job Status table for monitoring scheduled Python tasks
-- This table tracks the last execution status of scheduled jobs

CREATE TABLE public.job_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tool_id UUID NULL REFERENCES public.tools(id) ON DELETE SET NULL,
  last_status TEXT NOT NULL CHECK (last_status IN ('success', 'error')),
  last_finished_at TIMESTAMPTZ NOT NULL,
  last_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookup by status (for sidebar badge)
CREATE INDEX idx_job_status_last_status ON public.job_status(last_status);

-- Index for sorting by finish time
CREATE INDEX idx_job_status_last_finished_at ON public.job_status(last_finished_at DESC);

-- Enable RLS
ALTER TABLE public.job_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- SELECT: All authenticated users can view (internal portal assumption)
CREATE POLICY "Authenticated users can view job_status"
  ON public.job_status FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE: Deny for regular users (API uses service_role or bypasses RLS)
-- No policies for INSERT/UPDATE/DELETE means they are denied by default with RLS enabled

-- Comment
COMMENT ON TABLE public.job_status IS 'Tracks execution status of scheduled Python jobs for monitoring';
COMMENT ON COLUMN public.job_status.job_key IS 'Unique identifier for the job (e.g., daily-price-sync)';
COMMENT ON COLUMN public.job_status.title IS 'Human-readable display name for the job';
COMMENT ON COLUMN public.job_status.tool_id IS 'Optional reference to related tool';
COMMENT ON COLUMN public.job_status.last_status IS 'Most recent execution status: success or error';
COMMENT ON COLUMN public.job_status.last_finished_at IS 'When the job last completed';
COMMENT ON COLUMN public.job_status.last_message IS 'Optional message or error details';