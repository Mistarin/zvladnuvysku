"use client";

import { useState } from "react";
import { approveRatingComment, rejectRatingComment } from "@/app/admin/actions";
import { PublicUserLink } from "@/components/profile/public-user-link";
import type { PublicUserSummary } from "@/lib/public-user-summaries";

interface RatingApprovalCardProps {
  rating: {
    id: string;
    type: "subject" | "teacher";
    comment: string;
    created_at: string;
    targetName: string; // jméno předmětu nebo učitele
    overall_rating?: number | null; // pro info o tom kolik dal hvězdiček
    user_id: string;
    is_anonymous?: boolean;
    author?: PublicUserSummary | null;
  };
}

export function RatingApprovalCard({ rating }: RatingApprovalCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    const result = await approveRatingComment(rating.id, rating.type);
    if (!result.success) {
      setError(result.error);
    }
    setIsApproving(false);
  };

  const handleReject = async () => {
    if (!window.confirm("Opravdu smazat text tohoto komentáře? Hvězdičky zůstanou započítané.")) return;
    setIsRejecting(true);
    setError(null);
    const result = await rejectRatingComment(rating.id, rating.type);
    if (!result.success) {
      setError(result.error);
    }
    setIsRejecting(false);
  };

  const isWorking = isApproving || isRejecting;

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {rating.type === "subject" ? "" : "‍"}
            </span>
            <h3 className="font-bold text-lg text-foreground">
              {rating.targetName}
            </h3>
            {rating.overall_rating && (
              <span className="text-amber-500 font-bold ml-2">
                {rating.overall_rating}/5
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Napsáno {new Date(rating.created_at).toLocaleDateString('cs-CZ')}
          </p>
          <div className="mt-2">
            {rating.is_anonymous ? (
              <span className="text-sm text-muted-foreground">Anonymní recenze</span>
            ) : (
              <PublicUserLink
                userId={rating.user_id}
                summary={rating.author ?? null}
                fallbackLabel={`Uživatel ${rating.user_id.slice(0, 8)}…`}
                allowFallbackLink
              />
            )}
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/30 border border-border rounded-lg text-sm text-foreground italic">
        &ldquo;{rating.comment}&rdquo;
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
        <button
          onClick={handleReject}
          disabled={isWorking}
          className="px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50"
        >
          {isRejecting ? "Mažu..." : "Smazat text"}
        </button>
        <button
          onClick={handleApprove}
          disabled={isWorking}
          className="px-4 py-2 text-sm font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors disabled:opacity-50"
        >
          {isApproving ? "Schvaluji..." : "Schválit komentář"}
        </button>
      </div>
    </div>
  );
}
