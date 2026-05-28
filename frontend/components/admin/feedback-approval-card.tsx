"use client";

import { useState } from "react";
import { resolveFeedback } from "@/app/admin/actions";
import { Check } from "lucide-react";

interface FeedbackApprovalCardProps {
  feedback: {
    id: string;
    type: "bug" | "feature" | "other";
    message: string;
    created_at: string;
    user_id: string | null;
  };
}

export function FeedbackApprovalCard({ feedback }: FeedbackApprovalCardProps) {
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async () => {
    setIsResolving(true);
    const result = await resolveFeedback(feedback.id);
    if (!result.success) {
      alert("Chyba: " + result.error);
      setIsResolving(false);
    }
  };

  const typeLabels = {
    bug: { label: "Chyba", color: "text-red-500 bg-red-500/10" },
    feature: { label: "Návrh", color: "text-blue-500 bg-blue-500/10" },
    other: { label: "Jiné", color: "text-gray-500 bg-gray-500/10" },
  };

  const config = typeLabels[feedback.type];

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(feedback.created_at).toLocaleString("cs-CZ")}
          </span>
        </div>
      </div>
      
      <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
        {feedback.message}
      </p>

      <div className="flex items-center justify-end pt-2 border-t border-border/50">
        <button
          onClick={handleResolve}
          disabled={isResolving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
        >
          <Check className="w-4 h-4" />
          {isResolving ? "Řeším..." : "Vyřešeno"}
        </button>
      </div>
    </div>
  );
}
