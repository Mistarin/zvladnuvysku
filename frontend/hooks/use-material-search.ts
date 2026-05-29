'use client'

import { useEffect, useState } from 'react'
import { searchMaterials, type MaterialQuickSearchResult } from '@/app/actions/search'
import { parseSearchMode } from '@/lib/search-mode'
export type MaterialSearchResult = MaterialQuickSearchResult
type CachedMaterialSearch = { data: MaterialSearchResult[]; expiresAt: number }

interface UseMaterialSearchReturn {
  isMaterialMode: boolean
  materialQuery: string
  materialResults: MaterialSearchResult[]
  isMaterialLoading: boolean
}

const materialSearchCache = new Map<string, CachedMaterialSearch>()
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000

export function useMaterialSearch(query: string): UseMaterialSearchReturn {
  const parsed = parseSearchMode(query)
  const isMaterialMode = parsed.mode === 'materials'
  const materialQuery = isMaterialMode ? parsed.modeQuery : ''

  const [materialResults, setMaterialResults] = useState<MaterialSearchResult[]>([])
  const [isMaterialLoading, setIsMaterialLoading] = useState(false)

  useEffect(() => {
    if (!isMaterialMode) {
      setMaterialResults([])
      setIsMaterialLoading(false)
      return
    }

    const cached = materialSearchCache.get(materialQuery)
    if (cached && cached.expiresAt > Date.now()) {
      setMaterialResults(cached.data)
      setIsMaterialLoading(false)
      return
    }

    let cancelled = false
    setIsMaterialLoading(true)

    const timeoutId = window.setTimeout(() => {
      searchMaterials(materialQuery)
        .then((data) => {
          if (!cancelled) {
            materialSearchCache.set(materialQuery, {
              data,
              expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
            })
            setMaterialResults(data)
            setIsMaterialLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMaterialResults([])
            setIsMaterialLoading(false)
          }
        })
    }, 80)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [isMaterialMode, materialQuery])

  return { isMaterialMode, materialQuery, materialResults, isMaterialLoading }
}
