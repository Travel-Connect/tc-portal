-- Task Monitors table for monitoring scheduled tasks (Python/BAT)
-- This table tracks the latest status of each monitored task

CREATE TABLE public.task_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_key TEXT NOT NULL,
  task_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('python', 'bat')),
  machine_name TEXT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_status TEXT NULL CHECK (last_status IN ('success', 'failed')),
  last_started_at TIMESTAMPTZ NULL,
  last_finished_at TIMESTAMPTZ NULL,
  last_exit_code INT NULL,
  last_message TEXT NULL,
  last_log_url TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: same task can run on different machines
CREATE UNIQUE INDEX idx_task_monitors_unique
  ON public.task_monitors(task_key, kind, COALESCE(machine_name, ''));

-- Index for querying failed tasks
CREATE INDEX idx_task_monitors_last_status ON public.task_monitors(last_status);

-- Index for enabled tasks
CREATE INDEX idx_task_monitors_enabled ON public.task_monitors(enabled) WHERE enabled = true;

-- Task Monitor Runs table for history
CREATE TABLE public.task_monitor_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES public.task_monitors(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  duration_ms INT NULL,
  exit_code INT NULL,
  message TEXT NULL,
  log_url TEXT NULL,
  raw JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying runs by monitor
CREATE INDEX idx_task_monitor_runs_monitor_id ON public.task_monitor_runs(monitor_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.task_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_monitor_runs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can view
CREATE POLICY "Authenticated users can view task_monitors"
  ON public.task_monitors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view task_monitor_runs"
  ON public.task_monitor_runs FOR SELECT
  TO authenticated
  USING (true);

-- Comments
COMMENT ON TABLE public.task_monitors IS 'Tracks the latest status of scheduled tasks (Python/BAT)';
COMMENT ON COLUMN public.task_monitors.task_key IS 'Unique identifier for the task (e.g., nightly_import)';
COMMENT ON COLUMN public.task_monitors.task_name IS 'Human-readable display name';
COMMENT ON COLUMN public.task_monitors.kind IS 'Task type: python or bat';
COMMENT ON COLUMN public.task_monitors.machine_name IS 'PC name where the task runs (COMPUTERNAME)';
COMMENT ON COLUMN public.task_monitors.enabled IS 'Whether monitoring is active for this task';
COMMENT ON COLUMN public.task_monitors.last_status IS 'Most recent execution status';

COMMENT ON TABLE public.task_monitor_runs IS 'History of task executions';
COMMENT ON COLUMN public.task_monitor_runs.raw IS 'Original webhook payload for debugging';
