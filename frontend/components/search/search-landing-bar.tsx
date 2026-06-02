"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search/search-bar";

interface SearchLandingBarProps {
  basePath: string;
  placeholder: string;
  emptyHint: string;
}

export function SearchLandingBar({
  basePath,
  placeholder,
  emptyHint,
}: SearchLandingBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  const lastCommittedQueryRef = useRef((searchParams.get("q") ?? "").trim());

  useEffect(() => {
    const currentQuery = searchParams.get("q") ?? "";
    setQuery(currentQuery);
    lastCommittedQueryRef.current = currentQuery.trim();
  }, [searchParams]);

  const commitQuery = useCallback((nextQuery: string, pushHistory = false) => {
    const trimmed = nextQuery.trim();

    if (trimmed === lastCommittedQueryRef.current) {
      return;
    }

    lastCommittedQueryRef.current = trimmed;

    const params = new URLSearchParams(searchParams.toString());

    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }

    const href = params.toString() ? `${basePath}?${params.toString()}` : basePath;

    if (pushHistory) {
      router.push(href, { scroll: false });
      return;
    }

    router.replace(href, { scroll: false });
  }, [basePath, router, searchParams]);

  useEffect(() => {
    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(() => {
      commitQuery(query);
      debounceTimeoutRef.current = null;
    }, 250);

    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [commitQuery, query]);

  return (
    <div className="space-y-2">
      <div onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (debounceTimeoutRef.current !== null) {
            window.clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = null;
          }
          commitQuery(query, true);
        }
      }}>
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          isFocused={isFocused}
          placeholder={placeholder}
          size="default"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {query.trim() ? "Výsledky se aktualizují průběžně." : emptyHint}
      </p>
    </div>
  );
}
