'use client'

import { useState, useEffect, useCallback } from 'react'
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
  const [isFlipped, setIsFlipped] = useState(false)
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([])
  const [isComplete, setIsComplete] = useState(false)

  const currentCard = cards[currentIndex] ?? null
  const totalCards = cards.length

  const flip = useCallback(() => {
    setIsFlipped((prev) => !prev)
  }, [])

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
        setIsFlipped(false)
      }
    },
    [currentCard, currentIndex, totalCards]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (!isComplete) flip()
          break
        case '1':
          if (isFlipped && !isComplete) rate(1)
          break
        case '2':
          if (isFlipped && !isComplete) rate(3)
          break
        case '3':
          if (isFlipped && !isComplete) rate(5)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flip, rate, isFlipped, isComplete])

  return {
    currentCard,
    currentIndex,
    totalCards,
    isFlipped,
    isComplete,
    flip,
    rate,
    sessionResults,
  }
}
