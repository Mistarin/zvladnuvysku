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
