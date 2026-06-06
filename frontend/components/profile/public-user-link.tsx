import Link from "next/link";
import { getPublicProfilePath } from "@/lib/public-profile";
import type { PublicUserSummary } from "@/lib/public-user-summaries";
import { getFacultyColor } from "@/lib/faculties";

interface PublicUserLinkProps {
  userId: string;
  summary?: PublicUserSummary | null;
  fallbackLabel?: string;
  allowFallbackLink?: boolean;
}

export function PublicUserLink({
  userId,
  summary,
  fallbackLabel,
  allowFallbackLink = false,
}: PublicUserLinkProps) {
  const displayName = summary?.displayName?.trim() || "";
  const label = displayName || fallbackLabel || `Uživatel ${userId.slice(0, 8)}…`;
  const canLink = Boolean(displayName) || allowFallbackLink;

  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      {canLink ? (
        <Link
          href={getPublicProfilePath(userId)}
          className="truncate text-sm font-medium text-foreground hover:text-primary"
        >
          {label}
        </Link>
      ) : (
        <span className="truncate text-sm font-medium text-foreground">
          {label}
        </span>
      )}
      {summary?.faculties?.length ? (
        <span className="inline-flex items-center gap-1 shrink-0">
          {summary.faculties.map((faculty) => (
            <span
              key={faculty}
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{
                backgroundColor: `${getFacultyColor(faculty) ?? "var(--foreground)"}20`,
                color: getFacultyColor(faculty) ?? "var(--foreground)",
              }}
            >
              {faculty}
            </span>
          ))}
        </span>
      ) : null}
      {summary ? (
        <span className="shrink-0 rounded-full border border-primary/15 bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary">
          Lv. {summary.level}
        </span>
      ) : null}
    </span>
  );
}
