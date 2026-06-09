-- PR-2: prevent user-side material approval and reset approved reviews after edits.

DROP POLICY IF EXISTS "subject_materials_owner_insert" ON public.subject_materials;
CREATE POLICY "subject_materials_owner_insert"
  ON public.subject_materials FOR INSERT TO authenticated
  WITH CHECK (
    uploader_id = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
    AND moderation_status = 'pending'
    AND points_override IS NULL
    AND COALESCE(is_approved, false) = false
  );

CREATE OR REPLACE FUNCTION public.enforce_subject_material_pending_for_non_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') NOT IN ('admin', 'moderator') THEN
    NEW.moderation_status := 'pending';
    NEW.points_override := NULL;
    NEW.is_approved := false;
    NEW.moderated_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subject_materials_enforce_pending ON public.subject_materials;
CREATE TRIGGER trg_subject_materials_enforce_pending
BEFORE INSERT OR UPDATE ON public.subject_materials
FOR EACH ROW EXECUTE FUNCTION public.enforce_subject_material_pending_for_non_admin();

CREATE OR REPLACE FUNCTION public.protect_comment_is_approved()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  text_changed boolean := false;
BEGIN
  is_admin := COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'moderator');

  IF TG_TABLE_NAME = 'subject_ratings' THEN
    text_changed := NEW.comment IS DISTINCT FROM OLD.comment;
  ELSIF TG_TABLE_NAME = 'teacher_ratings' THEN
    text_changed := NEW.review IS DISTINCT FROM OLD.review;
  END IF;

  IF text_changed THEN
    NEW.comment_is_approved := false;
  END IF;

  IF NEW.comment_is_approved IS DISTINCT FROM OLD.comment_is_approved
     AND NOT is_admin
     AND NOT (text_changed AND COALESCE(NEW.comment_is_approved, false) = false) THEN
    RAISE EXCEPTION 'Only administrators or moderators can change approval state.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_subject_material_pending_for_non_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_comment_is_approved() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
