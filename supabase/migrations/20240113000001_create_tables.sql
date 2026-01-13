-- =====================================================
-- TC Portal Schema Migration
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. profiles テーブル
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- auth.users に新規ユーザーが追加されたとき profiles を自動作成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'member');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. categories テーブル
-- =====================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sort_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. tools テーブル
-- =====================================================
CREATE TABLE public.tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  description TEXT,
  tool_type TEXT NOT NULL CHECK (tool_type IN (
    'url', 'sheet', 'excel', 'bi', 'exe', 'python_runner', 'pad', 'folder_set', 'shortcut'
  )),
  -- アイコン設定
  icon_mode TEXT NOT NULL DEFAULT 'lucide' CHECK (icon_mode IN ('lucide', 'upload')),
  icon_key TEXT, -- lucideアイコン名
  icon_path TEXT, -- アップロード画像パス
  -- 状態
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tools_updated_at
  BEFORE UPDATE ON public.tools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 4. favorites テーブル（お気に入り）
-- =====================================================
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tool_id)
);

-- =====================================================
-- 5. pins テーブル（ピン留め）
-- =====================================================
CREATE TABLE public.pins (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tool_id)
);

-- =====================================================
-- 6. tool_orders テーブル（並び順）
-- =====================================================
CREATE TABLE public.tool_orders (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
  context TEXT NOT NULL CHECK (context IN ('home', 'tools')),
  sort_index INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, tool_id, context)
);

-- =====================================================
-- インデックス
-- =====================================================
CREATE INDEX idx_tools_category_id ON public.tools(category_id);
CREATE INDEX idx_tools_is_archived ON public.tools(is_archived);
CREATE INDEX idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX idx_pins_user_id ON public.pins(user_id);
CREATE INDEX idx_tool_orders_user_id_context ON public.tool_orders(user_id, context);
