import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { normalizeDepartmentName } from "@/lib/department-name";
import { createClient } from "@/lib/supabase/server";
import { TeacherProposalDialog } from "@/components/teacher/teacher-proposal-dialog";
import { FACULTIES, getFacultyColor } from "@/lib/faculties";
import { getPublicProfileIdentity, hasPublicProfileIdentity } from "@/lib/public-profile-identity";
import { getTeacherPath } from "@/lib/teacher-slug";
import type { Teacher } from "@/lib/types/database";

export const metadata: Metadata = {
  title: "Vyučující | ZvládnuVýšku",
  description: "Seznam vyučujících na Ostravské univerzitě a jejich hodnocení.",
};

export default async function TeachersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("display_name, faculty")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data ?? null
    : null;
  const hasPublicIdentity = hasPublicProfileIdentity(profile);
  const publicIdentity = getPublicProfileIdentity(profile);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Vyučující
          </h1>
          <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
            Prohlížej si profily vyučujících, hodnoť jejich přístup a objev, jaké předměty učí.
          </p>
        </div>
        <TeacherProposalDialog 
          hasPublicProfileIdentity={hasPublicIdentity}
          initialDisplayName={publicIdentity.displayName}
          initialFaculty={publicIdentity.faculty}
          trigger={
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
              + Přidat vyučujícího
            </button>
          }
        />
      </div>
      <Suspense fallback={<TeachersListSkeleton />}>
        <TeachersListSection />
      </Suspense>
    </div>
  );
}

async function TeachersListSection() {
  const supabase = await createClient();

  const { data: teachers, error } = await supabase
    .from("teachers")
    .select("id, slug, name, faculty, department")
    .eq("is_approved", true)
    .order("faculty", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching teachers:", error);
    return (
      <div className="container mx-auto px-4 py-12 text-center text-destructive">
        Nepodařilo se načíst seznam vyučujících.
      </div>
    );
  }

  const groupedTeachers = ((teachers ?? []) as Teacher[]).reduce<Record<string, Teacher[]>>((acc, t) => {
    if (!acc[t.faculty]) acc[t.faculty] = [];
    acc[t.faculty].push(t);
    return acc;
  }, {});

  const faculties = FACULTIES.map((faculty) => faculty.value).filter((faculty) => groupedTeachers[faculty]?.length);

  if (faculties.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground glass-card">
        Zatím zde nejsou žádní vyučující.
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {faculties.map((faculty) => {
        const facultyColor = getFacultyColor(faculty) ?? "#ccc";
        const teachersForFaculty = groupedTeachers[faculty] ?? [];

        return (
          <div key={faculty} className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: facultyColor }}
            />
            <h2 className="text-2xl font-semibold text-foreground">
              {faculty}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachersForFaculty.map((teacher) => {
              const badgeColor = getFacultyColor(faculty) ?? "var(--foreground)";

              return (
                <Link
                  key={teacher.id}
                  href={getTeacherPath(teacher.slug)}
                  className="glass-card p-5 group hover:border-primary/50 transition-all hover:-translate-y-1 block"
                >
                  <div className="flex flex-col gap-2">
                    <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                      {teacher.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-md shadow-sm"
                        style={{
                          backgroundColor: `${badgeColor}20`,
                          color: badgeColor,
                          border: `1px solid ${badgeColor}40`,
                        }}
                      >
                        {faculty}
                      </span>
                      {normalizeDepartmentName(teacher.department) && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {normalizeDepartmentName(teacher.department)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          </div>
        );
      })}
    </div>
  );
}

function TeachersListSkeleton() {
  return (
    <div className="space-y-12">
      {Array.from({ length: 2 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-2">
            <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((__, index) => (
              <div key={index} className="glass-card p-5">
                <div className="space-y-3">
                  <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
