import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DifficultyBadge, StarRating } from "@/components/subject/difficulty-badge";
import { RatingForm } from "@/components/subject/rating-form";
import { RatingStats } from "@/components/subject/rating-stats";
import { MaterialUploadForm } from "@/components/subject/material-upload-form";
import type { Subject, SubjectRatingStats } from "@/lib/types/database";
import { BookOpen, Target, MessageSquare, Star, Users, Layers, FileText, CheckCircle2, XCircle, Clock, Calendar, Diamond } from "lucide-react";
import { formatCredits } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("subjects")
    .select("name, description")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Předmět nenalezen" };

  const subject = data as Pick<Subject, "name" | "description">;
  return {
    title: subject.name,
    description: subject.description || `Detail předmětu ${subject.name} na Ostravské univerzitě.`,
  };
}

const SEMESTER_LABELS: Record<string, string> = {
  zimní: "Zimní semestr",
  letní: "Letní semestr",
  oba: "Oba semestry",
};

export default async function PredmetDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    notFound();
  }

  const subject = data as Subject;
  const [
    { data: { user } },
    { data: stData },
    { data: materialsData, error: materialsError },
    { data: rawRatings },
    { count: deckCount },
    { data: ratingStatsData }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("subject_teachers").select("teachers(id, slug, name, faculty, teacher_rating_stats(avg_rating, rating_count))").eq("subject_id", subject.id),
    supabase.from("subject_materials").select("id, title, file_path, size_bytes, created_at, is_approved").eq("subject_id", subject.id).order("created_at", { ascending: false }),
    supabase.from('subject_ratings').select('id, overall_rating, comment, created_at').eq('subject_id', subject.id).eq('comment_is_approved', true).not('comment', 'is', null).order('created_at', { ascending: false }),
    supabase.from('flashcard_decks').select('*', { count: 'exact', head: true }).eq('subject_id', subject.id).eq('is_public', true),
    supabase.from("subject_rating_stats").select("*").eq("subject_id", subject.id).single()
  ]);

  const isLoggedIn = !!user;

  const teachers = ((stData as any[])?.map(st => st.teachers).flat().filter(Boolean) as { id: string, slug: string, name: string, faculty: string }[]) || [];

  if (materialsError) {
    console.error("Error fetching materials:", materialsError);
  }
  let materials: any[] = materialsData || [];

  // Self-heal concurrently
  if (materials.length > 0) {
    const validIds = new Set<string>();
    await Promise.all(materials.map(async (m) => {
      const { data: publicUrlData } = supabase.storage.from('study_materials').getPublicUrl(m.file_path);
      try {
        const res = await fetch(publicUrlData.publicUrl, { method: 'HEAD', cache: 'no-store' });
        if (res.ok) {
          validIds.add(m.id);
        } else if (res.status === 400 || res.status === 404) {
          console.warn(`Material missing in storage: ${m.file_path}. Deleting DB row.`);
          await supabase.from('subject_materials').delete().eq('id', m.id);
        } else {
          validIds.add(m.id);
        }
      } catch (e) {
        validIds.add(m.id);
      }
    }));
    materials = materials.filter(m => validIds.has(m.id));
  }

  const ratingsWithComments = rawRatings || [];

  const ratingStats = ratingStatsData as SubjectRatingStats | null;
  const totalRatings = ratingStats?.total_ratings ?? 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" aria-label="Drobečková navigace">
        <Link href="/" className="hover:text-foreground transition-colors">
          Domů
        </Link>
        <span>/</span>
        <Link href="/predmety" className="hover:text-foreground transition-colors">
          Předměty
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{subject.name}</span>
      </nav>

      {/* Header and Inline Stats */}
      <div className="space-y-4 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          {subject.name}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-bold text-primary/80 bg-primary/10 px-2 py-1 rounded-lg">
            {subject.short_tag}
          </span>
          
          {(subject.faculty || subject.department) && (
            <span className="text-sm px-2 py-1 rounded-lg bg-muted/50 text-muted-foreground">
              {[subject.faculty, subject.department].filter(Boolean).join(" · ")}
            </span>
          )}

          {subject.credits && (
            <span className="text-sm px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5">
              <Diamond className="w-3.5 h-3.5" /> {formatCredits(subject.credits)}
            </span>
          )}

          {subject.difficulty && (
            <DifficultyBadge difficulty={subject.difficulty} size="lg" showLabel />
          )}

          {subject.time_intensity && (
            <span className="text-sm px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Náročnost: {subject.time_intensity}/5
            </span>
          )}

          {(() => {
            const type = subject.attendance_type;
            if (!type) return null;
            let text = type;
            let Icon = CheckCircle2;
            let bg = "bg-muted";
            let color = "text-muted-foreground";

            if (type === "volná") { text = "Volná"; Icon = CheckCircle2; bg = "bg-emerald-500/10"; color = "text-emerald-600 dark:text-emerald-400"; }
            else if (type === "povinná") { text = "Povinná"; Icon = XCircle; bg = "bg-red-500/10"; color = "text-red-600 dark:text-red-400"; }
            else if (type === "povinné přednášky") { text = "Přednášky"; Icon = Target; bg = "bg-orange-500/10"; color = "text-orange-600 dark:text-orange-400"; }
            else if (type === "povinná cvičení") { text = "Cvičení"; Icon = Target; bg = "bg-amber-500/10"; color = "text-amber-600 dark:text-amber-400"; }

            return (
              <span className={`text-sm font-medium px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${bg} ${color}`}>
                <Icon className="w-3.5 h-3.5" /> {text}
              </span>
            );
          })()}

          {subject.semester && (
            <span className="text-sm font-medium px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
              {SEMESTER_LABELS[subject.semester] || subject.semester}
            </span>
          )}

          {subject.year && (
            <span className="text-sm font-medium px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {subject.year}. ročník
            </span>
          )}

          {subject.exam_from_home && (
            <span className="text-sm font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border border-emerald-500/20">
              🏠 Z domova
            </span>
          )}
        </div>
      </div>

      {/* Grid Layout for Main Content vs Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* O předmětu */}
          {subject.description && (
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <BookOpen className="w-5 h-5 text-blue-500" /> O předmětu
              </h2>
              <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-sm">
                {subject.description}
              </p>
            </div>
          )}

          {subject.target_audience && (
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <Target className="w-5 h-5 text-emerald-500" /> Pro koho je předmět
              </h2>
              <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-sm">
                {subject.target_audience}
              </p>
            </div>
          )}

          {subject.real_requirements && (
            <div className="space-y-2 p-4 rounded-xl border border-primary/20 bg-primary/5 mt-4">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wide border-b border-primary/10 pb-2">
                <MessageSquare className="w-4 h-4" /> Reálné požadavky od studentů
              </h2>
              <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-sm">
                {subject.real_requirements}
              </p>
            </div>
          )}

          <hr className="border-border my-6" />

          {/* Hodnocení předmětu */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Star className="w-6 h-6 text-amber-500" /> Hodnocení předmětu
            </h2>
            <RatingStats stats={ratingStats} totalRatings={totalRatings} />
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
              <RatingForm subjectId={subject.id} isLoggedIn={isLoggedIn} />
            </div>
          </div>

          {/* Zkušenosti studentů */}
          {ratingsWithComments.length > 0 && (
            <div className="space-y-4 pt-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                <MessageSquare className="w-5 h-5 text-indigo-500" /> Zkušenosti studentů
              </h3>
              <div className="space-y-4">
                {ratingsWithComments.map((rating: any) => (
                  <div key={rating.id} className="glass-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm text-foreground">Anonymní student</div>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rating.created_at).toLocaleDateString('cs-CZ')}
                        </span>
                      </div>
                      {rating.overall_rating && (
                        <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                          {rating.overall_rating}/5 ★
                        </div>
                      )}
                    </div>
                    <p className="text-foreground/90 text-sm italic leading-relaxed">
                      "{rating.comment}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          {/* Učitelé */}
          {teachers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" /> Vyučující
              </h2>
              <div className="flex flex-col gap-3">
                {teachers.map((t: any) => {
                  const tStats = Array.isArray(t.teacher_rating_stats) ? t.teacher_rating_stats[0] : t.teacher_rating_stats;
                  const avgRating = tStats?.avg_rating;
                  const ratingCount = tStats?.rating_count || 0;
                  
                  return (
                    <div key={t.id} className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-2">
                      <Link
                        href={`/ucitele/${t.slug}`}
                        className="group flex flex-col"
                      >
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {t.name}
                        </span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            {t.faculty}
                          </span>
                          {avgRating ? (
                            <span className="flex items-center gap-1 text-sm font-bold text-amber-500">
                              {avgRating.toFixed(1)} ★
                              <span className="text-[10px] text-muted-foreground font-normal ml-0.5">({ratingCount})</span>
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Zatím nehodnoceno</span>
                          )}
                        </div>
                      </Link>
                      
                      <Link 
                        href={`/ucitele/${t.slug}#ohodnotit`}
                        className="text-xs text-primary/80 hover:text-primary transition-colors inline-block mt-1 font-medium"
                      >
                        Přidat hodnocení učitele →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kartičky */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-rose-500" /> Kartičky
            </h2>
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
              {isLoggedIn ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {deckCount ? `K dispozici: ${deckCount} balíčků` : 'Zatím žádné kartičky. Buďte první!'}
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/predmety/${slug}/flashcardy`}
                      className="text-center w-full py-2 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
                    >
                      Procházet kartičky
                    </Link>
                    <Link
                      href={`/flashcardy/novy?subject=${slug}`}
                      className="text-center w-full py-2 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                    >
                      + Vytvořit balíček
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Přihlaste se pro přístup k flashkartám.
                  </p>
                  <Link
                    href="/prihlaseni"
                    className="block text-center w-full py-2 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
                  >
                    Přihlásit se
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-border my-8" />

      {/* Materials (Full Width at bottom) */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border pb-3 mb-4">
          <FileText className="w-6 h-6 text-sky-500" /> Studijní materiály (PDF)
        </h2>
        
        {materials.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {materials.map((m: any) => {
              const { data: publicUrlData } = supabase.storage.from('study_materials').getPublicUrl(m.file_path);
              
              return (
                <a
                  key={m.id}
                  href={publicUrlData.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted hover:border-primary/50 transition-all group"
                >
                  <div className="flex-shrink-0">
                    <FileText className="w-8 h-8 text-sky-500/80 group-hover:text-sky-500 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {m.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                        PDF
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {(m.size_bytes / 1024 / 1024).toFixed(1)} MB
                      </span>
                      {!m.is_approved && (
                        <span className="text-[10px] uppercase font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded ml-auto">
                          Ke schválení
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Zatím nebyly nahrány žádné materiály.
          </p>
        )}

        <div className="pt-4 max-w-xl">
          <MaterialUploadForm subjectId={subject.id} />
        </div>
      </div>

      {/* Back link */}
      <div className="mt-8 pt-6 border-t border-border">
        <Link
          href="/predmety"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Zpět na předměty
        </Link>
      </div>
    </div>
  );
}

