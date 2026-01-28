-- Deprecate "shortcut" tool type: soft-delete all existing shortcut tools
UPDATE tools
SET deleted_at = now(),
    is_archived = true
WHERE tool_type = 'shortcut'
  AND deleted_at IS NULL;
