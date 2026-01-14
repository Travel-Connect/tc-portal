-- =============================================
-- tool_orders: ユーザー別ツール並び順
-- =============================================

CREATE TABLE IF NOT EXISTS public.tool_orders (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  sort_index INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tool_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tool_orders_user_id ON public.tool_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_orders_sort ON public.tool_orders(user_id, sort_index);

-- RLS有効化
ALTER TABLE public.tool_orders ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自分の行のみ操作可能
CREATE POLICY "Users can view own tool orders"
  ON public.tool_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tool orders"
  ON public.tool_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tool orders"
  ON public.tool_orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tool orders"
  ON public.tool_orders FOR DELETE
  USING (auth.uid() = user_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION public.update_tool_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tool_orders_updated_at
  BEFORE UPDATE ON public.tool_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tool_orders_updated_at();
