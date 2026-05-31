ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS attendance_type text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subjects'
      AND column_name = 'attendance_required'
  ) THEN
    UPDATE subjects
    SET attendance_type = CASE
      WHEN attendance_required = true THEN 'required'
      ELSE 'optional'
    END
    WHERE attendance_type IS NULL;
  ELSE
    UPDATE subjects
    SET attendance_type = 'optional'
    WHERE attendance_type IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subjects_attendance_type_check'
  ) THEN
    ALTER TABLE subjects
      ADD CONSTRAINT subjects_attendance_type_check
      CHECK (attendance_type IS NULL OR attendance_type IN ('optional', 'recommended', 'required'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  faculty text NOT NULL,
  department text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_slug_unique
  ON teachers (slug);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Veřejné čtení učitelů" ON teachers;
CREATE POLICY "Veřejné čtení učitelů"
  ON teachers FOR SELECT TO public
  USING (
    is_approved = true
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS "Návrh učitele" ON teachers;
CREATE POLICY "Návrh učitele"
  ON teachers FOR INSERT TO public
  WITH CHECK (is_approved = false);

DROP POLICY IF EXISTS "Admin úprava učitelů" ON teachers;
CREATE POLICY "Admin úprava učitelů"
  ON teachers FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

DROP POLICY IF EXISTS "Admin mazání učitelů" ON teachers;
CREATE POLICY "Admin mazání učitelů"
  ON teachers FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

CREATE TABLE IF NOT EXISTS teacher_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  review text CHECK (char_length(review) <= 2000),
  comment_is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (teacher_id, user_id)
);

ALTER TABLE teacher_ratings
  ADD COLUMN IF NOT EXISTS comment_is_approved boolean DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_ratings_teacher_user_unique
  ON teacher_ratings (teacher_id, user_id);

ALTER TABLE teacher_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Veřejné čtení hodnocení učitelů" ON teacher_ratings;
DROP POLICY IF EXISTS "Veřejné čtení schválených hodnocení učitelů" ON teacher_ratings;
CREATE POLICY "Veřejné čtení schválených hodnocení učitelů"
  ON teacher_ratings FOR SELECT TO public
  USING (review IS NULL OR comment_is_approved = true);

DROP POLICY IF EXISTS "Přihlášený může hodnotit učitele" ON teacher_ratings;
CREATE POLICY "Přihlášený může hodnotit učitele"
  ON teacher_ratings FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Přihlášený upraví vlastní hodnocení učitele" ON teacher_ratings;
CREATE POLICY "Přihlášený upraví vlastní hodnocení učitele"
  ON teacher_ratings FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Uživatel čte své hodnocení učitele" ON teacher_ratings;
CREATE POLICY "Uživatel čte své hodnocení učitele"
  ON teacher_ratings FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admin čte všechna hodnocení učitelů" ON teacher_ratings;
CREATE POLICY "Admin čte všechna hodnocení učitelů"
  ON teacher_ratings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

CREATE TABLE IF NOT EXISTS subject_teachers (
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  PRIMARY KEY (subject_id, teacher_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subject_teachers_subject_teacher_unique
  ON subject_teachers (subject_id, teacher_id);

ALTER TABLE subject_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Veřejné čtení učitelů předmětů" ON subject_teachers;
CREATE POLICY "Veřejné čtení učitelů předmětů"
  ON subject_teachers FOR SELECT TO public USING (true);

CREATE TABLE IF NOT EXISTS subject_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_path text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  is_approved boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  moderated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subject_materials
  ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subject_materials_moderation_status_check'
  ) THEN
    ALTER TABLE subject_materials
      ADD CONSTRAINT subject_materials_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

UPDATE subject_materials
SET is_approved = true
WHERE moderation_status = 'approved'
  AND is_approved IS DISTINCT FROM true;

ALTER TABLE subject_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Veřejné čtení schválených materiálů" ON subject_materials;
CREATE POLICY "Veřejné čtení schválených materiálů"
  ON subject_materials FOR SELECT TO public
  USING (moderation_status = 'approved');

DROP POLICY IF EXISTS "Přihlášený může vložit materiál" ON subject_materials;
CREATE POLICY "Přihlášený může vložit materiál"
  ON subject_materials FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = uploader_id);

DROP POLICY IF EXISTS "Uploader čte své materiály" ON subject_materials;
CREATE POLICY "Uploader čte své materiály"
  ON subject_materials FOR SELECT TO authenticated
  USING ((select auth.uid()) = uploader_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study_materials',
  'study_materials',
  true,
  2097152,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read study materials" ON storage.objects;
CREATE POLICY "Public can read study materials"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'study_materials');

DROP POLICY IF EXISTS "Authenticated users can upload study materials" ON storage.objects;
CREATE POLICY "Authenticated users can upload study materials"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'study_materials');

DROP POLICY IF EXISTS "Authenticated users can update study materials" ON storage.objects;
CREATE POLICY "Authenticated users can update study materials"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'study_materials')
  WITH CHECK (bucket_id = 'study_materials');

