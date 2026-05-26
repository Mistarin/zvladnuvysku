import Link from 'next/link'
import type { FlashcardDeck } from '@/lib/types/database'

interface DeckCardProps {
  deck: FlashcardDeck
  dueCount?: number
}

export function DeckCard({ deck, dueCount }: DeckCardProps) {
  return (
    <Link
      href={`/flashcardy/${deck.id}`}
      className="block glass-card hover-card rounded-xl p-5 space-y-3 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          {deck.title}
        </h3>
        {dueCount !== undefined && dueCount > 0 && (
          <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full accent-gradient text-white">
            {dueCount} dnes
          </span>
        )}
      </div>

      {deck.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {deck.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          🃏 {deck.card_count} {deck.card_count === 1 ? 'karta' : deck.card_count >= 2 && deck.card_count <= 4 ? 'karty' : 'karet'}
        </span>
        {!deck.is_public && (
          <span className="text-xs text-muted-foreground">🔒 Soukromý</span>
        )}
      </div>
    </Link>
  )
}
