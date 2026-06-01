-- =============================================================================
-- Migration: 20260601163000_security_audit_fixes.sql
-- Fixes:
--   1. REVOKE excessive anon grants on private tables (mitigated by RLS but
--      unnecessary surface area)
--   2. Add missing index on teachers.proposed_by (FK without covering index)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FIX 1: Revoke excessive anon INSERT/UPDATE/DELETE on private tables
-- These tables have no anon RLS policies so writes are already blocked,
-- but holding the grants is unnecessary attack surface.
-- -----------------------------------------------------------------------------

REVOKE INSERT, UPDATE, DELETE ON public.activity_acknowledgements FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.card_progress FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.flashcard_decks FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.flashcards FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subject_materials FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subject_ratings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subject_rating_stats FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subject_tags FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subject_teachers FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.subjects FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.teacher_ratings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.teacher_rating_stats FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.teachers FROM anon;

-- Keep anon SELECT on public-read tables (intentional):
--   subjects, subject_tags, subject_teachers, subject_ratings (read-only views),
--   subject_rating_stats, teacher_rating_stats, teachers (approved only via RLS),
--   flashcard_decks (public ones), flashcards (public deck ones)
--
-- Keep anon INSERT on feedback (intentional — anonymous bug reports allowed,
--   rate limiting handled at application layer)

-- -----------------------------------------------------------------------------
-- FIX 2: Add missing covering index on teachers.proposed_by (FK)
-- Supabase Performance Advisor: unindexed_foreign_keys
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_teachers_proposed_by
  ON public.teachers (proposed_by);
