"use client";

import { useState } from "react";
import { setFeedbackStatus } from "@/app/admin/actions";
import { PublicUserLink } from "@/components/profile/public-user-link";
import { Check } from "lucide-react";
import type { PublicUserSummary } from "@/lib/public-user-summaries";
import type { Database } from "@/lib/types/database";

interface FeedbackApprovalCardProps {
  // status/type are plain text columns in the live schema, so accept what the
  // database actually returns; runtime comparisons stay literal.
  feedback: Omit<Database["public"]["Tables"]["feedback"]["Row"], "status" | "type"> & {
    status: string;
    type: string;
    author?: PublicUserSummary | null;
  };
}

export function FeedbackApprovalCard({ feedback }: FeedbackApprovalCardProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (status: "new" | "in_progress" | "resolved") => {
    setIsWorking(true);
    setError(null);
    const result = await setFeedbackStatus(feedback.id, status);
    if (!result.success) {
      setError(result.error);
    }
    setIsWorking(false);
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    bug: { label: "Chyba", color: "text-red-500 bg-red-500/10" },
    feature: { label: "Návrh", color: "text-blue-500 bg-blue-500/10" },
    other: { label: "Jiné", color: "text-gray-500 bg-gray-500/10" },
  };

  const config = typeLabels[feedback.type] ?? typeLabels.other;
  const statusLabels: Record<string, string> = {
    new: "Nové",
    in_progress: "Rozpracováno",
    resolved: "Vyřešeno",
  } as const;
  const sourceTypeLabels: Record<string, string> = {
    general: "Obecné",
    material: "Materiál",
    subject_rating: "Hodnocení předmětu",
    teacher_rating: "Hodnocení učitele",
  };

  return (
    <div className="surface-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {feedback.created_at ? new Date(feedback.created_at).toLocaleString("cs-CZ") : ""}
          </span>
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
          {statusLabels[feedback.status] ?? feedback.status}
        </span>
      </div>

      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
        {feedback.message}
      </p>
      {feedback.source_label && (
        <p className="text-xs text-muted-foreground">
          Kontext: <span className="font-medium text-foreground">{feedback.source_label}</span>
          {feedback.source_type && (
            <span className="ml-2 text-[11px] uppercase tracking-wide">
              · {sourceTypeLabels[feedback.source_type] ?? feedback.source_type}
            </span>
          )}
        </p>
      )}
      {feedback.user_id ? (
        <PublicUserLink
          userId={feedback.user_id}
          summary={feedback.author ?? null}
          fallbackLabel={`Uživatel ${feedback.user_id.slice(0, 8)}…`}
          allowFallbackLink
        />
      ) : (
        <p className="text-xs text-muted-foreground">Odesláno anonymně</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/50">
        <button
          onClick={() => handleStatusChange("new")}
          disabled={isWorking || feedback.status === "new"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 disabled:opacity-50 transition-colors"
        >
          Nové
        </button>
        <button
          onClick={() => handleStatusChange("in_progress")}
          disabled={isWorking || feedback.status === "in_progress"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
        >
          Rozpracováno
        </button>
        <button
          onClick={() => handleStatusChange("resolved")}
          disabled={isWorking || feedback.status === "resolved"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
        >
          <Check className="w-4 h-4" />
          {isWorking ? "Ukládám..." : "Vyřešeno"}
        </button>
      </div>
    </div>
  );
}
