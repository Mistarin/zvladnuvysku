-- Migration: material_groups table + subject_materials columns
-- Created: 2026-06-02
-- Description: Adds material_groups table for grouping multiple uploaded
--              materials under a named folder. Also adds group_id and page_count
--              columns to subject_materials for linking and XP calculation.

-- ─── Create material_groups ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.material_groups (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  subject_id  uuid        REFERENCES public.subjects(id) ON DELETE SET NULL,
  uploader_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── Extend subject_materials ─────────────────────────────────────────────────

ALTER TABLE public.subject_materials
  ADD COLUMN IF NOT EXISTS group_id    uuid    REFERENCES public.material_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS page_count  integer;

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.material_groups ENABLE ROW LEVEL SECURITY;

-- Anyone can view groups (needed for public search and subject pages)
CREATE POLICY "Anyone can view material groups"
  ON public.material_groups
  FOR SELECT
  USING (true);

-- Only the uploader can create a group
CREATE POLICY "Authenticated users can create material groups"
  ON public.material_groups
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = uploader_id);

-- Uploader can update (rename) their own group
CREATE POLICY "Uploader can update own material groups"
  ON public.material_groups
  FOR UPDATE
  TO authenticated
  USING  ((select auth.uid()) = uploader_id)
  WITH CHECK ((select auth.uid()) = uploader_id);

-- Uploader can delete their own group
CREATE POLICY "Uploader can delete own material groups"
  ON public.material_groups
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = uploader_id);

-- ─── API access ───────────────────────────────────────────────────────────────

GRANT SELECT                       ON public.material_groups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE       ON public.material_groups TO authenticated;
