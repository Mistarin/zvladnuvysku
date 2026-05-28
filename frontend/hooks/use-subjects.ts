'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SubjectWithStats } from '@/lib/types/database'

export interface SubjectFilters {
  query?: string
  difficulty?: number[]
  timeIntensity?: number[]
  attendanceType?: string[]
  semester?: string[]
  creditsMin?: number
  creditsMax?: number
  faculty?: string
  department?: string[]
  year?: number[]
  ratingMin?: number
  teacherRatingMin?: number
}

export interface SortConfig {
  column: keyof SubjectWithStats
  direction: 'asc' | 'desc'
}

interface UseSubjectsReturn {
  subjects: SubjectWithStats[]
  totalCount: number
  isLoading: boolean
  error: string | null
  page: number
  setPage: (p: number) => void
}

const PAGE_SIZE = 20

export function useSubjects(
  filters: SubjectFilters = {},
  sort: SortConfig = { column: 'name', direction: 'asc' }
): UseSubjectsReturn {
  const [subjects, setSubjects] = useState<SubjectWithStats[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      let query = (supabase.from('subject_search_view') as any)
        .select('*', { count: 'exact' })

      // Filtrace
      if (filters.query?.trim()) {
        const q = `%${filters.query.trim()}%`
        query = query.or(`name.ilike.${q},short_tag.ilike.${q}`)
      }
      if (filters.difficulty?.length) {
        query = query.in('difficulty', filters.difficulty)
      }
      if (filters.timeIntensity?.length) {
        query = query.in('time_intensity', filters.timeIntensity)
      }
      if (filters.attendanceType?.length) {
        query = query.in('attendance_type', filters.attendanceType)
      }
      if (filters.semester?.length) {
        query = query.in('semester', filters.semester)
      }
      if (filters.creditsMin !== undefined) {
        query = query.gte('credits', filters.creditsMin)
      }
      if (filters.creditsMax !== undefined) {
        query = query.lte('credits', filters.creditsMax)
      }
      if (filters.faculty) {
        query = query.eq('faculty', filters.faculty)
      }
      if (filters.year?.length) {
        query = query.in('year', filters.year)
      }
      if (filters.ratingMin !== undefined) {
        query = query.gte('avg_subject_rating', filters.ratingMin)
      }
      if (filters.teacherRatingMin !== undefined) {
        query = query.gte('avg_teacher_rating', filters.teacherRatingMin)
      }

      // Řazení
      query = query.order(sort.column as string, { ascending: sort.direction === 'asc' })

      // Stránkování
      const from = (page - 1) * PAGE_SIZE
      query = query.range(from, from + PAGE_SIZE - 1)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      setSubjects(data || [])
      setTotalCount(count || 0)
    } catch (err) {
      setError('Nepodařilo se načíst předměty. Zkuste to prosím znovu.')
      console.error('Chyba při načítání předmětů:', err)
    } finally {
      setIsLoading(false)
    }
  }, [filters, sort, page])

  useEffect(() => {
    fetchSubjects()
  }, [fetchSubjects])

  // Reset na stranu 1 při změně filtrů
  useEffect(() => {
    setPage(1)
  }, [filters, sort])

  return { subjects, totalCount, isLoading, error, page, setPage }
}
