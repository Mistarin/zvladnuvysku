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

    query = query.order(sort.column, { ascending: sort.direction === "asc" });

    const from = (page - 1) * SUBJECTS_PAGE_SIZE;
    query = query.range(from, from + SUBJECTS_PAGE_SIZE - 1);

    const { data, count, error } = await query;
    if (error) {
      throw error;
    }

    const totalCount = count ?? 0;

    return {
      subjects: (data ?? []) as SubjectWithStats[],
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
