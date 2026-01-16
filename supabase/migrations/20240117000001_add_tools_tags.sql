-- Add tags column to tools table
ALTER TABLE public.tools
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Add GIN index for efficient array searches
CREATE INDEX IF NOT EXISTS tools_tags_gin ON public.tools USING gin (tags);

-- Comment
COMMENT ON COLUMN public.tools.tags IS 'User-defined tags for categorization and search';
