import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NewDeckForm } from '@/components/flashcard/new-deck-form'
import type { DeckSubjectRef } from '@/lib/flashcards'

export const metadata: Metadata = {
  title: 'Nový balíček procvičování',
  description: 'Vytvořte si vlastní sadu otázek pro procvičování.',
}

interface PageProps {
  searchParams: Promise<{ subject?: string }>
}

export default async function NovyBalicekPage({ searchParams }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/prihlaseni')

  const { subject } = await searchParams
  let initialSubject: DeckSubjectRef | null = null

  if (subject) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('subjects')
      .select('id, slug, name, short_tag, faculty')
      .eq('slug', subject)
      .maybeSingle()

    initialSubject = (data as DeckSubjectRef | null) ?? null
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Domů</Link>
        <span>/</span>
        {subject ? (
          <>
            <Link href="/predmety" className="hover:text-foreground transition-colors">Předměty</Link>
            <span>/</span>
            <Link href={`/predmety/${subject}/flashcardy`} className="hover:text-foreground transition-colors">
              {subject}
            </Link>
            <span>/</span>
          </>
        ) : null}
        <span className="text-foreground font-medium">Nový balíček</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">🃏 Nový balíček procvičování</h1>
        <p className="text-muted-foreground mt-1">
          Vytvořte sadu otázek a procvičujte je pomocí opakování.
        </p>
      </div>

      <NewDeckForm initialSubject={initialSubject} />
    </div>
  )
}
