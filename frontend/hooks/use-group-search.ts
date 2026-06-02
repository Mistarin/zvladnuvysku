'use client'

import { useEffect, useState } from 'react'
import { searchMaterialGroups, type MaterialGroupSearchResult } from '@/app/actions/search'
import { parseSearchMode } from '@/lib/search-mode'

export type GroupSearchResult = MaterialGroupSearchResult

type CachedGroupSearch = { data: GroupSearchResult[]; expiresAt: number }

interface UseGroupSearchReturn {
  isGroupMode: boolean
  groupQuery: string
  groupResults: GroupSearchResult[]
  isGroupLoading: boolean
}

const groupSearchCache = new Map<string, CachedGroupSearch>()
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000

export function useGroupSearch(query: string): UseGroupSearchReturn {
  const parsed = parseSearchMode(query)
  const isGroupMode = parsed.mode === 'groups'
  const groupQuery = isGroupMode ? parsed.modeQuery : ''

  const [groupResults, setGroupResults] = useState<GroupSearchResult[]>([])
  const [isGroupLoading, setIsGroupLoading] = useState(false)

  useEffect(() => {
    if (!isGroupMode) {
      setGroupResults([])
      setIsGroupLoading(false)
      return
    }

    const cached = groupSearchCache.get(groupQuery)
    if (cached && cached.expiresAt > Date.now()) {
      setGroupResults(cached.data)
      setIsGroupLoading(false)
      return
    }

    let cancelled = false
    setIsGroupLoading(true)

    const timeoutId = window.setTimeout(() => {
      searchMaterialGroups(groupQuery)
        .then((data) => {
          if (!cancelled) {
            groupSearchCache.set(groupQuery, {
              data,
              expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
            })
            setGroupResults(data)
            setIsGroupLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setGroupResults([])
            setIsGroupLoading(false)
          }
        })
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [isGroupMode, groupQuery])

  return { isGroupMode, groupQuery, groupResults, isGroupLoading }
}
