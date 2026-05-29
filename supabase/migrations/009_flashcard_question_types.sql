ALTER TABLE flashcards
  ADD COLUMN IF NOT EXISTS question_type text NOT NULL DEFAULT 'classic_flashcard',
  ADD COLUMN IF NOT EXISTS prompt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS answer_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS media_path text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'flashcards_question_type_check'
  ) THEN
    ALTER TABLE flashcards
      ADD CONSTRAINT flashcards_question_type_check
      CHECK (question_type IN ('classic_flashcard', 'multiple_choice', 'yes_no', 'open_answer'));
  END IF;
END $$;

UPDATE flashcards
SET
  prompt = CASE
    WHEN prompt = '' THEN front
    ELSE prompt
  END,
  answer_data = CASE
    WHEN answer_data = '{}'::jsonb THEN jsonb_build_object('answerText', back)
    ELSE answer_data
  END,
  question_type = COALESCE(NULLIF(question_type, ''), 'classic_flashcard');
