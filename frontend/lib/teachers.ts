import type { DepartmentOption } from "@/lib/departments";

export interface TeacherDirectoryFilters {
  query?: string;
  faculty?: string;
  departmentId?: string;
  ratingMin?: number;
  subjectId?: string;
}

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

function parseNumberValue(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getTeacherFiltersFromSearchParams(params: SearchParamInput): TeacherDirectoryFilters {
  return {
    query: getParamValue(params, "q") ?? undefined,
    faculty: getParamValue(params, "faculty") ?? undefined,
    departmentId: getParamValue(params, "department_id") ?? undefined,
    ratingMin: parseNumberValue(getParamValue(params, "rating_min")),
    subjectId: getParamValue(params, "subject_id") ?? undefined,
  };
}

export interface TeacherDirectorySubjectOption {
  id: string;
  slug: string;
  name: string;
  short_tag: string;
  label: string;
}

export interface TeacherDirectorySubjectPreview {
  id: string;
  slug: string;
  name: string;
  short_tag: string;
}

export interface TeacherDirectoryRow {
  id: string;
  slug: string;
  name: string;
  faculty: string;
  department: string | null;
  departmentId: string | null;
  avgRating: number | null;
  totalRatings: number;
  subjects: TeacherDirectorySubjectPreview[];
}

export interface TeacherDirectoryData {
  teachers: TeacherDirectoryRow[];
  totalCount: number;
  departments: DepartmentOption[];
  subjects: TeacherDirectorySubjectOption[];
}
