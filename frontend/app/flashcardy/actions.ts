'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  FLASHCARD_MEDIA_BUCKET,
  FLASHCARD_MEDIA_PREFIX,
  type FlashcardQuestionType,
  getFlashcardMediaBucket,
  groupFlashcardMediaPaths,
} from '@/lib/flashcards'
import type { Database } from '@/lib/types/database'

type ActionResult = { success: true } | { success: false; error: string }
type DeckMutationResult = { success: true; deckId?: string } | { success: false; error: string }
type DeckOwnerRecord = { id: string; creator_id: string }
type CardMediaRecord = { media_path: string | null }
type FlashcardDeckRow = Database['public']['Tables']['flashcard_decks']['Row']
type FlashcardDeckInsert = Database['public']['Tables']['flashcard_decks']['Insert']
type FlashcardDeckUpdate = Database['public']['Tables']['flashcard_decks']['Update']
type FlashcardInsert = Database['public']['Tables']['flashcards']['Insert']
type FlashcardUpdate = Database['public']['Tables']['flashcards']['Update']
type FlashcardRow = Database['public']['Tables']['flashcards']['Row']
type SaveDeckQuestion = {
  clientKey: string
  id?: string
  type: FlashcardQuestionType
  prompt: string
  answerText: string
  options: { id: string; text: string }[]
  correctOptionIds: string[]
  yesNoCorrect: boolean
  mediaPath: string | null
  removeMedia: boolean
  hasMediaFile: boolean
}
type SaveDeckPayload = {
  deckId?: string
  title: string
  description: string
  isPublic: boolean
  subjectId: string | null
  questions: SaveDeckQuestion[]
}
type SaveDeckResult = { success: true; deckId: string } | { success: false; error: string }
type SaveDeckValidatedQuestion = SaveDeckQuestion & {
  prompt: string
  answerText: string
}

const IMAGE_MAX_FILE_SIZE = 100 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

function isFlashcardQuestionType(value: string): value is FlashcardQuestionType {
  return value === 'classic_flashcard' || value === 'multiple_choice' || value === 'yes_no' || value === 'open_answer'
}

function parseSaveDeckPayload(rawPayload: FormDataEntryValue | null): SaveDeckPayload | null {
  if (typeof rawPayload !== 'string') return null

  try {
    const parsed = JSON.parse(rawPayload) as SaveDeckPayload
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.questions)) return null
    if (typeof parsed.title !== 'string' || typeof parsed.description !== 'string' || typeof parsed.isPublic !== 'boolean') {
      return null
    }

    const normalizedQuestions = parsed.questions
      .filter((question): question is SaveDeckQuestion => {
        return Boolean(
          question &&
            typeof question === 'object' &&
            typeof question.clientKey === 'string' &&
            isFlashcardQuestionType(question.type) &&
            typeof question.prompt === 'string' &&
            typeof question.answerText === 'string' &&
            Array.isArray(question.options) &&
            Array.isArray(question.correctOptionIds) &&
            typeof question.yesNoCorrect === 'boolean' &&
            (typeof question.mediaPath === 'string' || question.mediaPath === null) &&
            typeof question.removeMedia === 'boolean' &&
            typeof question.hasMediaFile === 'boolean'
        )
      })
      .map((question) => ({
        ...question,
        options: question.options.filter(
          (option): option is { id: string; text: string } =>
            Boolean(option && typeof option.id === 'string' && typeof option.text === 'string')
        ),
        correctOptionIds: question.correctOptionIds.filter((optionId): optionId is string => typeof optionId === 'string'),
      }))

    return {
      deckId: typeof parsed.deckId === 'string' ? parsed.deckId : undefined,
      title: parsed.title,
      description: parsed.description,
      isPublic: parsed.isPublic,
      subjectId: typeof parsed.subjectId === 'string' ? parsed.subjectId : null,
      questions: normalizedQuestions,
    }
  } catch {
    return null
  }
}

