-- PR-8: destructive admin operations require the admin role at the RLS layer.

DROP POLICY IF EXISTS "subjects_admin_delete" ON public.subjects;
CREATE POLICY "subjects_admin_delete"
  ON public.subjects FOR DELETE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "teachers_admin_delete" ON public.teachers;
CREATE POLICY "teachers_admin_delete"
  ON public.teachers FOR DELETE TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "subject_materials_owner_or_admin_delete" ON public.subject_materials;
CREATE POLICY "subject_materials_owner_or_admin_delete"
  ON public.subject_materials FOR DELETE TO authenticated
  USING (
    uploader_id = (select auth.uid())
    OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "study_materials_owner_or_admin_delete" ON storage.objects;
CREATE POLICY "study_materials_owner_or_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'study_materials'
    AND (
      owner = (select auth.uid())
      OR ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admins and moderators can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins and moderators can update departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

CREATE POLICY "Admins and moderators can insert departments"
  ON public.departments
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'moderator'));

CREATE POLICY "Admins and moderators can update departments"
  ON public.departments
  FOR UPDATE
  TO authenticated
  USING ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'moderator'))
  WITH CHECK ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'moderator'));

CREATE POLICY "Admins can delete departments"
  ON public.departments
  FOR DELETE
  TO authenticated
  USING ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

NOTIFY pgrst, 'reload schema';
