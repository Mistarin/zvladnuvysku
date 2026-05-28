'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { SubjectFilters, SortConfig } from './use-subjects'
import type { Subject } from '@/lib/types/database'

export interface FilterConfig {
  key: keyof SubjectFilters | 'freeCredits'
  label: string
  type: 'multiselect' | 'select' | 'slider' | 'boolean'
  options?: { value: string | number; label: string; color?: string }[]
  min?: number
  max?: number
  step?: number
}

export const FILTER_CONFIG: FilterConfig[] = [
  {
    key: 'timeIntensityMax',
    label: 'Max. Náročnost',
    type: 'slider',
    min: 1,
    max: 5,
    step: 1,
  },
  {
    key: 'ratingMin',
    label: 'Min. Hodnocení Předmětu',
    type: 'slider',
    min: 1,
    max: 5,
    step: 1,
  },
  {
    key: 'teacherRatingMin',
    label: 'Min. Hodnocení Učitele',
    type: 'slider',
    min: 1,
    max: 5,
    step: 1,
  },
  {
    key: 'creditsMin',
    label: 'Min. Kredity',
    type: 'slider',
    min: 0,
    max: 15,
    step: 1,
  },
  {
    key: 'attendanceType',
    label: 'Docházka',
    type: 'select',
    options: [
      { value: 'volná', label: 'Volná' },
      { value: 'povinné přednášky', label: 'Povinné přednášky' },
      { value: 'povinná cvičení', label: 'Povinná cvičení' },
      { value: 'povinná', label: 'Povinná (vše)' },
    ],
  },
  {
    key: 'year',
    label: 'Doporučený ročník',
    type: 'select',
    options: [
      { value: 1, label: '1. ročník' },
      { value: 2, label: '2. ročník' },
      { value: 3, label: '3. ročník' },
      { value: 4, label: '4. ročník' },
      { value: 5, label: '5. ročník' },
    ],
  },
  {
    key: 'semester',
    label: 'Semestr',
    type: 'select',
    options: [
      { value: 'zimní', label: 'Zimní' },
      { value: 'letní', label: 'Letní' },
      { value: 'oba', label: 'Oba' },
    ],
  },
  {
    key: 'faculty',
    label: 'Fakulta',
    type: 'select',
    options: [
      { value: 'FSS', label: 'FSS 🟨' },
      { value: 'FU', label: 'FU 🟥' },
      { value: 'FF', label: 'FF 🟪' },
      { value: 'LF', label: 'LF 🟦' },
      { value: 'PdF', label: 'PdF 🟧' },
      { value: 'PřF', label: 'PřF 🟩' },
    ],
  },
]

interface UseSubjectFiltersReturn {
  filters: SubjectFilters
  setFilter: <K extends keyof SubjectFilters>(key: K, value: SubjectFilters[K]) => void
  resetFilters: () => void
  filterConfig: FilterConfig[]
  activeFilterCount: number
  sort: SortConfig
  setSort: (sort: SortConfig) => void
}

function parseNumberArray(value: string | null): number[] | undefined {
  if (!value) return undefined
  const parsed = value.split(',').map(Number).filter(Boolean)
  return parsed.length > 0 ? parsed : undefined
}

function parseStringArray(value: string | null): string[] | undefined {
  if (!value) return undefined
  const parsed = value.split(',').filter(Boolean)
  return parsed.length > 0 ? parsed : undefined
}

export function useSubjectFilters(): UseSubjectFiltersReturn {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Parsování filtrů z URL
  const filters: SubjectFilters = useMemo(() => ({
    query: searchParams.get('q') ?? undefined,
    difficulty: parseNumberArray(searchParams.get('difficulty')),
    timeIntensity: parseNumberArray(searchParams.get('time_intensity')),
    timeIntensityMax: searchParams.get('time_intensity_max') ? Number(searchParams.get('time_intensity_max')) : undefined,
    semester: parseStringArray(searchParams.get('semester')),
    attendanceType: parseStringArray(searchParams.get('attendance')),
    year: parseNumberArray(searchParams.get('year')),
    creditsMin: searchParams.get('credits_min') ? Number(searchParams.get('credits_min')) : undefined,
    creditsMax: searchParams.get('credits_max') ? Number(searchParams.get('credits_max')) : undefined,
    faculty: searchParams.get('faculty') ?? undefined,
    ratingMin: searchParams.get('rating_min') ? Number(searchParams.get('rating_min')) : undefined,
    teacherRatingMin: searchParams.get('teacher_rating_min') ? Number(searchParams.get('teacher_rating_min')) : undefined,
  }), [searchParams])

  const sort: SortConfig = useMemo(() => ({
    column: (searchParams.get('sort_by') || 'name') as keyof Subject,
    direction: (searchParams.get('sort_dir') || 'asc') as 'asc' | 'desc',
  }), [searchParams])

  const setFilter = useCallback(<K extends keyof SubjectFilters>(
    key: K,
    value: SubjectFilters[K]
  ) => {
    const params = new URLSearchParams(searchParams.toString())

    const paramMap: Partial<Record<keyof SubjectFilters, string>> = {
      query: 'q',
      difficulty: 'difficulty',
      timeIntensity: 'time_intensity',
      timeIntensityMax: 'time_intensity_max',
      semester: 'semester',
      attendanceType: 'attendance',
      year: 'year',
      creditsMin: 'credits_min',
      creditsMax: 'credits_max',
      faculty: 'faculty',
      ratingMin: 'rating_min',
      teacherRatingMin: 'teacher_rating_min',
    }

    const paramKey = paramMap[key]
    if (!paramKey) return

    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
      params.delete(paramKey)
    } else if (Array.isArray(value)) {
      params.set(paramKey, value.join(','))
    } else {
      params.set(paramKey, String(value))
    }

    // Reset na stranu 1
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const resetFilters = useCallback(() => {
    const params = new URLSearchParams()
    if (searchParams.get('sort_by')) params.set('sort_by', searchParams.get('sort_by')!)
    if (searchParams.get('sort_dir')) params.set('sort_dir', searchParams.get('sort_dir')!)
    if (searchParams.get('faculty')) params.set('faculty', searchParams.get('faculty')!)
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const setSort = useCallback((newSort: SortConfig) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort_by', String(newSort.column))
    params.set('sort_dir', newSort.direction)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  // Počet aktivních filtrů
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.difficulty?.length) count++
    if (filters.timeIntensity?.length) count++
    if (filters.timeIntensityMax !== undefined) count++
    if (filters.semester?.length) count++
    if (filters.attendanceType?.length) count++
    if (filters.year?.length) count++
    if (filters.creditsMin !== undefined) count++
    if (filters.creditsMax !== undefined) count++
    if (filters.ratingMin !== undefined) count++
    if (filters.teacherRatingMin !== undefined) count++
    if (filters.faculty !== undefined) count++
    return count
  }, [filters])

  return {
    filters,
    setFilter,
    resetFilters,
    filterConfig: FILTER_CONFIG,
    activeFilterCount,
    sort,
    setSort,
  }
}
