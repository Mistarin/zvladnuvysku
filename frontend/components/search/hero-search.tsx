"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchBar } from "@/components/search/search-bar";
import { SearchSuggestions } from "@/components/search/search-suggestions";
import { useSearch } from "@/hooks/use-search";

export function HeroSearch() {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const { query, setQuery, results, isLoading, clearSearch } = useSearch();

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
          placeholder="Hledat předmět, zkratku nebo katedru..."
          size="large"
        />

        {/* Suggestions dropdown */}
        {isFocused && (
          <SearchSuggestions
            results={results}
            isLoading={isLoading}
            query={query}
            onSelect={handleSelect}
          />
        )}
      </div>

      {/* Hint text */}
      {!isFocused && (
        <p className="text-center text-xs text-muted-foreground mt-2 animate-fade-in">
          Stiskni <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border font-mono text-[10px]">Enter</kbd> pro hledání nebo vyber z návrhů
        </p>
      )}
    </div>
  );
}
