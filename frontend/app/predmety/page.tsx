"use client";

import { Suspense } from "react";
import { SubjectTable } from "@/components/subject/subject-table";
import { SearchFilters } from "@/components/search/search-filters";
import { useSubjects } from "@/hooks/use-subjects";
import { useSubjectFilters } from "@/hooks/use-subject-filters";

const PAGE_SIZE = 20;

function SubjectsContent() {
  const {
    filters,
    setFilter,
    resetFilters,
    filterConfig,
    activeFilterCount,
    sort,
    setSort,
  } = useSubjectFilters();

  const { subjects, totalCount, isLoading, error, page, setPage } =
    useSubjects(filters, sort);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <SearchFilters
        filters={filters}
        filterConfig={filterConfig}
        onFilterChange={setFilter}
        onReset={resetFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isLoading ? (
            "Načítám předměty..."
          ) : (
            <>
              <span className="font-medium text-foreground">{totalCount}</span>{" "}
              {totalCount === 1 ? "předmět" : totalCount < 5 ? "předměty" : "předmětů"}
            </>
          )}
        </span>
        {totalPages > 1 && (
          <span>
            Strana {page} z {totalPages}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <SubjectTable
        subjects={subjects}
        isLoading={isLoading}
        sort={sort}
        onSortChange={setSort}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || isLoading}
            className="px-4 py-2 rounded-lg text-sm border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Předchozí
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  disabled={isLoading}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    pageNum === page
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card hover:bg-muted"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="px-4 py-2 rounded-lg text-sm border border-border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Další →
          </button>
        </div>
      )}
    </div>
  );
}

export default function PredmetyPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Předměty</h1>
        <p className="text-muted-foreground mt-1">
          Procházej předměty Ostravské univerzity. Filtruj podle obtížnosti, semestru nebo katedry.
        </p>
      </div>

      {/* Main content — needs Suspense for useSearchParams */}
      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-muted rounded-xl animate-pulse"
              />
            ))}
          </div>
        }
      >
        <SubjectsContent />
      </Suspense>
    </div>
  );
}
