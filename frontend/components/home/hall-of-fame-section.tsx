"use client";

import Link from "next/link";
import { useState } from "react";
import { Trophy, BookOpen, FileText, FlipVertical, UserRound } from "lucide-react";
import { getPublicProfilePath } from "@/lib/public-profile";
import { getFacultyColor } from "@/lib/faculties";
import { getPublicProfileIdentity, hasPublicProfileIdentity } from "@/lib/public-profile-identity";
import { hasAcceptedCurrentLegalVersion, hasCompletedPublicProfileSetup } from "@/lib/legal-consent";
import { Button } from "@/components/ui/button";
import { WelcomeDisplayNameModal } from "@/components/layout/welcome-display-name-modal";
import { analyticsEvents, analyticsSources, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type {
  HallOfFamePeriod,
  HallOfFameRow,
  Profile,
} from "@/lib/types/database";

type HallOfFameData = Record<HallOfFamePeriod, HallOfFameRow[]>;

interface HallOfFameSectionProps {
  leaderboard: HallOfFameData;
  isLoggedIn: boolean;
  profile: Profile | null;
}

const PERIOD_LABELS: Record<HallOfFamePeriod, string> = {
  week: "Týden",
  month: "Měsíc",
  all: "Celkem",
};

export function HallOfFameSection({
  leaderboard,
  isLoggedIn,
  profile,
}: HallOfFameSectionProps) {
  const [period, setPeriod] = useState<HallOfFamePeriod>("week");
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const entries = leaderboard[period] ?? [];
  const hasPublicIdentity = hasPublicProfileIdentity(profile);
  const hasCompletedOnboarding = hasCompletedPublicProfileSetup(profile);
  const hasAcceptedLegal = hasAcceptedCurrentLegalVersion(profile);
  const publicIdentity = getPublicProfileIdentity(profile);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <section
      id="hall-of-fame"
      className="relative scroll-mt-24 border-y border-border bg-[var(--surface-soft)] py-16"
    >
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex flex-col gap-8">
          <div className="pb-4 text-center sm:pb-6">
            <div className="mx-auto max-w-2xl space-y-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Nejaktivnější studenti komunity
                </h2>
                <div className="mx-auto mt-3 h-1 w-18 rounded-full bg-primary/85" />
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  Veřejný žebříček studentů, kteří nejvíc pomáhají ostatním sdílením
                  kartiček, studijních materiálů, vyučujících a návrhů předmětů.
                </p>
              </div>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-[2rem] border-2 border-dashed border-border bg-[var(--surface-soft)] px-6 py-12 text-center">
              <p className="text-lg font-semibold text-foreground">
                Zatím tu nejsou žádní přispěvatelé za toto období.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Body se počítají z veřejných kartiček, schválených materiálů, přidaných vyučujících a schválených návrhů předmětů.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center pb-2">
                <div className="inline-flex w-full max-w-sm rounded-[1.5rem] border border-border bg-background/80 p-1 shadow-inner">
                  {(["week", "month", "all"] as HallOfFamePeriod[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPeriod(key)}
                      className={cn(
                        "flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                        period === key
                          ? "bg-secondary text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {PERIOD_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
              {/* Podium — top 3 */}
              {top3.length > 0 && (
                <PodiumSection entries={top3} />
              )}

              {/* Rest of the list */}
              {rest.length > 0 && (
                <div className="space-y-2 mt-4">
                  {rest.map((entry, i) => (
                    <LeaderboardRow key={`${period}-${entry.user_id}`} entry={entry} index={i + 3} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-[1.6rem] border border-border bg-background/80 p-5 shadow-sm sm:p-6">
            {isLoggedIn ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {hasPublicIdentity
                      ? "Tvůj veřejný profil je připravený pro Hall of Fame."
                      : "Chceš se dostat do žebříčku? Doplň si veřejnou identitu."}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasCompletedOnboarding
                      ? "XP se počítají přímo z bodů: 1 bod = 10 XP, 2 body = 20 XP, 3 body = 30 XP."
                      : "Bez dokončeného veřejného profilu a potvrzení pravidel se do veřejného leaderboardu nezapočítáš, i když přispíváš."}
                  </p>
                </div>
                <Button variant={hasCompletedOnboarding ? "outline" : "default"} onClick={() => setShowIdentityModal(true)}>
                  {hasCompletedOnboarding ? "Upravit veřejný profil" : "Dokončit veřejný profil"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Chceš se dostat do Hall of Fame?
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Přihlas se a začni přispívat kartičkami, materiály, novými předměty nebo vyučujícími.
                  </p>
                </div>
                <Link
                  href="/prihlaseni"
                  onClick={() => trackEvent(analyticsEvents.clickLogin, { source: analyticsSources.hallOfFameCta })}
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Přihlásit se
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <WelcomeDisplayNameModal
        open={showIdentityModal}
        onOpenChange={setShowIdentityModal}
        initialDisplayName={publicIdentity.displayName}
        initialFaculty={publicIdentity.faculty}
        initialSecondaryFaculty={publicIdentity.secondaryFaculty}
        initialLegalAcceptedAt={hasAcceptedLegal ? profile?.legal_accepted_at ?? null : null}
        initialLegalAcceptedVersion={profile?.legal_accepted_version ?? null}
      />
    </section>
  );
}

// ---- Podium component ----

function PodiumSection({ entries }: { entries: HallOfFameRow[] }) {
  // Tag each entry with its real rank BEFORE reordering for visual layout
  const first  = entries[0] ? { entry: entries[0], rank: 1, heightClass: "h-28", sizeClass: "text-3xl" } : null;
  const second = entries[1] ? { entry: entries[1], rank: 2, heightClass: "h-20", sizeClass: "text-xl"  } : null;
  const third  = entries[2] ? { entry: entries[2], rank: 3, heightClass: "h-16", sizeClass: "text-lg"  } : null;

  // Visual podium order: 2nd (left), 1st (center, tallest), 3rd (right)
  const podiumItems = [second, first, third].filter(Boolean) as NonNullable<typeof first>[];

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-4 pt-4 pb-2">
      {podiumItems.map(({ entry, rank, heightClass, sizeClass }) => (
        <PodiumColumn
          key={entry.user_id}
          entry={entry}
          rank={rank}
          heightClass={heightClass}
          sizeClass={sizeClass}
          isFirst={rank === 1}
        />
      ))}
    </div>
  );
}

function PodiumColumn({
  entry,
  rank,
  heightClass,
  sizeClass,
  isFirst,
}: {
  entry: HallOfFameRow;
  rank: number;
  heightClass: string;
  sizeClass: string;
  isFirst: boolean;
}) {
  const medalMeta: Record<number, { gradient: string; ring: string; pill: string; icon: React.ReactNode }> = {
    1: {
      gradient: "from-[#F0D48A] via-[#D9A93D] to-[#B9770E]",
      ring: "ring-1 ring-[#D9A93D]/35",
      pill: "bg-white/18 text-white",
      icon: <Trophy className="size-5 text-white" />,
    },
    2: {
      gradient: "from-[#E7ECF3] via-[#B9C4D3] to-[#8E9AAF]",
      ring: "ring-1 ring-[#A9B4C4]/40",
      pill: "bg-white/16 text-white/95",
      icon: <Trophy className="size-4 text-white/95" />,
    },
    3: {
      gradient: "from-[#D8A57D] via-[#B97845] to-[#8F522A]",
      ring: "ring-1 ring-[#B97845]/35",
      pill: "bg-white/14 text-white/95",
      icon: <Trophy className="size-4 text-white/95" />,
    },
  };

  const appearance = medalMeta[rank] ?? medalMeta[1];

  return (
    <Link
      href={getPublicProfilePath(entry.user_id)}
      className={`group flex max-w-[160px] flex-1 flex-col items-center gap-2 sm:max-w-[200px]`}
    >
      {/* Name */}
      <p className={`text-xs sm:text-sm font-semibold text-foreground text-center truncate w-full group-hover:text-primary transition-colors ${isFirst ? "font-bold" : ""}`}>
        {entry.display_name}
      </p>
      <FacultyPills faculties={[entry.faculty, entry.secondary_faculty].filter(Boolean)} />
      {/* Score */}
      <p className={`${sizeClass} font-bold text-foreground dark:text-card-foreground`}>{entry.total_score}</p>
      {/* Podium block */}
      <div
        className={`flex w-full ${heightClass} flex-col items-center justify-start gap-1 rounded-t-[1.4rem] bg-gradient-to-b ${appearance.gradient} pt-3 shadow-[0_18px_34px_-24px_rgba(15,23,42,0.65)] ${appearance.ring}`}
      >
        {/* Medal icon */}
        <div className="flex items-center justify-center">
          {appearance.icon}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] ${appearance.pill}`}>#{rank}</span>
      </div>
      {/* Pills */}
      <div className="mt-1 flex flex-wrap justify-center gap-1">
        <ScorePill icon={<FlipVertical className="size-3" />} value={entry.flashcard_count} label="K" />
        <ScorePill icon={<FileText className="size-3" />} value={entry.material_count} label="M" />
        <ScorePill icon={<UserRound className="size-3" />} value={entry.teacher_count} label="V" />
        <ScorePill icon={<BookOpen className="size-3" />} value={entry.subject_count} label="P" />
      </div>
    </Link>
  );
}

// ---- Regular row (4th+ places) ----

function LeaderboardRow({ entry, index }: { entry: HallOfFameRow; index: number }) {
  return (
    <Link
      href={getPublicProfilePath(entry.user_id)}
      className="flex items-center gap-4 rounded-2xl border border-border bg-background/50 px-4 py-3 shadow-sm transition-all hover:border-primary/40 hover:-translate-y-1 hover:shadow-md hover:bg-background/80"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
        #{index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{entry.display_name}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-3">
          <FacultyPills faculties={[entry.faculty, entry.secondary_faculty].filter(Boolean)} compact />
          <ScorePillInline icon={<FlipVertical className="size-3" />} value={entry.flashcard_count} />
          <ScorePillInline icon={<FileText className="size-3" />} value={entry.material_count} />
          <ScorePillInline icon={<UserRound className="size-3" />} value={entry.teacher_count} />
          <ScorePillInline icon={<BookOpen className="size-3" />} value={entry.subject_count} />
        </div>
      </div>
      <p className="text-lg font-bold text-primary">{entry.total_score}</p>
    </Link>
  );
}

function ScorePill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground shadow-sm">
      {icon}
      <span className="font-medium text-primary">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function ScorePillInline({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {icon}
      <span className="font-medium text-primary">{value}</span>
    </span>
  );
}

function FacultyPill({ faculty, compact = false }: { faculty: string; compact?: boolean }) {
  const color = getFacultyColor(faculty) ?? "var(--foreground)";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
      )}
      style={{
        backgroundColor: `${color}20`,
        color,
      }}
    >
      {faculty}
    </span>
  );
}

function FacultyPills({ faculties, compact = false }: { faculties: Array<string | null | undefined>; compact?: boolean }) {
  const items = faculties.filter((faculty): faculty is string => Boolean(faculty));
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {items.map((faculty) => (
        <FacultyPill key={faculty} faculty={faculty} compact={compact} />
      ))}
    </div>
  );
}
