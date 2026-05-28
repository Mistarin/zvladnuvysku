import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DifficultyBadge, StarRating } from "@/components/subject/difficulty-badge";
import { RatingForm } from "@/components/subject/rating-form";
import { RatingStats } from "@/components/subject/rating-stats";
import { MaterialUploadForm } from "@/components/subject/material-upload-form";
import type { Subject, SubjectRatingStats } from "@/lib/types/database";

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
  zimní: "❄️ Zimní semestr",
  letní: "☀️ Letní semestr",
  oba: "🔄 Oba semestry",
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
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const { data: stData } = await supabase
    .from("subject_teachers")
    .select("teachers(id, slug, name, faculty)")
    .eq("subject_id", subject.id);
    
  const teachers = ((stData as any[])?.map(st => st.teachers).flat().filter(Boolean) as { id: string, slug: string, name: string, faculty: string }[]) || [];

  // Fetch study materials for this subject
  const { data: materialsData, error: materialsError } = await supabase
    .from("subject_materials")
    .select("id, title, file_path, size_bytes, created_at")
    .eq("subject_id", subject.id)
    .order("created_at", { ascending: false });
    
  if (materialsError) {
    console.error("Error fetching materials:", materialsError);
  }
  const materials = materialsData || [];

  // Count available flashcard decks for this subject
  const { count: deckCount } = await supabase
    .from('flashcard_decks')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', subject.id)
    .eq('is_public', true);

  const { data: ratingStatsData } = await supabase
    .from("subject_rating_stats")
    .select("*")
    .eq("subject_id", subject.id)
    .single();

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

      {/* Header */}
      <div className="space-y-4 mb-8">
        <div className="flex flex-wrap items-start gap-3">
          <span className="font-mono text-sm font-bold text-primary/80 bg-primary/10 px-2 py-1 rounded-lg">
            {subject.short_tag}
          </span>
          {subject.difficulty && (
            <DifficultyBadge
              difficulty={subject.difficulty}
              size="lg"
              showLabel
            />
          )}
          {subject.credits && (
            <span className="text-sm px-2 py-1 rounded-lg bg-muted text-muted-foreground">
              {subject.credits} kreditů
            </span>
          )}
          {subject.semester && (
            <span className="text-sm px-2 py-1 rounded-lg bg-muted text-muted-foreground">
              {SEMESTER_LABELS[subject.semester] || subject.semester}
            </span>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          {subject.name}
        </h1>

        {(subject.faculty || subject.department) && (
          <p className="text-muted-foreground">
            {[subject.faculty, subject.department].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {subject.difficulty && (
          <StatCard
            label="Obtížnost"
            value={`${subject.difficulty}/5`}
            icon="🧠"
            sub={
              <div className="mt-1">
                <StarRating value={subject.difficulty} />
              </div>
            }
          />
        )}
        {subject.time_intensity && (
          <StatCard
            label="Časová náročnost"
            value={`${subject.time_intensity}/5`}
            icon="⏰"
            sub={
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-3 rounded-sm ${
                      i < subject.time_intensity! ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            }
          />
        )}
        {(() => {
          const type = subject.attendance_type;
          if (!type) return null;
          let text = type;
          let icon = "📋";
          let color = "text-muted-foreground";

          if (type === "volná") { text = "Volná"; icon = "🟢"; color = "text-emerald-500"; }
          else if (type === "povinná") { text = "Povinná (vše)"; icon = "🔴"; color = "text-red-500"; }
          else if (type === "povinné přednášky") { text = "Přednášky"; icon = "🟠"; color = "text-orange-500"; }
          else if (type === "povinná cvičení") { text = "Cvičení"; icon = "🟡"; color = "text-yellow-500"; }

          return (
            <StatCard
              label="Docházka"
              value={text}
              icon={icon}
              valueClass={color}
            />
          );
        })()}
        {subject.year && (
          <StatCard
            label="Doporučený ročník"
            value={`${subject.year}. ročník`}
            icon="📅"
          />
        )}
      </div>

      {/* Content sections */}
      <div className="space-y-6">
        {subject.description && (
          <ContentSection title="O předmětu" icon="📖">
            <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {subject.description}
            </p>
          </ContentSection>
        )}

        {subject.target_audience && (
          <ContentSection title="Pro koho je předmět" icon="🎯">
            <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {subject.target_audience}
            </p>
          </ContentSection>
        )}

        {subject.real_requirements && (
          <ContentSection title="Reálné požadavky od studentů" icon="💬" accent>
            <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {subject.real_requirements}
            </p>
          </ContentSection>
        )}

        {/* Učitelé */}
        {teachers.length > 0 && (
          <ContentSection title="Vyučující" icon="👨‍🏫">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teachers.map((t) => (
                <Link
                  key={t.id}
                  href={`/ucitele/${t.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted hover:border-primary/50 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {t.name}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                      {t.faculty}
                    </div>
                  </div>
                  <div className="text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                    →
                  </div>
                </Link>
              ))}
            </div>
          </ContentSection>
        )}

        {/* Studijní materiály (PDF) */}
        <ContentSection title="Studijní materiály (PDF)" icon="📄">
          <div className="space-y-4">
            {materials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <div className="text-2xl opacity-80 group-hover:opacity-100 transition-opacity">
                        📑
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
                        </div>
                      </div>
                      <div className="text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all">
                        ↓
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

            <div className="pt-2 border-t border-border">
              <MaterialUploadForm subjectId={subject.id} />
            </div>
          </div>
        </ContentSection>

        {/* Flashcardy */}
        <ContentSection title="Flashcardy" icon="🃏">
          {isLoggedIn ? (
            <div className="space-y-3">
              {deckCount !== null && deckCount !== undefined && deckCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  K dispozici je{' '}
                  <span className="font-semibold text-foreground">
                    {deckCount} {deckCount === 1 ? 'balíček' : deckCount >= 2 && deckCount <= 4 ? 'balíčky' : 'balíčků'}
                  </span>{' '}
                  s kartami pro procvičování.
                </p>
              )}
              {(deckCount === 0 || deckCount === null) && (
                <p className="text-sm text-muted-foreground">
                  Zatím žádné flashcardy. Buďte první kdo je vytvoří!
                </p>
              )}
              <div className="flex gap-3 flex-wrap">
                <Link
                  href={`/predmety/${slug}/flashcardy`}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
                >
                  🃏 Zobrazit flashcardy →
                </Link>
                <Link
                  href={`/flashcardy/novy?subject=${slug}`}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium border border-border bg-card hover:bg-muted transition-all"
                >
                  + Vytvořit balíček
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                {deckCount !== null && deckCount !== undefined && deckCount > 0
                  ? `K dispozici je ${deckCount} ${deckCount === 1 ? 'balíček' : deckCount >= 2 && deckCount <= 4 ? 'balíčky' : 'balíčků'} s kartami — přihlaste se pro procvičování.`
                  : 'Přihlaste se pro přístup k flashkartám nebo jejich vytváření.'}
              </p>
              <div className="flex gap-3 flex-wrap">
                {deckCount !== null && deckCount !== undefined && deckCount > 0 && (
                  <Link
                    href={`/predmety/${slug}/flashcardy`}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium border border-border bg-card hover:bg-muted transition-all"
                  >
                    🃏 Procházet flashcardy
                  </Link>
                )}
                <Link
                  href="/prihlaseni"
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
                >
                  Přihlásit se →
                </Link>
              </div>
            </div>
          )}
        </ContentSection>

        {/* Hodnocení */}
        <ContentSection title="Hodnocení" icon="⭐">
          <div className="space-y-6">
            <RatingStats stats={ratingStats} totalRatings={totalRatings} />
            <RatingForm subjectId={subject.id} isLoggedIn={isLoggedIn} />
          </div>
        </ContentSection>
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

// Helper komponenty (Single Responsibility)
function StatCard({
  label,
  value,
  icon,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  icon: string;
  sub?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="glass-card p-4 space-y-1">
      <div className="text-xl">{icon}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold ${valueClass || "text-foreground"}`}>
        {value}
      </div>
      {sub}
    </div>
  );
}

function ContentSection({
  title,
  icon,
  children,
  accent = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        accent
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card"
      }`}
    >
      <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <span>{icon}</span>
        <span>{title}</span>
      </h2>
      {children}
    </div>
  );
}
