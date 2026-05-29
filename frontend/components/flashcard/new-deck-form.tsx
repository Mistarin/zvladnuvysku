'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2 } from 'lucide-react'
import { saveOwnDeck } from '@/app/flashcardy/actions'
import {
  type DeckSubjectRef,
  getFlashcardMediaUrl,
  normalizeFlashcard,
  type FlashcardQuestionType,
  type MultipleChoiceOption,
} from '@/lib/flashcards'
import { getSubjectCache, searchInCache, type SubjectCacheEntry } from '@/lib/subject-cache'
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
  initialSubject?: DeckSubjectRef | null
  initialDeckData?: InitialDeckData
}

const IMAGE_MAX_FILE_SIZE = 100 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif'

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

function toDeckSubjectRef(subject: SubjectCacheEntry): DeckSubjectRef {
  return {
    id: subject.id,
    slug: subject.slug,
    name: subject.name,
    short_tag: subject.short_tag,
    faculty: subject.faculty,
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

export function NewDeckForm({ initialSubject = null, initialDeckData }: NewDeckFormProps) {
  const router = useRouter()
  const isEditing = Boolean(initialDeckData)
  const [title, setTitle] = useState(initialDeckData?.deck.title ?? '')
  const [description, setDescription] = useState(initialDeckData?.deck.description ?? '')
  const [isPublic, setIsPublic] = useState(initialDeckData?.deck.is_public ?? true)
  const [subjectCache, setSubjectCache] = useState<SubjectCacheEntry[]>([])
  const [subjectQuery, setSubjectQuery] = useState(initialSubject?.name ?? '')
  const [selectedSubject, setSelectedSubject] = useState<DeckSubjectRef | null>(initialSubject)
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initialDeckData?.cards.length
      ? initialDeckData.cards.map(createQuestionFromCard)
      : [createEmptyQuestion()]
  )
  const [collapsedQuestions, setCollapsedQuestions] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadSubjects = async () => {
      try {
        const entries = await getSubjectCache()
        if (!cancelled) setSubjectCache(entries)
      } catch {
        if (!cancelled) setSubjectCache([])
      }
    }

    loadSubjects()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSelectedSubject(initialSubject)
    setSubjectQuery(initialSubject?.name ?? '')
  }, [initialSubject])

  const subjectSuggestions = useMemo(() => {
    const normalized = subjectQuery.trim().toLowerCase()
    if (!normalized) return []
    if (
      selectedSubject &&
      (selectedSubject.name.toLowerCase() === normalized || selectedSubject.short_tag.toLowerCase() === normalized)
    ) {
      return []
    }
    return searchInCache(subjectCache, subjectQuery, 8)
  }, [selectedSubject, subjectCache, subjectQuery])

  const cancelHref =
    isEditing && initialDeckData
      ? `/flashcardy/${initialDeckData.deck.id}`
      : initialSubject?.slug
        ? `/predmety/${initialSubject.slug}/flashcardy`
        : '/predmety'

  const addQuestion = () => setQuestions((prev) => [...prev, createEmptyQuestion()])

  const duplicateQuestion = (index: number) => {
    setQuestions((prev) => {
      const source = prev[index]
      if (!source) return prev

      const duplicated: QuestionDraft = {
        ...source,
        id: undefined,
        options: source.options.map((option) => ({ ...option, id: crypto.randomUUID() })),
        mediaFile: null,
        removeMedia: false,
      }

      return [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)]
    })
  }

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    setQuestions((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev

      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  const getQuestionKey = (question: QuestionDraft, index: number) => question.id ?? `draft-${index}`

  const toggleCollapsed = (questionKey: string) => {
    setCollapsedQuestions((prev) => ({ ...prev, [questionKey]: !prev[questionKey] }))
  }

  const setAllCollapsed = (collapsed: boolean) => {
    setCollapsedQuestions(
      Object.fromEntries(questions.map((question, index) => [getQuestionKey(question, index), collapsed]))
    )
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
              mediaPreviewUrl: file ? URL.createObjectURL(file) : question.mediaPreviewUrl,
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
      if (question.mediaFile && (!ALLOWED_IMAGE_TYPES.includes(question.mediaFile.type) || question.mediaFile.size > IMAGE_MAX_FILE_SIZE)) {
        return { valid: [], error: `Otázka ${index + 1}: obrázek musí být do 100 KB a ve formátu JPG, PNG, WEBP nebo AVIF.` }
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

    try {
      const payload = {
        deckId: initialDeckData?.deck.id,
        title,
        description,
        isPublic,
        subjectId: selectedSubject?.id ?? null,
        questions: valid.map((question, index) => ({
          clientKey: getQuestionKey(question, index),
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          answerText: question.answerText,
          options: question.options,
          correctOptionIds: question.correctOptionIds,
          yesNoCorrect: question.yesNoCorrect,
          mediaPath: question.mediaPath,
          removeMedia: question.removeMedia,
          hasMediaFile: Boolean(question.mediaFile),
        })),
      }

      const formData = new FormData()
      formData.set('payload', JSON.stringify(payload))

      valid.forEach((question, index) => {
        if (question.mediaFile) {
          formData.set(`media:${getQuestionKey(question, index)}`, question.mediaFile)
        }
      })

      const result = await saveOwnDeck(formData)
      if (!result.success) {
        throw new Error(result.error)
      }

      router.push(`/flashcardy/${result.deckId}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Nastala chyba.')
    } finally {
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

        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground" htmlFor="subject-search">
            Přiřazený předmět
          </label>
          <div className="space-y-2">
            <input
              id="subject-search"
              type="text"
              value={subjectQuery}
              onChange={(e) => {
                const nextValue = e.target.value
                setSubjectQuery(nextValue)
                if (
                  selectedSubject &&
                  nextValue.trim().toLowerCase() !== selectedSubject.name.toLowerCase() &&
                  nextValue.trim().toLowerCase() !== selectedSubject.short_tag.toLowerCase()
                ) {
                  setSelectedSubject(null)
                }
                if (!nextValue.trim()) {
                  setSelectedSubject(null)
                }
              }}
              placeholder="Hledej podle zkratky nebo názvu předmětu..."
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {subjectSuggestions.length > 0 && (
              <div className="rounded-xl border border-border bg-background overflow-hidden">
                {subjectSuggestions.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => {
                      const nextSubject = toDeckSubjectRef(subject)
                      setSelectedSubject(nextSubject)
                      setSubjectQuery(nextSubject.name)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {subject.short_tag} · {subject.name}
                    </p>
                    {subject.faculty && (
                      <p className="text-xs text-muted-foreground mt-1">{subject.faculty}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedSubject ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {selectedSubject.short_tag} · {selectedSubject.name}
                </p>
                {selectedSubject.faculty && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedSubject.faculty}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject(null)
                  setSubjectQuery('')
                }}
                className="text-xs text-destructive hover:opacity-70 transition-opacity shrink-0"
              >
                Odebrat
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Předmět je volitelný. Pokud ho přiřadíš, balíček se bude lépe zobrazovat ve vyhledávání.
            </p>
          )}
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
          <div className="flex flex-wrap items-center gap-2">
            {questions.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setAllCollapsed(true)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  Sbalit vše
                </button>
                <button
                  type="button"
                  onClick={() => setAllCollapsed(false)}
                  className="text-sm px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  Rozbalit vše
                </button>
              </>
            )}
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-all"
            >
              <Plus className="size-4" />
              Přidat otázku
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((question, index) => (
            (() => {
              const questionKey = getQuestionKey(question, index)
              const isCollapsed = collapsedQuestions[questionKey] ?? false
              const questionSummary = question.prompt.trim() || 'Prázdná otázka'

              return (
            <div key={questionKey} className="glass-card rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-4 text-muted-foreground/60" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Otázka {index + 1}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {getQuestionTypeDescription(question.type)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-foreground">
                    {questionSummary}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(questionKey)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {isCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                    {isCollapsed ? 'Rozbalit' : 'Sbalit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, 'up')}
                    disabled={index === 0}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, 'down')}
                    disabled={index === questions.length - 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateQuestion(index)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Copy className="size-3.5" />
                    Duplikovat
                  </button>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                      Odebrat
                    </button>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <>
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
                <label className="text-xs text-muted-foreground">Obrázek k otázce (volitelný, max 100 KB, JPG/PNG/WEBP/AVIF)</label>
                <input
                  type="file"
                  accept={IMAGE_ACCEPT}
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
                      <button
                        type="button"
                        onClick={() => toggleCorrectOption(index, option.id)}
                        aria-pressed={question.correctOptionIds.includes(option.id)}
                        aria-label={
                          question.correctOptionIds.includes(option.id)
                            ? 'Odebrat správnou odpověď'
                            : 'Označit jako správnou odpověď'
                        }
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          question.correctOptionIds.includes(option.id)
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-background text-transparent hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
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
                </>
              )}
            </div>
              )
            })()
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
          href={cancelHref}
          className="px-5 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-all text-sm font-medium"
        >
          Zrušit
        </Link>
      </div>
    </form>
  )
}
