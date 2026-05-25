-- Hodnocení předmětů (fáze 2+)
CREATE TABLE subject_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  difficulty smallint CHECK (difficulty BETWEEN 1 AND 5),
  usefulness smallint CHECK (usefulness BETWEEN 1 AND 5),
  workload smallint CHECK (workload BETWEEN 1 AND 5),
  overall smallint NOT NULL CHECK (overall BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 2000),
  created_at timestamptz DEFAULT now(),
  UNIQUE (subject_id, user_id)  -- 1 hodnocení per user per předmět
);

-- Agregovaná statistika (denormalizováno pro rychlé čtení bez JOIN)
CREATE TABLE subject_rating_stats (
  subject_id uuid PRIMARY KEY REFERENCES subjects(id) ON DELETE CASCADE,
  avg_overall numeric(3,2) DEFAULT 0,
  avg_difficulty numeric(3,2) DEFAULT 0,
  avg_usefulness numeric(3,2) DEFAULT 0,
  avg_workload numeric(3,2) DEFAULT 0,
  total_ratings integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Auto-update trigger pro statistiky
CREATE OR REPLACE FUNCTION update_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subject_rating_stats (subject_id, avg_overall, avg_difficulty,
    avg_usefulness, avg_workload, total_ratings, updated_at)
  SELECT
    COALESCE(NEW.subject_id, OLD.subject_id),
    ROUND(AVG(overall)::numeric, 2),
    ROUND(AVG(difficulty)::numeric, 2),
    ROUND(AVG(usefulness)::numeric, 2),
    ROUND(AVG(workload)::numeric, 2),
    COUNT(*),
    now()
  FROM subject_ratings
  WHERE subject_id = COALESCE(NEW.subject_id, OLD.subject_id)
  ON CONFLICT (subject_id) DO UPDATE SET
    avg_overall = EXCLUDED.avg_overall,
    avg_difficulty = EXCLUDED.avg_difficulty,
    avg_usefulness = EXCLUDED.avg_usefulness,
    avg_workload = EXCLUDED.avg_workload,
    total_ratings = EXCLUDED.total_ratings,
    updated_at = now();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON subject_ratings
FOR EACH ROW EXECUTE FUNCTION update_rating_stats();

-- RLS politiky
ALTER TABLE subject_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subject_rating_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Veřejné čtení hodnocení" ON subject_ratings
  FOR SELECT TO public USING (true);
CREATE POLICY "Přihlášený může hodnotit" ON subject_ratings
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Přihlášený upraví vlastní" ON subject_ratings
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Veřejné čtení statistik" ON subject_rating_stats
  FOR SELECT TO public USING (true);
