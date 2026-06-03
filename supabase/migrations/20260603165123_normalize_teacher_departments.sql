with cleaned_teachers as (
  select
    id,
    nullif(
      btrim(
        regexp_replace(
          replace(coalesce(department, ''), '_', ' '),
          '\s+',
          ' ',
          'g'
        )
      ),
      ''
    ) as cleaned_department
  from public.teachers
),
normalized_teachers as (
  select
    id,
    case
      when cleaned_department is null then null
      else upper(left(cleaned_department, 1)) || substr(cleaned_department, 2)
    end as normalized_department
  from cleaned_teachers
)
update public.teachers as teachers
set department = normalized_teachers.normalized_department
from normalized_teachers
where teachers.id = normalized_teachers.id
  and teachers.department is distinct from normalized_teachers.normalized_department;

with normalized_proposal_teachers as (
  select
    sp.id,
    jsonb_agg(
      case
        when cleaned.cleaned_department is null then teacher
        else jsonb_set(
          teacher,
          '{department}',
          to_jsonb(upper(left(cleaned.cleaned_department, 1)) || substr(cleaned.cleaned_department, 2)),
          true
        )
      end
      order by ordinality
    ) as teachers_json
  from public.subject_proposals as sp
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(sp.data->'teachers') = 'array' then sp.data->'teachers'
      else '[]'::jsonb
    end
  ) with ordinality as teachers(teacher, ordinality)
  cross join lateral (
    select nullif(
      btrim(
        regexp_replace(
          replace(coalesce(teacher->>'department', ''), '_', ' '),
          '\s+',
          ' ',
          'g'
        )
      ),
      ''
    ) as cleaned_department
  ) as cleaned
  group by sp.id
)
update public.subject_proposals as subject_proposals
set data = jsonb_set(subject_proposals.data, '{teachers}', normalized_proposal_teachers.teachers_json, true)
from normalized_proposal_teachers
where subject_proposals.id = normalized_proposal_teachers.id
  and subject_proposals.data is distinct from jsonb_set(subject_proposals.data, '{teachers}', normalized_proposal_teachers.teachers_json, true);
