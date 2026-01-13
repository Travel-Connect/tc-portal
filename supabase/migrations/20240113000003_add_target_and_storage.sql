-- =====================================================
-- Add target column and create storage bucket
-- =====================================================

-- Add target column to tools table (URL or file path)
ALTER TABLE public.tools
ADD COLUMN IF NOT EXISTS target TEXT;

-- =====================================================
-- Storage bucket for tool icons
-- =====================================================
-- Note: Run this in Supabase Dashboard > Storage > New bucket
-- Bucket name: tool-icons
-- Public: Yes (for simplicity)
--
-- Or via SQL (requires storage schema access):
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('tool-icons', 'tool-icons', true)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage RLS policies (if bucket is created via SQL)
-- =====================================================
-- Allow authenticated users to read
-- CREATE POLICY "Public read access"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'tool-icons');

-- Allow admins to upload
-- CREATE POLICY "Admin upload access"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'tool-icons'
--   AND public.is_admin()
-- );

-- Allow admins to delete
-- CREATE POLICY "Admin delete access"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'tool-icons'
--   AND public.is_admin()
-- );
