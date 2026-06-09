-- PR-1: enforce @osu.cz defense-in-depth for auth issuance and user-owned writes.

CREATE OR REPLACE FUNCTION public.enforce_osu_email_before_user_created(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  user_email := COALESCE(event -> 'user' ->> 'email', event ->> 'email', '');

  IF lower(split_part(user_email, '@', 2)) <> 'osu.cz' THEN
    RETURN jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Only @osu.cz email addresses can create an account.'
      )
    );
  END IF;

  RETURN '{}'::jsonb;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE ALL ON FUNCTION public.enforce_osu_email_before_user_created(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_osu_email_before_user_created(jsonb) TO supabase_auth_admin;

DROP POLICY IF EXISTS "study_materials_owner_insert" ON storage.objects;
CREATE POLICY "study_materials_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'study_materials'
    AND owner = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "study_materials_owner_update" ON storage.objects;
CREATE POLICY "study_materials_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'study_materials'
    AND owner = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  )
  WITH CHECK (
    bucket_id = 'study_materials'
    AND owner = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "flashcard_media_owner_insert" ON storage.objects;
CREATE POLICY "flashcard_media_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "flashcard_media_owner_update" ON storage.objects;
CREATE POLICY "flashcard_media_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  )
  WITH CHECK (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;
CREATE POLICY "profiles_owner_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    user_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "activity_acknowledgements_insert" ON public.activity_acknowledgements;
CREATE POLICY "activity_acknowledgements_insert"
  ON public.activity_acknowledgements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "flashcard_decks_owner_insert" ON public.flashcard_decks;
CREATE POLICY "flashcard_decks_owner_insert"
  ON public.flashcard_decks FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "flashcard_decks_owner_update" ON public.flashcard_decks;
CREATE POLICY "flashcard_decks_owner_update"
  ON public.flashcard_decks FOR UPDATE TO authenticated
  USING (
    creator_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  )
  WITH CHECK (
    creator_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "flashcards_owner_insert" ON public.flashcards;
CREATE POLICY "flashcards_owner_insert"
  ON public.flashcards FOR INSERT TO authenticated
  WITH CHECK (
    lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
    AND EXISTS (
      SELECT 1
      FROM public.flashcard_decks d
      WHERE d.id = deck_id
        AND d.creator_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "flashcards_owner_update" ON public.flashcards;
CREATE POLICY "flashcards_owner_update"
  ON public.flashcards FOR UPDATE TO authenticated
  USING (
    lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
    AND EXISTS (
      SELECT 1
      FROM public.flashcard_decks d
      WHERE d.id = deck_id
        AND d.creator_id = (select auth.uid())
    )
  )
  WITH CHECK (
    lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
    AND EXISTS (
      SELECT 1
      FROM public.flashcard_decks d
      WHERE d.id = deck_id
        AND d.creator_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "subject_materials_owner_insert" ON public.subject_materials;
CREATE POLICY "subject_materials_owner_insert"
  ON public.subject_materials FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "Authenticated users can create material groups" ON public.material_groups;
CREATE POLICY "Authenticated users can create material groups"
  ON public.material_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = uploader_id
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "Uploader can update own material groups" ON public.material_groups;
CREATE POLICY "Uploader can update own material groups"
  ON public.material_groups
  FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = uploader_id
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  )
  WITH CHECK (
    (select auth.uid()) = uploader_id
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "subject_proposals_owner_insert" ON public.subject_proposals;
CREATE POLICY "subject_proposals_owner_insert"
  ON public.subject_proposals FOR INSERT TO authenticated
  WITH CHECK (
    proposed_by = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "subject_proposals_owner_pending_update" ON public.subject_proposals;
CREATE POLICY "subject_proposals_owner_pending_update"
  ON public.subject_proposals
  FOR UPDATE
  TO authenticated
  USING (
    proposed_by = (SELECT auth.uid())
    AND status = 'pending'
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  )
  WITH CHECK (
    proposed_by = (SELECT auth.uid())
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND rejection_reason IS NULL
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "subject_ratings_owner_insert" ON public.subject_ratings;
CREATE POLICY "subject_ratings_owner_insert"
  ON public.subject_ratings FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "subject_ratings_owner_or_admin_update" ON public.subject_ratings;
CREATE POLICY "subject_ratings_owner_or_admin_update"
  ON public.subject_ratings FOR UPDATE TO authenticated
  USING (
    (
      user_id = (select auth.uid())
      AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
    )
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  )
  WITH CHECK (
    (
      user_id = (select auth.uid())
      AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
    )
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "teacher_ratings_owner_insert" ON public.teacher_ratings;
CREATE POLICY "teacher_ratings_owner_insert"
  ON public.teacher_ratings FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

DROP POLICY IF EXISTS "teacher_ratings_owner_or_admin_update" ON public.teacher_ratings;
CREATE POLICY "teacher_ratings_owner_or_admin_update"
  ON public.teacher_ratings FOR UPDATE TO authenticated
  USING (
    (
      user_id = (select auth.uid())
      AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
    )
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  )
  WITH CHECK (
    (
      user_id = (select auth.uid())
      AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
    )
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

NOTIFY pgrst, 'reload schema';
