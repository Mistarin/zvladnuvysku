'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRating } from '@/hooks/use-rating'

interface RatingFormProps {
  subjectId: string
  isLoggedIn: boolean
}

function StarPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-xl transition-transform hover:scale-110"
            aria-label={`${star} z 5`}
          >
            <span className={active >= star ? 'text-yellow-400' : 'text-muted/60'}>
              ★
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function RatingForm({ subjectId, isLoggedIn }: RatingFormProps) {
  const { submit, isSubmitting, error, success } = useRating()

  const [overall, setOverall] = useState(0)
  const [difficulty, setDifficulty] = useState(0)
  const [usefulness, setUsefulness] = useState(0)
  const [workload, setWorkload] = useState(0)
  const [comment, setComment] = useState('')

  if (!isLoggedIn) {
    return (
      <div className="text-center py-6 space-y-3">
        <p className="text-muted-foreground text-sm">
          Pro přidání hodnocení se musíš přihlásit školním účtem.
        </p>
        <Link
          href="/prihlaseni"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
        >
          Přihlásit se →
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-6 space-y-2">
        <div className="text-3xl">🎉</div>
        <p className="font-medium text-foreground">Hodnocení uloženo!</p>
        <p className="text-sm text-muted-foreground">Díky za zpětnou vazbu.</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (overall === 0) return
    await submit({
      subjectId,
      overall,
      difficulty: difficulty || undefined,
      usefulness: usefulness || undefined,
      workload: workload || undefined,
      comment,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Celkové hodnocení — povinné */}
      <div>
        <StarPicker
          label="Celkové hodnocení *"
          value={overall}
          onChange={setOverall}
        />
        {overall === 0 && (
          <p className="text-xs text-muted-foreground/70 mt-1">Povinné</p>
        )}
      </div>

      {/* Volitelné dimenze */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StarPicker label="Obtížnost" value={difficulty} onChange={setDifficulty} />
        <StarPicker label="Užitečnost" value={usefulness} onChange={setUsefulness} />
        <StarPicker label="Pracovní zátěž" value={workload} onChange={setWorkload} />
      </div>

      {/* Komentář */}
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground" htmlFor="rating-comment">
          Komentář <span className="opacity-50">(max 2000 znaků)</span>
        </label>
        <textarea
          id="rating-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Sdílej svou zkušenost s předmětem..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
        />
        <p className="text-xs text-muted-foreground/50 text-right">
          {comment.length}/2000
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || overall === 0}
        className="w-full py-2.5 rounded-xl font-medium text-sm accent-gradient text-white hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Ukládám...' : 'Uložit hodnocení'}
      </button>
    </form>
  )
}
