-- Atomic SM-2 review recording.
--
-- Previously saveCardReview() did read-modify-upsert from the Next.js server:
-- two concurrent study sessions could lose updates. This function computes and
-- persists the next state in a single statement scoped to auth.uid().
--
-- Reimplements lib/sm2.ts calculateNextReview (quality < 3 resets progress,
-- else standard SM-2 interval growth; ease clamped to >= 1.3).

CREATE OR REPLACE FUNCTION public.record_card_review(
  p_card_id uuid,
  p_quality integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := (SELECT auth.uid());
  v_deck_is_public boolean;
  v_deck_creator uuid;
  v_ease_factor numeric(4,2) := 2.50;
  v_interval_days integer := 0;
  v_repetitions integer := 0;
  v_next_interval integer;
  v_next_ease numeric(4,2);
  v_next_repetitions integer;
  v_next_status text;
BEGIN
  IF p_quality NOT BETWEEN 0 AND 5 THEN
    RAISE EXCEPTION 'Kvalita odpovědi musí být v rozsahu 0 až 5.';
  END IF;

  -- Reject reviews for cards the viewer cannot see (no private-deck leakage).
  SELECT deck.is_public, deck.creator_id
    INTO v_deck_is_public, v_deck_creator
    FROM public.flashcards card
    JOIN public.flashcard_decks deck ON deck.id = card.deck_id
   WHERE card.id = p_card_id;

  IF v_deck_creator IS NULL OR (v_deck_is_public = false AND v_deck_creator <> v_user) THEN
    RAISE EXCEPTION 'Kartička nebyla nalezena nebo není veřejná.';
  END IF;

  SELECT ease_factor, interval_days, repetitions
    INTO v_ease_factor, v_interval_days, v_repetitions
    FROM public.card_progress
   WHERE user_id = v_user AND card_id = p_card_id
   LIMIT 1;

  IF p_quality < 3 THEN
    v_next_repetitions := 0;
    v_next_interval := 1;
    v_next_ease := v_ease_factor;
    v_next_status := 'learning';
  ELSE
    IF v_repetitions = 0 THEN
      v_next_interval := 1;
    ELSIF v_repetitions = 1 THEN
      v_next_interval := 6;
    ELSE
      v_next_interval := GREATEST(1, ROUND(v_interval_days * v_ease_factor));
    END IF;

    v_next_ease := GREATEST(
      1.3,
      v_ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02))
    );

    v_next_repetitions := v_repetitions + 1;
    v_next_status := CASE WHEN v_repetitions > 1 THEN 'review' ELSE 'learning' END;
  END IF;

  INSERT INTO public.card_progress (
    user_id, card_id, ease_factor, interval_days, repetitions,
    due_date, status, last_reviewed_at
  ) VALUES (
    v_user, p_card_id, v_next_ease, v_next_interval, v_next_repetitions,
    now() + make_interval(days => v_next_interval), v_next_status, now()
  )
  ON CONFLICT (user_id, card_id) DO UPDATE SET
    ease_factor = EXCLUDED.ease_factor,
    interval_days = EXCLUDED.interval_days,
    repetitions = EXCLUDED.repetitions,
    due_date = EXCLUDED.due_date,
    status = EXCLUDED.status,
    last_reviewed_at = EXCLUDED.last_reviewed_at;

  RETURN jsonb_build_object(
    'nextInterval', v_next_interval,
    'nextEaseFactor', v_next_ease::float8,
    'nextRepetitions', v_next_repetitions,
    'nextStatus', v_next_status,
    'dueDate', to_char(now() + make_interval(days => v_next_interval) AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END;
$$;
