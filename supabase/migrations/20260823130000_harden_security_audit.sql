-- Security audit hardening.
-- Generated manually because the Supabase CLI is not installed in this workspace.
-- Apply this migration to the linked project before enabling private storage URLs.

BEGIN;

-- Defense in depth for the school-domain restriction. Supabase Auth issuance
-- should also use a Before User Created hook configured to allow only osu.cz.
CREATE OR REPLACE FUNCTION public.enforce_school_email_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.jwt() ->> 'role') = 'authenticated'
     AND lower(split_part(COALESCE((SELECT auth.jwt() ->> 'email'), ''), '@', 2)) <> 'osu.cz' THEN
    RAISE EXCEPTION 'Pouze účty s adresou @osu.cz mohou upravovat obsah.';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'subject_ratings', 'teacher_ratings', 'flashcard_decks', 'flashcards',
    'card_progress', 'subject_proposals', 'subject_materials', 'material_groups'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_school_email_writes ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER trg_enforce_school_email_writes BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_school_email_writes()',
      table_name
    );
  END LOOP;
END;
$$;

-- Files are served through the application route and short-lived signed URLs.
UPDATE storage.buckets
SET public = false
WHERE id IN ('study_materials', 'flashcard_media');

DROP POLICY IF EXISTS "study_materials_approved_public_select" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_owner_or_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_media_public_select" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_media_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_media_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_media_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_media_owner_delete" ON storage.objects;

CREATE POLICY "study_materials_approved_public_select"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'study_materials'
    AND EXISTS (
      SELECT 1
      FROM public.subject_materials material
      WHERE material.file_path = name
        AND material.moderation_status = 'approved'
    )
  );

CREATE POLICY "study_materials_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'study_materials'
    AND (
      owner = (SELECT auth.uid())
      OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
    )
  );

CREATE POLICY "study_materials_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'study_materials'
    AND owner = (SELECT auth.uid())
  );

CREATE POLICY "study_materials_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'study_materials'
    AND owner = (SELECT auth.uid())
  )
  WITH CHECK (
    bucket_id = 'study_materials'
    AND owner = (SELECT auth.uid())
  );

CREATE POLICY "study_materials_owner_or_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'study_materials'
    AND (
      owner = (SELECT auth.uid())
      OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
    )
  );

CREATE POLICY "flashcard_media_public_select"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'flashcard_media'
    AND EXISTS (
      SELECT 1
      FROM public.flashcards card
      JOIN public.flashcard_decks deck ON deck.id = card.deck_id
      WHERE card.media_path = name
        AND deck.is_public = true
    )
  );

CREATE POLICY "flashcard_media_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'flashcard_media'
    AND (
      (storage.foldername(name))[1] = 'questions'
      AND (
        (storage.foldername(name))[2] = (SELECT auth.uid())::text
        OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
      )
    )
  );

CREATE POLICY "flashcard_media_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

CREATE POLICY "flashcard_media_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

CREATE POLICY "flashcard_media_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'flashcard_media'
    AND (
      (
        (storage.foldername(name))[1] = 'questions'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
      )
      OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
    )
  );

-- A normal contributor can only create a new item awaiting moderation.
DROP POLICY IF EXISTS "subject_materials_owner_insert" ON public.subject_materials;
CREATE POLICY "subject_materials_owner_insert"
  ON public.subject_materials FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = (SELECT auth.uid())
    AND moderation_status = 'pending'
    AND points_override IS NULL
  );

-- Editing review text after approval sends it back to moderation.
CREATE OR REPLACE FUNCTION public.protect_subject_rating_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.comment_is_approved IS DISTINCT FROM OLD.comment_is_approved
     AND COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Pouze moderátor může změnit stav schválení.';
  END IF;

  IF NEW.comment IS DISTINCT FROM OLD.comment
     AND COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') NOT IN ('admin', 'moderator') THEN
    NEW.comment_is_approved := false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_teacher_rating_moderation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.comment_is_approved IS DISTINCT FROM OLD.comment_is_approved
     AND COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') NOT IN ('admin', 'moderator') THEN
    RAISE EXCEPTION 'Pouze moderátor může změnit stav schválení.';
  END IF;

  IF NEW.review IS DISTINCT FROM OLD.review
     AND COALESCE((SELECT auth.jwt() -> 'app_metadata' ->> 'role'), '') NOT IN ('admin', 'moderator') THEN
    NEW.comment_is_approved := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_subject_ratings ON public.subject_ratings;
CREATE TRIGGER trg_protect_subject_ratings
BEFORE UPDATE ON public.subject_ratings
FOR EACH ROW EXECUTE FUNCTION public.protect_subject_rating_moderation();

DROP TRIGGER IF EXISTS trg_protect_teacher_ratings ON public.teacher_ratings;
CREATE TRIGGER trg_protect_teacher_ratings
BEFORE UPDATE ON public.teacher_ratings
FOR EACH ROW EXECUTE FUNCTION public.protect_teacher_rating_moderation();

-- Anonymous users may see approved public comments, but not anonymous activity counts.
DROP POLICY IF EXISTS "subject_ratings_select" ON public.subject_ratings;
CREATE POLICY "subject_ratings_select"
  ON public.subject_ratings FOR SELECT TO public
  USING (
    comment IS NULL
    OR (
      comment_is_approved = true
      AND (
        COALESCE(is_anonymous, false) = false
        OR user_id = (SELECT auth.uid())
      )
    )
    OR user_id = (SELECT auth.uid())
    OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "teacher_ratings_select" ON public.teacher_ratings;
CREATE POLICY "teacher_ratings_select"
  ON public.teacher_ratings FOR SELECT TO public
  USING (
    review IS NULL
    OR (
      comment_is_approved = true
      AND (
        COALESCE(is_anonymous, false) = false
        OR user_id = (SELECT auth.uid())
      )
    )
    OR user_id = (SELECT auth.uid())
    OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

ALTER FUNCTION public.get_public_profile_stats(uuid) SECURITY INVOKER;

-- Keep proposal moderation data private. Anonymous clients only need safe public fields.
REVOKE SELECT ON public.subject_proposals FROM anon;
GRANT SELECT (id, type, subject_id, status, created_at) ON public.subject_proposals TO anon;

COMMIT;
