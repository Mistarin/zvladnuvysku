import { notFound } from "next/navigation";
import Link from "next/link";
import { normalizeDepartmentName } from "@/lib/department-name";
import { createClient } from "@/lib/supabase/server";
import { TeacherRatingForm } from "@/components/teacher/teacher-rating-form";
import { TeacherReviews } from "@/components/teacher/teacher-reviews";
import { getFacultyColor } from "@/lib/faculties";
import { getPublicProfileIdentity } from "@/lib/public-profile-identity";
import { hasAcceptedCurrentLegalVersion, hasCompletedPublicProfileSetup } from "@/lib/legal-consent";
import { generateTeacherSlug } from "@/lib/teacher-slug";
import type { Database } from "@/lib/types/database";

interface PageProps {
  params: Promise<{ slug: string }>;
}

type TeacherRow = Database["public"]["Tables"]["teachers"]["Row"];
type TeacherSubject = Pick<Database["public"]["Tables"]["subjects"]["Row"], "slug" | "name" | "short_tag">;
type TeacherSubjectJoinRow = {
  subjects: TeacherSubject | TeacherSubject[] | null;
};

type ViewerProfile = {
  display_name?: string | null;
  faculty?: string | null;
  secondary_faculty?: string | null;
  legal_accepted_at?: string | null;
  legal_accepted_version?: string | null;
} | null;

function decodeRouteSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function TeacherDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const routeSlug = decodeRouteSlug(slug).trim();
  const canonicalRouteSlug = generateTeacherSlug(routeSlug);

  const { data: exactTeacher, error: teacherError } = await supabase
    .from("teachers")
    .select("*")
    .eq("slug", routeSlug)
    .maybeSingle();

  let teacher = exactTeacher as TeacherRow | null;

  if (!teacher) {
    const { data: fallbackTeachers, error: fallbackError } = await supabase
      .from("teachers")
      .select("*")
      .eq("is_approved", true);

    if (fallbackError) {
      console.error("[teacher-detail] Fallback slug lookup failed:", fallbackError.message);
    } else {
      teacher = ((fallbackTeachers ?? []) as TeacherRow[]).find(
        (candidate) => generateTeacherSlug(candidate.slug) === canonicalRouteSlug,
      ) ?? null;
    }
  }

  if ((teacherError && !teacher) || !teacher) {
    notFound();
  }

  const t = teacher;

  // Fetch subjects taught by teacher
  const { data: stData } = await supabase
    .from("subject_teachers")
    .select("subjects:subjects!subject_teachers_subject_id_fkey(slug, name, short_tag)")
    .eq("teacher_id", t.id);

  // Parse subjects safely since it's nested
  const subjectRows = (stData ?? []) as TeacherSubjectJoinRow[];
  const subjects = subjectRows.flatMap((row) => {
    if (!row.subjects) return [];
    return Array.isArray(row.subjects) ? row.subjects : [row.subjects];
  });

  const { data: teacherRatingStats } = await supabase
    .from("teacher_rating_stats")
    .select("avg_rating, total_ratings")
    .eq("teacher_id", t.id)
    .maybeSingle();

  const ratingStats = teacherRatingStats as Database["public"]["Tables"]["teacher_rating_stats"]["Row"] | null;
  const avgRating =
    ratingStats?.total_ratings && ratingStats.avg_rating != null
      ? ratingStats.avg_rating.toFixed(1)
      : "…";

  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;
  const profile: ViewerProfile = user
    ? (
        await supabase
          .from("profiles")
          .select("display_name, faculty, secondary_faculty, legal_accepted_at, legal_accepted_version")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data as ViewerProfile
    : null;
  const hasPublicIdentity = hasCompletedPublicProfileSetup(profile);
  const hasAcceptedLegal = hasAcceptedCurrentLegalVersion(profile);
  const publicIdentity = getPublicProfileIdentity(profile);

  const facColor = getFacultyColor(t.faculty) || "var(--foreground)";

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Domů</Link>
        <span>/</span>
        <Link href="/ucitele" className="hover:text-foreground transition-colors">Vyučující</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{t.name}</span>
      </nav>

      {/* Header */}
      <div className="surface-card p-8 mb-8 border-t-4" style={{ borderTopColor: facColor }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2.5 py-1 text-xs font-semibold rounded-md uppercase tracking-wider"
                style={{
                  backgroundColor: `${facColor}20`,
                  color: facColor,
                }}
              >
                {t.faculty}
              </span>
              {normalizeDepartmentName(t.department) && (
                <span className="text-sm text-muted-foreground">{normalizeDepartmentName(t.department)}</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
              {t.name}
            </h1>
          </div>
          <div className="text-center bg-card border border-border rounded-2xl p-4 min-w-[120px]">
            <div className="text-sm text-muted-foreground font-medium mb-1">Průměrné hodnocení</div>
            <div className="text-3xl font-bold text-primary flex items-center justify-center gap-1">
              {avgRating} <span className="text-xl"></span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {ratingStats?.total_ratings || 0} hodnocení
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column (Subjects & Info) */}
        <div className="md:col-span-1 space-y-6">
          <div className="surface-card p-6">
            <h3 className="font-semibold text-lg border-b border-border pb-3 mb-4 flex items-center gap-2">
              <span></span> Vyučované předměty
            </h3>
            {subjects.length > 0 ? (
              <ul className="space-y-3">
                {subjects.map(sub => (
                  <li key={sub.slug}>
                    <Link href={`/predmety/${sub.slug}`} className="group flex flex-col gap-0.5">
                      <span className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                        {sub.name}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {sub.short_tag}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Zatím nebyly přiřazeny žádné předměty.
              </p>
            )}
          </div>
        </div>

        {/* Right Column (Reviews) */}
        <div className="md:col-span-2 space-y-8">
          <div className="surface-card p-6">
            <h3 className="font-semibold text-xl mb-4">Ohodnoťte vyučujícího</h3>
            <TeacherRatingForm
              teacherId={t.id}
              isLoggedIn={isLoggedIn}
              hasPublicProfileIdentity={hasPublicIdentity}
              initialDisplayName={publicIdentity.displayName}
              initialFaculty={publicIdentity.faculty}
              initialLegalAcceptedAt={hasAcceptedLegal ? profile?.legal_accepted_at ?? null : null}
              initialLegalAcceptedVersion={profile?.legal_accepted_version ?? null}
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-xl">Recenze studentů</h3>
            <TeacherReviews teacherId={t.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
