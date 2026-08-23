import type { SubjectRatingStats } from '@/lib/types/database'

interface RatingStatsProps {
  stats: SubjectRatingStats | null
  totalRatings: number
}

function StarDisplay({ value }: { value: number | null | undefined }) {
  const safeValue = value ?? 0
  const filled = Math.round(safeValue)
  return (
    <div className="flex gap-0.5" aria-label={`${safeValue.toFixed(1)} z 5 hvězd`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-lg ${star <= filled ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
        >

        </span>
      ))}
    </div>
  )
}

function SubMetricBar({
  label,
  value,
  lowLabel,
  highLabel,
}: {
  label: string
  value: number | null | undefined
  lowLabel: string
  highLabel: string
}) {
  const hasValue = typeof value === 'number' && value > 0
  const safeValue = hasValue ? value : 0
  const pct = Math.round((safeValue / 5) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold text-foreground">
          {hasValue ? safeValue.toFixed(1) : '…'}
        </span>
      </div>
      <div className="h-1.5 rounded-md bg-muted overflow-hidden">
        <div
          className={`h-full rounded-md transition-colors ${
            hasValue ? 'primary-action' : 'bg-muted-foreground/10'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-medium text-muted-foreground/60">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}

export function RatingStats({ stats, totalRatings }: RatingStatsProps) {
  if (!stats || totalRatings === 0) {
    return (
      <div className="surface-card p-8 text-center space-y-3">
        <div className="text-4xl animate-pulse"></div>
        <h3 className="text-lg font-bold text-foreground">Zatím nehodnoceno</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
          Staň se průkopníkem! Tvé hodnocení může zachránit (nebo uklidnit) další studenty. Zabere to jen minutku.
        </p>
      </div>
    )
  }

  const avgOverall = stats.avg_overall ?? 0

  return (
    <div className="surface-card p-6 space-y-5">
      {/* Overall */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="text-4xl font-bold text-foreground">
          {avgOverall.toFixed(1)}
        </div>
        <div className="space-y-1">
          <StarDisplay value={avgOverall} />
          <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted-foreground">
            <span>{totalRatings}</span>
            <span>hodnocení</span>
          </div>
        </div>
      </div>

      {/* Sub-metrics */}
      <div className="space-y-4 pt-4 border-t border-border">
        <SubMetricBar label="Obtížnost" value={stats.avg_difficulty} lowLabel="Pohodové" highLabel="Zabiják" />
        <SubMetricBar label="Užitečnost" value={stats.avg_usefulness} lowLabel="Zbytečnost" highLabel="Zásadní" />
        <SubMetricBar label="Pracovní zátěž" value={stats.avg_workload} lowLabel="Žádná" highLabel="Extrémní" />
      </div>
    </div>
  )
}
