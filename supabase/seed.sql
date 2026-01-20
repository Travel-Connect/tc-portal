-- =====================================================
-- TC Portal Seed Data
-- =====================================================
-- 注意: このファイルはSupabase SQL Editorで手動実行するか、
-- supabase db reset で適用されます

-- =====================================================
-- カテゴリ（8件）
-- =====================================================
INSERT INTO public.categories (id, name, sort_index) VALUES
  ('11111111-1111-1111-1111-111111111101', '全体の健康診断', 1),
  ('11111111-1111-1111-1111-111111111102', '料金変動の時に使うもの', 2),
  ('11111111-1111-1111-1111-111111111103', 'その他', 3),
  ('11111111-1111-1111-1111-111111111104', 'コッシー', 4),
  ('11111111-1111-1111-1111-111111111105', '玉城', 5),
  ('11111111-1111-1111-1111-111111111106', '大城', 6),
  ('11111111-1111-1111-1111-111111111107', '神里', 7),
  ('11111111-1111-1111-1111-111111111108', 'ヒラリー', 8)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- サンプルツール（各カテゴリ1件）
-- execution_mode と target/run_config を設定
-- =====================================================
INSERT INTO public.tools (
  id, category_id, name, description, tool_type, execution_mode,
  target, run_config, icon_mode, icon_key
) VALUES
  -- 全体の健康診断: URL (open)
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'システム稼働状況チェック',
    'サーバーの稼働状況を一覧で確認できます',
    'url',
    'open',
    'https://example.com/status',
    NULL,
    'lucide',
    'Activity'
  ),
  -- 料金変動の時に使うもの: Excel (helper)
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111102',
    '料金計算シート',
    '料金変動時の計算に使用するExcelシート',
    'excel',
    'helper',
    'C:\Users\Public\Documents\sample.xlsx',
    NULL,
    'lucide',
    'Calculator'
  ),
  -- その他: Folder Set (helper)
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111103',
    '共有フォルダ一覧',
    '社内共有フォルダへのショートカット集',
    'folder_set',
    'helper',
    NULL,
    '{"paths": ["C:\\Users\\Public\\Documents", "C:\\Users\\Public\\Downloads"]}',
    'lucide',
    'FolderOpen'
  ),
  -- コッシー: BI (helper)
  (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111104',
    'コッシー専用ダッシュボード',
    'Power BIダッシュボード',
    'bi',
    'helper',
    'C:\Users\Public\Documents\sample.pbix',
    NULL,
    'lucide',
    'BarChart3'
  ),
  -- 玉城: Python Runner (queue)
  (
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111105',
    '玉城レポートツール',
    'Python自動レポート生成ツール',
    'python_runner',
    'queue',
    'C:\Scripts\report_tool',
    '{"script": "main.py", "args": []}',
    'lucide',
    'FileText'
  ),
  -- 大城: Sheet (open)
  (
    '22222222-2222-2222-2222-222222222206',
    '11111111-1111-1111-1111-111111111106',
    '大城データ集計',
    'スプレッドシートによるデータ集計',
    'sheet',
    'open',
    'https://docs.google.com/spreadsheets/d/example',
    NULL,
    'lucide',
    'Table'
  ),
  -- 神里: PAD (queue)
  (
    '22222222-2222-2222-2222-222222222207',
    '11111111-1111-1111-1111-111111111107',
    '神里自動化ツール',
    'Power Automate Desktopによる自動化',
    'pad',
    'queue',
    NULL,
    '{"flow_name": "SampleFlow"}',
    'lucide',
    'Workflow'
  ),
  -- ヒラリー: EXE (helper)
  (
    '22222222-2222-2222-2222-222222222208',
    '11111111-1111-1111-1111-111111111108',
    'ヒラリー管理EXE',
    'ローカル実行型管理ツール',
    'exe',
    'helper',
    'C:\Program Files\Sample\app.exe',
    NULL,
    'lucide',
    'Monitor'
  )
ON CONFLICT (id) DO NOTHING;
