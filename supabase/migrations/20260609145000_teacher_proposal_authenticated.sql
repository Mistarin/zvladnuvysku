-- PR-9: require authenticated teacher proposals at the RLS boundary.

DROP POLICY IF EXISTS "teachers_public_proposal_insert" ON public.teachers;
CREATE POLICY "teachers_public_proposal_insert"
  ON public.teachers FOR INSERT TO authenticated
  WITH CHECK (
    is_approved = false
    AND proposed_by = (select auth.uid())
    AND lower(split_part(((select auth.jwt()) ->> 'email'), '@', 2)) = 'osu.cz'
  );

NOTIFY pgrst, 'reload schema';
