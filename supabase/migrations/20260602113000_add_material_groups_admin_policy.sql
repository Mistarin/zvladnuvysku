DROP POLICY IF EXISTS "Admins can create material groups" ON public.material_groups;

CREATE POLICY "Admins can create material groups"
  ON public.material_groups
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));
