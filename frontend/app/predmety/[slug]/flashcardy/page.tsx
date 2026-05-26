import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DeckCard } from '@/components/flashcard/deck-card'
import type { FlashcardDeck } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface SubjectBasic {
  id: string
  name: string
  slug: string
}

interface CardBasic {
  id: string
  deck_id: string
}

interface ProgressBasic {
  card_id: string
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `Flashcardy — ${slug}`,
    description: `Procvičte si kartičkami předmět ${slug}.`,
  }
}

export default async function SubjectFlashcardyPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch subject — cast needed due to Database type structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subjectRaw, error } = await (supabase as any)
    .from('subjects')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (error || !subjectRaw) notFound()

  const subject = subjectRaw as SubjectBasic

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch public decks for this subject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: decksRaw } = await (supabase as any)
    .from('flashcard_decks')
    .select('*')
    .eq('subject_id', subject.id)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  const flashcardDecks = (decksRaw ?? []) as FlashcardDeck[]

  // Compute due counts per deck for logged-in users
  const dueCounts: Record<string, number> = {}
  if (user && flashcardDecks.length > 0) {
    const deckIds = flashcardDecks.map((d) => d.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cardsRaw } = await (supabase as any)
      .from('flashcards')
      .select('id, deck_id')
      .in('deck_id', deckIds)

    const cards = (cardsRaw ?? []) as CardBasic[]

    if (cards.length > 0) {
      const allCardIds = cards.map((c) => c.id)
      const today = new Date().toISOString()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: progressRaw } = await (supabase as any)
        .from('card_progress')
        .select('card_id')
        .eq('user_id', user.id)
        .in('card_id', allCardIds)
        .lte('due_date', today)

      const progress = (progressRaw ?? []) as ProgressBasic[]
      const dueCardIds = new Set(progress.map((p) => p.card_id))

      for (const card of cards) {
        if (dueCardIds.has(card.id)) {
          dueCounts[card.deck_id] = (dueCounts[card.deck_id] ?? 0) + 1
        }
      }
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Domů</Link>
        <span>/</span>
        <Link href="/predmety" className="hover:text-foreground transition-colors">Předměty</Link>
        <span>/</span>
        <Link href={`/predmety/${slug}`} className="hover:text-foreground transition-colors">{subject.name}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Flashcardy</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">🃏 Flashcardy</h1>
          <p className="text-muted-foreground mt-1">{subject.name}</p>
        </div>
        {user && (
          <Link
            href={`/flashcardy/novy?subject=${slug}`}
            className="px-4 py-2 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
          >
            + Vytvořit balíček
          </Link>
        )}
      </div>

      {flashcardDecks.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl space-y-4">
          <p className="text-4xl">🃏</p>
          <p className="text-lg font-semibold text-foreground">Zatím žádné flashcardy</p>
          <p className="text-muted-foreground text-sm">
            Buď první kdo je vytvoří pro tento předmět!
          </p>
          {user ? (
            <Link
              href={`/flashcardy/novy?subject=${slug}`}
              className="inline-flex px-5 py-2.5 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
            >
              Vytvořit první balíček
            </Link>
          ) : (
            <Link
              href="/prihlaseni"
              className="inline-flex px-5 py-2.5 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
            >
              Přihlásit se a vytvořit
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {flashcardDecks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              dueCount={dueCounts[deck.id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
