drop view if exists public.subject_search_view;

create view public.subject_search_view
with (security_invoker = true)
as
select
  s.id,
  s.slug,
  s.name,
  s.short_tag,
  s.description,
  s.target_audience,
  s.real_requirements,
  case
    when coalesce(srs.total_ratings, 0) > 0 then srs.avg_difficulty
    else null
  end as difficulty,
  s.time_intensity,
  s.attendance_type,
  s.credits,
  s.exam_from_home,
  s.semester,
  s.faculty,
  s.department,
  s.year,
  s.created_at,
  s.updated_at,
  coalesce(srs.avg_overall, 0) as avg_subject_rating,
  coalesce(
    (
      select round(avg(trs.avg_rating)::numeric, 2)
      from public.subject_teachers st
      join public.teacher_rating_stats trs on st.teacher_id = trs.teacher_id
      where st.subject_id = s.id
    ),
    0
  ) as avg_teacher_rating
from public.subjects s
left join public.subject_rating_stats srs on s.id = srs.subject_id;

revoke all on public.subject_search_view from public, anon, authenticated;
grant select on public.subject_search_view to anon, authenticated;
