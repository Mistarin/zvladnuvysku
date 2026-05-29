'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  FLASHCARD_MEDIA_BUCKET,
  FLASHCARD_MEDIA_PREFIX,
  getFlashcardMediaUrl,
  normalizeFlashcard,
  type FlashcardQuestionType,
  type MultipleChoiceOption,
} from '@/lib/flashcards'
import type { Flashcard, FlashcardDeck } from '@/lib/types/database'

interface QuestionDraft {
  id?: string
  type: FlashcardQuestionType
  prompt: string
  answerText: string
  options: MultipleChoiceOption[]
  correctOptionIds: string[]
  yesNoCorrect: boolean
  mediaFile: File | null
  mediaPath: string | null
  mediaPreviewUrl: string | null
  removeMedia: boolean
}

interface InitialDeckData {
  deck: FlashcardDeck
  cards: Flashcard[]
}

interface NewDeckFormProps {
  defaultSubject?: string
  userId: string
  initialDeckData?: InitialDeckData
}

const IMAGE_MAX_FILE_SIZE = 2 * 1024 * 1024

function createOption(text = ''): MultipleChoiceOption {
  return { id: crypto.randomUUID(), text }
}

function createEmptyQuestion(type: FlashcardQuestionType = 'classic_flashcard'): QuestionDraft {
  return {
    type,
    prompt: '',
    answerText: '',
    options: [createOption(), createOption()],
    correctOptionIds: [],
    yesNoCorrect: true,
    mediaFile: null,
    mediaPath: null,
    mediaPreviewUrl: null,
    removeMedia: false,
  }
}

function createQuestionFromCard(card: Flashcard): QuestionDraft {
  const question = normalizeFlashcard(card)
  const mediaPreviewUrl = getFlashcardMediaUrl(question.media_path)

  if (question.question_type === 'multiple_choice') {
    return {
      id: question.id,
      type: question.question_type,
      prompt: question.prompt,
      answerText: '',
      options: question.answer_data.options.length > 0 ? question.answer_data.options : [createOption(), createOption()],
      correctOptionIds: question.answer_data.correctOptionIds,
      yesNoCorrect: true,
      mediaFile: null,
      mediaPath: question.media_path,
      mediaPreviewUrl,
      removeMedia: false,
    }
  }

  if (question.question_type === 'yes_no') {
    return {
      id: question.id,
      type: question.question_type,
      prompt: question.prompt,
      answerText: '',
      options: [createOption(), createOption()],
      correctOptionIds: [],
      yesNoCorrect: question.answer_data.correct,
      mediaFile: null,
      mediaPath: question.media_path,
      mediaPreviewUrl,
      removeMedia: false,
    }
  }

  return {
    id: question.id,
    type: question.question_type,
    prompt: question.prompt,
    answerText: question.answer_data.answerText,
    options: [createOption(), createOption()],
    correctOptionIds: [],
    yesNoCorrect: true,
    mediaFile: null,
    mediaPath: question.media_path,
    mediaPreviewUrl,
    removeMedia: false,
  }
}

function getQuestionTypeDescription(type: FlashcardQuestionType): string {
  switch (type) {
    case 'classic_flashcard':
      return 'Kartička'
    case 'multiple_choice':
      return 'Výběr odpovědí'
    case 'yes_no':
      return 'Ano / Ne'
    case 'open_answer':
      return 'Otevřená odpověď'
  }
}

