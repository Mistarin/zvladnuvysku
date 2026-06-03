import "server-only";

import { unstable_cache } from "next/cache";
import type { SubjectWithStats } from "@/lib/types/database";
import {
  SUBJECTS_PAGE_SIZE,
  type SortConfig,
  type SubjectFilters,
} from "@/lib/subjects";
import { createPublicServerClient } from "@/lib/supabase/public-server";

export interface SubjectsPageResult {
  subjects: SubjectWithStats[];
  totalCount: number;
  page: number;
  totalPages: number;
}

type TeacherPreviewJoinRow = {
  subject_id: string;
  teacher: {
    id: string;
    slug: string;
    name: string;
    teacher_rating_stats:
      | { avg_rating: number | null; total_ratings: number | null }
      | Array<{ avg_rating: number | null; total_ratings: number | null }>
      | null;
  } | null;
};

function normalizeSubjectRequest(
  filters: SubjectFilters,
  sort: SortConfig,
  page: number
): string {
  return JSON.stringify({
    filters: {
      ...filters,
      query: filters.query?.trim() || undefined,
      difficulty: filters.difficulty?.slice().sort((a, b) => a - b),
      difficultyMax: filters.difficultyMax,
      timeIntensity: filters.timeIntensity?.slice().sort((a, b) => a - b),
      attendanceType: filters.attendanceType?.slice().sort(),
      semester: filters.semester?.slice().sort(),
      year: filters.year?.slice().sort((a, b) => a - b),
      department: filters.department?.slice().sort(),
    },
    sort,
    page,
  });
}

const getCachedSubjectsPage = unstable_cache(
  async (serializedRequest: string): Promise<SubjectsPageResult> => {
    const { filters, sort, page } = JSON.parse(serializedRequest) as {
      filters: SubjectFilters;
      sort: SortConfig;
      page: number;
    };

    const supabase = createPublicServerClient();
    let query = supabase
      .from("subject_search_view")
      .select("*", { count: "exact" });

    if (filters.query?.trim()) {
      const normalizedQuery = filters.query.trim();
      query = query.or(`name.ilike.%${normalizedQuery}%,short_tag.ilike.%${normalizedQuery}%`);
    }
    if (filters.difficulty?.length) {
      query = query.in("difficulty", filters.difficulty);
    }
    if (filters.difficultyMax !== undefined) {
      query = query.lte("difficulty", filters.difficultyMax);
    }
    if (filters.timeIntensity?.length) {
      query = query.in("time_intensity", filters.timeIntensity);
    }
    if (filters.timeIntensityMax !== undefined) {
      query = query.lte("time_intensity", filters.timeIntensityMax);
    }
    if (filters.attendanceType?.length) {
      query = query.in("attendance_type", filters.attendanceType);
    }
    if (filters.semester?.length) {
      query = query.in("semester", filters.semester);
    }
    if (filters.creditsMin !== undefined) {
      query = query.gte("credits", filters.creditsMin);
    }
    if (filters.creditsMax !== undefined) {
      query = query.lte("credits", filters.creditsMax);
    }
    if (filters.faculty) {
      query = query.eq("faculty", filters.faculty);
    }
    if (filters.year?.length) {
      query = query.in("year", filters.year);
    }
    if (filters.ratingMin !== undefined) {
      query = query.gte("avg_subject_rating", filters.ratingMin);
    }
    if (filters.teacherRatingMin !== undefined) {
      query = query.gte("avg_teacher_rating", filters.teacherRatingMin);
    }
    if (filters.examFromHome) {
      query = query.eq("exam_from_home", true);
    }

    const ascending = sort.direction === "asc";

    if (sort.column === "time_intensity" || sort.column === "difficulty" || sort.column === "credits" || sort.column === "year") {
      query = query
        .order(sort.column, { ascending, nullsFirst: false })
        .order("name", { ascending: true });
    } else {
      query = query.order(sort.column, { ascending });
    }

    const from = (page - 1) * SUBJECTS_PAGE_SIZE;
    query = query.range(from, from + SUBJECTS_PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) {
      throw error;
    }

    const subjects = (data ?? []) as SubjectWithStats[];
    const subjectIds = subjects.map((subject) => subject.id);
    const teacherPreviewMap = new Map<string, NonNullable<SubjectWithStats["teacher_rating_preview"]>>();

    if (subjectIds.length > 0) {
      const { data: teacherPreviewRows, error: teacherPreviewError } = await supabase
        .from("subject_teachers")
        .select("subject_id, teacher:teacher_id(id, slug, name, teacher_rating_stats(avg_rating, total_ratings))")
        .in("subject_id", subjectIds);

      if (teacherPreviewError) {
        throw teacherPreviewError;
      }

      for (const row of (teacherPreviewRows ?? []) as TeacherPreviewJoinRow[]) {
        if (!row.teacher) continue;
        const stats = Array.isArray(row.teacher.teacher_rating_stats)
          ? row.teacher.teacher_rating_stats[0] ?? null
          : row.teacher.teacher_rating_stats;

        const current = teacherPreviewMap.get(row.subject_id) ?? [];
        current.push({
          id: row.teacher.id,
          slug: row.teacher.slug,
          name: row.teacher.name,
          avg_rating: stats?.avg_rating ?? null,
          total_ratings: stats?.total_ratings ?? 0,
        });
        teacherPreviewMap.set(row.subject_id, current);
      }
    }

    const totalCount = count ?? 0;

    return {
      subjects: subjects.map((subject) => ({
        ...subject,
        teacher_rating_preview: (teacherPreviewMap.get(subject.id) ?? []).sort((left, right) =>
          left.name.localeCompare(right.name, "cs")
        ),
      })),
      totalCount,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / SUBJECTS_PAGE_SIZE)),
    };
  },
  ["subjects-page"],
  { revalidate: 300 }
);

export async function getSubjectsPage(
  filters: SubjectFilters,
  sort: SortConfig,
  page: number
) {
  return getCachedSubjectsPage(normalizeSubjectRequest(filters, sort, page));
}
