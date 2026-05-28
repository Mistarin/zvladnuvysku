-- Add comment_is_approved column to subject_ratings and teacher_ratings
ALTER TABLE public.subject_ratings
ADD COLUMN IF NOT EXISTS comment_is_approved BOOLEAN DEFAULT false;

ALTER TABLE public.teacher_ratings
ADD COLUMN IF NOT EXISTS comment_is_approved BOOLEAN DEFAULT false;

-- Update types in supabase types file if necessary
-- Note: You can run `npx supabase gen types typescript --local > lib/types/database.ts` or similar command,
-- but since we aren't using Supabase CLI locally, we'll manually update `lib/types/database.ts`.
