-- Fix execution_mode consistency
-- tool_type と execution_mode の整合性を取るマイグレーション

-- PAD と python_runner は必ず queue
UPDATE public.tools
SET execution_mode = 'queue'
WHERE tool_type IN ('pad', 'python_runner')
  AND execution_mode != 'queue';

-- Excel, BI, Folder, Folder_set, Shortcut, BAT, EXE は必ず helper
UPDATE public.tools
SET execution_mode = 'helper'
WHERE tool_type IN ('excel', 'bi', 'folder', 'folder_set', 'shortcut', 'bat', 'exe')
  AND execution_mode != 'helper';

-- URL, Sheet は必ず open
UPDATE public.tools
SET execution_mode = 'open'
WHERE tool_type IN ('url', 'sheet')
  AND execution_mode != 'open';

-- コメント追加
COMMENT ON COLUMN public.tools.execution_mode IS
  'open: URL/リンクを開くだけ (url, sheet), queue: Runsに積んでRunnerで実行 (pad, python_runner), helper: tcportal://でローカルHelper起動 (excel, bi, folder, folder_set, shortcut, bat, exe)';
