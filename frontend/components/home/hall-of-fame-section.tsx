"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, PencilLine, Trophy, X } from "lucide-react";
import { upsertDisplayName } from "@/app/actions/hall-of-fame";
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

  return (
    <section
      id="hall-of-fame"
      className="container mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:px-8 pb-16"
    >
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 p-6 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(234,179,8,0.16),transparent_65%)]"
          aria-hidden="true"
        />

        <div className="relative flex flex-col gap-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                <Trophy className="size-3.5" />
                Hall of Fame
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Nejaktivnější studentská komunita
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                  Veřejný žebříček studentů, kteří nejvíc pomáhají ostatním přes kartičky,
                  materiály a nové návrhy předmětů.
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
                Body se počítají z veřejných kartiček, schválených materiálů a nových schválených předmětů.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {entries.map((entry, index) => (
                <LeaderboardRow key={`${period}-${entry.user_id}`} entry={entry} index={index} />
              ))}
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
                    Bez veřejného jména se do veřejného leaderboardu nezapočítáš, i když přispíváš.
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
                    Přihlas se a začni přispívat kartičkami, materiály nebo novými předměty.
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

function LeaderboardRow({ entry, index }: { entry: HallOfFameRow; index: number }) {
  const medal = useMemo(() => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return null;
  }, [index]);

  return (
    <div className="grid gap-4 rounded-3xl border border-border/60 bg-background/75 px-4 py-4 shadow-sm sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-base font-semibold text-foreground">
          {medal ?? `#${index + 1}`}
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{entry.display_name}</p>
          <p className="text-sm text-muted-foreground">
            {entry.total_score} bodů celkem
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ScorePill label="Kartičky" value={entry.flashcard_count} />
        <ScorePill label="Materiály" value={entry.material_count} />
        <ScorePill label="Předměty" value={entry.subject_count} />
      </div>

      <div className="text-left sm:text-right">
        <p className="text-2xl font-bold text-foreground">{entry.total_score}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          score
        </p>
      </div>
    </div>
  );
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}

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
                2 až 40 znaků. Bez jména se ve veřejném žebříčku nezobrazíš.
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
