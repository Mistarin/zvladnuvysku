"use client";

import { SubjectTable } from "@/components/subject/subject-table";
import { useSubjectFilters } from "@/hooks/use-subject-filters";
import { SUBJECTS_PAGE_SIZE } from "@/lib/subjects";
import type { SubjectWithStats } from "@/lib/types/database";

interface SubjectsResultsPanelProps {
  subjects: SubjectWithStats[];
  totalCount: number;
  page: number;
}

export function SubjectsResultsPanel({
  subjects,
  totalCount,
  page,
}: SubjectsResultsPanelProps) {
  const { sort, setSort, setPage } = useSubjectFilters();
  const totalPages = Math.max(1, Math.ceil(totalCount / SUBJECTS_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{totalCount}</span>{" "}
          {totalCount === 1 ? "předmět" : totalCount < 5 ? "předměty" : "předmětů"}
        </span>
        {totalPages > 1 && (
          <span>
            Strana {page} z {totalPages}
          </span>
        )}
      </div>

      <SubjectTable subjects={subjects} sort={sort} onSortChange={setSort} />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
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
                  className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
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
            disabled={page >= totalPages}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Další →
          </button>
        </div>
      )}
    </div>
  );
}
