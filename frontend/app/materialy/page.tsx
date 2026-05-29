import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchLandingBar } from "@/components/search/search-landing-bar";
import { ReportIssueDialog } from "@/components/feedback/report-issue-dialog";
import { FileText, ExternalLink } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { getStoragePublicUrl } from "@/lib/storage";

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
        <SearchLandingBar
          basePath="/materialy"
          placeholder="Hledat materiál nebo předmět..."
          emptyHint="Napiš název materiálu a stiskni Enter."
        />
      </div>

      <Suspense key={query} fallback={<MaterialListSkeleton />}>
        <MaterialListSection query={query} />
      </Suspense>
    </div>
  );
}

async function MaterialListSection({ query }: { query: string }) {
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

  if (materials.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center space-y-3">
        <p className="text-4xl">📄</p>
        <p className="text-lg font-semibold text-foreground">Žádné materiály</p>
        <p className="text-sm text-muted-foreground">
          {query ? "Pro zadaný dotaz jsme nic nenašli." : "Zatím tu nejsou žádné schválené materiály."}
        </p>
        {query && (
          <Link href="/materialy" className="text-sm text-sky-700 hover:underline">
            Zobrazit všechny materiály
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {materials.map((material) => (
        <div
          key={material.id}
          className="glass-card rounded-xl p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-sky-700 shrink-0" />
              <h2 className="truncate font-semibold text-foreground">{material.title}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {material.subject && (
                <>
                  <Link
                    href={`/predmety/${material.subject.slug}`}
                    className="transition-colors hover:text-foreground"
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
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                Detail předmětu
              </Link>
            )}
            <a
              href={getStoragePublicUrl("study_materials", material.file_path) ?? ""}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
            >
              Otevřít PDF
              <ExternalLink className="w-4 h-4" />
            </a>
            <ReportIssueDialog
              sourceType="material"
              sourceId={material.id}
              sourceLabel={`Materiál ${material.title}`}
              compact
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MaterialListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="glass-card rounded-xl p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-28 animate-pulse rounded-lg bg-muted" />
              <div className="h-10 w-28 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
