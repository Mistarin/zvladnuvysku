'use client'

import Link from 'next/link'

interface SessionResult {
  quality: number
}

interface SessionSummaryProps {
  results: SessionResult[]
  subjectSlug?: string
  onRestart: () => void
}

function getMessage(percentKnown: number): string {
  if (percentKnown >= 90) return '🏆 Výborně! Zvládáte to skvěle!'
  if (percentKnown >= 70) return '🎉 Dobrá práce! Ještě trochu tréninku a budete mít vše v malíku.'
  if (percentKnown >= 50) return '💪 Dobrý začátek! Opakování je matka moudrosti.'
  if (percentKnown >= 30) return '📚 Nevadí — procvičujte dál a uvidíte pokrok!'
  return '🌱 Každý někde začíná. Pokračujte v procvičování!'
}

export function SessionSummary({ results, subjectSlug, onRestart }: SessionSummaryProps) {
  const total = results.length
  const known = results.filter((r) => r.quality >= 5).length
  const almost = results.filter((r) => r.quality >= 3 && r.quality < 5).length
  const unknown = results.filter((r) => r.quality < 3).length
  const percentKnown = total > 0 ? Math.round((known / total) * 100) : 0

  const message = getMessage(percentKnown)

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-lg mx-auto px-4 animate-slide-up">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Procvičování dokončeno!</h2>
        <p className="text-muted-foreground">{message}</p>
      </div>

      {/* Stats */}
      <div className="w-full glass-card p-6 space-y-4">
        <div className="text-center">
          <span className="text-4xl font-bold text-primary">{percentKnown}%</span>
          <p className="text-sm text-muted-foreground mt-1">zvládnuto z {total} otázek</p>
        </div>

        {/* Breakdown bars */}
        <div className="space-y-3">
          <StatBar
            label="Zvládl"
            count={known}
            total={total}
            color="bg-primary"
            emoji="✅"
          />
          <StatBar
            label="Částečně"
            count={almost}
            total={total}
            color="bg-yellow-400"
            emoji="🤔"
          />
          <StatBar
            label="Nezvládl"
            count={unknown}
            total={total}
            color="bg-destructive"
            emoji="😕"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <button
          onClick={onRestart}
          className="flex-1 px-5 py-3 rounded-xl text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all text-center"
        >
          🔄 Procvičovat znovu
        </button>
        {subjectSlug && (
          <Link
            href={`/predmety/${subjectSlug}/flashcardy`}
            className="flex-1 px-5 py-3 rounded-xl text-sm font-medium border border-border bg-card hover:bg-muted transition-all text-center"
          >
            ← Zpět na předmět
          </Link>
        )}
      </div>
    </div>
  )
}

function StatBar({
  label,
  count,
  total,
  color,
  emoji,
}: {
  label: string
  count: number
  total: number
  color: string
  emoji: string
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-5">{emoji}</span>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{label}</span>
          <span>{count} karet</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${color} rounded-full transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
