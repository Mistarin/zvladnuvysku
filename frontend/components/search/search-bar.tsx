"use client";

import { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

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
        transition-shadow duration-200
        ${
          isFocused
            ? "ring-1 shadow-lg search-bar-focused"
            : "border-transparent hover:shadow-md"
        }
      `}
    >
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
          ${isLarge ? "py-4 pl-6 pr-24 text-lg" : "py-2.5 pl-4 pr-20 text-sm"}
        `}
        aria-label="Vyhledat předmět"
        aria-autocomplete="list"
      />

      {/* Right side icons container (slides in when typing) */}
      <div className="absolute right-3 flex items-center overflow-hidden">
        <div
          className={`
            flex items-center gap-2 transition-all duration-300 ease-out
            ${
              hasText
                ? "translate-x-0 opacity-100"
                : "translate-x-4 opacity-0 pointer-events-none"
            }
          `}
        >
          {query && (
            <button
              onClick={() => {
                onQueryChange("");
                inputRef.current?.focus();
              }}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Vymazat hledání"
            >
              <X size={isLarge ? 20 : 16} />
            </button>
          )}
          
          {/* Vertical divider */}
          <div className="w-px h-5 bg-border mx-1" />
          
          <div className="p-1 text-primary">
            <Search size={isLarge ? 20 : 16} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
}
