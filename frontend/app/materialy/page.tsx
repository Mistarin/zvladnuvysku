import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileText, ExternalLink } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

interface MaterialListItem {
  id: string;
  title: string;
  file_path: string;
  size_bytes: number;
  created_at: string;
  subject: { name: string; slug: string; short_tag: string } | null;
}

export const metadata: Metadata = {
  title: "Studijní materiály",
  description: "Schválené studijní materiály napříč předměty.",
};

export default async function MaterialListPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const supabase = await createClient();

  let materialsQuery = supabase
    .from("subject_materials")
    .select("id, title, file_path, size_bytes, created_at, subject:subject_id(name, slug, short_tag)")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(60);

  if (query) {
    materialsQuery = materialsQuery.ilike("title", `%${query}%`);
  }

  const { data } = await materialsQuery;
  const materials = (data ?? []) as MaterialListItem[];

  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Domů</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Materiály</span>
      </nav>

      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Studijní materiály</h1>
            <p className="text-muted-foreground">
              {query
                ? <>Výsledky pro „<span className="text-foreground font-medium">{query}</span>“</>
                : "Schválené PDF materiály dostupné napříč předměty."}
            </p>
          </div>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center space-y-3">
          <p className="text-4xl">📄</p>
          <p className="text-lg font-semibold text-foreground">Žádné materiály</p>
          <p className="text-sm text-muted-foreground">
            {query ? "Pro zadaný dotaz jsme nic nenašli." : "Zatím tu nejsou žádné schválené materiály."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((material) => {
            const { data: publicUrlData } = supabase.storage.from("study_materials").getPublicUrl(material.file_path);

            return (
              <div
                key={material.id}
                className="glass-card rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-sky-700 shrink-0" />
                    <h2 className="font-semibold text-foreground truncate">{material.title}</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {material.subject && (
                      <>
                        <Link
                          href={`/predmety/${material.subject.slug}`}
                          className="hover:text-foreground transition-colors"
                        >
                          {material.subject.short_tag} · {material.subject.name}
                        </Link>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatFileSize(material.size_bytes)}</span>
                    <span>•</span>
                    <span>{new Date(material.created_at).toLocaleDateString("cs-CZ")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {material.subject && (
                    <Link
                      href={`/predmety/${material.subject.slug}`}
                      className="px-3 py-2 rounded-lg text-sm border border-border bg-card hover:bg-muted transition-colors"
                    >
                      Detail předmětu
                    </Link>
                  )}
                  <a
                    href={publicUrlData.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-sky-600 text-white hover:bg-sky-700 transition-colors inline-flex items-center gap-2"
                  >
                    Otevřít PDF
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