function validateDeckQuestions(questions: SaveDeckQuestion[]): { valid: SaveDeckValidatedQuestion[]; error?: string } {
  const valid = questions
    .map((question) => ({
      ...question,
      prompt: question.prompt.trim(),
      answerText: question.answerText.trim(),
    }))
    .filter((question) => question.prompt)

  if (valid.length === 0) {
    return { valid: [], error: 'Přidejte alespoň jednu otázku se zadáním.' }
  }

  for (const [index, question] of valid.entries()) {
    if (question.type === 'multiple_choice') {
      const filledOptions = question.options.filter((option) => option.text.trim())
      if (filledOptions.length < 2) {
        return { valid: [], error: `Otázka ${index + 1}: multiple choice musí mít alespoň 2 vyplněné možnosti.` }
      }
      if (question.correctOptionIds.length === 0) {
        return { valid: [], error: `Otázka ${index + 1}: vyberte alespoň jednu správnou možnost.` }
      }

      const validOptionIds = new Set(filledOptions.map((option) => option.id))
      if (!question.correctOptionIds.every((optionId) => validOptionIds.has(optionId))) {
        return { valid: [], error: `Otázka ${index + 1}: správné odpovědi musí být mezi vyplněnými možnostmi.` }
      }
      continue
    }

    if (question.type !== 'yes_no' && !question.answerText) {
      return { valid: [], error: `Otázka ${index + 1}: vyplňte správnou odpověď.` }
    }
  }

  return { valid }
}

async function getOwnedDeck(deckId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, deck: null as DeckOwnerRecord | null, error: 'Pro tuto akci je potřeba se přihlásit.' }
  }

  const { data: deck, error: deckError } = await supabase
    .from('flashcard_decks')
    .select('id, creator_id')
    .eq('id', deckId)
    .single()

  const typedDeck = deck as DeckOwnerRecord | null

  if (deckError || !typedDeck) {
    return { supabase, user, deck: null, error: 'Balíček nebyl nalezen.' }
  }

  if (typedDeck.creator_id !== user.id) {
    return { supabase, user, deck: null, error: 'Tento balíček nemůžete upravovat.' }
  }

  return { supabase, user, deck: typedDeck, error: null }
}

