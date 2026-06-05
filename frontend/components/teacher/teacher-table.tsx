"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { getFacultyColor } from "@/lib/faculties";
import { getTeacherPath } from "@/lib/teacher-slug";
import type { TeacherDirectoryRow } from "@/lib/teachers";

interface TeacherTableProps {
  teachers: TeacherDirectoryRow[];
}

function TeacherRating({ teacher }: { teacher: TeacherDirectoryRow }) {
  if (!teacher.totalRatings || teacher.avgRating === null) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-sm text-amber-600 dark:text-amber-400">
      <span className="font-semibold">{teacher.avgRating.toFixed(1)}</span>
      <Star className="h-3.5 w-3.5 fill-current" />
      <span className="text-[11px] text-muted-foreground">({teacher.totalRatings})</span>
    </div>
  );
}

export function TeacherTable({ teachers }: TeacherTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border">
      <table className="w-full" aria-label="Tabulka vyučujících">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jméno</th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Fakulta</th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Katedra</th>
            <th className="hidden px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">Hodnocení</th>
            <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground xl:table-cell">Předměty</th>
          </tr>
        </thead>
        <tbody>
          {teachers.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                <p className="mb-1 text-lg">🔎</p>
                <p className="text-sm">Žádní vyučující neodpovídají filtrům.</p>
              </td>
            </tr>
          ) : (
            teachers.map((teacher, index) => {
              const facultyColor = getFacultyColor(teacher.faculty) ?? "var(--foreground)";
              const subjectPreview = teacher.subjects.slice(0, 3);
              const remainingSubjectCount = Math.max(0, teacher.subjects.length - subjectPreview.length);

              return (
                <tr
                  key={teacher.id}
                  className={`border-b border-border/50 last:border-0 ${index % 2 === 0 ? "" : "bg-muted/20"}`}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-2">
                      <Link
                        href={getTeacherPath(teacher.slug)}
                        className="line-clamp-2 font-medium text-foreground transition-colors hover:text-primary"
                      >
                        {teacher.name}
                      </Link>
                      <div className="flex flex-wrap items-center gap-1.5 md:hidden">
                        <span
                          className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ backgroundColor: `${facultyColor}20`, color: facultyColor }}
                        >
                          {teacher.faculty}
                        </span>
                        {teacher.department ? (
                          <span className="text-xs text-muted-foreground">{teacher.department}</span>
                        ) : null}
                      </div>
                      <div className="sm:hidden">
                        <TeacherRating teacher={teacher} />
                      </div>
                      <div className="space-y-1 xl:hidden">
                        {subjectPreview.length > 0 ? (
                          <>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Předměty</p>
                            <div className="flex flex-wrap gap-1.5">
                              {subjectPreview.map((subject) => (
                                <Link
                                  key={subject.id}
                                  href={`/predmety/${subject.slug}`}
                                  className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                  {subject.short_tag}
                                </Link>
                              ))}
                              {remainingSubjectCount > 0 ? (
                                <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                                  +{remainingSubjectCount}
                                </span>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Bez přiřazených předmětů.</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 align-top md:table-cell">
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: `${facultyColor}20`, color: facultyColor }}
                    >
                      {teacher.faculty}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
                    {teacher.department ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-center align-top sm:table-cell">
                    <TeacherRating teacher={teacher} />
                  </td>
                  <td className="hidden px-4 py-3 xl:table-cell">
                    {subjectPreview.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {subjectPreview.map((subject) => (
                          <Link
                            key={subject.id}
                            href={`/predmety/${subject.slug}`}
                            className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            {subject.short_tag}
                          </Link>
                        ))}
                        {remainingSubjectCount > 0 ? (
                          <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
                            +{remainingSubjectCount}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
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
