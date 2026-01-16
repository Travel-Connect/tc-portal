-- =====================================================
-- Add 'folder' to allowed tool_type values
-- =====================================================

-- Drop the existing constraint
ALTER TABLE public.tools DROP CONSTRAINT IF EXISTS tools_tool_type_check;

-- Add new constraint with 'folder' included
ALTER TABLE public.tools ADD CONSTRAINT tools_tool_type_check
  CHECK (tool_type IN (
    'url', 'sheet', 'excel', 'bi', 'exe', 'python_runner', 'pad', 'folder_set', 'folder', 'shortcut'
  ));
