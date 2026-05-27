"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SearchBar } from "@/components/search/search-bar";
import { SearchSuggestions } from "@/components/search/search-suggestions";
import { useSearch } from "@/hooks/use-search";

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
    title: "Flashcardy",
    desc: "Spaced repetition učení přizpůsobené každému předmětu.",
  },
];

const STATS = [
  { value: "20+", label: "předmětů" },
  { value: "OU", label: "Ostravská univerzita" },
  { value: "CS", label: "Jen čeština" },
];

export default function HomePage() {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const { query, setQuery, results, isLoading, clearSearch } = useSearch();
  const containerRef = useRef<HTMLDivElement>(null);

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
        router.push(`/predmety?q=${encodeURIComponent(query.trim())}`);
        setIsFocused(false);
      }
      if (e.key === "Escape") {
        setIsFocused(false);
        clearSearch();
      }
    },
    [query, router, clearSearch]
  );

  return (
    <div className="relative overflow-hidden">

      {/* Hero — fullscreen centered */}
      <section className="home-hero">
        {/* Headlines */}
        <div className="relative w-full mb-8 flex justify-center pointer-events-none select-none">
          {/* Main Title (Maintains DOM height) */}
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
              <span className="home-title-accent">předmět</span>
            </h1>
          </div>

          {/* Alternative Hint (Absolute, centered over main title) */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${
              isFocused 
                ? "opacity-100 translate-y-0 duration-300 delay-150" 
                : "opacity-0 translate-y-4 duration-150 delay-0"
            }`}
            aria-hidden={!isFocused}
          >
            <p className="text-lg md:text-xl font-medium text-muted-foreground/80 tracking-tight px-4 whitespace-nowrap">
              „Protože reálné zkušenosti studentů jsou víc než jen sylabus.“
            </p>
          </div>
        </div>

        {/* Search */}
        <div
          ref={containerRef}
          className="home-search-wrapper"
          onKeyDown={handleKeyDown}
        >
          {/* Blur-only backdrop (no darkening) */}
          {isFocused && (
            <div
              className="search-backdrop-blur"
              onClick={() => setIsFocused(false)}
            />
          )}

          <div className="relative z-50 w-full">
            {/* The glow aura positioned literally behind the search bar */}
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
              placeholder="Předmět, zkratka, katedra…"
              size="large"
            />

            {isFocused && (
              <SearchSuggestions
                results={results}
                isLoading={isLoading}
                query={query}
                onSelect={handleSelect}
              />
            )}
          </div>

          <p className={`home-hint ${isFocused ? "home-hint--hidden" : ""}`}>
            Stiskni <kbd>Enter</kbd> pro zobrazení výsledků
          </p>
        </div>
      </section>

      {/* Stats */}
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

      {/* Features */}
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

      {/* Bottom CTA */}
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
