-- Tabulka pro návrhy předmětů od studentů
CREATE TABLE subject_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('new', 'edit')),
  subject_id uuid REFERENCES subjects(id),
  data jsonb NOT NULL DEFAULT '{}',
  note text,
  proposed_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subject_proposals ENABLE ROW LEVEL SECURITY;

-- Přihlášený uživatel vidí pouze své vlastní návrhy
CREATE POLICY "Uživatel vidí své návrhy"
  ON subject_proposals FOR SELECT TO authenticated
  USING ((select auth.uid()) = proposed_by);

-- Admin/moderátor vidí všechny návrhy
CREATE POLICY "Admin vidí všechny návrhy"
  ON subject_proposals FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

-- Přihlášený uživatel může vložit návrh za sebe
CREATE POLICY "Uživatel může navrhnout"
  ON subject_proposals FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = proposed_by);

-- Admin/moderátor může aktualizovat stav návrhu
CREATE POLICY "Admin může aktualizovat návrhy"
  ON subject_proposals FOR UPDATE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

-- Admin/moderátor může mazat návrhy
CREATE POLICY "Admin může mazat návrhy"
  ON subject_proposals FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );
