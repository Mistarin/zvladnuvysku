ALTER TABLE public.subject_proposals
  ALTER COLUMN type SET NOT NULL,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN proposed_by SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.flashcard_decks
  ALTER COLUMN is_public SET NOT NULL,
  ALTER COLUMN card_count SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.flashcards
  ALTER COLUMN position SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

ALTER TABLE public.subject_materials
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN is_approved SET NOT NULL;

ALTER TABLE public.teachers
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN is_approved SET NOT NULL;

NOTIFY pgrst, 'reload schema';
