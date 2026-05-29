'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { groupFlashcardMediaPaths } from '@/lib/flashcards'

type ActionResult = { success: true } | { success: false; error: string }
type DeckOwnerRecord = { id: string; creator_id: string }
type CardMediaRecord = { media_path: string | null }

export async function deleteOwnDeck(deckId: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Pro smazání balíčku je potřeba se přihlásit.' }
    }

    const { data: deck, error: deckError } = await supabase
      .from('flashcard_decks')
      .select('id, creator_id')
      .eq('id', deckId)
      .single()

    const typedDeck = deck as DeckOwnerRecord | null

    if (deckError || !typedDeck) {
      return { success: false, error: 'Balíček nebyl nalezen.' }
    }

    if (typedDeck.creator_id !== user.id) {
      return { success: false, error: 'Tento balíček nemůžete smazat.' }
    }

    const { data: cards, error: cardsError } = await supabase
      .from('flashcards')
      .select('media_path')
      .eq('deck_id', deckId)

    if (cardsError) {
      return { success: false, error: 'Nepodařilo se načíst obsah balíčku.' }
    }

    const mediaPaths = [
      ...new Set(
        ((cards ?? []) as CardMediaRecord[])
          .map((card) => card.media_path)
          .filter(Boolean) as string[]
      ),
    ]

    if (mediaPaths.length > 0) {
      for (const entry of groupFlashcardMediaPaths(mediaPaths)) {
        const { error: storageError } = await supabase.storage
          .from(entry.bucket)
          .remove(entry.paths)

        if (storageError) {
          return { success: false, error: `Nepodařilo se smazat obrázky balíčku: ${storageError.message}` }
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('flashcard_decks')
      .delete()
      .eq('id', deckId)
      .eq('creator_id', user.id)

    if (deleteError) {
      return { success: false, error: `Nepodařilo se smazat balíček: ${deleteError.message}` }
    }

    revalidatePath('/flashcardy')
    revalidatePath(`/flashcardy/${deckId}`)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se smazat balíček.',
    }
  }
}
