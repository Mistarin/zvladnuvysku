"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  auditApprovedMaterials,
  removeBrokenMaterialRecord,
  type BrokenMaterialAuditItem,
} from "@/app/admin/actions";

export function MaterialStorageAudit() {
  const [results, setResults] = useState<BrokenMaterialAuditItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAudit = () => {
    setError(null);

    startTransition(async () => {
      const result = await auditApprovedMaterials();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setResults(result.data);
    });
  };

  const handleRemove = async (item: BrokenMaterialAuditItem) => {
    if (!window.confirm(`Opravdu smazat rozbitý záznam "${item.title}"?`)) {
      return;
    }

    setRemovingId(item.id);
    setError(null);
    const result = await removeBrokenMaterialRecord(item.id);
    if (!result.success) {
      setError(result.error);
      setRemovingId(null);
      return;
    }

    setResults((current) => current?.filter((entry) => entry.id !== item.id) ?? []);
    setRemovingId(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Audit uložiště materiálů</h2>
          <p className="text-sm text-muted-foreground">
            Ručně zkontroluje schválené PDF a najde záznamy, které míří na neexistující soubor.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAudit}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {isPending ? "Kontroluji..." : "Spustit audit"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {results && (
        <>
          <div className="rounded-xl bg-background/60 px-3 py-2 text-sm text-muted-foreground">
            {results.length === 0
              ? "Audit nenašel žádné rozbité materiály."
              : `Audit našel ${results.length} ${results.length === 1 ? "rozbitý záznam" : results.length < 5 ? "rozbité záznamy" : "rozbitých záznamů"}.`}
          </div>

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      {item.subject_name && item.subject_slug ? (
                        <Link
                          href={`/predmety/${item.subject_slug}`}
                          className="block text-sm text-muted-foreground hover:text-foreground"
                        >
                          {item.subject_name}
                        </Link>
                      ) : (
                        <p className="text-sm text-muted-foreground">Bez navázaného předmětu</p>
                      )}
                      <p className="text-xs text-muted-foreground break-all">
                        {item.file_path}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.status_code ? `HTTP ${item.status_code}` : item.error_message ?? "Neznámá chyba"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      disabled={removingId === item.id}
                      className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
                    >
                      {removingId === item.id ? "Mažu..." : "Smazat záznam"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
