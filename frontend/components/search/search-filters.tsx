"use client";

import { useCallback, useState } from "react";
import type { SubjectFilters } from "@/hooks/use-subjects";
import type { FilterConfig } from "@/hooks/use-subject-filters";

interface SearchFiltersProps {
  filters: SubjectFilters;
  filterConfig: FilterConfig[];
  onFilterChange: <K extends keyof SubjectFilters>(
    key: K,
    value: SubjectFilters[K]
  ) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function SearchFilters({
  filters,
  filterConfig,
  onFilterChange,
  onReset,
  activeFilterCount,
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleMultiSelect = useCallback(
    (key: keyof SubjectFilters, value: number | string) => {
      const currentValues = (filters[key] as (number | string)[]) || [];
      const exists = currentValues.includes(value as never);

      if (exists) {
        const next = currentValues.filter((v) => v !== value);
        onFilterChange(key, next.length > 0 ? (next as SubjectFilters[typeof key]) : undefined);
      } else {
        onFilterChange(key, [...currentValues, value] as SubjectFilters[typeof key]);
      }
    },
    [filters, onFilterChange]
  );

  return (
    <div className="space-y-3">
      {/* Text search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </span>
        <input
          id="predmety-search"
          type="text"
          placeholder="Hledat předmět nebo zkratku…"
          value={filters.query ?? ''}
          onChange={e => onFilterChange('query', e.target.value as SubjectFilters['query'])}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
        />
        {filters.query && (
          <button
            onClick={() => onFilterChange('query', undefined)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Vymazat hledání"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        )}
      </div>

      {/* Toggle button */}
      <div className="flex items-center justify-between">
        <button
          id="filter-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150
            ${isOpen || activeFilterCount > 0
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
            }
          `}
        >
          <span>{isOpen ? "▲" : "▼"}</span>
          <span>Filtry</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            Zrušit filtry
          </button>
        )}
      </div>

      {/* Filter panel */}
      {isOpen && (
        <div className="bg-card border border-border rounded-xl p-4 animate-slide-down">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filterConfig.map((config) => (
              <div key={config.key} className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {config.label}
                </h4>

                {config.type === "multiselect" && config.options && (
                  <div className="flex flex-wrap gap-1.5">
                    {config.options.map((option) => {
                      const currentValues =
                        (filters[config.key] as (number | string)[]) || [];
                      const isSelected = currentValues.includes(
                        option.value as never
                      );

                      return (
                        <button
                          key={option.value}
                          onClick={() =>
                            handleMultiSelect(config.key, option.value)
                          }
                          className={`
                            text-xs px-2.5 py-1 rounded-lg border transition-all duration-100
                            ${isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                            }
                          `}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                )}


              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
