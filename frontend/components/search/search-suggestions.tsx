"use client";

import Link from "next/link";
import { DifficultyBadge } from "@/components/subject/difficulty-badge";
import type { SearchResult } from "@/hooks/use-search";
import type { FlashcardDeckResult } from "@/hooks/use-flashcard-search";
import { Layers, BookOpen } from "lucide-react";

interface SearchSuggestionsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: () => void;
  // Flashcard mode
  isFlashcardMode?: boolean;
  flashcardQuery?: string;
  deckResults?: FlashcardDeckResult[];
  isDeckLoading?: boolean;
}

export function SearchSuggestions({
  results,
  isLoading,
  query,
  onSelect,
  isFlashcardMode = false,
  flashcardQuery = "",
  deckResults = [],
  isDeckLoading = false,
}: SearchSuggestionsProps) {
  if (!query || query.trim().length < 1) return null;

  // ── FLASHCARD MODE ──────────────────────────────────────────────────────
  if (isFlashcardMode) {
    return (
      <div
        data-search-suggestions
        className="absolute top-full left-0 right-0 mt-1 z-50 animate-slide-down"
        role="listbox"
        aria-label="Výsledky vyhledávání balíčků"
      >
        <div className="bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2 border-b border-border/50 flex items-center gap-2 bg-primary/5">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide">
              Flashcard balíčky
            </span>
            {flashcardQuery && (
              <span className="text-xs text-muted-foreground">
                — hledám „{flashcardQuery}"
              </span>
            )}
          </div>

          {isDeckLoading ? (
            <div className="p-4 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Hledám balíčky...</span>
            </div>
          ) : deckResults.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {flashcardQuery
                  ? <>Žádné balíčky pro „<span className="font-medium text-foreground">{flashcardQuery}</span>"</>
                  : "Žádné veřejné balíčky"}
              </p>
              <Link
                href="/flashcardy/novy"
                className="mt-2 text-xs text-primary hover:underline block"
                onClick={onSelect}
              >
                Vytvořit nový balíček →
              </Link>
            </div>
          ) : (
            <>
              {deckResults.map((deck, idx) => (
                <Link
                  key={deck.id}
                  href={`/flashcardy/${deck.id}`}
                  onClick={onSelect}
                  role="option"
                  aria-selected={false}
                  className={`
                    flex items-center justify-between px-4 py-3
                    hover:bg-muted transition-colors duration-100 cursor-pointer
                    ${idx !== deckResults.length - 1 ? "border-b border-border/50" : ""}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{deck.title}</p>
                      {deck.subject && (
                        <p className="text-xs text-muted-foreground truncate">
                          {deck.subject.short_tag} · {deck.subject.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">
                    {deck.card_count} karet
                  </span>
                </Link>
              ))}

              <Link
                href="/flashcardy"
                onClick={onSelect}
                className="flex items-center justify-center px-4 py-2.5 text-xs text-primary hover:bg-primary/5 transition-colors border-t border-border/50"
              >
                Všechny balíčky →
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── NORMÁLNÍ MODE (předměty) ────────────────────────────────────────────
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
