"use client";

import { useEffect, useRef, useState } from "react";
import { Diamond } from "lucide-react";
import type { FilterConfig } from "@/hooks/use-subject-filters";
import type { SubjectFilters } from "@/lib/subjects";

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
  const [queryInput, setQueryInput] = useState(filters.query ?? "");
  const queryCommitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setQueryInput(filters.query ?? "");
  }, [filters.query]);

  useEffect(() => {
    return () => {
      if (queryCommitTimeoutRef.current !== null) {
        window.clearTimeout(queryCommitTimeoutRef.current);
      }
    };
  }, []);

  function setFilter<K extends keyof SubjectFilters>(key: K, value: SubjectFilters[K]) {
    onFilterChange(key, value);
  }

  function commitQuery(nextQuery: string) {
    const normalizedQuery = nextQuery.trim();
    onFilterChange("query", (normalizedQuery ? nextQuery : undefined) as SubjectFilters["query"]);
  }

  function scheduleQueryCommit(nextQuery: string) {
    if (queryCommitTimeoutRef.current !== null) {
      window.clearTimeout(queryCommitTimeoutRef.current);
    }

    queryCommitTimeoutRef.current = window.setTimeout(() => {
      commitQuery(nextQuery);
      queryCommitTimeoutRef.current = null;
    }, 250);
  }

  function getArrayFilterValue(key: keyof SubjectFilters) {
    return (filters[key] as (number | string)[] | undefined) ?? [];
  }

  function getNumberFilterValue(key: keyof SubjectFilters, fallback: number) {
    return (filters[key] as number | undefined) ?? fallback;
  }

  function getBooleanFilterValue(key: keyof SubjectFilters) {
    return (filters[key] as boolean | undefined) ?? false;
  }

  function handleMultiSelect(key: keyof SubjectFilters, value: number | string) {
    const currentValues = getArrayFilterValue(key);
    const exists = currentValues.includes(value as never);

    if (exists) {
      const next = currentValues.filter((v) => v !== value);
      onFilterChange(key, next.length > 0 ? (next as SubjectFilters[typeof key]) : undefined);
    } else {
      onFilterChange(key, [...currentValues, value] as SubjectFilters[typeof key]);
    }
  }

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
          value={queryInput}
          onChange={(e) => {
            const nextQuery = e.target.value;
            setQueryInput(nextQuery);
            scheduleQueryCommit(nextQuery);
          }}
          onBlur={() => {
            if (queryCommitTimeoutRef.current !== null) {
              window.clearTimeout(queryCommitTimeoutRef.current);
              queryCommitTimeoutRef.current = null;
            }
            commitQuery(queryInput);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (queryCommitTimeoutRef.current !== null) {
                window.clearTimeout(queryCommitTimeoutRef.current);
                queryCommitTimeoutRef.current = null;
              }
              commitQuery(queryInput);
            }
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
        />
        {queryInput && (
          <button
            onClick={() => {
              if (queryCommitTimeoutRef.current !== null) {
                window.clearTimeout(queryCommitTimeoutRef.current);
                queryCommitTimeoutRef.current = null;
              }
              setQueryInput("");
              onFilterChange("query", undefined);
            }}
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

        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              Zrušit filtry
            </button>
          )}
        </div>
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
                      const filterKey = config.key as keyof SubjectFilters;
                      const currentValues = getArrayFilterValue(filterKey);
                      const isSelected = currentValues.includes(option.value as never);

                      return (
                        <button
                          key={option.value}
                          onClick={() =>
                            handleMultiSelect(filterKey, option.value)
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

                {config.type === "slider" && (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const filterKey = config.key as keyof SubjectFilters;
                        const fallback = config.key.includes('Max') ? config.max ?? 0 : config.min ?? 0;
                        const currentValue = getNumberFilterValue(filterKey, fallback);

                        return (
                      <input
                        type="range"
                        min={config.min}
                        max={config.max}
                        step={config.step || 1}
                        value={currentValue}
                        onChange={(e) => setFilter(filterKey, Number(e.target.value) as SubjectFilters[typeof filterKey])}
                        className="w-full accent-primary"
                      />
                        );
                      })()}
                      <span className="text-sm font-bold text-foreground min-w-[1.5rem] text-right bg-muted px-2 py-0.5 rounded-md">
                        {getNumberFilterValue(
                          config.key as keyof SubjectFilters,
                          config.key.includes('Max') ? config.max ?? 0 : config.min ?? 0
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {config.type === "select" && config.options && (() => {
                  const filterVal = filters[config.key as keyof SubjectFilters];
                  const selectedValue = Array.isArray(filterVal) ? filterVal[0] : filterVal;
                  
                  return (
                    <select
                      value={(selectedValue as string | number) ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setFilter(config.key as keyof SubjectFilters, undefined);
                          return;
                        }
                        const isNumber = typeof config.options![0].value === 'number';
                        const newVal = isNumber ? Number(val) : val;
                        const isArrayType = ['attendanceType', 'semester', 'year'].includes(config.key);
                        
                        const filterKey = config.key as keyof SubjectFilters;
                        const nextValue = isArrayType ? [newVal] : newVal;
                        setFilter(filterKey, nextValue as SubjectFilters[typeof filterKey]);
                      }}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 text-foreground"
                    >
                      <option value="">Všechny</option>
                      {config.options.map((opt) => (
                        <option 
                          key={opt.value} 
                          value={opt.value}
                          style={{ color: opt.color, fontWeight: opt.color ? 'bold' : 'normal' }}
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  );
                })()}

                {config.type === "boolean" && (
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={getBooleanFilterValue(config.key as keyof SubjectFilters)}
                      onChange={(e) => setFilter(config.key as keyof SubjectFilters, e.target.checked ? true : undefined)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 bg-background"
                    />
                    <span className="text-sm font-medium text-foreground">{config.label}</span>
                  </label>
                )}
              </div>
            ))}
            
            {/* Quick Filters */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rychlé volby
              </h4>
              <button
                onClick={() => {
                  setFilter('timeIntensityMax', 2);
                  setFilter('ratingMin', 4);
                  setFilter('teacherRatingMin', 4);
                  setFilter('attendanceType', ['volná']);
                }}
                title="Vybere předměty s náročností max 2, volnou docházkou a hodnocením učitele i předmětu minimálně 4 ⭐"
                className="w-full flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
              >
                <Diamond className="w-4 h-4" /> Kredity zdarma
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
