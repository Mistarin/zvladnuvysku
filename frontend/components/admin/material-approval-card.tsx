"use client";

import Link from "next/link";
import { useState } from "react";
import { approveMaterial, rejectMaterial } from "@/app/admin/actions";
import type { SubjectMaterial } from "@/lib/types/database";
import { getStoragePublicUrl } from "@/lib/storage";

interface MaterialApprovalCardProps {
  material: SubjectMaterial;
  subjectName?: string;
  subjectSlug?: string;
}

export function MaterialApprovalCard({ material, subjectName, subjectSlug }: MaterialApprovalCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const publicUrl = getStoragePublicUrl("study_materials", material.file_path);

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    const result = await approveMaterial(material.id);
    if (!result.success) {
      setError(result.error);
    }
    setIsApproving(false);
  };

  const handleReject = async () => {
    setIsRejecting(true);
    setError(null);
    const result = await rejectMaterial(material.id, rejectReason);
    if (!result.success) {
      setError(result.error);
    }
    setIsRejecting(false);
    setShowReject(false);
  };

  const isWorking = isApproving || isRejecting;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            📄 {material.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Velikost: {(material.size_bytes / 1024 / 1024).toFixed(2)} MB
          </p>
          {subjectName && (
            <p className="text-sm text-muted-foreground mt-1">
              Předmět: <span className="font-medium text-foreground">{subjectName}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Nahráno {new Date(material.created_at).toLocaleString("cs-CZ")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <a 
            href={publicUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Otevřít PDF ↗
          </a>
          {subjectSlug && (
            <Link
              href={`/predmety/${subjectSlug}`}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Detail předmětu →
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
        {showReject ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Důvod zamítnutí (volitelné)"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-destructive/40 focus:border-destructive/40"
            />
            <button
              onClick={handleReject}
              disabled={isWorking}
              className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
            >
              {isRejecting ? "Zamítám..." : "Potvrdit"}
            </button>
            <button
              onClick={() => setShowReject(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Zrušit
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowReject(true)}
            disabled={isWorking}
            className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
          >
            Zamítnout
          </button>
        )}
        <button
          onClick={handleApprove}
          disabled={isWorking}
          className="px-4 py-2 text-sm font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
        >
          {isApproving ? "Schvaluji..." : "Schválit"}
        </button>
      </div>
    </div>
  );
}
