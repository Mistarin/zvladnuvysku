create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  faculty text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (faculty, name)
);

grant select on public.departments to anon, authenticated;
grant insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;

alter table public.departments enable row level security;

drop policy if exists "Public can read departments" on public.departments;
create policy "Public can read departments"
  on public.departments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage departments" on public.departments;
create policy "Admins can manage departments"
  on public.departments
  for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'moderator'))
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'moderator'));

create or replace function public.generate_department_slug(department_faculty text, department_name text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(
      translate(
        coalesce(department_faculty, '') || '-' || coalesce(department_name, ''),
        'áäčďéěëíľĺňóôöřŕšťúůüýžÁÄČĎÉĚËÍĽĹŇÓÔÖŘŔŠŤÚŮÜÝŽ',
        'aacdeeeillnooorrstuuuyzAACDEEEILLNOOORRSTUUUYZ'
      )
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

create or replace function public.normalize_department_name_sql(value text)
returns text
language sql
immutable
as $$
  select case
    when value is null then null
    else
      case
        when btrim(replace(value, '_', ' ')) = '' then null
        else upper(left(regexp_replace(btrim(replace(value, '_', ' ')), '\s+', ' ', 'g'), 1))
          || substr(regexp_replace(btrim(replace(value, '_', ' ')), '\s+', ' ', 'g'), 2)
      end
  end;
$$;

create or replace function public.set_department_defaults()
returns trigger
language plpgsql
as $$
begin
  new.name := public.normalize_department_name_sql(new.name);
  if new.name is null then
    raise exception 'Department name is required.';
  end if;

  if new.faculty is null or btrim(new.faculty) = '' then
    raise exception 'Department faculty is required.';
  end if;

  new.faculty := btrim(new.faculty);
  new.slug := public.generate_department_slug(new.faculty, new.name);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_departments_defaults on public.departments;
create trigger trg_departments_defaults
before insert or update on public.departments
for each row
execute function public.set_department_defaults();

insert into public.departments (name, faculty, slug)
select distinct
  normalized_department,
  faculty,
  public.generate_department_slug(faculty, normalized_department)
from (
  select
    faculty,
    public.normalize_department_name_sql(department) as normalized_department
  from public.subjects
  where faculty is not null

  union

  select
    faculty,
    public.normalize_department_name_sql(department) as normalized_department
  from public.teachers
  where faculty is not null
) source_departments
where normalized_department is not null
on conflict (faculty, name) do update
set slug = excluded.slug;

alter table public.subjects
  add column if not exists department_id uuid references public.departments(id) on delete set null;

alter table public.teachers
  add column if not exists department_id uuid references public.departments(id) on delete set null;

create index if not exists idx_subjects_department_id on public.subjects (department_id);
create index if not exists idx_teachers_department_id on public.teachers (department_id);

update public.subjects s
set department_id = d.id
from public.departments d
where s.faculty = d.faculty
  and public.normalize_department_name_sql(s.department) = d.name
  and (s.department_id is null or s.department_id is distinct from d.id);

update public.teachers t
set department_id = d.id
from public.departments d
where t.faculty = d.faculty
  and public.normalize_department_name_sql(t.department) = d.name
  and (t.department_id is null or t.department_id is distinct from d.id);

create or replace function public.sync_department_reference()
returns trigger
language plpgsql
as $$
declare
  resolved_department public.departments%rowtype;
begin
  if new.department_id is not null then
    select *
      into resolved_department
    from public.departments
    where id = new.department_id;

    if not found then
      raise exception 'Department % does not exist.', new.department_id;
    end if;

    new.department := resolved_department.name;
    new.faculty := resolved_department.faculty;
    return new;
  end if;

  new.department := public.normalize_department_name_sql(new.department);

  if new.department is null or new.faculty is null or btrim(new.faculty) = '' then
    new.department_id := null;
    return new;
  end if;

  insert into public.departments (name, faculty, slug)
  values (
    new.department,
    btrim(new.faculty),
    public.generate_department_slug(btrim(new.faculty), new.department)
  )
  on conflict (faculty, name) do update
    set slug = excluded.slug
  returning *
  into resolved_department;

  new.department_id := resolved_department.id;
  new.department := resolved_department.name;
  new.faculty := resolved_department.faculty;
  return new;
end;
$$;

drop trigger if exists trg_subjects_sync_department_reference on public.subjects;
create trigger trg_subjects_sync_department_reference
before insert or update of department, department_id, faculty on public.subjects
for each row
execute function public.sync_department_reference();

drop trigger if exists trg_teachers_sync_department_reference on public.teachers;
create trigger trg_teachers_sync_department_reference
before insert or update of department, department_id, faculty on public.teachers
for each row
execute function public.sync_department_reference();
