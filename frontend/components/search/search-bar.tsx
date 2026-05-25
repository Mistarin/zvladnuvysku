"use client";

import { useRef, useEffect } from "react";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused?: boolean;
  placeholder?: string;
  size?: "default" | "large";
}

export function SearchBar({
  query,
  onQueryChange,
  onFocus,
  onBlur,
  isFocused,
  placeholder = "Hledat předmět nebo zkratku...",
  size = "default",
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFocused) {
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLarge = size === "large";
  const hasText = query.length > 0;

  return (
    <div
      className={`
        relative flex items-center w-full
        bg-card border rounded-2xl
        transition-all duration-200
        ${
          isFocused
            ? "ring-1 ring-white/60 border-white/60 shadow-lg"
            : "border-border hover:border-border hover:shadow-md"
        }
      `}
    >
      {/* Search icon — left side, fades in when there is text */}
      <span
        className={`
          pl-4 shrink-0 transition-all duration-200
          ${isLarge ? "text-xl" : "text-base"}
          ${hasText
            ? "opacity-100 text-primary"
            : "opacity-40 text-muted-foreground"
          }
        `}
        aria-hidden
      >
        🔍
      </span>

      {/* Input */}
      <input
        ref={inputRef}
        id="subject-search"
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        onBlur={(e) => {
          if (!e.relatedTarget?.closest("[data-search-suggestions]")) {
            onBlur?.();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`
          flex-1 bg-transparent border-none outline-none
          text-foreground placeholder:text-muted-foreground
          ${isLarge ? "py-4 px-4 text-lg" : "py-2.5 px-3 text-sm"}
        `}
        aria-label="Vyhledat předmět"
        aria-autocomplete="list"
      />

      {/* Clear button */}
      {query && (
        <button
          onClick={() => {
            onQueryChange("");
            inputRef.current?.focus();
          }}
          className="pr-4 pl-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Vymazat hledání"
        >
          ✕
        </button>
      )}
    </div>
  );
}
