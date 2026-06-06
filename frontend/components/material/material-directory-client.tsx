"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, FolderOpen } from "lucide-react";
import { ListPageHeader } from "@/components/layout/list-page-shell";
import { ReportIssueDialog } from "@/components/feedback/report-issue-dialog";
import { SearchBar } from "@/components/search/search-bar";
import { ShareLinkButton } from "@/components/share/share-link-button";
import { DifficultyBadge } from "@/components/subject/difficulty-badge";
import { MaterialGroupCard, type MaterialGroupData } from "@/components/subject/material-group-card";
import {
  filterMaterialDirectoryGroups,
  filterMaterialDirectoryStandaloneMaterials,
  type MaterialDirectorySubject,
} from "@/lib/material-directory-search";
import { getSharePath } from "@/lib/share-links";
import { formatFileSize } from "@/lib/utils";

type MaterialDirectoryView = "groups" | "files";

interface MaterialDirectoryStandaloneMaterial {
  id: string;
  title: string;
  share_slug: string;
  file_path: string;
  public_url: string;
  size_bytes: number;
  page_count: number | null;
  group_id: string | null;
  created_at: string;
  subject: MaterialDirectorySubject;
}

interface FlattenedMaterial extends MaterialDirectoryStandaloneMaterial {
  group_id: string | null;
}

interface MaterialDirectoryClientProps {
  groups: MaterialGroupData[];
  standaloneMaterials: MaterialDirectoryStandaloneMaterial[];
  initialQuery: string;
  initialView: MaterialDirectoryView;
  focusedGroupId?: string;
}

const materialSecondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:text-sm";

