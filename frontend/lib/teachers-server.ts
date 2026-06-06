import "server-only";

import { unstable_cache } from "next/cache";
import { normalizeDepartmentName } from "@/lib/department-name";
import { sortDepartments, type DepartmentOption } from "@/lib/departments";
import { normalizeMaterialDirectorySearch } from "@/lib/material-directory-search";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { generateTeacherSlug } from "@/lib/teacher-slug";
import type {
  TeacherDirectoryData,
  TeacherDirectoryFilters,
  TeacherDirectorySubjectOption,
  TeacherDirectorySubjectPreview,
} from "@/lib/teachers";

type TeacherStatsJoin =
  | { avg_rating: number | null; total_ratings: number | null }
  | Array<{ avg_rating: number | null; total_ratings: number | null }>
  | null;

type TeacherRow = {
  id: string;
  slug: string;
  name: string;
  faculty: string;
  department: string | null;
  department_id?: string | null;
  teacher_rating_stats: TeacherStatsJoin;
};

type TeacherSubjectJoinRow = {
  teacher_id: string;
  subject: {
    id: string;
    slug: string;
    name: string;
    short_tag: string;
  } | null;
};

type SubjectOptionRow = {
  id: string;
  slug: string;
  name: string;
  short_tag: string;
};

function normalizeStats(stats: TeacherStatsJoin) {
  return Array.isArray(stats) ? (stats[0] ?? null) : stats;
}

function getLegacyDepartmentId(faculty: string, department: string) {
  return `legacy-${generateTeacherSlug(`${faculty}-${department}`)}`;
}

function buildFallbackDepartments(teachers: TeacherRow[]) {
  const byId = new Map<string, DepartmentOption>();

  for (const teacher of teachers) {
    const department = normalizeDepartmentName(teacher.department);
    if (!department) continue;

    const id = getLegacyDepartmentId(teacher.faculty, department);
    if (byId.has(id)) continue;

    byId.set(id, {
      id,
      name: department,
      faculty: teacher.faculty,
      slug: generateTeacherSlug(`${teacher.faculty}-${department}`),
    });
  }

  return sortDepartments(Array.from(byId.values()));
}

function mapTeachers(
  rawTeachers: TeacherRow[],
  subjectMap: Map<string, TeacherDirectorySubjectPreview[]>,
  departments: DepartmentOption[],
) {
  const departmentMap = new Map(departments.map((department) => [department.id, department.name]));

  return rawTeachers.map((teacher) => {
    const stats = normalizeStats(teacher.teacher_rating_stats);
    const subjects = (subjectMap.get(teacher.id) ?? []).sort((left, right) =>
      left.name.localeCompare(right.name, "cs")
    );
    const normalizedDepartment = normalizeDepartmentName(teacher.department);
    const departmentId = teacher.department_id ?? (normalizedDepartment ? getLegacyDepartmentId(teacher.faculty, normalizedDepartment) : null);

    return {
      id: teacher.id,
      slug: teacher.slug,
      name: teacher.name,
      faculty: teacher.faculty,
      department: normalizeDepartmentName(
        departmentId ? departmentMap.get(departmentId) ?? teacher.department : teacher.department,
      ),
      departmentId,
      avgRating: stats?.avg_rating ?? null,
      totalRatings: stats?.total_ratings ?? 0,
      subjects,
    };
  });
}

async function loadTeacherSubjectsAndOptions() {
  const supabase = createPublicServerClient();
  const [{ data: rawTeacherSubjects, error: subjectsError }, { data: rawSubjectOptions, error: subjectOptionsError }] = await Promise.all([
    supabase
      .from("subject_teachers")
      .select("teacher_id, subject:subject_id(id, slug, name, short_tag)"),
    supabase
      .from("subject_search_view")
      .select("id, slug, name, short_tag")
      .order("name", { ascending: true }),
  ]);

  if (subjectsError) throw subjectsError;
  if (subjectOptionsError) throw subjectOptionsError;

  const subjectMap = new Map<string, TeacherDirectorySubjectPreview[]>();
  for (const row of (rawTeacherSubjects ?? []) as TeacherSubjectJoinRow[]) {
    if (!row.subject) continue;
    const current = subjectMap.get(row.teacher_id) ?? [];
    current.push(row.subject);
    subjectMap.set(row.teacher_id, current);
  }

  const subjectOptions: TeacherDirectorySubjectOption[] = ((rawSubjectOptions ?? []) as SubjectOptionRow[]).map((subject) => ({
    ...subject,
    label: `${subject.short_tag} · ${subject.name}`,
  }));

  return { subjectMap, subjectOptions };
}

