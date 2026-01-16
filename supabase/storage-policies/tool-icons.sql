-- Storage policies for tool-icons bucket
-- Run these in Supabase Dashboard > Storage > Policies after creating the bucket

-- 1. First, create the bucket via Dashboard:
--    Name: tool-icons
--    Public: Yes

-- 2. Then add these policies:

-- Allow authenticated users to upload icons
CREATE POLICY "Authenticated users can upload tool icons"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tool-icons');

-- Allow authenticated users to update icons
CREATE POLICY "Authenticated users can update tool icons"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tool-icons')
WITH CHECK (bucket_id = 'tool-icons');

-- Allow authenticated users to delete icons
CREATE POLICY "Authenticated users can delete tool icons"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tool-icons');

-- Public read is automatic for public buckets