export function MaterialDirectoryClient({
  groups,
  standaloneMaterials,
  initialQuery,
  initialView,
  focusedGroupId,
}: MaterialDirectoryClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [view, setView] = useState<MaterialDirectoryView>(initialView);
  const [isFocused, setIsFocused] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const syncTimeoutRef = useRef<number | null>(null);

  const filteredGroups = filterMaterialDirectoryGroups(groups, deferredQuery, focusedGroupId);
  const filteredStandaloneMaterials = filterMaterialDirectoryStandaloneMaterials(standaloneMaterials, deferredQuery);
  const flattenedMaterials: FlattenedMaterial[] = [
    ...filteredGroups.flatMap((group) =>
      group.materials.map((material) => ({
        id: material.id,
        title: material.title,
        share_slug: material.share_slug,
        file_path: material.file_path,
        public_url: material.public_url,
        size_bytes: material.size_bytes,
        page_count: material.page_count,
        group_id: group.id,
        created_at: material.created_at,
        subject: group.subject,
      }))
    ),
    ...filteredStandaloneMaterials,
  ];

  useEffect(() => {
    if (syncTimeoutRef.current !== null) {
      window.clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const trimmedQuery = query.trim();

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      } else {
        params.delete("q");
      }

      if (view === "files") {
        params.set("view", "files");
      } else {
        params.delete("view");
      }

      const href = params.toString() ? `/materialy?${params.toString()}` : "/materialy";
      window.history.replaceState(null, "", href);
      syncTimeoutRef.current = null;
    }, 180);

    return () => {
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, [query, view]);

  return (
    <div className="mb-8 space-y-4">
      <ListPageHeader
        title="Studijní materiály"
        description={
          query.trim()
            ? <>Výsledky pro &bdquo;<span className="font-medium text-foreground">{query.trim()}</span>&ldquo;</>
            : "Schválené materiály a přehledné skupiny napříč předměty."
        }
        icon={<FileText className="h-5 w-5 text-primary" />}
        className="mb-0"
      />

      <div className="space-y-2">
        <div>
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            isFocused={isFocused}
            placeholder="Hledat materiál, skupinu nebo předmět..."
            size="default"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {query.trim() ? "Výsledky se filtrují okamžitě." : "Zadej název materiálu, skupiny nebo zkratku předmětu."}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView("groups")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            view === "groups"
              ? "border-border bg-muted text-foreground"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Skupiny
        </button>
        <button
          type="button"
          onClick={() => setView("files")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            view === "files"
              ? "border-border bg-muted text-foreground"
              : "border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Jednotlivé soubory
        </button>
        <Link
          href="/jak-to-funguje"
          className="ml-auto self-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Jak fungují body? →
        </Link>
      </div>

      {view === "files" ? (
        <MaterialFilesSection materials={flattenedMaterials} query={query} onClearQuery={() => setQuery("")} />
      ) : (
        <MaterialGroupsSection
          groups={filteredGroups}
          ungroupedMaterials={filteredStandaloneMaterials}
          query={query}
          focusedGroupId={focusedGroupId}
          onClearQuery={() => setQuery("")}
        />
      )}
    </div>
  );
}

function MaterialGroupsSection({
  groups,
  ungroupedMaterials,
  query,
  focusedGroupId,
  onClearQuery,
}: {
  groups: MaterialGroupData[];
  ungroupedMaterials: MaterialDirectoryStandaloneMaterial[];
  query: string;
  focusedGroupId?: string;
  onClearQuery: () => void;
}) {
  if (groups.length === 0 && ungroupedMaterials.length === 0) {
    return <EmptyState query={query} onClearQuery={onClearQuery} filesView={false} />;
  }

  return (
    <div className="space-y-8">
      {groups.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FolderOpen className="h-4 w-4 text-[#F6B73C]" />
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

      {ungroupedMaterials.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-4 w-4 text-primary" />
            Jednotlivé soubory
            <span className="text-xs font-normal normal-case">({ungroupedMaterials.length})</span>
          </h2>
          <div className="space-y-2">
            {ungroupedMaterials.map((material) => (
              <SingleMaterialRow key={material.id} material={material} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MaterialFilesSection({
  materials,
  query,
  onClearQuery,
}: {
  materials: FlattenedMaterial[];
  query: string;
  onClearQuery: () => void;
}) {
  if (materials.length === 0) {
    return <EmptyState query={query} onClearQuery={onClearQuery} filesView />;
  }

  return (
    <div className="space-y-3">
      {materials.map((material) => (
        <SingleMaterialRow key={material.id} material={material} />
      ))}
    </div>
  );
}

function EmptyState({
  query,
  filesView,
  onClearQuery,
}: {
  query: string;
  filesView: boolean;
  onClearQuery: () => void;
}) {
  return (
    <div className="glass-card space-y-3 rounded-2xl p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <FileText className="h-6 w-6" />
      </div>
      <p className="text-lg font-semibold text-foreground">Žádné materiály</p>
      <p className="text-sm text-muted-foreground">
        {query ? "Pro tenhle dotaz jsme nic nenašli." : "Zatím tu nejsou žádné schválené materiály."}
      </p>
      {query && (
        <button
          type="button"
          onClick={onClearQuery}
          className="text-sm text-primary hover:underline"
        >
          {filesView ? "Zobrazit všechny soubory" : "Zobrazit všechny materiály"}
        </button>
      )}
    </div>
  );
}

function SingleMaterialRow({ material }: { material: FlattenedMaterial }) {
  return (
    <div className="glass-card flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 items-start gap-2">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:line-clamp-1">
              {material.title}
            </p>
            {material.subject && (
              <Link
                href={`/predmety/${material.subject.slug}`}
                className="mt-0.5 block text-xs font-medium text-primary transition-colors hover:text-[#35D7E8]"
              >
                {material.subject.short_tag} · {material.subject.name}
              </Link>
            )}
            {material.subject ? <MaterialSubjectMeta subject={material.subject} /> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
          <span>{formatFileSize(material.size_bytes)}</span>
          {material.page_count != null && <><span>•</span><span>{material.page_count} stran</span></>}
          <span>•</span>
          <span>{new Date(material.created_at).toLocaleDateString("cs-CZ")}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:self-start">
        {material.subject && (
          <Link
            href={`/predmety/${material.subject.slug}`}
            className={materialSecondaryButtonClass}
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
          href={material.public_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-[#35D7E8] sm:px-3 sm:text-sm"
        >
          PDF
          <ExternalLink className="h-3.5 w-3.5" />
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

function MaterialSubjectMeta({ subject }: { subject: NonNullable<FlattenedMaterial["subject"]> }) {
  const hasMetadata = subject.difficulty || subject.avg_subject_rating || subject.avg_teacher_rating;
  if (!hasMetadata) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
      {subject.difficulty ? <DifficultyBadge difficulty={subject.difficulty} size="sm" /> : null}
      {subject.avg_subject_rating ? (
        <span className="rounded-full border border-[#F6B73C]/25 bg-[#F6B73C]/10 px-2 py-0.5 text-[10px] font-medium text-[#F6B73C]">
          Předmět {subject.avg_subject_rating.toFixed(1)} ★
        </span>
      ) : null}
      {subject.avg_teacher_rating ? (
        <span className="rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Učitel {subject.avg_teacher_rating.toFixed(1)} ★
        </span>
      ) : null}
    </div>
  );
}
