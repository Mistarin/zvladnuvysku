DROP POLICY IF EXISTS "subject_materials_admin_insert" ON public.subject_materials;
CREATE POLICY "subject_materials_admin_insert"
  ON public.subject_materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

NOTIFY pgrst, 'reload schema';
