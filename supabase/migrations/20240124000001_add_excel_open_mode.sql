-- Excelツールの起動モード追加
-- file: 指定ファイルを開く（従来動作）
-- folder_latest_created: フォルダ内の作成日時が最新のファイルを開く
-- folder_pick: フォルダからファイル選択ダイアログで開く

-- excel_open_mode カラム追加
ALTER TABLE public.tools
ADD COLUMN IF NOT EXISTS excel_open_mode TEXT NOT NULL DEFAULT 'file';

-- excel_folder_path カラム追加
ALTER TABLE public.tools
ADD COLUMN IF NOT EXISTS excel_folder_path TEXT NULL;

-- CHECK制約追加
ALTER TABLE public.tools
ADD CONSTRAINT tools_excel_open_mode_check
CHECK (excel_open_mode IN ('file', 'folder_latest_created', 'folder_pick'));

-- 既存のexcelツールは excel_open_mode='file' を自動設定（デフォルト値により既に設定済み）
-- 念のためUPDATE
UPDATE public.tools
SET excel_open_mode = 'file'
WHERE tool_type = 'excel' AND excel_open_mode IS NULL;

-- コメント追加
COMMENT ON COLUMN public.tools.excel_open_mode IS 'Excelツールの起動モード: file(指定ファイル), folder_latest_created(最新ファイル), folder_pick(選択ダイアログ)';
COMMENT ON COLUMN public.tools.excel_folder_path IS 'folder_latest_created/folder_pickモード時の対象フォルダパス';
