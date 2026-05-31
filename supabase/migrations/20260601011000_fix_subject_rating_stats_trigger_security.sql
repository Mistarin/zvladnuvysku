CREATE OR REPLACE FUNCTION public.update_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subject_id uuid;
  v_avg_overall numeric;
  v_avg_difficulty numeric;
  v_avg_usefulness numeric;
  v_avg_workload numeric;
  v_count integer;
BEGIN
  v_subject_id := COALESCE(NEW.subject_id, OLD.subject_id);

  IF v_subject_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE id = v_subject_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    ROUND(AVG(overall)::numeric, 2),
    ROUND(AVG(difficulty)::numeric, 2),
    ROUND(AVG(usefulness)::numeric, 2),
    ROUND(AVG(workload)::numeric, 2),
    COUNT(*)
  INTO v_avg_overall, v_avg_difficulty, v_avg_usefulness, v_avg_workload, v_count
  FROM public.subject_ratings
  WHERE subject_id = v_subject_id;

  INSERT INTO public.subject_rating_stats (
    subject_id,
    avg_overall,
    avg_difficulty,
    avg_usefulness,
    avg_workload,
    total_ratings,
    updated_at
  )
  VALUES (
    v_subject_id,
    COALESCE(v_avg_overall, 0),
    COALESCE(v_avg_difficulty, 0),
    COALESCE(v_avg_usefulness, 0),
    COALESCE(v_avg_workload, 0),
    COALESCE(v_count, 0),
    now()
  )
  ON CONFLICT (subject_id) DO UPDATE SET
    avg_overall = EXCLUDED.avg_overall,
    avg_difficulty = EXCLUDED.avg_difficulty,
    avg_usefulness = EXCLUDED.avg_usefulness,
    avg_workload = EXCLUDED.avg_workload,
    total_ratings = EXCLUDED.total_ratings,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.update_rating_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_rating_stats() FROM anon;
REVOKE ALL ON FUNCTION public.update_rating_stats() FROM authenticated;
