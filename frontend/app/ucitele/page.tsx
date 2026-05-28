import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TeacherProposalDialog } from "@/components/teacher/teacher-proposal-dialog";

export const metadata: Metadata = {
  title: "Vyučující | ZvládnuVýšku",
  description: "Seznam vyučujících na Ostravské univerzitě a jejich hodnocení.",
};

const FACULTY_COLORS: Record<string, string> = {
  FSS: "#FBB900",
  FU: "#D2091D",
  FF: "#74348B",
  LF: "#007CBB",
  PdF: "#EE7202",
  PřF: "#7A9B21",
};

export default async function TeachersPage() {
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

  // Group teachers by faculty
  const groupedTeachers = ((teachers as any[]) || []).reduce((acc, t) => {
    if (!acc[t.faculty]) acc[t.faculty] = [];
    acc[t.faculty].push(t);
    return acc;
  }, {} as Record<string, any[]>);

  const faculties = Object.keys(groupedTeachers).sort();

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
          trigger={
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity">
              + Přidat vyučujícího
            </button>
          }
        />
      </div>

      {faculties.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground glass-card">
          Zatím zde nejsou žádní vyučující.
        </div>
      ) : (
        <div className="space-y-12">
          {faculties.map((faculty) => (
            <div key={faculty} className="space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: FACULTY_COLORS[faculty] || "#ccc" }} 
                />
                <h2 className="text-2xl font-semibold text-foreground">
                  {faculty}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedTeachers[faculty].map((teacher: any) => (
                  <Link
                    key={teacher.id}
                    href={`/ucitele/${teacher.slug}`}
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
                            backgroundColor: FACULTY_COLORS[faculty] ? `${FACULTY_COLORS[faculty]}20` : "var(--muted)",
                            color: FACULTY_COLORS[faculty] || "var(--foreground)",
                            border: `1px solid ${FACULTY_COLORS[faculty]}40`
                          }}
                        >
                          {faculty}
                        </span>
                        {teacher.department && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {teacher.department}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
