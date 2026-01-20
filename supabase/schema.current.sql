-- =====================================================
-- TC Portal Current Schema Snapshot
-- 全マイグレーション適用後の想定スキーマ
-- 生成日: 2024-01-22
-- =====================================================

-- =====================================================
-- Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Tables
-- =====================================================

-- profiles: ユーザープロファイル
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- categories: ツールカテゴリ
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sort_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tools: ツール定義
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  tool_type TEXT NOT NULL CHECK (tool_type IN (
    'url', 'sheet', 'excel', 'bi', 'exe', 'python_runner', 'pad', 'folder_set', 'folder', 'shortcut', 'bat'
  )),
  target TEXT,
  -- アイコン設定
  icon_mode TEXT NOT NULL DEFAULT 'lucide' CHECK (icon_mode IN ('lucide', 'upload')),
  icon_key TEXT,
  icon_path TEXT,
  -- 実行設定
  execution_mode TEXT NOT NULL DEFAULT 'open' CHECK (execution_mode IN ('open', 'queue', 'helper')),
  run_config JSONB,
  -- タグ
  tags TEXT[] NOT NULL DEFAULT '{}',
  -- 状態
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.tools.execution_mode IS
  'open: URL/リンクを開くだけ (url, sheet), queue: Runsに積んでRunnerで実行 (pad, python_runner), helper: tcportal://でローカルHelper起動 (excel, bi, folder, folder_set, shortcut, bat, exe)';
COMMENT ON COLUMN public.tools.run_config IS
  'python_runner: {"script": "path"}, pad: {"flow_name": "xxx", "command": "..."}';

-- favorites: お気に入り
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_id)
);

-- pins: ピン留め
CREATE TABLE public.pins (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_id)
);

-- tool_orders: ツール並び順
CREATE TABLE public.tool_orders (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  context TEXT NOT NULL CHECK (context IN ('home', 'tools')),
  sort_index INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, tool_id, context)
);

-- machines: Runner実行マシン
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- runs: 実行履歴
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'canceled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  summary TEXT,
  error_message TEXT,
  log_path TEXT,
  log_url TEXT,
  machine_id UUID REFERENCES public.machines(id) ON DELETE SET NULL,
  run_token_hash TEXT NOT NULL,
  payload JSONB
);

-- =====================================================
-- Views
-- =====================================================

-- 最終成功日時
CREATE VIEW public.tool_last_success AS
SELECT
  tool_id,
  MAX(finished_at) AS last_success_at
FROM public.runs
WHERE status = 'success'
GROUP BY tool_id;

-- =====================================================
-- Indexes
-- =====================================================

-- tools
CREATE INDEX idx_tools_category_id ON public.tools(category_id);
CREATE INDEX idx_tools_is_archived ON public.tools(is_archived);
CREATE INDEX tools_tags_gin ON public.tools USING gin (tags);

-- favorites
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);

-- pins
CREATE INDEX idx_pins_user_id ON public.pins(user_id);
CREATE INDEX idx_pins_user_sort ON public.pins(user_id, sort_order);

-- tool_orders
CREATE INDEX idx_tool_orders_user_id_context ON public.tool_orders(user_id, context);

-- runs
CREATE INDEX idx_runs_tool_id ON public.runs(tool_id);
CREATE INDEX idx_runs_status ON public.runs(status);
CREATE INDEX idx_runs_requested_at ON public.runs(requested_at DESC);
CREATE INDEX idx_runs_queued ON public.runs(status) WHERE status = 'queued';

-- =====================================================
-- Functions
-- =====================================================

-- プロファイル自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'member');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- admin判定
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- Runner用キュー取得（service_role専用）
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

  IF v_run_id IS NULL THEN
    RETURN;
  END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- claim_run は service_role のみ（PUBLIC からも REVOKE が必要）
REVOKE EXECUTE ON FUNCTION public.claim_run(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_run(UUID) TO service_role;

-- machine last_seen 更新
CREATE OR REPLACE FUNCTION public.update_machine_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.machine_id IS NOT NULL AND NEW.status = 'running' THEN
    UPDATE public.machines
    SET last_seen_at = now()
    WHERE id = NEW.machine_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- =====================================================
-- Triggers
-- =====================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trigger_update_machine_last_seen
  AFTER UPDATE ON public.runs
  FOR EACH ROW
  WHEN (NEW.status = 'running' AND NEW.machine_id IS NOT NULL)
  EXECUTE FUNCTION public.update_machine_last_seen();

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- categories (全員管理可能)
CREATE POLICY "Authenticated users can view categories"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (true);

-- tools (全員管理可能)
CREATE POLICY "Authenticated users can view tools"
  ON public.tools FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tools"
  ON public.tools FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tools"
  ON public.tools FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tools"
  ON public.tools FOR DELETE
  TO authenticated
  USING (true);

-- favorites
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON public.favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- pins
CREATE POLICY "Users can view own pins"
  ON public.pins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pins"
  ON public.pins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pins"
  ON public.pins FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- tool_orders
CREATE POLICY "Users can view own tool_orders"
  ON public.tool_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tool_orders"
  ON public.tool_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tool_orders"
  ON public.tool_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tool_orders"
  ON public.tool_orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- runs
CREATE POLICY "Authenticated can view all runs"
  ON public.runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can create own runs"
  ON public.runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requested_by);

-- machines: service_role のみ（RLSバイパス）
