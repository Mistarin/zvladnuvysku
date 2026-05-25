'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getSubjectCache,
  searchInCache,
  type SubjectCacheEntry,
} from '@/lib/subject-cache'

export type SearchResult = Omit<SubjectCacheEntry, '_nameLower' | '_tagLower'>

interface UseSearchReturn {
  query: string
  setQuery: (q: string) => void
  results: SearchResult[]
  isLoading: boolean   // true jen při prvním fetch cache
  clearSearch: () => void
}

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState('')
  const [cache, setCache] = useState<SubjectCacheEntry[] | null>(null)
  const [cacheLoading, setCacheLoading] = useState(false)

  // Načti cache eagerly při prvním mount
  useEffect(() => {
    setCacheLoading(true)
    getSubjectCache()
      .then(setCache)
      .catch((err) => console.error('Nepodařilo se načíst předměty:', err))
      .finally(() => setCacheLoading(false))
  }, [])

  // Vyhledávání je čistě synchronní — žádná síť, žádný debounce
  const results = useMemo<SearchResult[]>(() => {
    if (!cache || query.trim().length < 1) return []
    return searchInCache(cache, query, 10)
  }, [cache, query])

  const clearSearch = useCallback(() => setQuery(''), [])

  return {
    query,
    setQuery,
    results,
    isLoading: cacheLoading,
    clearSearch,
  }
}
