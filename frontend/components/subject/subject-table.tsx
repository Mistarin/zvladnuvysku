"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { DifficultyBadge } from "./difficulty-badge";
import { getFacultyColor } from "@/lib/faculties";
import { getTeacherPath } from "@/lib/teacher-slug";
import type { SortConfig } from "@/lib/subjects";
import type { SubjectWithStats } from "@/lib/types/database";
import { formatCredits } from "@/lib/utils";

interface SubjectTableProps {
  subjects: SubjectWithStats[];
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
  { key: "time_intensity", label: "Časová náročnost", sortable: true, className: "text-center" },
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

function TeacherRatingCell({ subject }: { subject: SubjectWithStats }) {
  const teachers = subject.teacher_rating_preview ?? [];
  const ratedTeachers = teachers.filter((teacher) => teacher.total_ratings > 0 && teacher.avg_rating !== null);

  if (teachers.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  const hasMultipleTeachers = teachers.length > 1;
  const average = subject.avg_teacher_rating > 0 ? subject.avg_teacher_rating : null;

  return (
    <div className="group relative inline-flex items-center justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-background/60 px-2.5 py-1 text-sm shadow-inner">
        {average !== null ? (
          <>
            <span className="font-bold text-amber-500">{average.toFixed(1)}</span>
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        {hasMultipleTeachers && (
          <span className="text-xs text-muted-foreground">
            · {teachers.length}
          </span>
        )}
      </div>

      {hasMultipleTeachers && (
        <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden min-w-[18rem] rounded-2xl border border-white/10 bg-popover/95 p-3 text-left shadow-2xl backdrop-blur-md group-hover:block group-focus-within:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vyučující
          </p>
          <div className="space-y-1.5">
            {teachers.map((teacher) => (
              <Link
                key={teacher.id}
                href={getTeacherPath(teacher.slug)}
                className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60"
              >
                <span className="line-clamp-2 text-sm text-foreground">{teacher.name}</span>
                <span className="shrink-0 text-sm font-medium text-amber-500">
                  {teacher.total_ratings > 0 && teacher.avg_rating !== null ? `${teacher.avg_rating.toFixed(1)} ★` : "—"}
                </span>
              </Link>
            ))}
          </div>
          {ratedTeachers.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Zatím bez hodnocení.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function SubjectTable({
  subjects,
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
          {subjects.length === 0 ? (
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
              const facultyColor = getFacultyColor(subject.faculty) ?? "var(--foreground)";
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
                            backgroundColor: `${facultyColor}20`,
                            color: facultyColor,
                          }}
                        >
                          {subject.faculty}
                        </span>
                      )}
                      {subject.exam_from_home && (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                            ✓
                          </span>
                          Z domova
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
                      <span className="text-sm font-medium">{formatCredits(subject.credits)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {subject.time_intensity ? (
                      <span className="inline-flex whitespace-nowrap">
                        <DifficultyBadge difficulty={subject.time_intensity} />
                      </span>
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
                    <TeacherRatingCell subject={subject} />
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
