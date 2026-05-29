"use client";

import { useState, useCallback, useRef, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { SearchSuggestions } from "@/components/search/search-suggestions";
import { useSearch } from "@/hooks/use-search";
import { useFlashcardSearch } from "@/hooks/use-flashcard-search";
import { useMaterialSearch } from "@/hooks/use-material-search";
import { parseSearchMode } from "@/lib/search-mode";

const FEATURES = [
  {
    icon: "🔍",
    title: "Chytré vyhledávání",
    desc: "Najdi předmět podle názvu nebo zkratky. Výsledky okamžitě.",
  },
  {
    icon: "📊",
    title: "Reálné hodnocení",
    desc: "Obtížnost, časová náročnost a docházka od skutečných studentů.",
  },
  {
    icon: "🃏",
    title: "Kartičky",
    desc: "Spaced repetition učení přizpůsobené každému předmětu.",
  },
];

const STATS = [
  { value: "20+", label: "předmětů" },
  { value: "OU", label: "Ostravská univerzita" },
  { value: "CS", label: "Jen čeština" },
];

export function HomePageClient() {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const { query, setQuery, results, isLoading, clearSearch } = useSearch();
  const deferredQuery = useDeferredValue(query);
  const { isFlashcardMode, flashcardQuery, deckResults, isDeckLoading } =
    useFlashcardSearch(deferredQuery);
  const { isMaterialMode, materialQuery, materialResults, isMaterialLoading } =
    useMaterialSearch(deferredQuery);
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
    [query, flashcardQuery, materialQuery, isFlashcardMode, isMaterialMode, router, clearSearch]
  );

  const placeholder =
    searchMode === "flashcards"
      ? "Název balíčku…"
      : searchMode === "materials"
        ? "Název materiálu…"
        : "Předmět, zkratka, katedra…";

  return (
    <div className="relative overflow-hidden">
      <section className="home-hero">
        <div className="relative w-full mb-8 flex justify-center pointer-events-none select-none">
          <div
            className={`transition-all ease-out text-center ${
              isFocused
                ? "opacity-0 translate-y-4 duration-150 delay-0"
                : "opacity-100 translate-y-0 duration-300 delay-150"
            }`}
            aria-hidden={isFocused}
          >
            <h1 className="home-title whitespace-nowrap">
              Najdi svůj{" "}
              <span className="home-title-accent">
                {searchMode === "flashcards"
                  ? "balíček"
                  : searchMode === "materials"
                    ? "materiál"
                    : "předmět"}
              </span>
            </h1>
          </div>

          <div
            className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${
              isFocused
                ? "opacity-100 translate-y-0 duration-300 delay-150"
                : "opacity-0 translate-y-4 duration-150 delay-0"
            }`}
            aria-hidden={!isFocused}
          >
            <p className="text-lg md:text-xl font-medium text-muted-foreground/80 tracking-tight px-4 whitespace-nowrap">
              {searchMode === "flashcards"
                ? "Hledáš balíček kartiček? Zkus zadat název nebo předmět."
                : searchMode === "materials"
                  ? "Hledáš materiál? Zkus název souboru nebo předmětu."
                  : `„Protože reálné zkušenosti studentů jsou víc než jen sylabus.“`}
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
              />
            )}
          </div>

          <div className={`home-search-helper ${isFocused ? "home-search-helper--hidden" : ""}`}>
            <p className="home-hint">
              {searchMode === "flashcards"
                ? <><span className="font-mono text-primary">.F</span> režim — hledáš balíčky kartiček</>
                : searchMode === "materials"
                  ? <><span className="font-mono text-sky-700">.M</span> režim — hledáš studijní materiály</>
                  : "Jednotný studentský hub. Proč generovat stokrát to, co už dávno existuje?"}
            </p>

            <div className={`home-search-modes ${searchMode === "subjects" ? "" : "home-search-modes--hidden"}`}>
              <span>Zkratky hledání:</span>
              <span className="rounded-full border border-border bg-card px-2.5 py-1">
                <span className="font-mono text-primary">.f</span> kartičky
              </span>
              <span className="rounded-full border border-border bg-card px-2.5 py-1">
                <span className="font-mono text-sky-700">.m</span> materiály
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="home-stats animate-fade-in">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {stat.value}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <section className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 border-t border-border/50">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Vše, co potřebuješ vědět
          </h2>
          <p className="text-muted-foreground mt-2">
            Než si zapíšeš předmět, zjisti co od něj čekat.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => (
            <div
              key={feature.title}
              className="glass-card hover-card p-6 text-center space-y-3 animate-slide-up"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="text-4xl">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 border-t border-border/50">
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
