'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  getFlashcardAnswerText,
  getFlashcardMediaUrl,
  getQuestionTypeLabel,
  normalizeFlashcard,
} from '@/lib/flashcards'
import type { Flashcard } from '@/lib/types/database'

interface CardListItemProps {
  card: Flashcard
  index: number
}

export function CardListItem({ card, index }: CardListItemProps) {
  const [expanded, setExpanded] = useState(false)
  const question = normalizeFlashcard(card)
  const mediaUrl = getFlashcardMediaUrl(question.media_path)

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-xs font-mono text-muted-foreground shrink-0 w-6 text-right">
            {index + 1}.
          </span>
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">{question.prompt}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {getQuestionTypeLabel(question.question_type)}
            </p>
          </div>
        </div>
        <span className="text-muted-foreground text-xs shrink-0">
          {expanded ? '▲ skrýt' : '▼ detail'}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 pl-14 border-t border-border/50">
          <div className="pt-3 space-y-3">
            {mediaUrl && (
              <Image
                src={mediaUrl}
                alt="Obrázek otázky"
                width={800}
                height={480}
                className="max-h-56 h-auto w-auto rounded-xl border border-border bg-background object-contain"
              />
            )}
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {getFlashcardAnswerText(question)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
