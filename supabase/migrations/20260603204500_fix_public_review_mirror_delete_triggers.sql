CREATE OR REPLACE FUNCTION public.sync_public_subject_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_row public.subject_ratings%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_subject_reviews
    WHERE id = OLD.id;

    RETURN NULL;
  END IF;

  source_row := NEW;

  IF source_row.comment IS NOT NULL AND source_row.comment_is_approved = true THEN
    INSERT INTO public.public_subject_reviews (
      id,
      subject_id,
      overall,
      comment,
      created_at,
      author_user_id,
      is_anonymous
    )
    VALUES (
      source_row.id,
      source_row.subject_id,
      source_row.overall,
      source_row.comment,
      source_row.created_at,
      CASE WHEN source_row.is_anonymous THEN NULL ELSE source_row.user_id END,
      source_row.is_anonymous
    )
    ON CONFLICT (id) DO UPDATE
    SET
      subject_id = EXCLUDED.subject_id,
      overall = EXCLUDED.overall,
      comment = EXCLUDED.comment,
      created_at = EXCLUDED.created_at,
      author_user_id = EXCLUDED.author_user_id,
      is_anonymous = EXCLUDED.is_anonymous;
  ELSE
    DELETE FROM public.public_subject_reviews
    WHERE id = source_row.id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_public_teacher_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_row public.teacher_ratings%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_teacher_reviews
    WHERE id = OLD.id;

    RETURN NULL;
  END IF;

  source_row := NEW;

  IF source_row.review IS NOT NULL AND source_row.comment_is_approved = true THEN
    INSERT INTO public.public_teacher_reviews (
      id,
      teacher_id,
      rating,
      review,
      created_at,
      author_user_id,
      is_anonymous
    )
    VALUES (
      source_row.id,
      source_row.teacher_id,
      source_row.rating,
      source_row.review,
      source_row.created_at,
      CASE WHEN source_row.is_anonymous THEN NULL ELSE source_row.user_id END,
      source_row.is_anonymous
    )
    ON CONFLICT (id) DO UPDATE
    SET
      teacher_id = EXCLUDED.teacher_id,
      rating = EXCLUDED.rating,
      review = EXCLUDED.review,
      created_at = EXCLUDED.created_at,
      author_user_id = EXCLUDED.author_user_id,
      is_anonymous = EXCLUDED.is_anonymous;
  ELSE
    DELETE FROM public.public_teacher_reviews
    WHERE id = source_row.id;
  END IF;

  RETURN NULL;
END;
$$;
