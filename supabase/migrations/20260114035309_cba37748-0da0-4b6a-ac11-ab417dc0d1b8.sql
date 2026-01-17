-- Fix storage RLS policies to be more secure
DROP POLICY IF EXISTS "Users can upload session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view session recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their session recordings" ON storage.objects;

-- More secure policies using folder-based ownership
CREATE POLICY "Users can upload session recordings to their folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'session-recordings' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their session recordings" ON storage.objects
FOR SELECT USING (
  bucket_id = 'session-recordings' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own session recordings" ON storage.objects
FOR DELETE USING (
  bucket_id = 'session-recordings' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);