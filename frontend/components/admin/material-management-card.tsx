"use client";

import { useState } from "react";
import Link from "next/link";
import { updateMaterialScoring } from "@/app/admin/actions";
import { PublicUserLink } from "@/components/profile/public-user-link";
import type { PublicUserSummary } from "@/lib/public-user-summaries";
import { getStoragePublicUrl } from "@/lib/storage";

type ManagedMaterial = {
  id: string;
  title: string;
  file_path: string;
  size_bytes: number;
  page_count: number | null;
  points_override: number | null;
  moderation_status: "pending" | "approved" | "rejected";
  created_at: string;
  uploader_id: string;
};

interface MaterialManagementCardProps {
  material: ManagedMaterial;
  subjectName?: string;
  subjectSlug?: string;
  author?: PublicUserSummary | null;
}

function getAutomaticPoints(pageCount: number | null) {
  if (pageCount === null) return 1;
  if (pageCount <= 5) return 1;
  if (pageCount <= 15) return 2;
  if (pageCount <= 30) return 3;
  return 4;
}

function getEffectivePoints(pageCount: number | null, pointsOverride: number | null) {
  return pointsOverride ?? getAutomaticPoints(pageCount);
}

export function MaterialManagementCard({
  material,
  subjectName,
  subjectSlug,
  author,
}: MaterialManagementCardProps) {
  const [pageCount, setPageCount] = useState(material.page_count?.toString() ?? "");
  const [pointsMode, setPointsMode] = useState<"auto" | "1" | "2" | "3" | "4">(
    material.points_override === 1 || material.points_override === 2 || material.points_override === 3 || material.points_override === 4
      ? String(material.points_override) as "1" | "2" | "3" | "4"
      : "auto",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedPageCount = pageCount.trim() ? Number(pageCount) : null;
  const previewPageCount = parsedPageCount !== null && Number.isInteger(parsedPageCount) && parsedPageCount >= 1
    ? parsedPageCount
    : null;
  const previewOverride = pointsMode === "auto" ? null : Number(pointsMode) as 1 | 2 | 3 | 4;
  const previewPoints = getEffectivePoints(previewPageCount, previewOverride);
  const publicUrl = getStoragePublicUrl("study_materials", material.file_path);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const result = await updateMaterialScoring(material.id, {
      pageCount: pageCount.trim() ? Number(pageCount) : null,
      pointsOverride: pointsMode === "auto" ? null : Number(pointsMode) as 1 | 2 | 3 | 4,
    });

    if (result.success) {
      setMessage("Bodování materiálu je uložené.");
    } else {
      setError(result.error);
    }

    setIsSaving(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5 min-w-0">
          <h3 className="text-lg font-semibold text-foreground break-words">{material.title}</h3>
          <p className="text-sm text-muted-foreground">
            {(material.size_bytes / 1024 / 1024).toFixed(2)} MB
            <span className="mx-2">·</span>
            {new Date(material.created_at).toLocaleString("cs-CZ")}
          </p>
          {subjectName && (
            <p className="text-sm text-muted-foreground">
              Předmět: <span className="font-medium text-foreground">{subjectName}</span>
            </p>
          )}
          <div className="text-sm">
            <PublicUserLink
              userId={material.uploader_id}
              summary={author ?? null}
              fallbackLabel={`Uživatel ${material.uploader_id.slice(0, 8)}…`}
              allowFallbackLink
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {previewPoints} body
          </span>
          <span className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
            {pointsMode === "auto" ? "automaticky podle stran" : "ručně přepsáno"}
          </span>
          <span className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
            {material.moderation_status === "approved"
              ? "schváleno"
              : material.moderation_status === "rejected"
                ? "zamítnuto"
                : "čeká na schválení"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-end">
        <label className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">Počet stran</span>
          <input
            type="number"
            min={1}
            max={9999}
            value={pageCount}
            onChange={(event) => setPageCount(event.target.value)}
            placeholder="nevyplněno"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/40"
          />
        </label>

        <div className="space-y-1">
          <span className="block text-xs font-medium text-muted-foreground">Body</span>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "auto", label: "Automaticky" },
              { value: "1", label: "1 bod" },
              { value: "2", label: "2 body" },
              { value: "3", label: "3 body" },
              { value: "4", label: "4 body" },
            ].map((option) => {
              const active = pointsMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPointsMode(option.value as "auto" | "1" | "2" | "3" | "4")}
                  className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Když necháš automatiku, body se spočítají z počtu stran. Ruční volba má přednost.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Ukládám..." : "Uložit"}
        </button>
      </div>

      {(message || error) && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${error ? "border-destructive/20 bg-destructive/10 text-destructive" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"}`}>
          {error ?? message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <a
          href={publicUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Otevřít PDF
        </a>
        {subjectSlug && (
          <Link href={`/predmety/${subjectSlug}`} className="text-muted-foreground hover:text-foreground">
            Detail předmětu
          </Link>
        )}
      </div>
    </div>
  );
}
