ALTER TABLE public.subject_ratings
  ADD COLUMN IF NOT EXISTS overall_rating smallint
  CHECK (overall_rating IS NULL OR (overall_rating >= 1 AND overall_rating <= 5));

UPDATE public.subject_ratings
SET overall_rating = overall
WHERE overall_rating IS DISTINCT FROM overall;

CREATE OR REPLACE FUNCTION public.sync_subject_rating_overall_alias()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.overall IS NULL AND NEW.overall_rating IS NOT NULL THEN
      NEW.overall := NEW.overall_rating;
    END IF;

    NEW.overall_rating := NEW.overall;
    RETURN NEW;
  END IF;

  IF NEW.overall_rating IS DISTINCT FROM OLD.overall_rating
     AND NEW.overall IS NOT DISTINCT FROM OLD.overall THEN
    NEW.overall := NEW.overall_rating;
  ELSE
    NEW.overall_rating := NEW.overall;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_subject_rating_overall_alias ON public.subject_ratings;
CREATE TRIGGER trg_sync_subject_rating_overall_alias
BEFORE INSERT OR UPDATE ON public.subject_ratings
FOR EACH ROW
EXECUTE FUNCTION public.sync_subject_rating_overall_alias();

REVOKE ALL ON FUNCTION public.sync_subject_rating_overall_alias() FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
