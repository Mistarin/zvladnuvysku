import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TeacherRatingForm } from "@/components/teacher/teacher-rating-form";
import { TeacherReviews } from "@/components/teacher/teacher-reviews";

const FACULTY_COLORS: Record<string, string> = {
  FSS: "#FBB900",
  FU: "#D2091D",
  FF: "#74348B",
  LF: "#007CBB",
  PdF: "#EE7202",
  PřF: "#7A9B21",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeacherDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch teacher
  const { data: teacher, error: teacherError } = await supabase
    .from("teachers")
    .select("*")
    .eq("slug", slug)
    .single();

  if (teacherError || !teacher) {
    notFound();
  }

  const t = teacher as any;

  // Fetch subjects taught by teacher
  const { data: stData } = await supabase
    .from("subject_teachers")
    .select("subjects(slug, name, short_tag)")
    .eq("teacher_id", t.id);

  // Parse subjects safely since it's nested
  const subjects = (stData as any[])?.map(st => st.subjects).filter(Boolean) as { slug: string, name: string, short_tag: string }[] || [];

  // Fetch ratings
  const { data: ratingsData } = await supabase
    .from("teacher_ratings")
    .select("rating");
    
  // Fetch all ratings for avg
  const { data: teacherRatings } = await supabase
    .from("teacher_ratings")
    .select("rating, review, created_at, comment_is_approved")
    .eq("teacher_id", t.id)
    .order("created_at", { ascending: false });

  const avgRating = teacherRatings?.length 
    ? ((teacherRatings as any[]).reduce((acc, r) => acc + (r.rating || 0), 0) / teacherRatings.length).toFixed(1)
    : "—";

  const ratingsWithComments = ((teacherRatings as any[]) || []).filter(r => r.review && r.comment_is_approved);

  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const facColor = FACULTY_COLORS[t.faculty] || "var(--foreground)";

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
      <div className="glass-card p-8 mb-8 border-t-4" style={{ borderTopColor: facColor }}>
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
              {t.department && (
                <span className="text-sm text-muted-foreground">{t.department}</span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1">
              {t.name}
            </h1>
          </div>
          <div className="text-center bg-card border border-border rounded-2xl p-4 min-w-[120px]">
            <div className="text-sm text-muted-foreground font-medium mb-1">Průměrné hodnocení</div>
            <div className="text-3xl font-bold text-primary flex items-center justify-center gap-1">
              {avgRating} <span className="text-xl">⭐</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {teacherRatings?.length || 0} hodnocení
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column (Subjects & Info) */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg border-b border-border pb-3 mb-4 flex items-center gap-2">
              <span>📚</span> Vyučované předměty
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
          <div className="glass-card p-6">
            <h3 className="font-semibold text-xl mb-4">Ohodnoťte vyučujícího</h3>
            <TeacherRatingForm teacherId={t.id} isLoggedIn={isLoggedIn} />
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
