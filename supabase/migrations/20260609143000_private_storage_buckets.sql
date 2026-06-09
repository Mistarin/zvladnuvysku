-- PR-3: make user-uploaded buckets private and allow signed URLs only for visible rows.

UPDATE storage.buckets
SET public = false
WHERE id IN ('study_materials', 'flashcard_media');

DROP POLICY IF EXISTS "study_materials_approved_select" ON storage.objects;
CREATE POLICY "study_materials_approved_select"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'study_materials'
    AND EXISTS (
      SELECT 1
      FROM public.subject_materials m
      WHERE m.file_path = storage.objects.name
        AND m.moderation_status = 'approved'
    )
  );

DROP POLICY IF EXISTS "study_materials_admin_select" ON storage.objects;
CREATE POLICY "study_materials_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'study_materials'
    AND ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "flashcard_media_visible_select" ON storage.objects;
CREATE POLICY "flashcard_media_visible_select"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'flashcard_media'
    AND EXISTS (
      SELECT 1
      FROM public.flashcards f
      JOIN public.flashcard_decks d ON d.id = f.deck_id
      WHERE f.media_path = storage.objects.name
        AND (d.is_public = true OR d.creator_id = (select auth.uid()))
    )
  );

NOTIFY pgrst, 'reload schema';
