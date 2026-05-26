import type { SubjectRatingStats } from '@/lib/types/database'

interface RatingStatsProps {
  stats: SubjectRatingStats | null
  totalRatings: number
}

function StarDisplay({ value }: { value: number }) {
  const filled = Math.round(value)
  return (
    <div className="flex gap-0.5" aria-label={`${value.toFixed(1)} z 5 hvězd`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`text-lg ${star <= filled ? 'text-yellow-400' : 'text-muted-foreground/30'}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function SubMetricBar({
  label,
  value,
}: {
  label: string
  value: number
}) {
  const pct = Math.round((value / 5) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full accent-gradient transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function RatingStats({ stats, totalRatings }: RatingStatsProps) {
  if (!stats || totalRatings === 0) {
    return (
      <div className="glass-card p-6 text-center space-y-2">
        <div className="text-3xl">🌟</div>
        <p className="text-muted-foreground text-sm">
          Zatím žádné hodnocení. Buď první!
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 space-y-5">
      {/* Overall */}
      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold text-foreground">
          {stats.avg_overall.toFixed(1)}
        </div>
        <div className="space-y-1">
          <StarDisplay value={stats.avg_overall} />
          <p className="text-xs text-muted-foreground">
            ({totalRatings} {totalRatings === 1 ? 'hodnocení' : totalRatings < 5 ? 'hodnocení' : 'hodnocení'})
          </p>
        </div>
      </div>

      {/* Sub-metrics */}
      <div className="space-y-3 pt-2 border-t border-border">
        <SubMetricBar label="Obtížnost" value={stats.avg_difficulty} />
        <SubMetricBar label="Užitečnost" value={stats.avg_usefulness} />
        <SubMetricBar label="Pracovní zátěž" value={stats.avg_workload} />
      </div>
    </div>
  )
}
