'use client'

import { useState } from 'react'
import type { Flashcard } from '@/lib/types/database'

interface CardListItemProps {
  card: Flashcard
  index: number
}

export function CardListItem({ card, index }: CardListItemProps) {
  const [expanded, setExpanded] = useState(false)

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
          <p className="text-sm text-foreground truncate">{card.front}</p>
        </div>
        <span className="text-muted-foreground text-xs shrink-0">
          {expanded ? '▲ skrýt' : '▼ odpověď'}
        </span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 pl-14 border-t border-border/50">
          <p className="text-sm text-muted-foreground pt-3 leading-relaxed">{card.back}</p>
        </div>
      )}
    </div>
  )
}
