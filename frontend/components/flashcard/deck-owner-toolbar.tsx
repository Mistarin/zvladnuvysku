"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Eye, EyeOff, Loader2, PencilLine } from "lucide-react";
import { duplicateOwnDeck, setOwnDeckVisibility } from "@/app/flashcardy/actions";

interface DeckOwnerToolbarProps {
  deckId: string;
  isPublic: boolean;
  variant?: "detail" | "compact";
}

export function DeckOwnerToolbar({
  deckId,
  isPublic,
  variant = "detail",
}: DeckOwnerToolbarProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const compact = variant === "compact";

  const buttonClassName = compact
    ? "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
    : "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50";

  const handleToggleVisibility = () => {
    setError(null);

    startTransition(async () => {
      const result = await setOwnDeckVisibility(deckId, !isPublic);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  };

  const handleDuplicate = () => {
    setError(null);

    startTransition(async () => {
      const result = await duplicateOwnDeck(deckId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (result.deckId) {
        router.push(`/flashcardy/${result.deckId}`);
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className={`flex ${compact ? "flex-wrap gap-2" : "flex-wrap gap-2"}`}>
        <Link
          href={`/flashcardy/${deckId}/upravit`}
          className={buttonClassName}
        >
          <PencilLine className="size-4" />
          Upravit
        </Link>
        <button
          type="button"
          onClick={handleToggleVisibility}
          disabled={isPending}
          className={buttonClassName}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isPublic ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
          {isPublic ? "Skrýt" : "Zveřejnit"}
        </button>
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={isPending}
          className={buttonClassName}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
          Duplikovat
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
