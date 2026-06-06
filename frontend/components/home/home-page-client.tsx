"use client";

import { useState, useCallback, useRef, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, BarChart3, FlipVertical } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
import { SearchSuggestions } from "@/components/search/search-suggestions";
import { useSearch } from "@/hooks/use-search";
import { useFlashcardSearch } from "@/hooks/use-flashcard-search";
import { useMaterialSearch } from "@/hooks/use-material-search";
import { useGroupSearch } from "@/hooks/use-group-search";
import { parseSearchMode } from "@/lib/search-mode";

interface SiteStats {
  subjectCount: number;
  materialCount: number;
  deckCount: number;
}

interface HomePageClientProps {
  siteStats: SiteStats;
}

const FEATURES = [
  {
    Icon: Search,
    title: "Najdi, co tě čeká",
    desc: "Přestaň tápat. Zjisti náročnost a požadavky předmětu dřív, než si ho zapíšeš.",
    href: "/predmety",
  },
  {
    Icon: BarChart3,
    title: "Od studentů pro studenty",
    desc: "Žádné PR řeči ze sylabu. Jen tvrdá data o docházce a obtížnosti od těch, co to už přežili.",
    href: "/predmety",
  },
  {
    Icon: FlipVertical,
    title: "Uč se chytře, ne dlouho",
    desc: "Netrav noci nad skripty. Použij sdílené flashcards pro efektivní učení přesně na míru předmětu.",
    href: "/flashcardy",
  },
];

