"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, Star } from "lucide-react";
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
  { key: "difficulty", label: "Obtížnost", sortable: true, className: "text-center" },
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
  volná: { text: "Volná", bg: "bg-[#70C96B]/12 text-[#70C96B]" },
  povinná: { text: "Povinná (vše)", bg: "bg-[#F05D5E]/12 text-[#F05D5E]" },
  "povinné přednášky": { text: "Přednášky", bg: "bg-[#F6B73C]/12 text-[#F6B73C]" },
  "povinná cvičení": { text: "Cvičení", bg: "bg-[#F6B73C]/12 text-[#F6B73C]" },
};

function getAttendanceData(type: string | null | undefined) {
  if (!type) return { text: "…", bg: "bg-muted text-muted-foreground" };
  return ATTENDANCE_STYLES[type] || { text: type, bg: "bg-muted text-muted-foreground" };
}

function TeacherRatingCell({ subject }: { subject: SubjectWithStats }) {
  const teachers = subject.teacher_rating_preview ?? [];
  const ratedTeachers = teachers.filter((teacher) => teacher.total_ratings > 0 && teacher.avg_rating !== null);

  if (teachers.length === 0) {
    return <span className="text-sm text-muted-foreground">…</span>;
  }

  const hasMultipleTeachers = teachers.length > 1;
  const average =
    subject.avg_teacher_rating != null && subject.avg_teacher_rating > 0
      ? subject.avg_teacher_rating
      : null;

  return (
    <div className="group relative inline-flex items-center justify-center">
      <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm">
        {average !== null ? (
          <>
            <span className="font-bold text-[#F6B73C]">{average.toFixed(1)}</span>
            <Star className="h-3.5 w-3.5 fill-[#F6B73C] text-[#F6B73C]" />
          </>
        ) : (
          <span className="text-muted-foreground">…</span>
        )}
        {hasMultipleTeachers && (
          <span className="text-xs text-muted-foreground">
            · {teachers.length}
          </span>
        )}
      </div>

      {hasMultipleTeachers && (
        <div className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden min-w-[18rem] rounded-lg border border-border bg-popover p-3 text-left group-hover:block group-focus-within:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vyučující
          </p>
          <div className="space-y-1.5">
            {teachers.map((teacher) => (
              <Link
                key={teacher.id}
                href={getTeacherPath(teacher.slug)}
                className="pointer-events-auto flex items-center justify-between gap-3 rounded-md px-3 py-2 transition-colors hover:bg-muted/60"
              >
                <span className="line-clamp-2 text-sm text-foreground">{teacher.name}</span>
                <span className="shrink-0 text-sm font-medium text-[#F6B73C]">
                  {teacher.total_ratings > 0 && teacher.avg_rating !== null ? `${teacher.avg_rating.toFixed(1)} ` : "…"}
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
      return <ArrowUpDown aria-hidden="true" className="ml-1 inline size-3.5 text-muted-foreground/50" />;
    }
    return sort.direction === "asc" ? (
        <ArrowUp aria-hidden="true" className="ml-1 inline size-3.5 text-primary" />
      ) : (
        <ArrowDown aria-hidden="true" className="ml-1 inline size-3.5 text-primary" />
      );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-card xl:overflow-visible">
      <table className="w-full min-w-[860px] border-separate border-spacing-0" role="grid" aria-label="Tabulka předmětů">
        <thead>
          <tr className="bg-background">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`
                  border-b border-border px-4 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground
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
                <p className="text-sm">Žádné předměty neodpovídají filtrům.</p>
              </td>
            </tr>
          ) : (
            subjects.map((subject) => {
              const attendance = getAttendanceData(subject.attendance_type);
              const facultyColor = getFacultyColor(subject.faculty) ?? "var(--foreground)";
              return (
                <tr
                  key={subject.id}
                  className={`
                    table-row-hover border-b border-border/60 last:border-0
                  `}
                >
                  <td className="border-b border-border/60 px-4 py-4 align-top last:border-0">
                    <Link
                      href={`/predmety/${subject.slug}`}
                      className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {subject.name}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {subject.faculty && (
                        <span
                          className="faculty-accent-chip inline-flex items-center rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                          style={{
                            ["--faculty-color" as string]: facultyColor,
                          }}
                        >
                          {subject.faculty}
                        </span>
                      )}
                      {subject.exam_from_home && (
                        <span className="inline-flex items-center whitespace-nowrap rounded-md border border-[#70C96B]/25 bg-[#70C96B]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#70C96B]">
                          Z domova
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="border-b border-border/60 px-4 py-4 text-center align-middle hidden sm:table-cell">
                    <span className="text-sm font-medium text-foreground">
                      {subject.short_tag}
                    </span>
                  </td>

                  <td className="border-b border-border/60 px-4 py-4 text-center align-middle hidden md:table-cell">
                    {subject.credits ? (
                      <span className="text-sm font-medium">{formatCredits(subject.credits)}</span>
                    ) : (
                      <span className="text-muted-foreground">…</span>
                    )}
                  </td>

                  <td className="border-b border-border/60 px-4 py-4 text-center align-middle">
                    {subject.difficulty ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-foreground">{Number(subject.difficulty).toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">…</span>
                    )}
                  </td>

                  <td className="border-b border-border/60 px-4 py-4 text-center align-middle hidden lg:table-cell">
                    {subject.avg_subject_rating ? (
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-[#F6B73C]">{subject.avg_subject_rating.toFixed(1)}</span>
                        <span className="text-[#F6B73C] text-xs"></span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">…</span>
                    )}
                  </td>

                  <td className="border-b border-border/60 px-4 py-4 text-center align-middle hidden xl:table-cell">
                    <TeacherRatingCell subject={subject} />
                  </td>

                  <td className="border-b border-border/60 px-4 py-4 align-middle hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {subject.semester
                        ? SEMESTER_LABELS[subject.semester] || subject.semester
                        : "…"}
                    </span>
                  </td>

                  <td className="border-b border-border/60 px-4 py-4 text-center align-middle hidden lg:table-cell">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-md ${attendance.bg}`}
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
