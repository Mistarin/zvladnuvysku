-- 1. Zpětná vazba (Feedback)
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('bug', 'feature', 'other')),
  message text NOT NULL,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášený může přidat feedback"
  ON feedback FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anonym může přidat feedback"
  ON feedback FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Moderátor čte feedback"
  ON feedback FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

CREATE POLICY "Moderátor aktualizuje feedback"
  ON feedback FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

-- 2. Statistiky učitelů (Teacher Rating Stats)
CREATE TABLE teacher_rating_stats (
  teacher_id uuid PRIMARY KEY REFERENCES teachers(id) ON DELETE CASCADE,
  avg_rating numeric(3,2) DEFAULT 0,
  total_ratings integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teacher_rating_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Veřejné čtení statistik učitelů" ON teacher_rating_stats FOR SELECT TO public USING (true);

-- Auto-update trigger pro statistiky učitelů
CREATE OR REPLACE FUNCTION update_teacher_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO teacher_rating_stats (teacher_id, avg_rating, total_ratings, updated_at)
  SELECT
    COALESCE(NEW.teacher_id, OLD.teacher_id),
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*),
    now()
  FROM teacher_ratings
  WHERE teacher_id = COALESCE(NEW.teacher_id, OLD.teacher_id)
  ON CONFLICT (teacher_id) DO UPDATE SET
    avg_rating = EXCLUDED.avg_rating,
    total_ratings = EXCLUDED.total_ratings,
    updated_at = now();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_teacher_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON teacher_ratings
FOR EACH ROW EXECUTE FUNCTION update_teacher_rating_stats();

-- Init statistik z existujících dat
INSERT INTO teacher_rating_stats (teacher_id, avg_rating, total_ratings)
SELECT teacher_id, ROUND(AVG(rating)::numeric, 2), COUNT(*)
FROM teacher_ratings
GROUP BY teacher_id
ON CONFLICT (teacher_id) DO UPDATE SET
  avg_rating = EXCLUDED.avg_rating,
  total_ratings = EXCLUDED.total_ratings;

-- 3. Pohled pro vyhledávání předmětů (Subject Search View)
CREATE OR REPLACE VIEW subject_search_view AS
SELECT 
  s.id,
  s.slug,
  s.name,
  s.short_tag,
  s.description,
  s.target_audience,
  s.real_requirements,
  s.difficulty,
  s.time_intensity,
  s.attendance_type,
  s.credits,
  s.semester,
  s.faculty,
  s.department,
  s.year,
  s.created_at,
  s.updated_at,
  COALESCE(srs.avg_overall, 0) AS avg_subject_rating,
  COALESCE(
    (SELECT ROUND(AVG(trs.avg_rating)::numeric, 2)
     FROM subject_teachers st
     JOIN teacher_rating_stats trs ON st.teacher_id = trs.teacher_id
     WHERE st.subject_id = s.id),
    0
  ) AS avg_teacher_rating
FROM subjects s
LEFT JOIN subject_rating_stats srs ON s.id = srs.subject_id;
