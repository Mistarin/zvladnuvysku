'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface CardDraft {
  front: string
  back: string
}

interface NewDeckFormProps {
  defaultSubject?: string
  userId: string
}

export function NewDeckForm({ defaultSubject, userId }: NewDeckFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [cards, setCards] = useState<CardDraft[]>([{ front: '', back: '' }])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const addCard = () => setCards((prev) => [...prev, { front: '', back: '' }])

  const removeCard = (index: number) => {
    if (cards.length <= 1) return
    setCards((prev) => prev.filter((_, i) => i !== index))
  }

  const updateCard = (index: number, field: 'front' | 'back', value: string) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) return setError('Zadejte název balíčku.')
    const validCards = cards.filter((c) => c.front.trim() && c.back.trim())
    if (validCards.length === 0) return setError('Přidejte alespoň jednu kartu s přední i zadní stranou.')

    setLoading(true)
    const supabase = createClient()

    try {
      // Get subject_id if provided
      let subjectId: string | null = null
      if (defaultSubject) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: subject } = await (supabase as any)
          .from('subjects')
          .select('id')
          .eq('slug', defaultSubject)
          .single()
        subjectId = (subject as { id: string } | null)?.id ?? null
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: deck, error: deckErr } = await (supabase as any)
        .from('flashcard_decks')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          is_public: isPublic,
          creator_id: userId,
          subject_id: subjectId,
        })
        .select('id')
        .single()

      if (deckErr || !deck) throw new Error(deckErr?.message || 'Nepodařilo se vytvořit balíček.')

      const deckId = (deck as { id: string }).id

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: cardsErr } = await (supabase as any).from('flashcards').insert(
        validCards.map((c, i) => ({
          deck_id: deckId,
          front: c.front.trim(),
          back: c.back.trim(),
          position: i,
        }))
      )

      if (cardsErr) throw new Error((cardsErr as { message: string }).message)

      router.push(`/flashcardy/${deckId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nastala chyba.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Deck metadata */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Informace o balíčku</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="title">
            Název <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="např. Biologie — buněčné dělení"
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="description">
            Popis (volitelný)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Krátký popis obsahu balíčku..."
            rows={2}
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPublic((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isPublic ? 'accent-gradient' : 'bg-muted'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                isPublic ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <label className="text-sm text-foreground cursor-pointer" onClick={() => setIsPublic((v) => !v)}>
            {isPublic ? '🌐 Veřejný balíček' : '🔒 Soukromý balíček'}
          </label>
        </div>
      </div>

      {/* Cards editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Karty ({cards.length})</h2>
          <button
            type="button"
            onClick={addCard}
            className="text-sm px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-all"
          >
            + Přidat kartu
          </button>
        </div>

        <div className="space-y-3">
          {cards.map((card, i) => (
            <div key={i} className="glass-card rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Karta {i + 1}
                </span>
                {cards.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCard(i)}
                    className="text-xs text-destructive hover:opacity-70 transition-opacity"
                  >
                    Odebrat
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Přední strana (otázka)</label>
                  <textarea
                    value={card.front}
                    onChange={(e) => updateCard(i, 'front', e.target.value)}
                    placeholder="Zadejte otázku..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Zadní strana (odpověď)</label>
                  <textarea
                    value={card.back}
                    onChange={(e) => updateCard(i, 'back', e.target.value)}
                    placeholder="Zadejte odpověď..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addCard}
          className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary/40 hover:text-primary transition-all"
        >
          + Přidat další kartu
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl font-medium accent-gradient text-white hover:opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? 'Vytváření...' : '✓ Vytvořit balíček'}
        </button>
        <Link
          href={defaultSubject ? `/predmety/${defaultSubject}/flashcardy` : '/predmety'}
          className="px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-all text-sm font-medium"
        >
          Zrušit
        </Link>
      </div>
    </form>
  )
}
