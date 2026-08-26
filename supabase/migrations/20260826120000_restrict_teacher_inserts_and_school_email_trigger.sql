-- Restrict direct teacher inserts to authenticated @osu.cz users.
-- The old policy ("teachers_public_proposal_insert", TO public) allowed fully
-- anonymous clients to insert rows into public.teachers at unlimited volume.
--
-- Also extends the school-email write guard (from 20260823130000_harden_security_audit.sql)
-- to teachers so moderation-queue poisoning requires a valid school identity.

BEGIN;

DROP POLICY IF EXISTS "teachers_public_proposal_insert" ON public.teachers;
CREATE POLICY "teachers_authenticated_proposal_insert"
  ON public.teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (is_approved = false);

-- Defense in depth: same restriction as content tables, applied to teachers.
DROP TRIGGER IF EXISTS trg_enforce_school_email_writes ON public.teachers;
CREATE TRIGGER trg_enforce_school_email_writes
BEFORE INSERT OR UPDATE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.enforce_school_email_writes();

COMMIT;

NOTIFY pgrst, 'reload schema';
