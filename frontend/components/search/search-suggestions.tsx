"use client";

import Link from "next/link";
import { DifficultyBadge } from "@/components/subject/difficulty-badge";
import type { SearchResult } from "@/hooks/use-search";

interface SearchSuggestionsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: () => void;
}

export function SearchSuggestions({
  results,
  isLoading,
  query,
  onSelect,
}: SearchSuggestionsProps) {
  if (!query || query.trim().length < 1) return null;

  return (
    <div
      data-search-suggestions
      className="absolute top-full left-0 right-0 mt-1 z-50 animate-slide-down"
      role="listbox"
      aria-label="Výsledky vyhledávání"
    >
      <div className="bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-4 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Hledám...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Žádné výsledky pro{" "}
              <span className="font-medium text-foreground">
                &quot;{query}&quot;
              </span>
            </p>
            <Link
              href={`/predmety?q=${encodeURIComponent(query)}`}
              className="mt-2 text-xs text-primary hover:underline block"
              onClick={onSelect}
            >
              Zobrazit všechny předměty →
            </Link>
          </div>
        ) : (
          <>
            {results.map((result, idx) => (
              <Link
                key={result.slug}
                href={`/predmety/${result.slug}`}
                onClick={onSelect}
                role="option"
                aria-selected={false}
                className={`
                  flex items-center justify-between px-4 py-3 
                  hover:bg-muted transition-colors duration-100 cursor-pointer
                  ${idx !== results.length - 1 ? "border-b border-border/50" : ""}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                    {result.short_tag}
                  </span>
                  <span className="text-sm text-foreground truncate">
                    {result.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {result.credits && (
                    <span className="text-xs text-muted-foreground">
                      {result.credits} kr.
                    </span>
                  )}
                  {result.difficulty && (
                    <DifficultyBadge difficulty={result.difficulty} size="sm" />
                  )}
                </div>
              </Link>
            ))}

            {/* Link na všechny výsledky */}
            <Link
              href={`/predmety?q=${encodeURIComponent(query)}`}
              onClick={onSelect}
              className="flex items-center justify-center px-4 py-2.5 text-xs text-primary hover:bg-primary/5 transition-colors border-t border-border/50"
            >
              Zobrazit všechny výsledky →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
