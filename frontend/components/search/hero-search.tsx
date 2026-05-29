"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/search/search-bar";
import { SearchSuggestions } from "@/components/search/search-suggestions";
import { useSearch } from "@/hooks/use-search";
import { useFlashcardSearch } from "@/hooks/use-flashcard-search";
import { useMaterialSearch } from "@/hooks/use-material-search";
import { parseSearchMode } from "@/lib/search-mode";

export function HeroSearch() {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const { query, setQuery, results, isLoading, clearSearch } = useSearch();
  const { flashcardQuery, deckResults, isDeckLoading } = useFlashcardSearch(query);
  const { materialQuery, materialResults, isMaterialLoading } = useMaterialSearch(query);
  const searchMode = parseSearchMode(query).mode;

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => {
    // Malé zpoždění, aby se kliknutí na suggestion stihlo zpracovat
    setTimeout(() => setIsFocused(false), 150);
  }, []);

  const handleSelect = useCallback(() => {
    setIsFocused(false);
    clearSearch();
  }, [clearSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && query.trim()) {
        if (searchMode === "flashcards") {
          router.push(
            flashcardQuery
              ? `/flashcardy?q=${encodeURIComponent(flashcardQuery)}`
              : "/flashcardy"
          );
        } else if (searchMode === "materials") {
          router.push(
            materialQuery
              ? `/materialy?q=${encodeURIComponent(materialQuery)}`
              : "/materialy"
          );
        } else {
          router.push(`/predmety?q=${encodeURIComponent(query.trim())}`);
        }
        setIsFocused(false);
      }
      if (e.key === "Escape") {
        setIsFocused(false);
        clearSearch();
      }
    },
    [query, router, clearSearch, searchMode, flashcardQuery, materialQuery]
  );

  const placeholder =
    searchMode === "flashcards"
      ? "Hledat balíček nebo předmět..."
      : searchMode === "materials"
        ? "Hledat materiál nebo předmět..."
        : "Hledat předmět, zkratku nebo katedru...";

  return (
    <div className="w-full max-w-2xl mx-auto relative" onKeyDown={handleKeyDown}>
      {/* Backdrop blur při focusu */}
      {isFocused && (
        <div
          className="search-backdrop"
          onClick={() => {
            setIsFocused(false);
          }}
        />
      )}

      {/* Search container — nad backdrop */}
      <div className="relative z-50">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          isFocused={isFocused}
          placeholder={placeholder}
          size="large"
        />

        {/* Suggestions dropdown */}
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

      {/* Hint text */}
      {!isFocused && (
        <p className="text-center text-xs text-muted-foreground mt-2 animate-fade-in">
          {searchMode === "flashcards" ? (
            <><span className="font-mono text-primary">.F</span> režim — stiskni <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border font-mono text-[10px]">Enter</kbd> pro všechny kartičky</>
          ) : searchMode === "materials" ? (
            <><span className="font-mono text-sky-700">.M</span> režim — stiskni <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border font-mono text-[10px]">Enter</kbd> pro všechny materiály</>
          ) : (
            <>Stiskni <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border font-mono text-[10px]">Enter</kbd> pro hledání nebo vyber z návrhů</>
          )}
        </p>
      )}
    </div>
  );
}
