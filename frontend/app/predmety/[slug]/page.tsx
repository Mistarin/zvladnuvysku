import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DifficultyBadge, StarRating } from "@/components/subject/difficulty-badge";
import type { Subject } from "@/lib/types/database";

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
        <StatCard
          label="Docházka"
          value={subject.attendance_required ? "Povinná" : "Volitelná"}
          icon={subject.attendance_required ? "📋" : "✅"}
          valueClass={
            subject.attendance_required ? "text-orange-500" : "text-emerald-500"
          }
        />
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

        {/* Flashcardy — vyžadují login */}
        <ContentSection title="Flashcardy" icon="🃏">
          <div className="text-center py-4 space-y-3">
            <p className="text-muted-foreground text-sm">
              Flashcardy pro tento předmět jsou dostupné po přihlášení.
            </p>
            <Link
              href="/prihlaseni"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium accent-gradient text-white hover:opacity-90 transition-all"
            >
              Přihlásit se →
            </Link>
          </div>
        </ContentSection>

        {/* Hodnocení — fáze 2+ */}
        <ContentSection title="Hodnocení" icon="⭐">
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm">
              Hodnocení bude dostupné v příští verzi. Chceš přispět?{" "}
              <Link href="/prihlaseni" className="text-primary hover:underline">
                Přihlas se
              </Link>
              .
            </p>
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
