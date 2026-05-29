"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Trash2, X } from "lucide-react";
import { deleteOwnDeck } from "@/app/flashcardy/actions";

export function DeleteDeckButton({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    setError(null);

    startTransition(async () => {
      const result = await deleteOwnDeck(deckId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setIsOpen(false);
      router.push("/flashcardy");
      router.refresh();
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15"
        >
          <Trash2 className="size-4" />
          Smazat
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
          <div className="space-y-2 pr-8">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              Smazat balíček kartiček?
            </Dialog.Title>
            <Dialog.Description className="text-sm leading-6 text-muted-foreground">
              Tato akce smaže balíček, jeho otázky i nahrané obrázky. Smazání nejde vrátit zpět.
            </Dialog.Description>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-border/60 pt-4">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={isPending}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                Zrušit
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Ano, smazat
            </button>
          </div>

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="size-4" />
            <span className="sr-only">Zavřít</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
