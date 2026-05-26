import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { FlashcardDeck, Flashcard } from '@/lib/types/database'
import { CardListItem } from '@/components/flashcard/card-list-item'

interface PageProps {
  params: Promise<{ deckId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { deckId } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('flashcard_decks').select('title').eq('id', deckId).single()
  return { title: (data as { title: string } | null)?.title ?? 'Balíček flashkaret' }
}

export default async function DeckDetailPage({ params }: PageProps) {
  const { deckId } = await params
  const supabase = await createClient()

  const { data: deck, error } = await supabase
    .from('flashcard_decks')
    .select('*')
    .eq('id', deckId)
    .single()

  if (error || !deck) notFound()

  const flashcardDeck = deck as FlashcardDeck

  const { data: cards } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', deckId)
    .order('position')

  const flashcards = (cards ?? []) as Flashcard[]

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isCreator = user?.id === flashcardDeck.creator_id

  // Fetch creator profile for display (admin API not available client-side)
  void (supabase)

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Domů</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{flashcardDeck.title}</span>
      </nav>

      {/* Header */}
      <div className="glass-card rounded-2xl p-6 mb-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{flashcardDeck.title}</h1>
            {flashcardDeck.description && (
              <p className="text-muted-foreground leading-relaxed">{flashcardDeck.description}</p>
            )}
          </div>
          {isCreator && (
            <div className="flex gap-2 shrink-0">
              <DeleteDeckButton deckId={deckId} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="text-sm text-muted-foreground">
            🃏 {flashcardDeck.card_count} {flashcardDeck.card_count === 1 ? 'karta' : flashcardDeck.card_count >= 2 && flashcardDeck.card_count <= 4 ? 'karty' : 'karet'}
          </span>
          {!flashcardDeck.is_public && (
            <span className="text-sm text-muted-foreground">🔒 Soukromý</span>
          )}
          {isCreator && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Váš balíček
            </span>
          )}
        </div>

        {/* CTA */}
        {flashcards.length > 0 && (
          <Link
            href={`/flashcardy/${deckId}/ucit-se`}
            className="inline-flex items-center gap-2 mt-2 px-6 py-3 rounded-xl font-medium accent-gradient text-white hover:opacity-90 transition-all"
          >
            ▶ Začít procvičovat
          </Link>
        )}
      </div>

      {/* Card list */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Karty ({flashcards.length})</h2>
        {flashcards.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Tento balíček nemá žádné karty.</div>
        ) : (
          <div className="space-y-2">
            {flashcards.map((card, i) => (
              <CardListItem key={card.id} card={card} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DeleteDeckButton({ deckId: _deckId }: { deckId: string }) {
  // Placeholder — full delete flow would use a client component + server action
  return null
}