export function HomePageClient({ siteStats }: HomePageClientProps) {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const { query, setQuery, results, isLoading, clearSearch } = useSearch();
  const deferredQuery = useDeferredValue(query);
  const { isFlashcardMode, flashcardQuery, deckResults, isDeckLoading } =
    useFlashcardSearch(deferredQuery);
  const { isMaterialMode, materialQuery, materialResults, isMaterialLoading } =
    useMaterialSearch(deferredQuery);
  const { isGroupMode, groupQuery, groupResults, isGroupLoading } =
    useGroupSearch(deferredQuery);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchMode = parseSearchMode(query).mode;

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => {
    setTimeout(() => setIsFocused(false), 150);
  }, []);

  const handleSelect = useCallback(() => {
    setIsFocused(false);
    clearSearch();
  }, [clearSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && query.trim()) {
        if (isFlashcardMode) {
          router.push(
            flashcardQuery
              ? `/flashcardy?q=${encodeURIComponent(flashcardQuery)}`
              : "/flashcardy"
          );
        } else if (isMaterialMode) {
          router.push(
            materialQuery
              ? `/materialy?q=${encodeURIComponent(materialQuery)}`
              : "/materialy"
          );
        } else if (isGroupMode) {
          router.push("/materialy?view=groups");
        } else {
          router.push(`/predmety?q=${encodeURIComponent(query.trim())}`);
        }
        setIsFocused(false);
        clearSearch();
      }
      if (e.key === "Escape") {
        setIsFocused(false);
        clearSearch();
      }
    },
    [query, flashcardQuery, materialQuery, isFlashcardMode, isMaterialMode, isGroupMode, router, clearSearch]
  );

  const handleTabClick = useCallback((mode: "subjects" | "flashcards" | "materials" | "groups") => {
    let newQuery = query.replace(/^\.[fms]\s*/, "");
    if (mode === "flashcards") newQuery = `.f ${newQuery}`;
    else if (mode === "materials") newQuery = `.m ${newQuery}`;
    else if (mode === "groups") newQuery = `.s ${newQuery}`;
    setQuery(newQuery);
    if (isFocused) {
      window.setTimeout(() => {
        const input = document.getElementById("subject-search") as HTMLInputElement | null;
        input?.focus();
      }, 0);
    }
  }, [isFocused, query, setQuery]);

  const placeholder =
    searchMode === "flashcards"
      ? "Název balíčku…"
      : searchMode === "materials"
        ? "Název materiálu…"
        : searchMode === "groups"
          ? "Název skupiny…"
          : "Předmět, zkratka, katedra…";

  const stats = [
    { value: siteStats.subjectCount.toString(), label: "předmětů" },
    { value: siteStats.materialCount.toString(), label: "materiálů" },
    { value: siteStats.deckCount.toString(), label: "balíčků kartiček" },
  ];

  return (
    <div className="relative overflow-hidden">
      <section className="home-hero">
        <div className="relative w-full mb-8 flex flex-col items-center pointer-events-none select-none">
          <div className="transition-all ease-out text-center">
            <h1 className="home-title text-balance">
              Najdi{" "}
              <span className="home-title-accent">
                {searchMode === "flashcards"
                  ? "kartičky"
                  : searchMode === "materials"
                    ? "materiály"
                    : searchMode === "groups"
                      ? "složky"
                      : "předmět"}
              </span>
            </h1>
          </div>

          <div className="mt-4 transition-all ease-out opacity-100">
            <p className="text-lg md:text-xl font-medium text-muted-foreground/80 tracking-tight px-4 text-balance text-center max-w-md">
              {searchMode === "flashcards"
                ? "Hledáš balíček kartiček? Zkus zadat název nebo předmět."
                : searchMode === "materials"
                  ? "Hledáš materiál? Zkus název souboru nebo předmětu."
                  : searchMode === "groups"
                    ? "Hledáš skupinu materiálů? Zkus název skupiny nebo předmětu."
                    : `\u201eProtože reálné zkušenosti studentů jsou víc než jen sylabus.\u201c`}
            </p>
          </div>
        </div>

        <div
          ref={containerRef}
          className="home-search-wrapper"
          onKeyDown={handleKeyDown}
        >
          {isFocused && (
            <div
              className="search-backdrop-blur"
              onClick={() => setIsFocused(false)}
            />
          )}

          <div className="relative z-50 w-full">
            <div
              className={`absolute -inset-4 sm:-inset-6 z-[-1] home-ambient-glow-aura transition-transform duration-500 ease-out ${
                isFocused ? "scale-90" : "scale-100"
              }`}
              aria-hidden="true"
            />

            <SearchBar
              query={query}
              onQueryChange={setQuery}
              onFocus={handleFocus}
              onBlur={handleBlur}
              isFocused={isFocused}
              placeholder={placeholder}
              size="large"
            />

            {isFocused && (
              <SearchSuggestions
                results={results}
                isLoading={isLoading}
                query={query}
                onSelect={handleSelect}
                mode={searchMode}
                flashcardQuery={flashcardQuery}
                deckResults={deckResults}
                isDeckLoading={isDeckLoading}
                materialQuery={materialQuery}
                materialResults={materialResults}
                isMaterialLoading={isMaterialLoading}
                groupQuery={groupQuery}
                groupResults={groupResults}
                isGroupLoading={isGroupLoading}
              />
            )}
          </div>

          <div className="home-search-helper">
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <button
                onClick={() => handleTabClick("subjects")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  searchMode === "subjects"
                    ? "bg-foreground text-background shadow-md scale-105"
                    : "bg-card border border-white/5 text-muted-foreground hover:bg-muted/50 hover:text-foreground shadow-sm"
                }`}
              >
                Předměty
              </button>
              <button
                onClick={() => handleTabClick("flashcards")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  searchMode === "flashcards"
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-card border border-white/5 text-muted-foreground hover:bg-muted/50 hover:text-foreground shadow-sm"
                }`}
              >
                Kartičky
              </button>
              <button
                onClick={() => handleTabClick("materials")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  searchMode === "materials"
                    ? "bg-sky-600 text-white shadow-md scale-105"
                    : "bg-card border border-white/5 text-muted-foreground hover:bg-muted/50 hover:text-foreground shadow-sm"
                }`}
              >
                Materiály
              </button>
              <button
                onClick={() => handleTabClick("groups")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  searchMode === "groups"
                    ? "bg-amber-600 text-white shadow-md scale-105"
                    : "bg-card border border-white/5 text-muted-foreground hover:bg-muted/50 hover:text-foreground shadow-sm"
                }`}
              >
                Skupiny
              </button>
            </div>

            <p className="home-hint mt-4">
              {searchMode === "flashcards"
                ? "Hledáš balíčky kartiček pro konkrétní předmět."
                : searchMode === "materials"
                  ? "Hledáš konkrétní studijní materiály, poznámky nebo skripta."
                  : searchMode === "groups"
                    ? "Hledáš ucelené skupiny materiálů k vybranému tématu."
                    : "Jednotný studentský hub. Proč generovat stokrát to, co už dávno existuje?"}
            </p>
          </div>
        </div>
      </section>

      <div className="home-stats animate-fade-in relative z-10 -mt-24 sm:-mt-20">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {stat.value}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Features section */}
      <section className="border-t border-border bg-[var(--surface-soft)] py-16">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Vše, co potřebuješ vědět
            </h2>
            <div className="mx-auto mt-3 h-1 w-18 rounded-full bg-primary/85" />
            <p className="mt-2 text-muted-foreground">
              Než si zapíšeš předmět, zjisti co od něj čekat.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {FEATURES.map(({ Icon, title, desc, href }, idx) => (
              <Link
                key={title}
                href={href}
                className="glass-card hover-card block space-y-4 p-6 text-center animate-slide-up"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: "color-mix(in srgb, var(--accent-color) 14%, transparent)" }}>
                  <Icon className="h-6 w-6" style={{ color: "var(--accent-color)" }} />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </Link>
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-muted-foreground/60">
            ZvládnuVýšku je neoficiální studentský web — není spojen s Ostravskou univerzitou ani jejími fakultami.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl border-t border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-[2rem] border border-white/5 bg-card/40 p-8 shadow-sm backdrop-blur md:grid-cols-[1.4fr_0.9fr] md:items-center">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Proč ZvládnuVýšku
            </span>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Nejsme další sklad PDF souborů
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Otevřené studijní materiály, důvěryhodné recenze a chytré kartičky pro Ostravskou univerzitu na jednom místě.
              Bez reklam, bez paywallů a bez virtuální měny.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
            <Link
              href="/proc-ne-primat"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white accent-gradient hover:opacity-90"
            >
              Proč ne Primát?
            </Link>
            <Link
              href="/materialy"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-background/70 px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted/50"
            >
              Prozkoumat materiály
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 border-t border-white/5">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            Začni hned teď
          </h2>
          <p className="text-muted-foreground">
            Prohlédni si všechny předměty Ostravské univerzity.
          </p>
          <Link
            href="/predmety"
            id="bottom-cta-btn"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold accent-gradient text-white hover:opacity-90 transition-all duration-150 hover:scale-105 shadow-lg shadow-primary/20"
          >
            <span>Procházet předměty</span>
            <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
