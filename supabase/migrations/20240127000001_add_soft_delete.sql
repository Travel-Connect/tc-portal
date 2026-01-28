-- Add soft delete columns to tools table
ALTER TABLE tools
  ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN deleted_by UUID DEFAULT NULL REFERENCES auth.users(id);

-- Index for filtering non-deleted tools efficiently
CREATE INDEX idx_tools_deleted_at ON tools (deleted_at) WHERE deleted_at IS NULL;

-- Comment
COMMENT ON COLUMN tools.deleted_at IS 'Soft delete timestamp. NULL = active, non-NULL = deleted';
COMMENT ON COLUMN tools.deleted_by IS 'User who deleted the tool';
