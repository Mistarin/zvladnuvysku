'use client'

import type { Flashcard } from '@/lib/types/database'

interface FlashcardViewerProps {
  card: Flashcard
  isFlipped: boolean
  currentIndex: number
  totalCards: number
  onFlip: () => void
  onRate: (quality: 0 | 1 | 2 | 3 | 4 | 5) => void
}

export function FlashcardViewer({
  card,
  isFlipped,
  currentIndex,
  totalCards,
  onFlip,
  onRate,
}: FlashcardViewerProps) {
  const progress = ((currentIndex) / totalCards) * 100

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto px-4">
      {/* Progress bar */}
      <div className="w-full space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Karta {currentIndex + 1} z {totalCards}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full accent-gradient rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 3D Flip Card */}
      <div
        className="w-full cursor-pointer"
        style={{ perspective: '1200px' }}
        onClick={onFlip}
        role="button"
        aria-label={isFlipped ? 'Zobrazit přední stranu' : 'Otočit kartu'}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onFlip()}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: '280px',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 glass-card p-8 flex flex-col rounded-2xl shadow-lg"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-4">
              Otázka
            </span>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xl sm:text-2xl font-medium text-foreground text-center leading-relaxed">
                {card.front}
              </p>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Klikněte nebo stiskněte <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs font-mono">Mezerník</kbd> pro otočení
            </p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 p-8 flex flex-col rounded-2xl shadow-lg border border-primary/20"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'color-mix(in srgb, var(--color-card) 85%, var(--color-primary) 15%)',
            }}
          >
            <span className="text-xs font-semibold text-primary/70 uppercase tracking-wider mb-4">
              Odpověď
            </span>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xl sm:text-2xl font-medium text-foreground text-center leading-relaxed">
                {card.back}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons — visible only after flip */}
      <div
        className={`w-full transition-all duration-300 ${
          isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <p className="text-center text-sm text-muted-foreground mb-3">Jak dobře jste si vzpomněli?</p>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => onRate(1)}
            className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 border-destructive/40 bg-destructive/5 hover:bg-destructive/15 text-destructive transition-all hover:scale-105 active:scale-95 font-medium"
          >
            <span className="text-lg">😕</span>
            <span className="text-sm">Nevím</span>
            <span className="text-xs opacity-60">[1]</span>
          </button>
          <button
            onClick={() => onRate(3)}
            className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 border-yellow-400/40 bg-yellow-400/5 hover:bg-yellow-400/15 text-yellow-700 dark:text-yellow-400 transition-all hover:scale-105 active:scale-95 font-medium"
          >
            <span className="text-lg">🤔</span>
            <span className="text-sm">Skoro</span>
            <span className="text-xs opacity-60">[2]</span>
          </button>
          <button
            onClick={() => onRate(5)}
            className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/15 text-primary transition-all hover:scale-105 active:scale-95 font-medium"
          >
            <span className="text-lg">✅</span>
            <span className="text-sm">Znám</span>
            <span className="text-xs opacity-60">[3]</span>
          </button>
        </div>
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-muted-foreground text-center">
        <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded font-mono">Mezerník</kbd> = otočit
        {isFlipped && (
          <>
            {' '}·{' '}
            <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded font-mono">1</kbd>/<kbd className="px-1.5 py-0.5 bg-muted border border-border rounded font-mono">2</kbd>/<kbd className="px-1.5 py-0.5 bg-muted border border-border rounded font-mono">3</kbd> = hodnocení
          </>
        )}
      </p>
    </div>
  )
}
