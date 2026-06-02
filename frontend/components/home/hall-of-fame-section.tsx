"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Loader2,
  PencilLine,
  Trophy,
  X,
  BookOpen,
  FileText,
  FlipVertical,
  UserRound,
} from "lucide-react";
import { upsertDisplayName } from "@/app/actions/hall-of-fame";
import { getPublicProfilePath } from "@/lib/public-profile";
import { Button } from "@/components/ui/button";
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
  const entries = leaderboard[period] ?? [];
  const hasDisplayName = Boolean(profile?.display_name?.trim());

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <section
      id="hall-of-fame"
      className="container mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:px-8 pb-16"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        {/* Header glow — matches brand-sync-color */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-52 sm:h-60"
          style={{
            background:
              "radial-gradient(circle at top, color-mix(in srgb, var(--brand-sync-color) 18%, transparent), transparent 70%)",
          }}
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-6 pb-8 sm:gap-7 sm:pb-10 lg:flex-row lg:items-end lg:justify-between lg:pb-12">
            <div className="max-w-2xl space-y-4">
              {/* Badge — uses brand-sync-color */}
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                style={{
                  borderColor: "color-mix(in srgb, var(--brand-sync-color) 35%, transparent)",
                  background: "color-mix(in srgb, var(--brand-sync-color) 10%, transparent)",
                  color: "var(--brand-sync-color)",
                }}
              >
                <Trophy className="size-3.5" />
                Hall of Fame
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Nejaktivnější studenti komunity
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  Veřejný žebříček studentů, kteří nejvíc pomáhají ostatním sdílením
                  kartiček, studijních materiálů, vyučujících a návrhů předmětů.
                </p>
              </div>
            </div>

            <div className="inline-flex w-full max-w-sm rounded-2xl border border-border bg-background/80 p-1">
              {(["week", "month", "all"] as HallOfFamePeriod[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriod(key)}
                  className={cn(
                    "flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    period === key
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {PERIOD_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-background/50 px-6 py-12 text-center">
              <p className="text-lg font-semibold text-foreground">
                Zatím tu nejsou žádní přispěvatelé za toto období.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Body se počítají z veřejných kartiček, schválených materiálů, přidaných vyučujících a schválených návrhů předmětů.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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

          <div className="rounded-3xl border border-border/60 bg-background/60 p-5 sm:p-6">
            {isLoggedIn ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {hasDisplayName
                      ? "Tvoje veřejné jméno je připravené pro Hall of Fame."
                      : "Chceš se dostat do žebříčku? Doplň si veřejné jméno."}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasDisplayName
                      ? "XP se počítají přímo z bodů: 1 bod = 10 XP, 2 body = 20 XP, 3 body = 30 XP."
                      : "Bez veřejného jména se do veřejného leaderboardu nezapočítáš, i když přispíváš."}
                  </p>
                </div>
                <DisplayNameDialog
                  initialValue={profile?.display_name ?? ""}
                  triggerLabel={hasDisplayName ? "Upravit veřejné jméno" : "Nastavit veřejné jméno"}
                />
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
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Přihlásit se
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
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
  const medalColors: Record<number, string> = {
    1: "from-yellow-400 to-amber-500",
    2: "from-slate-300 to-slate-400",
    3: "from-amber-600 to-amber-700",
  };

  const medalIcons = {
    1: <Trophy className="size-5 text-yellow-900" />,
    2: <Trophy className="size-4 text-slate-700" />,
    3: <Trophy className="size-4 text-amber-900" />,
  };

  return (
    <Link
      href={getPublicProfilePath(entry.user_id)}
      className={`flex flex-col items-center gap-2 group flex-1 max-w-[160px] sm:max-w-[200px]`}
    >
      {/* Name */}
      <p className={`text-xs sm:text-sm font-semibold text-foreground text-center truncate w-full group-hover:text-primary transition-colors ${isFirst ? "font-bold" : ""}`}>
        {entry.display_name}
      </p>
      {/* Score */}
      <p className={`${sizeClass} font-bold text-foreground`}>{entry.total_score}</p>
      {/* Podium block */}
      <div
        className={`w-full ${heightClass} rounded-t-2xl bg-gradient-to-b ${medalColors[rank] ?? "from-muted to-muted/60"} flex flex-col items-center justify-start pt-3 gap-1 shadow-sm`}
      >
        {/* Medal icon */}
        <div className="flex items-center justify-center">
          {medalIcons[rank as 1 | 2 | 3]}
        </div>
        <span className="text-xs font-bold opacity-80 text-white">#{rank}</span>
      </div>
      {/* Pills */}
      <div className="flex flex-wrap justify-center gap-1 mt-1">
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
      className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/75 px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-background"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
        #{index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{entry.display_name}</p>
        <div className="flex items-center gap-3 mt-0.5">
          <ScorePillInline icon={<FlipVertical className="size-3" />} value={entry.flashcard_count} />
          <ScorePillInline icon={<FileText className="size-3" />} value={entry.material_count} />
          <ScorePillInline icon={<UserRound className="size-3" />} value={entry.teacher_count} />
          <ScorePillInline icon={<BookOpen className="size-3" />} value={entry.subject_count} />
        </div>
      </div>
      <p className="text-lg font-bold text-foreground">{entry.total_score}</p>
    </Link>
  );
}

function ScorePill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">
      {icon}
      <span className="font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function ScorePillInline({ icon, value }: { icon: React.ReactNode; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      {icon}
      <span className="font-medium text-foreground">{value}</span>
    </span>
  );
}

// ---- Display name dialog ----

function DisplayNameDialog({
  initialValue,
  triggerLabel,
}: {
  initialValue: string;
  triggerLabel: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await upsertDisplayName(value);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setIsOpen(false);
    });
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setValue(initialValue);
          setError(null);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant={initialValue ? "outline" : "default"}>
          <PencilLine className="size-4" />
          {triggerLabel}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
          <div className="space-y-1.5">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Veřejné jméno do Hall of Fame
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground">
              Toto jméno uvidí ostatní studenti v žebříčku. Nemusí být unikátní.
            </Dialog.Description>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-2">
              <label htmlFor="display-name" className="text-sm font-medium text-foreground">
                Veřejné jméno
              </label>
              <input
                id="display-name"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                maxLength={40}
                placeholder="Např. Martin z PřF"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                2 až 40 znaků. XP se počítají jednoduše: každý 1 bod znamená 10 XP.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
              <Dialog.Close asChild>
                <Button variant="outline" disabled={isPending}>
                  Zrušit
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Uložit jméno
              </Button>
            </div>
          </form>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="size-4" />
            <span className="sr-only">Zavřít</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
