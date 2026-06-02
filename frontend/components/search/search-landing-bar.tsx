"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const submit = () => {
    const trimmed = query.trim();
    router.push(trimmed ? `${basePath}?q=${encodeURIComponent(trimmed)}` : basePath);
  };

  return (
    <div className="space-y-2">
      <div onKeyDown={(e) => {
        if (e.key === "Enter") {
          submit();
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
        {query.trim() ? "Uprav dotaz a stiskni Enter." : emptyHint}
      </p>
    </div>
  );
}
