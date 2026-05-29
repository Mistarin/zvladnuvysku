create extension if not exists pg_trgm;

create index if not exists idx_subjects_name_trgm
on public.subjects
using gin (name gin_trgm_ops);

create index if not exists idx_subjects_short_tag_trgm
on public.subjects
using gin (short_tag gin_trgm_ops);

create index if not exists idx_flashcard_decks_public_title_trgm
on public.flashcard_decks
using gin (title gin_trgm_ops)
where is_public = true;

create index if not exists idx_subject_materials_approved_title_trgm
on public.subject_materials
using gin (title gin_trgm_ops)
where is_approved = true;

create index if not exists idx_teachers_name_trgm
on public.teachers
using gin (name gin_trgm_ops);
