"use client";

import Link from "next/link";
import { DifficultyBadge } from "./difficulty-badge";
import type { SubjectWithStats } from "@/lib/types/database";
import type { SortConfig } from "@/hooks/use-subjects";

interface SubjectTableProps {
  subjects: SubjectWithStats[];
  isLoading: boolean;
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
}

const COLUMNS: {
  key: keyof SubjectWithStats | 'avg_teacher_rating';
  label: string;
  sortable: boolean;
  className?: string;
}[] = [
  { key: "name", label: "Název", sortable: true },
  { key: "short_tag", label: "Zkratka", sortable: true, className: "hidden sm:table-cell text-center" },
  { key: "credits", label: "Kredity", sortable: true, className: "hidden md:table-cell text-center" },
  { key: "time_intensity", label: "Náročnost", sortable: true, className: "text-center" },
  { key: "avg_subject_rating", label: "Předmět", sortable: true, className: "hidden lg:table-cell text-center" },
  { key: "avg_teacher_rating", label: "Učitel", sortable: true, className: "hidden xl:table-cell text-center" },
  { key: "semester", label: "Semestr", sortable: true, className: "hidden md:table-cell text-center" },
  { key: "attendance_type", label: "Docházka", sortable: false, className: "hidden lg:table-cell text-center" },
];

const SEMESTER_LABELS: Record<string, string> = {
  zimní: "Zimní",
  letní: "Letní",
  oba: "Oba",
};

const FACULTY_COLORS: Record<string, string> = {
  FSS: "#FBB900",
  FU: "#D2091D",
  FF: "#74348B",
  LF: "#007CBB",
  PdF: "#EE7202",
  PřF: "#7A9B21",
};

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div
                className="h-4 bg-muted rounded animate-pulse"
                style={{ width: `${60 + Math.random() * 40}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
const ATTENDANCE_STYLES: Record<string, { text: string; bg: string }> = {
  volná: { text: "Volná", bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  povinná: { text: "Povinná (vše)", bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  "povinné přednášky": { text: "Přednášky", bg: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  "povinná cvičení": { text: "Cvičení", bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
};

function getAttendanceData(type: string | null | undefined) {
  if (!type) return { text: "—", bg: "bg-muted text-muted-foreground" };
  return ATTENDANCE_STYLES[type] || { text: type, bg: "bg-muted text-muted-foreground" };
}

export function SubjectTable({
  subjects,
  isLoading,
  sort,
  onSortChange,
}: SubjectTableProps) {
  function handleSort(column: keyof SubjectWithStats) {
    if (sort.column === column) {
      onSortChange({
        column,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      onSortChange({ column, direction: "asc" });
    }
  }

  function SortIcon({ column }: { column: keyof SubjectWithStats }) {
    if (sort.column !== column) {
      return <span className="text-muted-foreground/40 ml-1">↕</span>;
    }
    return (
      <span className="text-primary ml-1">
        {sort.direction === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border">
      <table className="w-full" role="grid" aria-label="Tabulka předmětů">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`
                  px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider
                  ${col.className?.includes('text-center') ? '' : 'text-left'}
                  ${col.className || ""}
                  ${col.sortable ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""}
                `}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  sort.column === col.key
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {col.label}
                {col.sortable && <SortIcon column={col.key} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton />
          ) : subjects.length === 0 ? (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-4 py-12 text-center text-muted-foreground"
              >
                <p className="text-lg mb-1">🔍</p>
                <p className="text-sm">Žádné předměty neodpovídají filtrům</p>
              </td>
            </tr>
          ) : (
            subjects.map((subject, idx) => {
              const attendance = getAttendanceData(subject.attendance_type);
              return (
                <tr
                  key={subject.id}
                  className={`
                    table-row-hover border-b border-border/50 last:border-0
                    ${idx % 2 === 0 ? "" : "bg-muted/20"}
                  `}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/predmety/${subject.slug}`}
                      className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {subject.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {subject.faculty && (
                        <span 
                          className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wider"
                          style={{ 
                            backgroundColor: `${FACULTY_COLORS[subject.faculty] || "var(--foreground)"}20`,
                            color: FACULTY_COLORS[subject.faculty] || "var(--foreground)",
                          }}
                        >
                          {subject.faculty}
                        </span>
                      )}
                      {(subject as any).exam_from_home && (
                        <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          🏠 Z domova
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 hidden sm:table-cell text-center align-middle">
                    <span className="text-sm font-medium text-foreground">
                      {subject.short_tag}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {subject.credits ? (
                      <span className="text-sm font-medium">{subject.credits}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {subject.time_intensity ? (
                      <DifficultyBadge difficulty={subject.time_intensity} />
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {subject.avg_subject_rating ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-amber-500">{subject.avg_subject_rating.toFixed(1)}</span>
                        <span className="text-amber-500 text-xs">★</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center hidden xl:table-cell">
                    {subject.avg_teacher_rating ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-amber-500">{subject.avg_teacher_rating.toFixed(1)}</span>
                        <span className="text-amber-500 text-xs">★</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {subject.semester
                        ? SEMESTER_LABELS[subject.semester] || subject.semester
                        : "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${attendance.bg}`}
                    >
                      {attendance.text}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
