INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flashcard_media',
  'flashcard_media',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read flashcard images" ON storage.objects;
CREATE POLICY "Public can read flashcard images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'flashcard_media');

DROP POLICY IF EXISTS "Authenticated users can upload flashcard images" ON storage.objects;
CREATE POLICY "Authenticated users can upload flashcard images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated users can update own flashcard images" ON storage.objects;
CREATE POLICY "Authenticated users can update own flashcard images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "Authenticated users can delete own flashcard images" ON storage.objects;
CREATE POLICY "Authenticated users can delete own flashcard images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );
