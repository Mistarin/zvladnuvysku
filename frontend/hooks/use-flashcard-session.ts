'use client'

import { useState, useCallback } from 'react'
import type { Flashcard } from '@/lib/types/database'
import { saveCardReview } from '@/app/flashcardy/[deckId]/ucit-se/actions'

interface SessionResult {
  cardId: string
  quality: 0 | 1 | 2 | 3 | 4 | 5
}

interface UseFlashcardSessionOptions {
  cards: Flashcard[]
  deckId: string
}

export function useFlashcardSession({ cards, deckId: _deckId }: UseFlashcardSessionOptions) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const currentCard = cards[currentIndex] ?? null
  const totalCards = cards.length

  const rate = useCallback(
    async (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
      if (!currentCard) return

      // Save review in background (don't block UI)
      saveCardReview(currentCard.id, quality).catch(console.error)

      setSessionResults((prev) => [...prev, { cardId: currentCard.id, quality }])

      const nextIndex = currentIndex + 1
      if (nextIndex >= totalCards) {
        setIsComplete(true)
      } else {
        setCurrentIndex(nextIndex)
      }
    },
    [currentCard, currentIndex, totalCards]
  )

  return {
    currentCard,
    currentIndex,
    totalCards,
    isComplete,
    rate,
    sessionResults,
  }
}
