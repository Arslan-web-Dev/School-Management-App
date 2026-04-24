
-- Replace the broad public SELECT policy on avatars with a more limited one.
-- Public direct-URL access to images still works (Supabase serves them via CDN);
-- this prevents anonymous bulk listing of bucket contents.
DROP POLICY IF EXISTS "Avatars publicly viewable" ON storage.objects;

-- Make the bucket private at listing level; images are still served via signed/public URL endpoints
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- Authenticated users may read avatar metadata
CREATE POLICY "Authenticated read avatars" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
