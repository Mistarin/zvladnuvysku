const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Velmi snadný",
  2: "Snadný",
  3: "Střední",
  4: "Těžký",
  5: "Velmi těžký",
};

interface DifficultyBadgeProps {
  difficulty: number;
  size?: "sm" | "default" | "lg";
  showLabel?: boolean;
}

export function DifficultyBadge({
  difficulty,
  size = "default",
  showLabel = false,
}: DifficultyBadgeProps) {
  const clampedDifficulty = Math.min(5, Math.max(1, Math.round(difficulty)));
  const label = DIFFICULTY_LABELS[clampedDifficulty] || "Neznámá";
  const displayValue = Number.isInteger(difficulty)
    ? difficulty.toFixed(0)
    : difficulty.toFixed(1);

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    default: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium whitespace-nowrap
        badge-difficulty-${clampedDifficulty}
        ${sizeClasses[size]}
      `}
      title={`Obtížnost: ${displayValue}/5 — ${label}`}
      aria-label={`Obtížnost ${displayValue} z 5 — ${label}`}
    >
      {showLabel ? (
        <span>Obtížnost: {displayValue}/5</span>
      ) : (
        <span>{displayValue}/5</span>
      )}
    </span>
  );
}

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "default";
}

export function StarRating({ value, max = 5, size = "default" }: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} z ${max}`}>
      {stars.map((star) => (
        <span
          key={star}
          className={`${size === "sm" ? "text-xs" : "text-sm"} ${
            star <= Math.round(value)
              ? "text-amber-400"
              : "text-muted-foreground/30"
          }`}
        >
          ★
        </span>
      ))}
    </span>
  );
}
