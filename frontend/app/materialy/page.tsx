import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchLandingBar } from "@/components/search/search-landing-bar";
import { ReportIssueDialog } from "@/components/feedback/report-issue-dialog";
import { FileText, ExternalLink, FolderOpen } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { getStoragePublicUrl } from "@/lib/storage";
import { MaterialGroupCard, type MaterialGroupData } from "@/components/subject/material-group-card";

interface PageProps {
  searchParams: Promise<{ q?: string; view?: string }>;
}

interface MaterialListItem {
  id: string;
  title: string;
  file_path: string;
  size_bytes: number;
  page_count: number | null;
  group_id: string | null;
  created_at: string;
  subject: { name: string; slug: string; short_tag: string } | null;
}

export const metadata: Metadata = {
  title: "Studijní materiály",
  description: "Schválené studijní materiály napříč předměty.",
};

export default async function MaterialListPage({ searchParams }: PageProps) {
  const { q, view } = await searchParams;
  const query = q?.trim() ?? "";
  const showGroups = view === "groups" || !view;

  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">Domů</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Materiály</span>
      </nav>

      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Studijní materiály</h1>
            <p className="text-muted-foreground">
              {query
                ? <>Výsledky pro „<span className="text-foreground font-medium">{query}</span>"</>
                : "Schválené PDF materiály dostupné napříč předměty."}
            </p>
          </div>
        </div>

        <SearchLandingBar
          basePath="/materialy"
          placeholder="Hledat materiál, skupinu nebo předmět..."
          emptyHint="Napiš název materiálu nebo zkratku předmětu a stiskni Enter."
        />

        {/* View toggle */}
        <div className="flex gap-2">
          <Link
            href={query ? `/materialy?q=${encodeURIComponent(query)}` : "/materialy"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
              showGroups
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Skupiny
          </Link>
          <Link
            href={query ? `/materialy?view=files&q=${encodeURIComponent(query)}` : "/materialy?view=files"}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
              view === "files"
                ? "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-400"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Jednotlivé soubory
          </Link>
          <Link
            href="/jak-to-funguje"
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors self-center"
          >
            Jak funguje bodový systém? →
          </Link>
        </div>
      </div>

      <Suspense key={`${query}-${view}`} fallback={<MaterialListSkeleton />}>
        {view === "files" ? (
          <MaterialFilesSection query={query} />
        ) : (
          <MaterialGroupsSection query={query} />
        )}
      </Suspense>
    </div>
  );
}

// ── Groups section ────────────────────────────────────────────────────────────

async function MaterialGroupsSection({ query }: { query: string }) {
  const supabase = await createClient();

  // Load groups with their materials and subject info
  let groupsQuery = supabase
    .from("material_groups" as never)
    .select("id, title, uploader_id, created_at, subject:subject_id(name, slug, short_tag), materials:subject_materials(id, title, file_path, size_bytes, page_count, moderation_status)")
    .order("created_at", { ascending: false })
    .limit(40) as unknown as Promise<{ data: RawGroup[] | null; error: unknown }>;

  const { data: rawGroups } = await groupsQuery;
  let groups = (rawGroups ?? []) as RawGroup[];

  // Filter by query (group title or subject name)
  if (query) {
    const q = query.toLowerCase();
    groups = groups.filter(g =>
      g.title.toLowerCase().includes(q) ||
      (g.subject?.name ?? "").toLowerCase().includes(q) ||
      (g.subject?.short_tag ?? "").toLowerCase().includes(q)
    );
  }

  // Load uploader display names
  const uploaderIds = [...new Set(groups.map(g => g.uploader_id))];
  const uploaderMap: Record<string, string | null> = {};
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", uploaderIds);
    for (const p of (profiles ?? []) as { user_id: string; display_name: string | null }[]) {
      uploaderMap[p.user_id] = p.display_name;
    }
  }

  // Also load individual materials not in any group
  const ungroupedQuery = supabase
    .from("subject_materials")
    .select("id, title, file_path, size_bytes, page_count, group_id, created_at, subject:subject_id(name, slug, short_tag)")
    .eq("moderation_status", "approved")
    .is("group_id", null)
    .order("created_at", { ascending: false })
    .limit(30);

  const ungroupedFiltered = query
    ? ungroupedQuery.or(`title.ilike.%${query}%`)
    : ungroupedQuery;

  const { data: ungroupedData } = await ungroupedFiltered;
  const ungroupedMaterials = (ungroupedData ?? []) as MaterialListItem[];

  if (groups.length === 0 && ungroupedMaterials.length === 0) {
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
    <div className="space-y-8">
      {/* Groups */}
      {groups.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FolderOpen className="w-4 h-4 text-amber-500" />
            Skupiny materiálů
            <span className="text-xs font-normal normal-case">({groups.length})</span>
          </h2>
          {groups.map(group => {
            const groupData: MaterialGroupData = {
              id: group.id,
              title: group.title,
              created_at: group.created_at,
              uploader_id: group.uploader_id,
              uploader_display_name: uploaderMap[group.uploader_id] ?? null,
              subject: group.subject ?? null,
              materials: (group.materials ?? []).map(m => ({
                ...m,
                public_url: getStoragePublicUrl("study_materials", m.file_path) ?? "",
              })),
            };
            return <MaterialGroupCard key={group.id} group={groupData} showSubject />;
          })}
        </section>
      )}

      {/* Ungrouped individual files */}
      {ungroupedMaterials.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="w-4 h-4 text-sky-600" />
            Jednotlivé soubory
            <span className="text-xs font-normal normal-case">({ungroupedMaterials.length})</span>
          </h2>
          <div className="space-y-2">
            {ungroupedMaterials.map(material => (
              <SingleMaterialRow key={material.id} material={material} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Individual files section ──────────────────────────────────────────────────

async function MaterialFilesSection({ query }: { query: string }) {
  const supabase = await createClient();
  let materialsQuery = supabase
    .from("subject_materials")
    .select("id, title, file_path, size_bytes, page_count, group_id, created_at, subject:subject_id(name, slug, short_tag)")
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(60);

  if (query) {
    // Search by material title OR subject short_tag match via join
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
          <Link href="/materialy?view=files" className="text-sm text-sky-700 hover:underline">
            Zobrazit všechny materiály
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {materials.map((material) => (
        <SingleMaterialRow key={material.id} material={material} />
      ))}
    </div>
  );
}

// ── Shared single material row ────────────────────────────────────────────────

function SingleMaterialRow({ material }: { material: MaterialListItem }) {
  return (
    <div className="glass-card rounded-xl p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          {material.page_count != null && <><span>•</span><span>{material.page_count} stran</span></>}
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
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawGroup {
  id: string;
  title: string;
  uploader_id: string;
  created_at: string;
  subject: { name: string; slug: string; short_tag: string } | null;
  materials: {
    id: string;
    title: string;
    file_path: string;
    size_bytes: number;
    page_count: number | null;
    moderation_status: "pending" | "approved" | "rejected";
  }[];
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

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
