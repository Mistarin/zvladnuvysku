-- Extension pro trigram vyhledávání (funguji i pro češtinu)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Hlavní tabulka předmětů
CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,                    -- "Databázové systémy"
  short_tag text NOT NULL,               -- "DBS"
  description text,
  target_audience text,                  -- Pro koho je předmět
  real_requirements text,                -- Reálné požadavky od studentů
  difficulty smallint CHECK (difficulty BETWEEN 1 AND 5),
  time_intensity smallint CHECK (time_intensity BETWEEN 1 AND 5),
  attendance_required boolean DEFAULT false,
  credits smallint,
  semester text CHECK (semester IN ('zimní', 'letní', 'oba')),
  faculty text,                          -- "Přírodovědecká fakulta"
  department text,                       -- "Katedra informatiky"
  year smallint,                         -- Doporučený ročník
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigram indexy pro rychlé vyhledávání (funguje i bez slovníku)
CREATE INDEX idx_subjects_name_trgm ON subjects USING gin (name gin_trgm_ops);
CREATE INDEX idx_subjects_tag_trgm ON subjects USING gin (short_tag gin_trgm_ops);
CREATE INDEX idx_subjects_slug ON subjects (slug);

-- RLS: anonymní čtení, autentizovaný zápis
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Veřejné čtení předmětů"
  ON subjects FOR SELECT TO public USING (true);

CREATE POLICY "Moderátor může upravovat"
  ON subjects FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
  -- Poznámka: v produkci přidej role check (is_moderator)

-- Tagy předmětů (pro rozšířené filtrování)
CREATE TABLE subject_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  tag text NOT NULL,
  UNIQUE (subject_id, tag)
);

ALTER TABLE subject_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Veřejné čtení tagů"
  ON subject_tags FOR SELECT TO public USING (true);

-- Funkce pro automatické updatování updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
