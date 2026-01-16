-- Add icon upload support to tools table
-- icon_mode: 'lucide' (default) or 'upload'
-- icon_key: Lucide icon name (for icon_mode='lucide')
-- icon_path: Storage path (for icon_mode='upload')

ALTER TABLE public.tools
  ADD COLUMN icon_mode TEXT NOT NULL DEFAULT 'lucide' CHECK (icon_mode IN ('lucide', 'upload')),
  ADD COLUMN icon_key TEXT NULL,
  ADD COLUMN icon_path TEXT NULL;

-- Migrate existing icon data: copy current icon column to icon_key
UPDATE public.tools
SET icon_key = icon
WHERE icon IS NOT NULL;

-- Create Storage bucket for tool icons (run via Supabase Dashboard or CLI)
-- Note: Execute this in Supabase Dashboard > Storage > New Bucket
-- Bucket name: tool-icons
-- Public: Yes

-- Storage policies for tool-icons bucket
-- These need to be created via Supabase Dashboard or using storage API
-- INSERT: authenticated users only
-- UPDATE: authenticated users only
-- DELETE: authenticated users only
-- SELECT: public (automatic for public bucket)
