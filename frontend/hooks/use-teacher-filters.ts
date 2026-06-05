"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getTeacherFiltersFromSearchParams, type TeacherDirectoryFilters } from "@/lib/teachers";

const PARAM_MAP: Record<keyof TeacherDirectoryFilters, string> = {
  query: "q",
  faculty: "faculty",
  departmentId: "department_id",
  ratingMin: "rating_min",
  subjectId: "subject_id",
};

export function useTeacherFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => getTeacherFiltersFromSearchParams(searchParams),
    [searchParams],
  );

  const setFilter = useCallback(<K extends keyof TeacherDirectoryFilters>(key: K, value: TeacherDirectoryFilters[K]) => {
    const params = new URLSearchParams(searchParams.toString());
    const paramKey = PARAM_MAP[key];

    if (!paramKey) return;

    if (value === undefined || value === null || value === "") {
      params.delete(paramKey);
    } else {
      params.set(paramKey, String(value));
    }

    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [pathname, router, searchParams]);

  const setFilters = useCallback((patch: Partial<TeacherDirectoryFilters>) => {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch) as Array<[keyof TeacherDirectoryFilters, TeacherDirectoryFilters[keyof TeacherDirectoryFilters]]>) {
      const paramKey = PARAM_MAP[key];
      if (!paramKey) continue;

      if (value === undefined || value === null || value === "") {
        params.delete(paramKey);
      } else {
        params.set(paramKey, String(value));
      }
    }

    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
  }, [pathname, router, searchParams]);

  const resetFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.faculty) count += 1;
    if (filters.departmentId) count += 1;
    if (filters.ratingMin !== undefined) count += 1;
    if (filters.subjectId) count += 1;
    return count;
  }, [filters]);

  return {
    filters,
    setFilter,
    setFilters,
    resetFilters,
    activeFilterCount,
  };
}
