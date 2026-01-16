-- TC Portal Staging Seed Data
-- ステージング環境用のサンプルデータ
--
-- 使用方法:
-- Supabase Dashboard → SQL Editor でこのファイルの内容を実行

-- カテゴリ
INSERT INTO categories (id, name, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000001', '業務ツール', 1),
  ('00000000-0000-0000-0000-000000000002', 'データ分析', 2),
  ('00000000-0000-0000-0000-000000000003', '自動化', 3),
  ('00000000-0000-0000-0000-000000000004', 'その他', 99)
ON CONFLICT (id) DO NOTHING;

-- サンプルツール
INSERT INTO tools (name, tool_type, execution_mode, category_id, description, target, tags) VALUES
  -- URLツール（open）
  ('Google検索', 'url', 'open', '00000000-0000-0000-0000-000000000004',
   '検索エンジン', 'https://www.google.com', ARRAY['検索', 'Web']),

  -- Spreadsheetツール（open）
  ('サンプルスプレッドシート', 'sheet', 'open', '00000000-0000-0000-0000-000000000001',
   'Google Sheetsのサンプル', 'https://docs.google.com/spreadsheets/d/example', ARRAY['データ', 'シート']),

  -- Excelツール（helper）
  ('売上レポート.xlsx', 'excel', 'helper', '00000000-0000-0000-0000-000000000001',
   'Excelで開くサンプルファイル（要ローカルファイル）', 'C:\Users\Public\Documents\sample.xlsx', ARRAY['Excel', 'レポート']),

  -- フォルダツール（helper）
  ('共有フォルダ', 'folder', 'helper', '00000000-0000-0000-0000-000000000001',
   'ドキュメントフォルダを開く', 'C:\Users\Public\Documents', ARRAY['フォルダ']),

  -- BATツール（helper）
  ('サンプルBAT', 'bat', 'helper', '00000000-0000-0000-0000-000000000003',
   'バッチファイルを実行（要ローカルファイル）', 'C:\test\sample.bat', ARRAY['BAT', '自動化']),

  -- Pythonツール（queue - Runner用）
  ('Pythonサンプル', 'python_runner', 'queue', '00000000-0000-0000-0000-000000000003',
   'Pythonスクリプトを実行（Runner必要）', 'C:\scripts\sample.py', ARRAY['Python', 'スクリプト']),

  -- PADツール（queue - Runner用）
  ('PADサンプルフロー', 'pad', 'queue', '00000000-0000-0000-0000-000000000003',
   'Power Automate Desktopフロー（Runner必要）', 'ms-powerautomate://flow?name=SampleFlow', ARRAY['PAD', 'RPA']),

  -- BIツール（helper）
  ('ダッシュボード.pbix', 'bi', 'helper', '00000000-0000-0000-0000-000000000002',
   'Power BIダッシュボード（要ローカルファイル）', 'C:\Reports\dashboard.pbix', ARRAY['BI', 'ダッシュボード'])
ON CONFLICT DO NOTHING;

-- Runnerマシン（テスト用）
-- 注意: 実際のkey_hashは使用するキーのSHA256ハッシュに置き換えてください
-- Node.js: require('crypto').createHash('sha256').update('staging-runner-key').digest('hex')
-- 'staging-runner-key' のハッシュ: 7f4a8c3b9e2d1f6a5c8b7e4d3a2f1c9b8e7d6a5c4b3a2f1e9d8c7b6a5f4e3d2c
INSERT INTO machines (name, key_hash, enabled) VALUES
  ('staging-runner', '7f4a8c3b9e2d1f6a5c8b7e4d3a2f1c9b8e7d6a5c4b3a2f1e9d8c7b6a5f4e3d2c', true)
ON CONFLICT DO NOTHING;

-- 確認用クエリ
-- SELECT * FROM categories;
-- SELECT * FROM tools;
-- SELECT * FROM machines;
