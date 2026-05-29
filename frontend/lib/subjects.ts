import type { Subject, SubjectWithStats } from "@/lib/types/database";

export interface SubjectFilters {
  query?: string;
  difficulty?: number[];
  timeIntensity?: number[];
  timeIntensityMax?: number;
  attendanceType?: string[];
  semester?: string[];
  creditsMin?: number;
  creditsMax?: number;
  faculty?: string;
  department?: string[];
  year?: number[];
  ratingMin?: number;
  teacherRatingMin?: number;
  examFromHome?: boolean;
}

export interface SortConfig {
  column: keyof SubjectWithStats;
  direction: "asc" | "desc";
}

export const SUBJECTS_PAGE_SIZE = 20;

const ALLOWED_SORT_COLUMNS = new Set<keyof SubjectWithStats>([
  "name",
  "short_tag",
  "credits",
  "time_intensity",
  "avg_subject_rating",
  "avg_teacher_rating",
  "semester",
  "attendance_type",
  "difficulty",
  "faculty",
  "year",
  "created_at",
  "updated_at",
  "description",
  "target_audience",
  "real_requirements",
  "exam_from_home",
  "department",
  "slug",
  "id",
]);

type SearchParamInput =
  | URLSearchParams
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function hasGetter(params: SearchParamInput): params is URLSearchParams | { get(name: string): string | null } {
  return typeof (params as { get?: unknown }).get === "function";
}

function getParamValue(params: SearchParamInput, key: string): string | null {
  if (params instanceof URLSearchParams || hasGetter(params)) {
    return params.get(key);
  }

  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseNumberArray(value: string | null): number[] | undefined {
  if (!value) return undefined;
  const parsed = value
    .split(",")
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);
  return parsed.length > 0 ? parsed : undefined;
}

function parseStringArray(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : undefined;
}

function parseNumberValue(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getSubjectFiltersFromSearchParams(params: SearchParamInput): SubjectFilters {
  return {
    query: getParamValue(params, "q") ?? undefined,
    difficulty: parseNumberArray(getParamValue(params, "difficulty")),
    timeIntensity: parseNumberArray(getParamValue(params, "time_intensity")),
    timeIntensityMax: parseNumberValue(getParamValue(params, "time_intensity_max")),
    semester: parseStringArray(getParamValue(params, "semester")),
    attendanceType: parseStringArray(getParamValue(params, "attendance")),
    year: parseNumberArray(getParamValue(params, "year")),
    creditsMin: parseNumberValue(getParamValue(params, "credits_min")),
    creditsMax: parseNumberValue(getParamValue(params, "credits_max")),
    faculty: getParamValue(params, "faculty") ?? undefined,
    ratingMin: parseNumberValue(getParamValue(params, "rating_min")),
    teacherRatingMin: parseNumberValue(getParamValue(params, "teacher_rating_min")),
    examFromHome: getParamValue(params, "exam_from_home") === "true" || undefined,
  };
}

export function getSubjectSortFromSearchParams(params: SearchParamInput): SortConfig {
  const rawColumn = (getParamValue(params, "sort_by") ?? "name") as keyof Subject;
  const column = ALLOWED_SORT_COLUMNS.has(rawColumn as keyof SubjectWithStats)
    ? (rawColumn as keyof SubjectWithStats)
    : "name";
  const direction = getParamValue(params, "sort_dir") === "desc" ? "desc" : "asc";

  return { column, direction };
}

export function getSubjectPageFromSearchParams(params: SearchParamInput): number {
  const page = Number(getParamValue(params, "page") ?? "1");
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}