function serializeTeacherFilters(filters: TeacherDirectoryFilters) {
  return JSON.stringify({
    ...filters,
    query: filters.query?.trim() || undefined,
  });
}

const getTeacherDirectorySnapshot = unstable_cache(
  async () => {
    const supabase = createPublicServerClient();
    const { subjectMap, subjectOptions } = await loadTeacherSubjectsAndOptions();

    try {
      const [{ data: rawTeachers, error: teachersError }, { data: rawDepartments, error: departmentsError }] = await Promise.all([
        supabase
          .from("teachers")
          .select("id, slug, name, faculty, department, department_id, teacher_rating_stats(avg_rating, total_ratings)")
          .eq("is_approved", true)
          .order("name", { ascending: true }),
        supabase
          .from("departments")
          .select("id, name, faculty, slug")
          .order("faculty", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      if (teachersError) throw teachersError;
      if (departmentsError) throw departmentsError;

      const departments = sortDepartments((rawDepartments ?? []) as DepartmentOption[]);
      const teachers = mapTeachers((rawTeachers ?? []) as TeacherRow[], subjectMap, departments);
      return { teachers, departments, subjects: subjectOptions };
    } catch (error) {
      console.warn("Falling back to legacy teacher directory query.", error);

      const { data: rawTeachers, error: teachersError } = await supabase
        .from("teachers")
        .select("id, slug, name, faculty, department, teacher_rating_stats(avg_rating, total_ratings)")
        .eq("is_approved", true)
        .order("name", { ascending: true });

      if (teachersError) throw teachersError;

      const teachersSource = (rawTeachers ?? []) as TeacherRow[];
      const departments = buildFallbackDepartments(teachersSource);
      const teachers = mapTeachers(teachersSource, subjectMap, departments);
      return { teachers, departments, subjects: subjectOptions };
    }
  },
  ["teacher-directory-snapshot"],
  { revalidate: 300 },
);

export const getTeacherDirectory = unstable_cache(
  async (serializedFilters: string): Promise<TeacherDirectoryData> => {
    const filters = JSON.parse(serializedFilters) as TeacherDirectoryFilters;
    const snapshot = await getTeacherDirectorySnapshot();
    const normalizedQuery = normalizeMaterialDirectorySearch(filters.query ?? "");

    const teachers = snapshot.teachers.filter((teacher) => {
      if (filters.faculty && teacher.faculty !== filters.faculty) return false;
      if (filters.departmentId && teacher.departmentId !== filters.departmentId) return false;
      if (filters.ratingMin !== undefined && (teacher.avgRating ?? 0) < filters.ratingMin) return false;
      if (filters.subjectId && !teacher.subjects.some((subject) => subject.id === filters.subjectId)) return false;

      if (!normalizedQuery) return true;

      const haystacks = [
        teacher.name,
        teacher.faculty,
        teacher.department ?? "",
        ...teacher.subjects.flatMap((subject) => [subject.name, subject.short_tag]),
      ];

      return haystacks.some((value) =>
        normalizeMaterialDirectorySearch(value).includes(normalizedQuery),
      );
    });

    return {
      teachers,
      totalCount: teachers.length,
      departments: snapshot.departments,
      subjects: snapshot.subjects,
    };
  },
  ["teacher-directory-filters"],
  { revalidate: 300 },
);

export async function getTeachersDirectoryData(filters: TeacherDirectoryFilters) {
  return getTeacherDirectory(serializeTeacherFilters(filters));
}
