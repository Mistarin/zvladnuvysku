-- Add comment_is_approved column to subject_ratings and teacher_ratings
ALTER TABLE public.subject_ratings
ADD COLUMN IF NOT EXISTS comment_is_approved BOOLEAN DEFAULT false;

ALTER TABLE public.teacher_ratings
ADD COLUMN IF NOT EXISTS comment_is_approved BOOLEAN DEFAULT false;

DROP POLICY IF EXISTS "Veřejné čtení hodnocení" ON public.subject_ratings;
CREATE POLICY "Veřejné čtení schválených hodnocení"
  ON public.subject_ratings FOR SELECT TO public
  USING (comment IS NULL OR comment_is_approved = true);

DROP POLICY IF EXISTS "Uživatel čte své hodnocení předmětu" ON public.subject_ratings;
CREATE POLICY "Uživatel čte své hodnocení předmětu"
  ON public.subject_ratings FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admin čte všechna hodnocení předmětů" ON public.subject_ratings;
CREATE POLICY "Admin čte všechna hodnocení předmětů"
  ON public.subject_ratings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

DROP POLICY IF EXISTS "Veřejné čtení hodnocení učitelů" ON public.teacher_ratings;
CREATE POLICY "Veřejné čtení schválených hodnocení učitelů"
  ON public.teacher_ratings FOR SELECT TO public
  USING (review IS NULL OR comment_is_approved = true);

DROP POLICY IF EXISTS "Uživatel čte své hodnocení učitele" ON public.teacher_ratings;
CREATE POLICY "Uživatel čte své hodnocení učitele"
  ON public.teacher_ratings FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admin čte všechna hodnocení učitelů" ON public.teacher_ratings;
CREATE POLICY "Admin čte všechna hodnocení učitelů"
  ON public.teacher_ratings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));