export function NewDeckForm({ defaultSubject, userId, initialDeckData }: NewDeckFormProps) {
  const router = useRouter()
  const isEditing = Boolean(initialDeckData)
  const [title, setTitle] = useState(initialDeckData?.deck.title ?? '')
  const [description, setDescription] = useState(initialDeckData?.deck.description ?? '')
  const [isPublic, setIsPublic] = useState(initialDeckData?.deck.is_public ?? true)
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialDeckData?.cards.length
      ? initialDeckData.cards.map(createQuestionFromCard)
      : [createEmptyQuestion()]
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const addQuestion = () => setQuestions((prev) => [...prev, createEmptyQuestion()])

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateQuestion = <K extends keyof QuestionDraft>(index: number, field: K, value: QuestionDraft[K]) => {
    setQuestions((prev) => prev.map((question, i) => (i === index ? { ...question, [field]: value } : question)))
  }

  const updateOption = (questionIndex: number, optionId: string, text: string) => {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              options: question.options.map((option) => (option.id === optionId ? { ...option, text } : option)),
            }
          : question
      )
    )
  }

  const addOption = (questionIndex: number) => {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              options: [...question.options, createOption()],
            }
          : question
      )
    )
  }

  const removeOption = (questionIndex: number, optionId: string) => {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== questionIndex || question.options.length <= 2) return question
        return {
          ...question,
          options: question.options.filter((option) => option.id !== optionId),
          correctOptionIds: question.correctOptionIds.filter((id) => id !== optionId),
        }
      })
    )
  }

  const toggleCorrectOption = (questionIndex: number, optionId: string) => {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== questionIndex) return question
        const isChecked = question.correctOptionIds.includes(optionId)
        return {
          ...question,
          correctOptionIds: isChecked
            ? question.correctOptionIds.filter((id) => id !== optionId)
            : [...question.correctOptionIds, optionId],
        }
      })
    )
  }

  const handleTypeChange = (index: number, nextType: FlashcardQuestionType) => {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === index
          ? {
              ...createEmptyQuestion(nextType),
              id: question.id,
              prompt: question.prompt,
              mediaPath: question.mediaPath,
              mediaPreviewUrl: question.mediaPreviewUrl,
              removeMedia: question.removeMedia,
            }
          : question
      )
    )
  }

  const handleMediaChange = (index: number, file: File | null) => {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === index
          ? {
              ...question,
              mediaFile: file,
              removeMedia: file ? false : question.removeMedia,
            }
          : question
      )
    )
  }

  const handleRemoveMedia = (index: number) => {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === index
          ? {
              ...question,
              mediaFile: null,
              mediaPath: null,
              mediaPreviewUrl: null,
              removeMedia: true,
            }
          : question
      )
    )
  }

  const validateQuestions = (items: QuestionDraft[]) => {
    const valid = items.filter((question) => question.prompt.trim())

    if (valid.length === 0) {
      return { valid: [] as QuestionDraft[], error: 'Přidejte alespoň jednu otázku se zadáním.' }
    }

    for (const [index, question] of valid.entries()) {
      if (question.mediaFile && (!question.mediaFile.type.startsWith('image/') || question.mediaFile.size > IMAGE_MAX_FILE_SIZE)) {
        return { valid: [], error: `Otázka ${index + 1}: obrázek musí být do 2 MB a ve formátu obrázku.` }
      }

      if (question.type === 'multiple_choice') {
        const filledOptions = question.options.filter((option) => option.text.trim())
        if (filledOptions.length < 2) {
          return { valid: [], error: `Otázka ${index + 1}: multiple choice musí mít alespoň 2 vyplněné možnosti.` }
        }
        if (question.correctOptionIds.length === 0) {
          return { valid: [], error: `Otázka ${index + 1}: vyberte alespoň jednu správnou možnost.` }
        }
        const validOptionIds = new Set(filledOptions.map((option) => option.id))
        if (!question.correctOptionIds.every((id) => validOptionIds.has(id))) {
          return { valid: [], error: `Otázka ${index + 1}: správné odpovědi musí být mezi vyplněnými možnostmi.` }
        }
        continue
      }

      if (!question.answerText.trim() && question.type !== 'yes_no') {
        return { valid: [], error: `Otázka ${index + 1}: vyplňte správnou odpověď.` }
      }
    }

    return { valid, error: '' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) return setError('Zadejte název balíčku.')

    const { valid, error: validationError } = validateQuestions(questions)
    if (validationError) return setError(validationError)

    setLoading(true)
    const supabase = createClient()
    const uploadedPaths: string[] = []
    const removedPaths: string[] = []

    try {
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

      let deckId = initialDeckData?.deck.id

      if (isEditing && deckId) {
        const { error: deckErr } = await supabase
          .from('flashcard_decks')
          .update({
            title: title.trim(),
            description: description.trim() || null,
            is_public: isPublic,
            subject_id: subjectId,
          } as never)
          .eq('id', deckId)

        if (deckErr) throw new Error(deckErr.message || 'Nepodařilo se upravit balíček.')
      } else {
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
        deckId = (deck as { id: string }).id
      }

      if (!deckId) throw new Error('Chybí ID balíčku.')

      const existingCards = new Map((initialDeckData?.cards ?? []).map((card) => [card.id, card]))
      const validIds = new Set(valid.map((question) => question.id).filter(Boolean))
      const cardsToDelete = (initialDeckData?.cards ?? []).filter((card) => !validIds.has(card.id))

      const records = []
      for (const [index, question] of valid.entries()) {
        let mediaPath = question.mediaPath

        if (question.mediaFile) {
          if (question.mediaPath) {
            removedPaths.push(question.mediaPath)
          }
          const ext = question.mediaFile.name.split('.').pop() || 'png'
          mediaPath = `${FLASHCARD_MEDIA_PREFIX}/${userId}/${Date.now()}-${index}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from(FLASHCARD_MEDIA_BUCKET)
            .upload(mediaPath, question.mediaFile, { cacheControl: '3600', upsert: false })

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
                options: question.options.filter((option) => option.text.trim()).map((option) => ({
                  id: option.id,
                  text: option.text.trim(),
                })),
                correctOptionIds: question.correctOptionIds,
              }
            : question.type === 'yes_no'
              ? {
                  correct: question.yesNoCorrect,
                }
              : {
                  answerText: question.answerText.trim(),
                }

        const record = {
          deck_id: deckId,
          front: question.prompt.trim(),
          back: question.type === 'yes_no' ? (question.yesNoCorrect ? 'Ano' : 'Ne') : question.answerText.trim(),
          prompt: question.prompt.trim(),
          question_type: question.type,
          answer_data: answerData,
          media_path: mediaPath,
          position: index,
        }

        if (question.id && existingCards.has(question.id)) {
          const { error: updateError } = await supabase
            .from('flashcards')
            .update(record as never)
            .eq('id', question.id)
            .eq('deck_id', deckId)

          if (updateError) throw new Error(updateError.message || 'Nepodařilo se upravit otázku.')
        } else {
          records.push(record)
        }
      }

      if (records.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: cardsErr } = await (supabase as any).from('flashcards').insert(records)
        if (cardsErr) throw new Error(cardsErr.message || 'Nepodařilo se uložit nové otázky.')
      }

      for (const card of cardsToDelete) {
        const { error: deleteError } = await supabase
          .from('flashcards')
          .delete()
          .eq('id', card.id)
          .eq('deck_id', deckId)

        if (deleteError) throw new Error(deleteError.message || 'Nepodařilo se smazat otázku.')
        if (card.media_path) removedPaths.push(card.media_path)
      }

      const uniqueRemovedPaths = [...new Set(removedPaths.filter(Boolean))]
      if (uniqueRemovedPaths.length > 0) {
        await supabase.storage.from(FLASHCARD_MEDIA_BUCKET).remove(uniqueRemovedPaths)
      }

      router.push(`/flashcardy/${deckId}`)
      router.refresh()
    } catch (err: unknown) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(FLASHCARD_MEDIA_BUCKET).remove(uploadedPaths)
      }
      setError(err instanceof Error ? err.message : 'Nastala chyba.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Otázky ({questions.length})</h2>
          <button
            type="button"
            onClick={addQuestion}
            className="text-sm px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-all"
          >
            + Přidat otázku
          </button>
        </div>

        <div className="space-y-3">
          {questions.map((question, index) => (
            <div key={question.id ?? index} className="glass-card rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Otázka {index + 1}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">{getQuestionTypeDescription(question.type)}</p>
                </div>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="text-xs text-destructive hover:opacity-70 transition-opacity"
                  >
                    Odebrat
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Typ otázky</label>
                <select
                  value={question.type}
                  onChange={(e) => handleTypeChange(index, e.target.value as FlashcardQuestionType)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="classic_flashcard">Klasická kartička</option>
                  <option value="multiple_choice">Výběr odpovědí</option>
                  <option value="yes_no">Ano / Ne</option>
                  <option value="open_answer">Otevřená odpověď</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Zadání otázky</label>
                <textarea
                  value={question.prompt}
                  onChange={(e) => updateQuestion(index, 'prompt', e.target.value)}
                  placeholder="Zadejte zadání otázky..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Obrázek k otázce (volitelný, max 2 MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMediaChange(index, e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer border border-border rounded-lg bg-background"
                />
                {question.mediaFile && (
                  <p className="text-xs text-muted-foreground">Vybraný soubor: {question.mediaFile.name}</p>
                )}
                {!question.mediaFile && question.mediaPreviewUrl && !question.removeMedia && (
                  <div className="space-y-2">
                    <Image
                      src={question.mediaPreviewUrl}
                      alt="Aktuální obrázek otázky"
                      width={800}
                      height={480}
                      className="max-h-48 h-auto w-auto rounded-xl border border-border bg-background object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index)}
                      className="text-xs text-destructive hover:opacity-70 transition-opacity"
                    >
                      Odebrat obrázek
                    </button>
                  </div>
                )}
              </div>

              {question.type === 'multiple_choice' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Možnosti odpovědí</label>
                    <button
                      type="button"
                      onClick={() => addOption(index)}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
                    >
                      + Možnost
                    </button>
                  </div>
                  {question.options.map((option) => (
                    <div key={option.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={question.correctOptionIds.includes(option.id)}
                        onChange={() => toggleCorrectOption(index, option.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => updateOption(index, option.id, e.target.value)}
                        placeholder="Text možnosti"
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(index, option.id)}
                        className="text-xs text-destructive hover:opacity-70 transition-opacity"
                      >
                        Odebrat
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">Zaškrtni všechny správné odpovědi.</p>
                </div>
              ) : question.type === 'yes_no' ? (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Správná odpověď</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => updateQuestion(index, 'yesNoCorrect', true)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                        question.yesNoCorrect ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'
                      }`}
                    >
                      Ano
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestion(index, 'yesNoCorrect', false)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                        !question.yesNoCorrect ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background'
                      }`}
                    >
                      Ne
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    {question.type === 'classic_flashcard' ? 'Správná odpověď' : 'Referenční odpověď pro self-check'}
                  </label>
                  <textarea
                    value={question.answerText}
                    onChange={(e) => updateQuestion(index, 'answerText', e.target.value)}
                    placeholder="Zadejte správnou odpověď..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm hover:border-primary/40 hover:text-primary transition-all"
        >
          + Přidat další otázku
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
          {loading ? (isEditing ? 'Ukládání...' : 'Vytváření...') : isEditing ? '✓ Uložit změny' : '✓ Vytvořit balíček'}
        </button>
        <Link
          href={isEditing && initialDeckData ? `/flashcardy/${initialDeckData.deck.id}` : defaultSubject ? `/predmety/${defaultSubject}/flashcardy` : '/predmety'}
          className="px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-all text-sm font-medium"
        >
          Zrušit
        </Link>
      </div>
    </form>
  )
}
