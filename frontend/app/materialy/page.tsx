import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SearchLandingBar } from "@/components/search/search-landing-bar";
import { ReportIssueDialog } from "@/components/feedback/report-issue-dialog";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { FileText, ExternalLink, FolderOpen } from "lucide-react";
import { formatFileSize } from "@/lib/utils";
import { getStoragePublicUrl } from "@/lib/storage";
import { MaterialGroupCard } from "@/components/subject/material-group-card";
import { getPublicMaterialDirectory, type PublicStandaloneMaterial } from "@/lib/material-directory";
import { getSharePath } from "@/lib/share-links";

interface PageProps {
  searchParams: Promise<{ q?: string; view?: string; group?: string; skupina?: string }>;
}

export const metadata: Metadata = {
  title: "Studijní materiály",
  description: "Schválené studijní materiály a skupiny materiálů napříč předměty.",
};

export default async function MaterialListPage({ searchParams }: PageProps) {
  const { q, view, group, skupina } = await searchParams;
  const query = q?.trim() ?? "";
  const showGroups = view === "groups" || !view;
  const focusedGroupId = group ?? skupina ?? undefined;

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
                ? <>Výsledky pro &bdquo;<span className="text-foreground font-medium">{query}</span>&ldquo;</>
                : "Schválené materiály a přehledné skupiny napříč předměty."}
            </p>
          </div>
        </div>

        <SearchLandingBar
          basePath="/materialy"
          placeholder="Hledat materiál, skupinu nebo předmět..."
          emptyHint="Zadej název materiálu, skupiny nebo zkratku předmětu a potvrď Enterem."
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
            Jak fungují body? →
          </Link>
        </div>
      </div>

      <Suspense key={`${query}-${view}`} fallback={<MaterialListSkeleton />}>
        {view === "files" ? (
          <MaterialFilesSection query={query} />
        ) : (
          <MaterialGroupsSection query={query} focusedGroupId={focusedGroupId} />
        )}
      </Suspense>
    </div>
  );
}

// ── Groups section ────────────────────────────────────────────────────────────

async function MaterialGroupsSection({ query, focusedGroupId }: { query: string; focusedGroupId?: string }) {
  const { groups, standaloneMaterials: ungroupedMaterials } = await getPublicMaterialDirectory(query, focusedGroupId);

  if (groups.length === 0 && ungroupedMaterials.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center space-y-3">
        <p className="text-4xl">📄</p>
        <p className="text-lg font-semibold text-foreground">Žádné materiály</p>
        <p className="text-sm text-muted-foreground">
          {query ? "Pro tenhle dotaz jsme nic nenašli." : "Zatím tu nejsou žádné schválené materiály."}
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
          {groups.map((group) => (
            <MaterialGroupCard
              key={group.id}
              group={group}
              showSubject
              compact
              defaultExpanded={focusedGroupId === group.id}
            />
          ))}
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
  const { groups, standaloneMaterials } = await getPublicMaterialDirectory(query);
  const materials = [
    ...groups.flatMap((group) => group.materials.map((material) => ({
      id: material.id,
      title: material.title,
      share_slug: material.share_slug,
      file_path: material.file_path,
      size_bytes: material.size_bytes,
      page_count: material.page_count,
      group_id: group.id,
      created_at: material.created_at,
      subject: group.subject,
    }))),
    ...standaloneMaterials,
  ];

  if (materials.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center space-y-3">
        <p className="text-4xl">📄</p>
        <p className="text-lg font-semibold text-foreground">Žádné materiály</p>
        <p className="text-sm text-muted-foreground">
          {query ? "Pro tenhle dotaz jsme nic nenašli." : "Zatím tu nejsou žádné schválené materiály."}
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

function SingleMaterialRow({ material }: { material: PublicStandaloneMaterial | {
  id: string;
  title: string;
  share_slug: string;
  file_path: string;
  size_bytes: number;
  page_count: number | null;
  group_id: string | null;
  created_at: string;
  subject: { name: string; slug: string; short_tag: string } | null;
} }) {
  return (
    <div className="glass-card rounded-lg p-3 sm:p-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex items-start gap-2 min-w-0">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
            <FileText className="w-3.5 h-3.5 text-sky-700" />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:line-clamp-1">
              {material.title}
            </p>
            {material.subject && (
              <Link
                href={`/predmety/${material.subject.slug}`}
                className="mt-0.5 block text-xs font-medium text-sky-700 transition-colors hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
              >
                {material.subject.short_tag} · {material.subject.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
          <span>{formatFileSize(material.size_bytes)}</span>
          {material.page_count != null && <><span>•</span><span>{material.page_count} stran</span></>}
          <span>•</span>
          <span>{new Date(material.created_at).toLocaleDateString("cs-CZ")}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 sm:self-start">
        {material.subject && (
          <Link
            href={`/predmety/${material.subject.slug}`}
            className="rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium transition-colors hover:bg-muted sm:text-sm"
          >
            Předmět
          </Link>
        )}
        <ShareLinkButton
          path={getSharePath("material", material.share_slug)}
          copiedLabel="Zkopírováno"
          className="px-2.5 py-2"
        />
        <a
          href={getStoragePublicUrl("study_materials", material.file_path) ?? ""}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-2 text-xs font-medium text-white transition-colors hover:bg-sky-700 sm:px-3 sm:text-sm"
        >
          PDF
          <ExternalLink className="w-3.5 h-3.5" />
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