export async function deleteOwnDeck(deckId: string): Promise<ActionResult> {
  try {
    const { supabase, user, error } = await getOwnedDeck(deckId)
    if (error || !user) {
      return { success: false, error: error ?? 'Pro smazání balíčku je potřeba se přihlásit.' }
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

export async function setOwnDeckVisibility(deckId: string, isPublic: boolean): Promise<ActionResult> {
  try {
    const { supabase, error } = await getOwnedDeck(deckId)
    if (error) {
      return { success: false, error }
    }

    const deckUpdate: FlashcardDeckUpdate = { is_public: isPublic }
    const { error: updateError } = await supabase
      .from('flashcard_decks')
      .update(deckUpdate as never)
      .eq('id', deckId)

    if (updateError) {
      return { success: false, error: `Nepodařilo se změnit viditelnost: ${updateError.message}` }
    }

    revalidatePath('/flashcardy')
    revalidatePath(`/flashcardy/${deckId}`)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se změnit viditelnost balíčku.',
    }
  }
}

export async function duplicateOwnDeck(deckId: string): Promise<DeckMutationResult> {
  try {
    const { supabase, user, error } = await getOwnedDeck(deckId)
    if (error || !user) {
      return { success: false, error: error ?? 'Pro duplikaci balíčku je potřeba se přihlásit.' }
    }

    const { data: deckData, error: deckError } = await supabase
      .from('flashcard_decks')
      .select('*')
      .eq('id', deckId)
      .single()

    const sourceDeck = deckData as FlashcardDeckRow | null

    if (deckError || !sourceDeck) {
      return { success: false, error: 'Původní balíček nebyl nalezen.' }
    }

    const { data: cardsData, error: cardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position')

    const sourceCards = (cardsData ?? []) as FlashcardRow[]

    if (cardsError) {
      return { success: false, error: `Nepodařilo se načíst otázky balíčku: ${cardsError.message}` }
    }

    const deckInsert: FlashcardDeckInsert = {
      creator_id: user.id,
      subject_id: sourceDeck.subject_id,
      title: `${sourceDeck.title} (kopie)`,
      description: sourceDeck.description,
      is_public: false,
    }

    const { data: newDeckData, error: createDeckError } = await supabase
      .from('flashcard_decks')
      .insert(deckInsert as never)
      .select('id')
      .single()

    const newDeckId = (newDeckData as { id: string } | null)?.id

    if (createDeckError || !newDeckId) {
      return { success: false, error: `Nepodařilo se vytvořit kopii balíčku: ${createDeckError?.message ?? 'Chybí ID nového balíčku.'}` }
    }

    const clonedCards: FlashcardInsert[] = []

    for (const [index, card] of sourceCards.entries()) {
      let duplicatedMediaPath = card.media_path

      if (card.media_path) {
        const sourceBucket = getFlashcardMediaBucket(card.media_path)
        const fileExtension = card.media_path.split('.').pop() ?? 'png'
        duplicatedMediaPath = `${FLASHCARD_MEDIA_PREFIX}/${user.id}/${Date.now()}-${index}-${crypto.randomUUID()}.${fileExtension}`

        if (sourceBucket === FLASHCARD_MEDIA_BUCKET) {
          const { error: copyError } = await supabase.storage
            .from(sourceBucket)
            .copy(card.media_path, duplicatedMediaPath)

          if (copyError) {
            return { success: false, error: `Nepodařilo se zkopírovat obrázek otázky: ${copyError.message}` }
          }
        } else {
          const { data: downloadedFile, error: downloadError } = await supabase.storage
            .from(sourceBucket)
            .download(card.media_path)

          if (downloadError || !downloadedFile) {
            return { success: false, error: `Nepodařilo se stáhnout obrázek otázky: ${downloadError?.message ?? 'Chybí soubor.'}` }
          }

          const { error: uploadError } = await supabase.storage
            .from(FLASHCARD_MEDIA_BUCKET)
            .upload(duplicatedMediaPath, downloadedFile, { upsert: false })

          if (uploadError) {
            return { success: false, error: `Nepodařilo se nahrát kopii obrázku: ${uploadError.message}` }
          }
        }
      }

      clonedCards.push({
        deck_id: newDeckId,
        front: card.front,
        back: card.back,
        prompt: card.prompt,
        question_type: card.question_type,
        answer_data: card.answer_data,
        media_path: duplicatedMediaPath,
        position: card.position,
      })
    }

    if (clonedCards.length > 0) {
      const { error: insertCardsError } = await supabase.from('flashcards').insert(clonedCards as never)
      if (insertCardsError) {
        return { success: false, error: `Nepodařilo se zkopírovat otázky: ${insertCardsError.message}` }
      }
    }

    revalidatePath('/flashcardy')
    revalidatePath(`/flashcardy/${deckId}`)
    revalidatePath(`/flashcardy/${newDeckId}`)
    return { success: true, deckId: newDeckId }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se duplikovat balíček.',
    }
  }
}

export async function saveOwnDeck(formData: FormData): Promise<SaveDeckResult> {
  const payload = parseSaveDeckPayload(formData.get('payload'))

  if (!payload) {
    return { success: false, error: 'Neplatná data balíčku.' }
  }

  const { valid, error: validationError } = validateDeckQuestions(payload.questions)
  if (validationError) {
    return { success: false, error: validationError }
  }

  const title = payload.title.trim()
  if (!title) {
    return { success: false, error: 'Zadejte název balíčku.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Pro uložení balíčku je potřeba se přihlásit.' }
  }

  let ownedDeckId: string | undefined
  if (payload.deckId) {
    const ownership = await getOwnedDeck(payload.deckId)
    if (ownership.error) {
      return { success: false, error: ownership.error }
    }
    ownedDeckId = payload.deckId
  }

  const uploadedPaths: string[] = []
  const removedPaths: string[] = []
  let createdDeckId: string | undefined

  try {
    let deckId = ownedDeckId

    if (deckId) {
      const deckUpdate: FlashcardDeckUpdate = {
        title,
        description: payload.description.trim() || null,
        is_public: payload.isPublic,
        subject_id: payload.subjectId,
      }

      const { error: deckUpdateError } = await supabase
        .from('flashcard_decks')
        .update(deckUpdate as never)
        .eq('id', deckId)
        .eq('creator_id', user.id)

      if (deckUpdateError) {
        throw new Error(deckUpdateError.message || 'Nepodařilo se upravit balíček.')
      }
    } else {
      const deckInsert: FlashcardDeckInsert = {
        title,
        description: payload.description.trim() || null,
        is_public: payload.isPublic,
        creator_id: user.id,
        subject_id: payload.subjectId,
      }

      const { data: newDeck, error: createDeckError } = await supabase
        .from('flashcard_decks')
        .insert(deckInsert as never)
        .select('id')
        .single()

      const insertedDeckId = (newDeck as { id: string } | null)?.id
      if (createDeckError || !insertedDeckId) {
        throw new Error(createDeckError?.message || 'Nepodařilo se vytvořit balíček.')
      }

      deckId = insertedDeckId
      createdDeckId = insertedDeckId
    }

    if (!deckId) {
      throw new Error('Chybí ID balíčku.')
    }

    const { data: existingCardsData, error: existingCardsError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('deck_id', deckId)
      .order('position')

    if (existingCardsError) {
      throw new Error(existingCardsError.message || 'Nepodařilo se načíst stávající otázky.')
    }

    const existingCards = (existingCardsData ?? []) as FlashcardRow[]
    const existingCardsMap = new Map(existingCards.map((card) => [card.id, card]))
    const validIds = new Set(valid.map((question) => question.id).filter(Boolean))
    const cardsToDelete = existingCards.filter((card) => !validIds.has(card.id))

    const newCardRecords: FlashcardInsert[] = []

    for (const [index, question] of valid.entries()) {
      const mediaEntry = formData.get(`media:${question.clientKey}`)
      const mediaFile = mediaEntry instanceof File && mediaEntry.size > 0 ? mediaEntry : null
      let mediaPath = question.mediaPath

      if (mediaFile) {
        if (!ALLOWED_IMAGE_TYPES.includes(mediaFile.type) || mediaFile.size > IMAGE_MAX_FILE_SIZE) {
          throw new Error(`Otázka ${index + 1}: obrázek musí být do 100 KB a ve formátu JPG, PNG, WEBP nebo AVIF.`)
        }

        if (question.mediaPath) {
          removedPaths.push(question.mediaPath)
        }

        const extension = mediaFile.name.split('.').pop() || 'png'
        mediaPath = `${FLASHCARD_MEDIA_PREFIX}/${user.id}/${Date.now()}-${index}-${crypto.randomUUID()}.${extension}`
        const { error: uploadError } = await supabase.storage
          .from(FLASHCARD_MEDIA_BUCKET)
          .upload(mediaPath, mediaFile, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          throw new Error(`Nepodařilo se nahrát obrázek: ${uploadError.message}`)
        }

        uploadedPaths.push(mediaPath)
      } else if (question.removeMedia && question.mediaPath) {
        removedPaths.push(question.mediaPath)
        mediaPath = null
      }

      const answerData =
        question.type === 'multiple_choice'
          ? {
              options: question.options
                .filter((option) => option.text.trim())
                .map((option) => ({ id: option.id, text: option.text.trim() })),
              correctOptionIds: question.correctOptionIds,
            }
          : question.type === 'yes_no'
            ? { correct: question.yesNoCorrect }
            : { answerText: question.answerText }

      const baseRecord = {
        deck_id: deckId,
        front: question.prompt,
        back: question.type === 'yes_no' ? (question.yesNoCorrect ? 'Ano' : 'Ne') : question.answerText,
        prompt: question.prompt,
        question_type: question.type,
        answer_data: answerData,
        media_path: mediaPath,
        position: index,
      }

      if (question.id && existingCardsMap.has(question.id)) {
        const updateRecord: FlashcardUpdate = baseRecord
        const { error: updateError } = await supabase
          .from('flashcards')
          .update(updateRecord as never)
          .eq('id', question.id)
          .eq('deck_id', deckId)

        if (updateError) {
          throw new Error(updateError.message || 'Nepodařilo se upravit otázku.')
        }
      } else {
        newCardRecords.push(baseRecord)
      }
    }

    if (newCardRecords.length > 0) {
      const { error: insertCardsError } = await supabase.from('flashcards').insert(newCardRecords as never)
      if (insertCardsError) {
        throw new Error(insertCardsError.message || 'Nepodařilo se uložit nové otázky.')
      }
    }

    for (const card of cardsToDelete) {
      const { error: deleteError } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', card.id)
        .eq('deck_id', deckId)

      if (deleteError) {
        throw new Error(deleteError.message || 'Nepodařilo se smazat otázku.')
      }

      if (card.media_path) {
        removedPaths.push(card.media_path)
      }
    }

    const uniqueRemovedPaths = [...new Set(removedPaths.filter(Boolean))]
    if (uniqueRemovedPaths.length > 0) {
      for (const entry of groupFlashcardMediaPaths(uniqueRemovedPaths)) {
        await supabase.storage.from(entry.bucket).remove(entry.paths)
      }
    }

    revalidatePath('/flashcardy')
    revalidatePath(`/flashcardy/${deckId}`)
    return { success: true, deckId }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      for (const entry of groupFlashcardMediaPaths(uploadedPaths)) {
        await supabase.storage.from(entry.bucket).remove(entry.paths)
      }
    }

    if (createdDeckId) {
      await supabase.from('flashcard_decks').delete().eq('id', createdDeckId).eq('creator_id', user.id)
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Nepodařilo se uložit balíček.',
    }
  }
}
