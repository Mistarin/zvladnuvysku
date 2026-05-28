-- 1. Zkouška z domova
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS exam_from_home boolean DEFAULT false;

-- 2. Schvalování učitelů
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Všichni stávající učitelé jsou automaticky schváleni
UPDATE teachers SET is_approved = true WHERE is_approved IS NULL OR is_approved = false;

-- RLS: veřejné čtení pouze schválených (admini vidí všechny)
DROP POLICY IF EXISTS "Veřejné čtení učitelů" ON teachers;
CREATE POLICY "Veřejné čtení učitelů"
  ON teachers FOR SELECT
  TO public
  USING (
    is_approved = true
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

-- RLS: kdokoliv může navrhnout učitele, ale is_approved bude vždy false
-- (Supabase DEFAULT false zajistí správnou hodnotu, toto pravidlo jen povolí INSERT)
DROP POLICY IF EXISTS "Návrh učitele" ON teachers;
CREATE POLICY "Návrh učitele"
  ON teachers FOR INSERT
  TO public
  WITH CHECK (is_approved = false);
