'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import {
  areOptionSetsEqual,
  getFlashcardAnswerText,
  getFlashcardMediaUrl,
  normalizeFlashcard,
  type FlashcardQuestion,
} from '@/lib/flashcards'
import type { Flashcard } from '@/lib/types/database'

interface FlashcardViewerProps {
  card: Flashcard
  currentIndex: number
  totalCards: number
  onRate: (quality: 0 | 1 | 2 | 3 | 4 | 5) => void
}

type Stage = 'answering' | 'revealed' | 'rating'

export function FlashcardViewer({
  card,
  currentIndex,
  totalCards,
  onRate,
}: FlashcardViewerProps) {
  const question = useMemo(() => normalizeFlashcard(card), [card])
  const [stage, setStage] = useState<Stage>(question.question_type === 'classic_flashcard' ? 'answering' : 'answering')
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([])
  const [typedAnswer, setTypedAnswer] = useState('')
  const [yesNoSelection, setYesNoSelection] = useState<boolean | null>(null)

  useEffect(() => {
    setStage('answering')
    setSelectedOptionIds([])
    setTypedAnswer('')
    setYesNoSelection(null)
  }, [question.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

      if (question.question_type === 'classic_flashcard' && stage === 'answering' && e.key === ' ') {
        e.preventDefault()
        setStage('revealed')
      }

      if (stage === 'rating') {
        if (e.key === '1') onRate(1)
        if (e.key === '2') onRate(3)
        if (e.key === '3') onRate(5)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onRate, question.question_type, stage])

  const progress = (currentIndex / totalCards) * 100
  const mediaUrl = getFlashcardMediaUrl(question.media_path)

  const multipleChoiceCorrect = question.question_type === 'multiple_choice'
    ? areOptionSetsEqual(selectedOptionIds, question.answer_data.correctOptionIds)
    : null

  const yesNoCorrect = question.question_type === 'yes_no'
    ? yesNoSelection === question.answer_data.correct
    : null

  const revealClassic = () => setStage('revealed')
  const continueToRating = () => setStage('rating')

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto px-4">
      <div className="w-full space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Otázka {currentIndex + 1} z {totalCards}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full accent-gradient rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="w-full glass-card rounded-2xl shadow-lg p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
            {getQuestionTypeTitle(question)}
          </span>
          {question.question_type !== 'classic_flashcard' && (
            <span className="text-xs text-muted-foreground">
              Nejprve odpověz, potom proveď self-check
            </span>
          )}
        </div>

        <div className="space-y-4">
          {mediaUrl && (
            <Image
              src={mediaUrl}
              alt="Obrázek otázky"
              width={1200}
              height={720}
              className="w-full max-h-72 object-contain rounded-xl border border-border bg-background"
            />
          )}
          <p className="text-xl sm:text-2xl font-medium text-foreground text-center leading-relaxed">
            {question.prompt}
          </p>
        </div>

        {question.question_type === 'classic_flashcard' && (
          <>
            {stage === 'answering' ? (
              <div className="text-center space-y-4">
                <button
                  onClick={revealClassic}
                  className="px-6 py-3 rounded-xl font-medium accent-gradient text-white hover:opacity-90 transition-all"
                >
                  Otočit kartičku
                </button>
                <p className="text-xs text-muted-foreground">
                  Klikni nebo stiskni <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono">Mezerník</kbd> pro odhalení odpovědi
                </p>
              </div>
            ) : (
              <AnswerReveal answerText={getFlashcardAnswerText(question)} onContinue={continueToRating} />
            )}
          </>
        )}

        {question.question_type === 'multiple_choice' && (
          <>
            <div className="space-y-3">
              {question.answer_data.options.map((option) => {
                const isSelected = selectedOptionIds.includes(option.id)
                const isCorrectOption = stage !== 'answering' && question.answer_data.correctOptionIds.includes(option.id)
                const isWrongSelected = stage !== 'answering' && isSelected && !isCorrectOption

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={stage !== 'answering'}
                    onClick={() => {
                      if (stage !== 'answering') return
                      setSelectedOptionIds((prev) =>
                        prev.includes(option.id)
                          ? prev.filter((id) => id !== option.id)
                          : [...prev, option.id]
                      )
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      isCorrectOption
                        ? 'border-primary bg-primary/10 text-primary'
                        : isWrongSelected
                          ? 'border-destructive/40 bg-destructive/10 text-destructive'
                          : isSelected
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-background hover:bg-muted'
                    }`}
                  >
                    {option.text}
                  </button>
                )
              })}
            </div>

            {stage === 'answering' ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={selectedOptionIds.length === 0}
                  onClick={() => setStage('revealed')}
                  className="px-5 py-2.5 rounded-xl font-medium accent-gradient text-white disabled:opacity-50"
                >
                  Zkontrolovat odpověď
                </button>
              </div>
            ) : stage === 'revealed' ? (
              <FeedbackReveal
                title={multipleChoiceCorrect ? 'Správně' : 'Ne zcela správně'}
                description={`Správné odpovědi: ${getFlashcardAnswerText(question)}`}
                tone={multipleChoiceCorrect ? 'success' : 'warning'}
                onContinue={continueToRating}
              />
            ) : null}
          </>
        )}

        {question.question_type === 'yes_no' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={stage !== 'answering'}
                onClick={() => {
                  setYesNoSelection(true)
                  setStage('revealed')
                }}
                className={`px-4 py-4 rounded-xl border text-sm font-medium transition-all ${
                  yesNoSelection === true ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted'
                }`}
              >
                Ano
              </button>
              <button
                type="button"
                disabled={stage !== 'answering'}
                onClick={() => {
                  setYesNoSelection(false)
                  setStage('revealed')
                }}
                className={`px-4 py-4 rounded-xl border text-sm font-medium transition-all ${
                  yesNoSelection === false ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background hover:bg-muted'
                }`}
              >
                Ne
              </button>
            </div>

            {stage === 'revealed' && (
              <FeedbackReveal
                title={yesNoCorrect ? 'Správně' : 'Ne zcela správně'}
                description={`Správná odpověď: ${getFlashcardAnswerText(question)}`}
                tone={yesNoCorrect ? 'success' : 'warning'}
                onContinue={continueToRating}
              />
            )}
          </>
        )}

        {question.question_type === 'open_answer' && (
          <>
            <div className="space-y-3">
              <textarea
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Napiš svoji odpověď..."
                rows={5}
                disabled={stage !== 'answering'}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              {stage === 'answering' ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStage('revealed')}
                    className="px-5 py-2.5 rounded-xl font-medium accent-gradient text-white"
                  >
                    Zobrazit řešení
                  </button>
                </div>
              ) : (
                <AnswerReveal
                  answerText={getFlashcardAnswerText(question)}
                  extra={typedAnswer.trim() ? `Tvoje odpověď: ${typedAnswer.trim()}` : 'Bez vyplněné odpovědi.'}
                  onContinue={continueToRating}
                />
              )}
            </div>
          </>
        )}
      </div>

      {stage === 'rating' && (
        <div className="w-full animate-slide-up">
          <p className="text-center text-sm text-muted-foreground mb-3">Jak dobře jste si vzpomněli?</p>
          <div className="grid grid-cols-3 gap-3">
            <RatingButton emoji="😕" label="Nevím" shortcut="1" onClick={() => onRate(1)} tone="danger" />
            <RatingButton emoji="🤔" label="Skoro" shortcut="2" onClick={() => onRate(3)} tone="warning" />
            <RatingButton emoji="✅" label="Znám" shortcut="3" onClick={() => onRate(5)} tone="success" />
          </div>
        </div>
      )}
    </div>
  )
}

function getQuestionTypeTitle(question: FlashcardQuestion): string {
  switch (question.question_type) {
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

function AnswerReveal({
  answerText,
  extra,
  onContinue,
}: {
  answerText: string
  extra?: string
  onContinue: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
        <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider">Správná odpověď</span>
        <p className="text-lg text-foreground leading-relaxed whitespace-pre-wrap">{answerText}</p>
        {extra && <p className="text-sm text-muted-foreground">{extra}</p>}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="px-5 py-2.5 rounded-xl font-medium border border-border bg-card hover:bg-muted transition-colors"
        >
          Pokračovat na self-check
        </button>
      </div>
    </div>
  )
}

function FeedbackReveal({
  title,
  description,
  tone,
  onContinue,
}: {
  title: string
  description: string
  tone: 'success' | 'warning'
  onContinue: () => void
}) {
  return (
    <div className={`rounded-2xl p-5 space-y-3 border ${
      tone === 'success'
        ? 'border-primary/20 bg-primary/5'
        : 'border-yellow-400/30 bg-yellow-400/10'
    }`}>
      <p className={`font-semibold ${tone === 'success' ? 'text-primary' : 'text-yellow-700 dark:text-yellow-400'}`}>
        {title}
      </p>
      <p className="text-sm text-foreground">{description}</p>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="px-5 py-2.5 rounded-xl font-medium border border-border bg-card hover:bg-muted transition-colors"
        >
          Pokračovat na self-check
        </button>
      </div>
    </div>
  )
}

function RatingButton({
  emoji,
  label,
  shortcut,
  onClick,
  tone,
}: {
  emoji: string
  label: string
  shortcut: string
  onClick: () => void
  tone: 'danger' | 'warning' | 'success'
}) {
  const toneClasses =
    tone === 'danger'
      ? 'border-destructive/40 bg-destructive/5 hover:bg-destructive/15 text-destructive'
      : tone === 'warning'
        ? 'border-yellow-400/40 bg-yellow-400/5 hover:bg-yellow-400/15 text-yellow-700 dark:text-yellow-400'
        : 'border-primary/40 bg-primary/5 hover:bg-primary/15 text-primary'

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all hover:scale-105 active:scale-95 font-medium ${toneClasses}`}
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-sm">{label}</span>
      <span className="text-xs opacity-60">[{shortcut}]</span>
    </button>
  )
}
