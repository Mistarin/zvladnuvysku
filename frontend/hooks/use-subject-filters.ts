'use client'

import { useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import type { SubjectFilters, SortConfig } from './use-subjects'
import type { Subject } from '@/lib/types/database'

export interface FilterConfig {
  key: keyof SubjectFilters
  label: string
  type: 'multiselect' | 'boolean' | 'range'
  options?: { value: string | number; label: string }[]
  min?: number
  max?: number
}

export const FILTER_CONFIG: FilterConfig[] = [
  {
    key: 'difficulty',
    label: 'Obtížnost',
    type: 'multiselect',
    options: [
      { value: 1, label: '⭐ Velmi snadný' },
      { value: 2, label: '⭐⭐ Snadný' },
      { value: 3, label: '⭐⭐⭐ Střední' },
      { value: 4, label: '⭐⭐⭐⭐ Těžký' },
      { value: 5, label: '⭐⭐⭐⭐⭐ Velmi těžký' },
    ],
  },
  {
    key: 'timeIntensity',
    label: 'Časová náročnost',
    type: 'multiselect',
    options: [
      { value: 1, label: '1 — Minimální' },
      { value: 2, label: '2 — Nízká' },
      { value: 3, label: '3 — Střední' },
      { value: 4, label: '4 — Vysoká' },
      { value: 5, label: '5 — Maximální' },
    ],
  },
  {
    key: 'semester',
    label: 'Semestr',
    type: 'multiselect',
    options: [
      { value: 'zimní', label: 'Zimní' },
      { value: 'letní', label: 'Letní' },
      { value: 'oba', label: 'Oba' },
    ],
  },
  {
    key: 'attendanceRequired',
    label: 'Povinná docházka',
    type: 'boolean',
  },
  {
    key: 'year',
    label: 'Doporučený ročník',
    type: 'multiselect',
    options: [
      { value: 1, label: '1. ročník' },
      { value: 2, label: '2. ročník' },
      { value: 3, label: '3. ročník' },
    ],
  },
  {
    key: 'creditsMin',
    label: 'Kredity (min)',
    type: 'range',
    min: 1,
    max: 10,
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
    difficulty: parseNumberArray(searchParams.get('difficulty')),
    timeIntensity: parseNumberArray(searchParams.get('time_intensity')),
    semester: parseStringArray(searchParams.get('semester')),
    attendanceRequired: searchParams.get('attendance') === 'true'
      ? true
      : searchParams.get('attendance') === 'false'
      ? false
      : null,
    year: parseNumberArray(searchParams.get('year')),
    creditsMin: searchParams.get('credits_min') ? Number(searchParams.get('credits_min')) : undefined,
    creditsMax: searchParams.get('credits_max') ? Number(searchParams.get('credits_max')) : undefined,
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
      difficulty: 'difficulty',
      timeIntensity: 'time_intensity',
      semester: 'semester',
      attendanceRequired: 'attendance',
      year: 'year',
      creditsMin: 'credits_min',
      creditsMax: 'credits_max',
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
    if (filters.semester?.length) count++
    if (filters.attendanceRequired !== null && filters.attendanceRequired !== undefined) count++
    if (filters.year?.length) count++
    if (filters.creditsMin !== undefined) count++
    if (filters.creditsMax !== undefined) count++
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
