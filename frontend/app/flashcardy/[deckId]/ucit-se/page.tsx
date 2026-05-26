import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FlashcardStudySession } from '@/components/flashcard/flashcard-study-session'
import type { FlashcardDeck, Flashcard, CardProgress } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ deckId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { deckId } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('flashcard_decks').select('title').eq('id', deckId).single()
  return { title: `Procvičování — ${(data as { title: string } | null)?.title ?? 'Flashcardy'}` }
}

export default async function UcitSePage({ params }: PageProps) {
  const { deckId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/prihlaseni')

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

  const allCards = (cards ?? []) as Flashcard[]

  // Fetch user's progress to sort: due first, then new
  const today = new Date().toISOString()
  const { data: progress } = await supabase
    .from('card_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('card_id', allCards.map((c) => c.id))

  const progressMap = new Map<string, CardProgress>(
    ((progress ?? []) as CardProgress[]).map((p) => [p.card_id, p])
  )

  // Sort: due cards first, then learning, then new
  const sortedCards = [...allCards].sort((a, b) => {
    const pa = progressMap.get(a.id)
    const pb = progressMap.get(b.id)

    const isDueA = pa && pa.due_date <= today
    const isDueB = pb && pb.due_date <= today

    if (isDueA && !isDueB) return -1
    if (!isDueA && isDueB) return 1
    if (!pa && pb) return 1  // new cards come after due
    if (pa && !pb) return -1
    return a.position - b.position
  })

  // Determine subject slug for back navigation
  let subjectSlug: string | undefined
  if (flashcardDeck.subject_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subject } = await (supabase as any)
      .from('subjects')
      .select('slug')
      .eq('id', flashcardDeck.subject_id)
      .single()
    subjectSlug = (subject as { slug: string } | null)?.slug
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href={`/flashcardy/${deckId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {flashcardDeck.title}
          </Link>
          <h1 className="text-xl font-bold text-foreground mt-1">Procvičování</h1>
        </div>
      </div>

      <FlashcardStudySession
        cards={sortedCards}
        deckId={deckId}
        subjectSlug={subjectSlug}
      />
    </div>
  )
}
