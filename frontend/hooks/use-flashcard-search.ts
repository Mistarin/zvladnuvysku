'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseSearchMode } from '@/lib/search-mode'

export interface FlashcardDeckResult {
  id: string
  title: string
  description: string | null
  card_count: number
  subject?: { name: string; short_tag: string } | null
}

interface UseFlashcardSearchReturn {
  isFlashcardMode: boolean
  flashcardQuery: string
  deckResults: FlashcardDeckResult[]
  isDeckLoading: boolean
}

export function useFlashcardSearch(query: string): UseFlashcardSearchReturn {
  const parsed = parseSearchMode(query)
  const isFlashcardMode = parsed.mode === 'flashcards'
  const flashcardQuery = isFlashcardMode ? parsed.modeQuery : ''

  const [deckResults, setDeckResults] = useState<FlashcardDeckResult[]>([])
  const [isDeckLoading, setIsDeckLoading] = useState(false)

  useEffect(() => {
    if (!isFlashcardMode) {
      setDeckResults([])
      return
    }

    setIsDeckLoading(true)
    const supabase = createClient()

    const run = async () => {
      let q = supabase
        .from('flashcard_decks')
        .select('id, title, description, card_count, subject:subject_id(name, short_tag)')
        .eq('is_public', true)
        .order('card_count', { ascending: false })
        .limit(8)

      if (flashcardQuery.length >= 1) {
        q = q.ilike('title', `%${flashcardQuery}%`)
      }

      const { data } = await q
      setDeckResults((data as FlashcardDeckResult[]) || [])
      setIsDeckLoading(false)
    }

    run()
  }, [isFlashcardMode, flashcardQuery])

  return { isFlashcardMode, flashcardQuery, deckResults, isDeckLoading }
}
