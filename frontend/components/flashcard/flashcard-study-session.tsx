'use client'

import { useState } from 'react'
import type { Flashcard } from '@/lib/types/database'
import { useFlashcardSession } from '@/hooks/use-flashcard-session'
import { FlashcardViewer } from './flashcard-viewer'
import { SessionSummary } from './session-summary'

interface FlashcardStudySessionProps {
  cards: Flashcard[]
  deckId: string
  subjectSlug?: string
}

export function FlashcardStudySession({ cards, deckId, subjectSlug }: FlashcardStudySessionProps) {
  const [sessionKey, setSessionKey] = useState(0)

  const { currentCard, currentIndex, totalCards, isFlipped, isComplete, flip, rate, sessionResults } =
    useFlashcardSession({ cards, deckId })

  const handleRestart = () => {
    setSessionKey((k) => k + 1)
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-2xl">🃏</p>
        <p className="text-muted-foreground">Tento balíček neobsahuje žádné karty.</p>
      </div>
    )
  }

  if (isComplete) {
    return (
      <SessionSummary
        key={`summary-${sessionKey}`}
        results={sessionResults}
        deckId={deckId}
        subjectSlug={subjectSlug}
        onRestart={handleRestart}
      />
    )
  }

  if (!currentCard) return null

  return (
    <FlashcardViewer
      key={`viewer-${sessionKey}-${currentIndex}`}
      card={currentCard}
      isFlipped={isFlipped}
      currentIndex={currentIndex}
      totalCards={totalCards}
      onFlip={flip}
      onRate={rate}
    />
  )
}
