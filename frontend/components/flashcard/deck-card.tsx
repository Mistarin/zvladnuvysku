import Link from 'next/link'
import { ShareLinkButton } from '@/components/share/share-link-button'
import { getSharePath } from '@/lib/share-links'
import type { FlashcardDeck } from '@/lib/types/database'

interface DeckCardProps {
  deck: FlashcardDeck
  dueCount?: number
}

export function DeckCard({ deck, dueCount }: DeckCardProps) {
  return (
    <div className="surface-card interactive-surface rounded-xl p-5 space-y-3 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/flashcardy/${deck.id}`} className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
            {deck.title}
          </h3>
        </Link>
        <div className="flex items-center gap-2">
          {deck.is_public && (
            <ShareLinkButton
              path={getSharePath('deck', deck.share_slug)}
              className="px-2 py-1 text-[11px] sm:text-xs"
            />
          )}
          {dueCount !== undefined && dueCount > 0 && (
            <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md primary-action text-white">
              {dueCount} dnes
            </span>
          )}
        </div>
      </div>

      <Link href={`/flashcardy/${deck.id}`} className="block space-y-3">
        {deck.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {deck.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
             {deck.card_count} {deck.card_count === 1 ? 'karta' : deck.card_count >= 2 && deck.card_count <= 4 ? 'karty' : 'karet'}
          </span>
          {!deck.is_public && (
            <span className="text-xs text-muted-foreground"> Soukromý</span>
          )}
        </div>
      </Link>
    </div>
  )
}
