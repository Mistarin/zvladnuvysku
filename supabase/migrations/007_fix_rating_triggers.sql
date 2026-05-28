CREATE OR REPLACE FUNCTION update_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_id uuid;
  v_avg_overall numeric;
  v_avg_difficulty numeric;
  v_avg_time numeric;
  v_count int;
BEGIN
  v_subject_id := COALESCE(NEW.subject_id, OLD.subject_id);

  -- Pokud předmět už neexistuje (právě se maže), rovnou skonči
  IF NOT EXISTS (SELECT 1 FROM subjects WHERE id = v_subject_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT 
    ROUND(AVG(overall_rating)::numeric, 2),
    ROUND(AVG(difficulty_rating)::numeric, 2),
    ROUND(AVG(time_rating)::numeric, 2),
    COUNT(*)
  INTO v_avg_overall, v_avg_difficulty, v_avg_time, v_count
  FROM subject_ratings
  WHERE subject_id = v_subject_id;

  INSERT INTO subject_rating_stats (
    subject_id, avg_overall, avg_difficulty, avg_time, rating_count, updated_at
  )
  VALUES (
    v_subject_id, COALESCE(v_avg_overall, 0), COALESCE(v_avg_difficulty, 0), COALESCE(v_avg_time, 0), COALESCE(v_count, 0), now()
  )
  ON CONFLICT (subject_id) DO UPDATE SET
    avg_overall = EXCLUDED.avg_overall,
    avg_difficulty = EXCLUDED.avg_difficulty,
    avg_time = EXCLUDED.avg_time,
    rating_count = EXCLUDED.rating_count,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_teacher_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_teacher_id uuid;
  v_avg_rating numeric;
  v_count int;
BEGIN
  v_teacher_id := COALESCE(NEW.teacher_id, OLD.teacher_id);

  -- Pokud učitel už neexistuje (právě se maže), rovnou skonči
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
    teacher_id, avg_rating, rating_count, updated_at
  )
  VALUES (
    v_teacher_id, COALESCE(v_avg_rating, 0), COALESCE(v_count, 0), now()
  )
  ON CONFLICT (teacher_id) DO UPDATE SET
    avg_rating = EXCLUDED.avg_rating,
    rating_count = EXCLUDED.rating_count,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
