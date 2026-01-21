-- ユーザー別ツール表示設定テーブル
-- 各ユーザーがツールごとにカード色などをカスタマイズできる

CREATE TABLE IF NOT EXISTS public.tool_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  -- 色設定（HEX形式、例: "#ff3246"）
  color_hex TEXT NULL,
  -- 色プリセット名（"red" | "yellow" | "green" | "blue" | "purple"）
  color_preset TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- ユーザー+ツールの組み合わせはユニーク
  UNIQUE(user_id, tool_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_tool_user_preferences_user_id ON public.tool_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_user_preferences_tool_id ON public.tool_user_preferences(tool_id);

-- RLS有効化
ALTER TABLE public.tool_user_preferences ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自分の設定のみ読み書き可能
CREATE POLICY "Users can view own preferences"
  ON public.tool_user_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.tool_user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.tool_user_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.tool_user_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION public.update_tool_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tool_user_preferences_updated_at
  BEFORE UPDATE ON public.tool_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tool_user_preferences_updated_at();
