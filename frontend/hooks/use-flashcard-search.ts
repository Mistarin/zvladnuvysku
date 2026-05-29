'use client'

import { useState, useEffect } from 'react'
import { searchFlashcardDecks, type FlashcardDeckSearchResult } from '@/app/actions/search'
import { parseSearchMode } from '@/lib/search-mode'

export type FlashcardDeckResult = FlashcardDeckSearchResult
type CachedDeckSearch = { data: FlashcardDeckResult[]; expiresAt: number }

interface UseFlashcardSearchReturn {
  isFlashcardMode: boolean
  flashcardQuery: string
  deckResults: FlashcardDeckResult[]
  isDeckLoading: boolean
}

const deckSearchCache = new Map<string, CachedDeckSearch>()
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000

export function useFlashcardSearch(query: string): UseFlashcardSearchReturn {
  const parsed = parseSearchMode(query)
  const isFlashcardMode = parsed.mode === 'flashcards'
  const flashcardQuery = isFlashcardMode ? parsed.modeQuery : ''

  const [deckResults, setDeckResults] = useState<FlashcardDeckResult[]>([])
  const [isDeckLoading, setIsDeckLoading] = useState(false)

  useEffect(() => {
    if (!isFlashcardMode) {
      setDeckResults([])
      setIsDeckLoading(false)
      return
    }

    let cancelled = false
    setIsDeckLoading(true)

    const timeoutId = window.setTimeout(() => {
      const cached = deckSearchCache.get(flashcardQuery)
      if (cached && cached.expiresAt > Date.now()) {
        if (!cancelled) {
          setDeckResults(cached.data)
          setIsDeckLoading(false)
        }
        return
      }

      searchFlashcardDecks(flashcardQuery)
        .then((data) => {
          if (!cancelled) {
            deckSearchCache.set(flashcardQuery, {
              data,
              expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
            })
            setDeckResults(data)
            setIsDeckLoading(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDeckResults([])
            setIsDeckLoading(false)
          }
        })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [isFlashcardMode, flashcardQuery])

  return { isFlashcardMode, flashcardQuery, deckResults, isDeckLoading }
}
