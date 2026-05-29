import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewDeckForm } from '@/components/flashcard/new-deck-form'
import type { DeckSubjectRef } from '@/lib/flashcards'
import type { Flashcard, FlashcardDeck } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ deckId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { deckId } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('flashcard_decks').select('title').eq('id', deckId).single()
  return { title: `Upravit — ${(data as { title: string } | null)?.title ?? 'Balíček'}` }
}

export default async function UpravitBalicekPage({ params }: PageProps) {
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
  if (flashcardDeck.creator_id !== user.id) redirect(`/flashcardy/${deckId}`)

  const { data: cards } = await supabase
    .from('flashcards')
    .select('*')
    .eq('deck_id', deckId)
    .order('position')

  const flashcards = (cards ?? []) as Flashcard[]

  let initialSubject: DeckSubjectRef | null = null
  if (flashcardDeck.subject_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subject } = await (supabase as any)
      .from('subjects')
      .select('id, slug, name, short_tag, faculty')
      .eq('id', flashcardDeck.subject_id)
      .single()
    initialSubject = (subject as DeckSubjectRef | null) ?? null
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Domů</Link>
        <span>/</span>
        <Link href={`/flashcardy/${deckId}`} className="hover:text-foreground transition-colors">
          {flashcardDeck.title}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Upravit</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">✏️ Upravit balíček</h1>
        <p className="text-muted-foreground mt-1">
          Uprav otázky, správné odpovědi a obrázky bez vytváření nového balíčku.
        </p>
      </div>

      <NewDeckForm
        initialSubject={initialSubject}
        userId={user.id}
        initialDeckData={{ deck: flashcardDeck, cards: flashcards }}
      />
    </div>
  )
}