DROP POLICY IF EXISTS "Authenticated users can delete study materials" ON storage.objects;
CREATE POLICY "Authenticated users can delete study materials"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'study_materials');

CREATE TABLE IF NOT EXISTS teacher_rating_stats (
  teacher_id uuid PRIMARY KEY REFERENCES teachers(id) ON DELETE CASCADE,
  avg_rating numeric(3,2) DEFAULT 0,
  total_ratings integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teacher_rating_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Veřejné čtení statistik učitelů" ON teacher_rating_stats;
CREATE POLICY "Veřejné čtení statistik učitelů"
  ON teacher_rating_stats FOR SELECT TO public USING (true);

CREATE OR REPLACE FUNCTION update_teacher_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id uuid;
  v_avg_rating numeric;
  v_count integer;
BEGIN
  v_teacher_id := COALESCE(NEW.teacher_id, OLD.teacher_id);

  IF v_teacher_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM teachers WHERE id = v_teacher_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*)
  INTO v_avg_rating, v_count
  FROM teacher_ratings
  WHERE teacher_id = v_teacher_id;

  INSERT INTO teacher_rating_stats (
    teacher_id,
    avg_rating,
    total_ratings,
    updated_at
  )
  VALUES (
    v_teacher_id,
    COALESCE(v_avg_rating, 0),
    COALESCE(v_count, 0),
    now()
  )
  ON CONFLICT (teacher_id) DO UPDATE SET
    avg_rating = EXCLUDED.avg_rating,
    total_ratings = EXCLUDED.total_ratings,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_update_teacher_rating_stats ON teacher_ratings;
CREATE TRIGGER trg_update_teacher_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON teacher_ratings
FOR EACH ROW EXECUTE FUNCTION update_teacher_rating_stats();

ALTER TABLE subject_ratings
  ADD COLUMN IF NOT EXISTS comment_is_approved boolean DEFAULT false;

DROP POLICY IF EXISTS "Veřejné čtení hodnocení" ON subject_ratings;
DROP POLICY IF EXISTS "Veřejné čtení schválených hodnocení" ON subject_ratings;
CREATE POLICY "Veřejné čtení schválených hodnocení"
  ON subject_ratings FOR SELECT TO public
  USING (comment IS NULL OR comment_is_approved = true);

DROP POLICY IF EXISTS "Uživatel čte své hodnocení předmětu" ON subject_ratings;
CREATE POLICY "Uživatel čte své hodnocení předmětu"
  ON subject_ratings FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admin čte všechna hodnocení předmětů" ON subject_ratings;
CREATE POLICY "Admin čte všechna hodnocení předmětů"
  ON subject_ratings FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator'));

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
    (
      SELECT ROUND(AVG(trs.avg_rating)::numeric, 2)
      FROM subject_teachers st
      JOIN teacher_rating_stats trs ON st.teacher_id = trs.teacher_id
      WHERE st.subject_id = s.id
    ),
    0
  ) AS avg_teacher_rating
FROM subjects s
LEFT JOIN subject_rating_stats srs ON s.id = srs.subject_id;
