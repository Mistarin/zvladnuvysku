DROP POLICY IF EXISTS "teachers_admin_insert" ON public.teachers;
CREATE POLICY "teachers_admin_insert"
  ON public.teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "subject_teachers_admin_insert" ON public.subject_teachers;
CREATE POLICY "subject_teachers_admin_insert"
  ON public.subject_teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

NOTIFY pgrst, 'reload schema';
