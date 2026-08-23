"use client";

import type { KeyboardEventHandler } from "react";
import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused?: boolean;
  placeholder?: string;
  size?: "default" | "large";
  inputId?: string;
  ariaLabel?: string;
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}

export function SearchBar({
  query,
  onQueryChange,
  onFocus,
  onBlur,
  isFocused,
  placeholder = "Hledat předmět nebo zkratku...",
  size = "default",
  inputId = "subject-search",
  ariaLabel = "Vyhledávání",
  className,
  onKeyDown,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isFocused) {
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFocus = () => {
    onFocus?.();
  };

  const isLarge = size === "large";
  const hasText = query.length > 0;

  return (
    <div
      className={`
        search-bar-container relative flex w-full items-center rounded-2xl border border-border/80 bg-card/90
        transition-[border-color,box-shadow,background-color] duration-200
        ${
          isFocused
            ? "search-bar-focused"
            : "hover:border-border hover:bg-card"
        }
        ${className ?? ""}
      `}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={onKeyDown}
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
          ${isLarge ? "py-4 pl-5 pr-24 text-lg" : "py-3 pl-4 pr-20 text-sm"}
        `}
        aria-label={ariaLabel}
        aria-autocomplete="list"
      />

      <div className="absolute right-3 flex items-center gap-2">
        {hasText ? (
          <>
            {query && (
              <button
                onClick={() => {
                  onQueryChange("");
                  inputRef.current?.focus();
                }}
                className="p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Vymazat hledání"
              >
                <X size={isLarge ? 20 : 16} />
              </button>
            )}

            <div className="mx-1 h-5 w-px bg-border" />
          </>
        ) : null}
        <div className="p-1 text-primary">
          <Search size={isLarge ? 20 : 16} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
