"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SearchBar } from "@/components/search/search-bar";
import { filterDepartmentsByFaculty, type DepartmentOption } from "@/lib/departments";
import type { TeacherDirectorySubjectOption } from "@/lib/teachers";
import { useTeacherFilters } from "@/hooks/use-teacher-filters";

interface TeachersFilterPanelProps {
  departments: DepartmentOption[];
  subjects: TeacherDirectorySubjectOption[];
}

export function TeachersFilterPanel({ departments, subjects }: TeachersFilterPanelProps) {
  const { filters, setFilter, setFilters, resetFilters, activeFilterCount } = useTeacherFilters();
  const [isOpen, setIsOpen] = useState(false);
  const [queryInput, setQueryInput] = useState(filters.query ?? "");
  const [subjectInput, setSubjectInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const queryCommitTimeoutRef = useRef<number | null>(null);
  const subjectMap = useMemo(() => new Map(subjects.map((subject) => [subject.label, subject.id])), [subjects]);
  const selectedSubject = subjects.find((subject) => subject.id === filters.subjectId) ?? null;
  const availableDepartments = filterDepartmentsByFaculty(departments, filters.faculty);

  useEffect(() => {
    setQueryInput(filters.query ?? "");
  }, [filters.query]);

  useEffect(() => {
    setSubjectInput(selectedSubject?.label ?? "");
  }, [selectedSubject]);

  useEffect(() => {
    if (activeFilterCount > 0) {
      setIsOpen(true);
    }
  }, [activeFilterCount]);

  useEffect(() => () => {
    if (queryCommitTimeoutRef.current !== null) {
      window.clearTimeout(queryCommitTimeoutRef.current);
    }
  }, []);

  function commitQuery(nextQuery: string) {
    const trimmed = nextQuery.trim();
    setFilter("query", trimmed || undefined);
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

  function commitSubject(nextValue: string) {
    const trimmed = nextValue.trim();
    if (!trimmed) {
      setSubjectInput("");
      setFilter("subjectId", undefined);
      return;
    }

    const subjectId = subjectMap.get(trimmed);
    if (subjectId) {
      setFilter("subjectId", subjectId);
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <SearchBar
          inputId="ucitele-search"
          ariaLabel="Hledat vyučujícího"
          query={queryInput}
          onQueryChange={(nextQuery) => {
            setQueryInput(nextQuery);
            scheduleQueryCommit(nextQuery);
          }}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => {
            setIsSearchFocused(false);
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
          isFocused={isSearchFocused}
          placeholder="Hledat jméno, katedru nebo předmět..."
        />
        <p className="text-xs text-muted-foreground">
          {queryInput.trim() ? "Výsledky se aktualizují průběžně." : "Zadej jméno vyučujícího, katedru nebo zkratku předmětu."}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={`
            flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-150
            ${isOpen || activeFilterCount > 0
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"}
          `}
        >
          <span>{isOpen ? "▲" : "▼"}</span>
          <span>Filtry</span>
          {activeFilterCount > 0 ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          ) : null}
        </button>

        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            Zrušit filtry
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div className="grid gap-4 rounded-2xl border border-border bg-card/90 p-4   md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fakulta</h4>
            <select
              value={filters.faculty ?? ""}
              onChange={(event) => {
                const nextFaculty = event.target.value || undefined;
                setFilters({
                  faculty: nextFaculty,
                  departmentId: undefined,
                });
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
            >
              <option value="">Všechny fakulty</option>
              {Array.from(new Set(departments.map((department) => department.faculty))).map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Katedra</h4>
            <select
              value={filters.departmentId ?? ""}
              onChange={(event) => setFilter("departmentId", event.target.value || undefined)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
            >
              <option value="">Všechny katedry</option>
              {availableDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Min. hodnocení</h4>
            <select
              value={filters.ratingMin ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setFilter("ratingMin", value ? Number(value) : undefined);
              }}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
            >
              <option value="">Bez minima</option>
              {[1, 2, 3, 4, 4.5].map((rating) => (
                <option key={rating} value={rating}>
                  {rating.toString().replace(".", ",")}  a více
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Předmět</h4>
            <input
              list="teacher-subject-options"
              value={subjectInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSubjectInput(nextValue);
                if (!nextValue.trim()) {
                  setFilter("subjectId", undefined);
                }
              }}
              onBlur={(event) => commitSubject(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitSubject(subjectInput);
                }
              }}
              placeholder="Vyber vyučovaný předmět…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/40"
            />
            <datalist id="teacher-subject-options">
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.label} />
              ))}
            </datalist>
          </div>
        </div>
      ) : null}
    </div>
  );
}
