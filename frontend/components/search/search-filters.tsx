"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SearchBar } from "@/components/search/search-bar";
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
  const [isFocused, setIsFocused] = useState(false);
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
    <section className="space-y-5 rounded-lg border border-border bg-card p-4 sm:p-5">
      <div className="space-y-2">
        <SearchBar
          inputId="predmety-search"
          ariaLabel="Hledat předmět"
          query={queryInput}
          onQueryChange={(nextQuery) => {
            setQueryInput(nextQuery);
            scheduleQueryCommit(nextQuery);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (queryCommitTimeoutRef.current !== null) {
              window.clearTimeout(queryCommitTimeoutRef.current);
              queryCommitTimeoutRef.current = null;
            }
            commitQuery(queryInput);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            if (queryCommitTimeoutRef.current !== null) {
              window.clearTimeout(queryCommitTimeoutRef.current);
              queryCommitTimeoutRef.current = null;
            }
            commitQuery(queryInput);
          }}
          isFocused={isFocused}
          placeholder="Hledat předmět nebo zkratku…"
        />
        <p className="text-xs text-muted-foreground">
          {queryInput.trim() ? "Výsledky se aktualizují průběžně." : "Zadej název předmětu nebo zkratku."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          id="filter-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors duration-150
            ${isOpen || activeFilterCount > 0
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted"
            }
          `}
        >
          <ChevronDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          <span>Filtry</span>
          {activeFilterCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
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

      {isOpen && (
        <div className="rounded-lg border border-border bg-background p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filterConfig.map((config) => (
              <div key={config.key} className="space-y-2">
                {config.type !== "boolean" && (
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {config.label}
                  </h4>
                )}

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
                            rounded-lg border px-2.5 py-1 text-xs transition-colors duration-100
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

                {config.type === "slider" && (() => {
                  const filterKey = config.key as keyof SubjectFilters;
                  const isMaxSlider = config.key.includes("Max");
                  const defaultValue = isMaxSlider ? (config.max ?? 5) : (config.min ?? 1);
                  const currentValue = getNumberFilterValue(filterKey, defaultValue);
                  const isAtDefault = currentValue === defaultValue;
                  const valueLabel = isMaxSlider ? `≤ ${currentValue}` : String(currentValue);

                  return (
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={config.min}
                          max={config.max}
                          step={config.step || 1}
                          value={currentValue}
                          onChange={(e) => {
                            const newValue = Number(e.target.value);
                            if (newValue === defaultValue) {
                              setFilter(filterKey, undefined);
                            } else {
                              setFilter(filterKey, newValue as SubjectFilters[typeof filterKey]);
                            }
                          }}
                          className="w-full accent-primary"
                        />
                        <span className={`text-sm font-bold min-w-[2.5rem] text-right px-2 py-0.5 rounded-md ${isAtDefault ? "text-muted-foreground bg-muted/50" : "text-foreground bg-muted"}`}>
                          {valueLabel}
                        </span>
                      </div>
                      {isAtDefault ? (
                        <p className="text-xs text-muted-foreground/70">Filtr neaktivní</p>
                      ) : isMaxSlider ? (
                        <p className="text-xs text-muted-foreground/70">Zobrazí vybranou hodnotu i všechno nižší.</p>
                      ) : null}
                    </div>
                  );
                })()}

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
                        const isNumber = typeof config.options![0].value === "number";
                        const newVal = isNumber ? Number(val) : val;
                        const isArrayType = ["attendanceType", "semester", "year"].includes(config.key);

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
                          style={{ color: opt.color, fontWeight: opt.color ? "bold" : "normal" }}
                        >
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  );
                })()}

                {config.type === "boolean" && (
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={getBooleanFilterValue(config.key as keyof SubjectFilters)}
                        onChange={(e) => setFilter(config.key as keyof SubjectFilters, e.target.checked ? true : undefined)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        getBooleanFilterValue(config.key as keyof SubjectFilters)
                          ? "bg-primary border-primary"
                          : "bg-background border-border group-hover:border-primary/50"
                      }`}>
                        {getBooleanFilterValue(config.key as keyof SubjectFilters) && (
                          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                            <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground">{config.label}</span>
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
