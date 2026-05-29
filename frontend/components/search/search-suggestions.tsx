"use client";

import Link from "next/link";
import { DifficultyBadge } from "@/components/subject/difficulty-badge";
import type { SearchResult } from "@/hooks/use-search";
import type { FlashcardDeckResult } from "@/hooks/use-flashcard-search";
import type { MaterialSearchResult } from "@/hooks/use-material-search";
import type { SearchMode } from "@/lib/search-mode";
import { Layers, BookOpen, FileText } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface SearchSuggestionsProps {
  results: SearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: () => void;
  mode?: SearchMode;
  flashcardQuery?: string;
  deckResults?: FlashcardDeckResult[];
  isDeckLoading?: boolean;
  materialQuery?: string;
  materialResults?: MaterialSearchResult[];
  isMaterialLoading?: boolean;
}

export function SearchSuggestions({
  results,
  isLoading,
  query,
  onSelect,
  mode = "subjects",
  flashcardQuery = "",
  deckResults = [],
  isDeckLoading = false,
  materialQuery = "",
  materialResults = [],
  isMaterialLoading = false,
}: SearchSuggestionsProps) {
  if (!query || query.trim().length < 1) return null;

  // ── FLASHCARD MODE ──────────────────────────────────────────────────────
  if (mode === "flashcards") {
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
              Balíčky kartiček
            </span>
            {flashcardQuery && (
              <span className="text-xs text-muted-foreground">
                — hledám „{flashcardQuery}“
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
                  ? <>Žádné balíčky pro „<span className="font-medium text-foreground">{flashcardQuery}</span>“</>
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
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">
                            {deck.subject.short_tag} · {deck.subject.name}
                          </p>
                          {deck.subject.faculty && (
                            <p className="text-[11px] text-muted-foreground/80 truncate">
                              {deck.subject.faculty}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">
                    {deck.card_count} karet
                  </span>
                </Link>
              ))}

              <Link
                href={
                  flashcardQuery
                    ? `/flashcardy?q=${encodeURIComponent(flashcardQuery)}`
                    : "/flashcardy"
                }
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

  // ── MATERIAL MODE ───────────────────────────────────────────────────────
  if (mode === "materials") {
    return (
      <div
        data-search-suggestions
        className="absolute top-full left-0 right-0 mt-1 z-50 animate-slide-down"
        role="listbox"
        aria-label="Výsledky vyhledávání materiálů"
      >
        <div className="bg-popover border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-border/50 flex items-center gap-2 bg-sky-500/5">
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span className="text-xs font-semibold text-sky-700 tracking-wide">
              Studijní materiály
            </span>
            {materialQuery && (
              <span className="text-xs text-muted-foreground">
                — hledám „{materialQuery}“
              </span>
            )}
          </div>

          {isMaterialLoading ? (
            <div className="p-4 flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Hledám materiály...</span>
            </div>
          ) : materialResults.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                {materialQuery
                  ? <>Žádné materiály pro „<span className="font-medium text-foreground">{materialQuery}</span>“</>
                  : "Žádné schválené materiály"}
              </p>
              <Link
                href={materialQuery ? `/materialy?q=${encodeURIComponent(materialQuery)}` : "/materialy"}
                onClick={onSelect}
                className="mt-2 text-xs text-sky-700 hover:underline block"
              >
                Projít všechny materiály →
              </Link>
            </div>
          ) : (
            <>
              {materialResults.map((material, idx) => (
                <a
                  key={material.id}
                  href={material.public_url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onSelect}
                  role="option"
                  aria-selected={false}
                  className={`
                    flex items-center justify-between px-4 py-3
                    hover:bg-muted transition-colors duration-100 cursor-pointer
                    ${idx !== materialResults.length - 1 ? "border-b border-border/50" : ""}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-sky-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{material.title}</p>
                      {material.subject && (
                        <p className="text-xs text-muted-foreground truncate">
                          {material.subject.short_tag} · {material.subject.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">
                    {formatFileSize(material.size_bytes)}
                  </span>
                </a>
              ))}

              <Link
                href={
                  materialQuery
                    ? `/materialy?q=${encodeURIComponent(materialQuery)}`
                    : "/materialy"
                }
                onClick={onSelect}
                className="flex items-center justify-center px-4 py-2.5 text-xs text-sky-700 hover:bg-sky-500/5 transition-colors border-t border-border/50"
              >
                Všechny materiály →
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
