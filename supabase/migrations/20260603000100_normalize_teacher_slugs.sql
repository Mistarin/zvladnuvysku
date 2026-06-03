create extension if not exists unaccent with schema extensions;

with normalized as (
  select
    id,
    coalesce(
      nullif(
        regexp_replace(
          regexp_replace(
            lower(extensions.unaccent(slug)),
            '[^a-z0-9]+',
            '-',
            'g'
          ),
          '(^-|-$)',
          '',
          'g'
        ),
        ''
      ),
      'teacher'
    ) as base_slug
  from public.teachers
),
ranked as (
  select
    id,
    case
      when count(*) over (partition by base_slug) = 1 then base_slug
      else base_slug || '-' || row_number() over (partition by base_slug order by id)
    end as normalized_slug
  from normalized
)
update public.teachers as teachers
set slug = ranked.normalized_slug
from ranked
where teachers.id = ranked.id
  and teachers.slug is distinct from ranked.normalized_slug;
