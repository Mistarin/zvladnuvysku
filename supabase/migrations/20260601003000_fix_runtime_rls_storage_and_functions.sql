-- Align the live Supabase project with the application access model.
-- This migration is intentionally idempotent because the remote schema was
-- ahead of some local migrations and behind others.

ALTER TABLE public.subject_proposals
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submission_token text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_proposals_submission_token
  ON public.subject_proposals (submission_token)
  WHERE submission_token IS NOT NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('study_materials', 'study_materials', true, 2097152, ARRAY['application/pdf']),
  ('flashcard_media', 'flashcard_media', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE INDEX IF NOT EXISTS idx_card_progress_card_id ON public.card_progress (card_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_creator_id ON public.flashcard_decks (creator_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_subject_id ON public.flashcard_decks (subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_materials_subject_id ON public.subject_materials (subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_materials_uploader_id ON public.subject_materials (uploader_id);
CREATE INDEX IF NOT EXISTS idx_subject_proposals_proposed_by ON public.subject_proposals (proposed_by);
CREATE INDEX IF NOT EXISTS idx_subject_proposals_reviewed_by ON public.subject_proposals (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_subject_proposals_subject_id ON public.subject_proposals (subject_id);
CREATE INDEX IF NOT EXISTS idx_subject_ratings_user_id ON public.subject_ratings (user_id);
CREATE INDEX IF NOT EXISTS idx_subject_teachers_teacher_id ON public.subject_teachers (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_ratings_user_id ON public.teacher_ratings (user_id);

DROP INDEX IF EXISTS public.idx_subjects_tag_trgm;

ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_deck_card_count() SET search_path = public;
ALTER FUNCTION public.update_rating_stats() SET search_path = public;
ALTER FUNCTION public.update_teacher_rating_stats() SET search_path = public;
ALTER FUNCTION public.protect_comment_is_approved() SET search_path = public;

CREATE OR REPLACE FUNCTION public.delete_subject_material_on_storage_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.bucket_id = 'study_materials' THEN
    DELETE FROM public.subject_materials
    WHERE file_path = OLD.name;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_deck_card_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_rating_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_teacher_rating_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_comment_is_approved() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_subject_material_on_storage_delete() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "study_materials_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_owner_or_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "Public can read study materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload study materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update study materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete study materials" ON storage.objects;
DROP POLICY IF EXISTS "Verejne cteni materialu ze storage" ON storage.objects;
DROP POLICY IF EXISTS "Veřejné čtení materiálů ze storage" ON storage.objects;
DROP POLICY IF EXISTS "Prihlaseni uzivatele mohou nahravat do storage" ON storage.objects;
DROP POLICY IF EXISTS "Přihlášení uživatelé mohou nahrávat do storage" ON storage.objects;
DROP POLICY IF EXISTS "Uzivatele mohou mazat sve soubory ze storage" ON storage.objects;
DROP POLICY IF EXISTS "Uživatelé mohou mazat své soubory ze storage" ON storage.objects;

CREATE POLICY "study_materials_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'study_materials' AND owner = (select auth.uid()));

CREATE POLICY "study_materials_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'study_materials' AND owner = (select auth.uid()));

CREATE POLICY "study_materials_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'study_materials' AND owner = (select auth.uid()))
  WITH CHECK (bucket_id = 'study_materials' AND owner = (select auth.uid()));

CREATE POLICY "study_materials_owner_or_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'study_materials'
    AND (
      owner = (select auth.uid())
      OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "flashcard_media_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_media_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_media_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "flashcard_media_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "Public can read flashcard images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload flashcard images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own flashcard images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own flashcard images" ON storage.objects;

CREATE POLICY "flashcard_media_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );

CREATE POLICY "flashcard_media_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );

CREATE POLICY "flashcard_media_owner_update"
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

CREATE POLICY "flashcard_media_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'flashcard_media'
    AND (storage.foldername(name))[1] = 'questions'
    AND (storage.foldername(name))[2] = (select auth.uid())::text
  );

DROP POLICY IF EXISTS "subjects_public_select" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_insert" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_update" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_delete" ON public.subjects;
DROP POLICY IF EXISTS "Moderátor může upravovat" ON public.subjects;
DROP POLICY IF EXISTS "Admins can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can delete subjects" ON public.subjects;
DROP POLICY IF EXISTS "Veřejné čtení předmětů" ON public.subjects;

CREATE POLICY "subjects_public_select"
  ON public.subjects FOR SELECT TO public
  USING (true);

CREATE POLICY "subjects_admin_insert"
  ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

CREATE POLICY "subjects_admin_update"
  ON public.subjects FOR UPDATE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'))
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

CREATE POLICY "subjects_admin_delete"
  ON public.subjects FOR DELETE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

DROP POLICY IF EXISTS "teachers_public_select" ON public.teachers;
DROP POLICY IF EXISTS "teachers_public_proposal_insert" ON public.teachers;
DROP POLICY IF EXISTS "teachers_admin_update" ON public.teachers;
DROP POLICY IF EXISTS "teachers_admin_delete" ON public.teachers;
DROP POLICY IF EXISTS "Veřejné čtení učitelů" ON public.teachers;
DROP POLICY IF EXISTS "Učitelé jsou veřejně dostupní" ON public.teachers;
DROP POLICY IF EXISTS "Návrh učitele" ON public.teachers;
DROP POLICY IF EXISTS "Admin úprava učitelů" ON public.teachers;
DROP POLICY IF EXISTS "Admin mazání učitelů" ON public.teachers;

CREATE POLICY "teachers_public_select"
  ON public.teachers FOR SELECT TO public
  USING (
    is_approved = true
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

CREATE POLICY "teachers_public_proposal_insert"
  ON public.teachers FOR INSERT TO public
  WITH CHECK (is_approved = false);

CREATE POLICY "teachers_admin_update"
  ON public.teachers FOR UPDATE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'))
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

CREATE POLICY "teachers_admin_delete"
  ON public.teachers FOR DELETE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

DROP POLICY IF EXISTS "flashcard_decks_select" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_owner_insert" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_owner_update" ON public.flashcard_decks;
DROP POLICY IF EXISTS "flashcard_decks_owner_delete" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Veřejné decky" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Vlastní decky" ON public.flashcard_decks;

CREATE POLICY "flashcard_decks_select"
  ON public.flashcard_decks FOR SELECT TO public
  USING (is_public = true OR creator_id = (select auth.uid()));

CREATE POLICY "flashcard_decks_owner_insert"
  ON public.flashcard_decks FOR INSERT TO authenticated
  WITH CHECK (creator_id = (select auth.uid()));

CREATE POLICY "flashcard_decks_owner_update"
  ON public.flashcard_decks FOR UPDATE TO authenticated
  USING (creator_id = (select auth.uid()))
  WITH CHECK (creator_id = (select auth.uid()));

CREATE POLICY "flashcard_decks_owner_delete"
  ON public.flashcard_decks FOR DELETE TO authenticated
  USING (creator_id = (select auth.uid()));

DROP POLICY IF EXISTS "flashcards_select" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_owner_insert" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_owner_update" ON public.flashcards;
DROP POLICY IF EXISTS "flashcards_owner_delete" ON public.flashcards;
DROP POLICY IF EXISTS "Karty z veřejných decků" ON public.flashcards;
DROP POLICY IF EXISTS "Vlastní karty" ON public.flashcards;

CREATE POLICY "flashcards_select"
  ON public.flashcards FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.flashcard_decks d
      WHERE d.id = deck_id
        AND (d.is_public = true OR d.creator_id = (select auth.uid()))
    )
  );

CREATE POLICY "flashcards_owner_insert"
  ON public.flashcards FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.flashcard_decks d
      WHERE d.id = deck_id
        AND d.creator_id = (select auth.uid())
    )
  );

CREATE POLICY "flashcards_owner_update"
  ON public.flashcards FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.flashcard_decks d
      WHERE d.id = deck_id
        AND d.creator_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.flashcard_decks d
      WHERE d.id = deck_id
        AND d.creator_id = (select auth.uid())
    )
  );

CREATE POLICY "flashcards_owner_delete"
  ON public.flashcards FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.flashcard_decks d
      WHERE d.id = deck_id
        AND d.creator_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
DROP POLICY IF EXISTS "Uživatel čte svůj profil" ON public.profiles;
DROP POLICY IF EXISTS "Veřejné čtení profilů" ON public.profiles;
DROP POLICY IF EXISTS "Uživatel vloží svůj profil" ON public.profiles;
DROP POLICY IF EXISTS "Uživatel upraví svůj profil" ON public.profiles;

CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT TO public
  USING (
    (display_name IS NOT NULL AND btrim(display_name) <> '')
    OR user_id = (select auth.uid())
  );

CREATE POLICY "profiles_owner_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "profiles_owner_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "subject_materials_select" ON public.subject_materials;
DROP POLICY IF EXISTS "subject_materials_owner_insert" ON public.subject_materials;
DROP POLICY IF EXISTS "subject_materials_admin_update" ON public.subject_materials;
DROP POLICY IF EXISTS "subject_materials_owner_or_admin_delete" ON public.subject_materials;
DROP POLICY IF EXISTS "Veřejnost vidí jen schválené materiály" ON public.subject_materials;
DROP POLICY IF EXISTS "Autoři a admini vidí i neschválené" ON public.subject_materials;
DROP POLICY IF EXISTS "Veřejné čtení schválených materiálů" ON public.subject_materials;
DROP POLICY IF EXISTS "Uploader čte své materiály" ON public.subject_materials;
DROP POLICY IF EXISTS "Přihlášený může vložit materiál" ON public.subject_materials;
DROP POLICY IF EXISTS "Přihlášení uživatelé mohou přidávat materiály" ON public.subject_materials;
DROP POLICY IF EXISTS "Majitel může smazat svůj materiál" ON public.subject_materials;

CREATE POLICY "subject_materials_select"
  ON public.subject_materials FOR SELECT TO public
  USING (
    moderation_status = 'approved'
    OR uploader_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

CREATE POLICY "subject_materials_owner_insert"
  ON public.subject_materials FOR INSERT TO authenticated
  WITH CHECK (uploader_id = (select auth.uid()));

CREATE POLICY "subject_materials_admin_update"
  ON public.subject_materials FOR UPDATE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'))
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

CREATE POLICY "subject_materials_owner_or_admin_delete"
  ON public.subject_materials FOR DELETE TO authenticated
  USING (
    uploader_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "feedback_insert" ON public.feedback;
DROP POLICY IF EXISTS "feedback_select" ON public.feedback;
DROP POLICY IF EXISTS "feedback_admin_update" ON public.feedback;
DROP POLICY IF EXISTS "Anonym může přidat feedback" ON public.feedback;
DROP POLICY IF EXISTS "Přihlášený může přidat feedback" ON public.feedback;
DROP POLICY IF EXISTS "Moderátor čte feedback" ON public.feedback;
DROP POLICY IF EXISTS "Moderátor aktualizuje feedback" ON public.feedback;
DROP POLICY IF EXISTS "Uživatel čte svůj feedback" ON public.feedback;

CREATE POLICY "feedback_insert"
  ON public.feedback FOR INSERT TO public
  WITH CHECK (
    type IN ('bug', 'feature', 'other')
    AND char_length(btrim(message)) > 0
    AND (user_id IS NULL OR user_id = (select auth.uid()))
  );

CREATE POLICY "feedback_select"
  ON public.feedback FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

CREATE POLICY "feedback_admin_update"
  ON public.feedback FOR UPDATE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'))
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

DROP POLICY IF EXISTS "subject_proposals_owner_insert" ON public.subject_proposals;
DROP POLICY IF EXISTS "subject_proposals_select" ON public.subject_proposals;
DROP POLICY IF EXISTS "subject_proposals_admin_update" ON public.subject_proposals;
DROP POLICY IF EXISTS "subject_proposals_admin_delete" ON public.subject_proposals;
DROP POLICY IF EXISTS "Uživatel může navrhnout" ON public.subject_proposals;
DROP POLICY IF EXISTS "students_insert" ON public.subject_proposals;
DROP POLICY IF EXISTS "Uživatel vidí své návrhy" ON public.subject_proposals;
DROP POLICY IF EXISTS "students_select_own" ON public.subject_proposals;
DROP POLICY IF EXISTS "Admin vidí všechny návrhy" ON public.subject_proposals;
DROP POLICY IF EXISTS "Admin může aktualizovat návrhy" ON public.subject_proposals;
DROP POLICY IF EXISTS "Admin může mazat návrhy" ON public.subject_proposals;
DROP POLICY IF EXISTS "Admins can approve proposals" ON public.subject_proposals;

CREATE POLICY "subject_proposals_owner_insert"
  ON public.subject_proposals FOR INSERT TO authenticated
  WITH CHECK (proposed_by = (select auth.uid()));

CREATE POLICY "subject_proposals_select"
  ON public.subject_proposals FOR SELECT TO authenticated
  USING (
    proposed_by = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

CREATE POLICY "subject_proposals_admin_update"
  ON public.subject_proposals FOR UPDATE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'))
  WITH CHECK (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

CREATE POLICY "subject_proposals_admin_delete"
  ON public.subject_proposals FOR DELETE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

DROP POLICY IF EXISTS "subject_ratings_select" ON public.subject_ratings;
DROP POLICY IF EXISTS "subject_ratings_owner_insert" ON public.subject_ratings;
DROP POLICY IF EXISTS "subject_ratings_owner_or_admin_update" ON public.subject_ratings;
DROP POLICY IF EXISTS "Veřejné čtení hodnocení" ON public.subject_ratings;
DROP POLICY IF EXISTS "Veřejné čtení schválených hodnocení" ON public.subject_ratings;
DROP POLICY IF EXISTS "Uživatel čte své hodnocení předmětu" ON public.subject_ratings;
DROP POLICY IF EXISTS "Admin čte všechna hodnocení předmětů" ON public.subject_ratings;
DROP POLICY IF EXISTS "Přihlášený může hodnotit" ON public.subject_ratings;
DROP POLICY IF EXISTS "Přihlášený upraví vlastní" ON public.subject_ratings;

CREATE POLICY "subject_ratings_select"
  ON public.subject_ratings FOR SELECT TO public
  USING (
    comment IS NULL
    OR comment_is_approved = true
    OR user_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

CREATE POLICY "subject_ratings_owner_insert"
  ON public.subject_ratings FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "subject_ratings_owner_or_admin_update"
  ON public.subject_ratings FOR UPDATE TO authenticated
  USING (
    user_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "teacher_ratings_select" ON public.teacher_ratings;
DROP POLICY IF EXISTS "teacher_ratings_owner_insert" ON public.teacher_ratings;
DROP POLICY IF EXISTS "teacher_ratings_owner_or_admin_update" ON public.teacher_ratings;
DROP POLICY IF EXISTS "teacher_ratings_owner_delete" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Hodnocení učitelů jsou veřejná" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Veřejné čtení hodnocení učitelů" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Veřejné čtení schválených hodnocení učitelů" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Uživatel čte své hodnocení učitele" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Admin čte všechna hodnocení učitelů" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Přihlášení uživatelé mohou hodnotit" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Přihlášený může hodnotit učitele" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Správa vlastního hodnocení" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Přihlášený upraví vlastní hodnocení učitele" ON public.teacher_ratings;
DROP POLICY IF EXISTS "Smazání vlastního hodnocení" ON public.teacher_ratings;

CREATE POLICY "teacher_ratings_select"
  ON public.teacher_ratings FOR SELECT TO public
  USING (
    review IS NULL
    OR comment_is_approved = true
    OR user_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

CREATE POLICY "teacher_ratings_owner_insert"
  ON public.teacher_ratings FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "teacher_ratings_owner_or_admin_update"
  ON public.teacher_ratings FOR UPDATE TO authenticated
  USING (
    user_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

CREATE POLICY "teacher_ratings_owner_delete"
  ON public.teacher_ratings FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.get_public_profile_subject_proposals(
  profile_user_id uuid,
  entry_limit integer DEFAULT 20
)
RETURNS TABLE (
  proposal_id uuid,
  proposal_type text,
  created_at timestamptz,
  subject_name text,
  subject_short_tag text,
  subject_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sp.id AS proposal_id,
    sp.type AS proposal_type,
    sp.created_at,
    COALESCE(
      NULLIF(btrim(s.name), ''),
      NULLIF(btrim(sp.data ->> 'name'), ''),
      NULLIF(btrim(sp.data ->> 'short_tag'), ''),
      'Schvaleny navrh'
    ) AS subject_name,
    COALESCE(
      NULLIF(btrim(s.short_tag), ''),
      NULLIF(btrim(sp.data ->> 'short_tag'), '')
    ) AS subject_short_tag,
    s.slug AS subject_slug
  FROM public.subject_proposals sp
  LEFT JOIN public.subjects s ON s.id = sp.subject_id
  WHERE sp.proposed_by = profile_user_id
    AND sp.status = 'approved'
  ORDER BY sp.created_at DESC
  LIMIT GREATEST(COALESCE(entry_limit, 20), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_profile_subject_proposals(uuid, integer) TO anon, authenticated;

DROP VIEW IF EXISTS public.subject_search_view;

CREATE VIEW public.subject_search_view
WITH (security_invoker = true)
AS
SELECT
  s.id,
  s.slug,
  s.name,
  s.short_tag,
  s.description,
  s.target_audience,
  s.real_requirements,
  s.difficulty,
  s.time_intensity,
  s.attendance_type,
  s.credits,
  s.exam_from_home,
  s.semester,
  s.faculty,
  s.department,
  s.year,
  s.created_at,
  s.updated_at,
  COALESCE(srs.avg_overall, 0) AS avg_subject_rating,
  COALESCE(
    (
      SELECT ROUND(AVG(trs.avg_rating)::numeric, 2)
      FROM public.subject_teachers st
      JOIN public.teacher_rating_stats trs ON st.teacher_id = trs.teacher_id
      WHERE st.subject_id = s.id
    ),
    0
  ) AS avg_teacher_rating
FROM public.subjects s
LEFT JOIN public.subject_rating_stats srs ON s.id = srs.subject_id;

REVOKE ALL ON public.subject_search_view FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subject_search_view TO anon, authenticated;
