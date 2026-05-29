"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Loader2, MessageSquareWarning, X } from "lucide-react";
import { submitFeedback } from "@/app/actions/feedback";

type ReportIssueDialogProps = {
  sourceType: "material" | "subject_rating" | "teacher_rating";
  sourceId: string;
  sourceLabel: string;
  compact?: boolean;
};

export function ReportIssueDialog({
  sourceType,
  sourceId,
  sourceLabel,
  compact = false,
}: ReportIssueDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitFeedback({
        type: "bug",
        message,
        sourceType,
        sourceId,
        sourceLabel,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setMessage("");
      }, 1500);
    });
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setError(null);
          setSuccess(false);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={
            compact
              ? "inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
              : "inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          }
        >
          <MessageSquareWarning className={compact ? "size-3.5" : "size-4"} />
          Nahlásit problém
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
          {success ? (
            <div className="space-y-3 py-6 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Nahlášení odesláno</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Díky, podíváme se na to.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5 pr-8">
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  Nahlásit problém
                </Dialog.Title>
                <Dialog.Description className="text-sm leading-6 text-muted-foreground">
                  Popiš, co je na tomto obsahu špatně nebo zavádějící.
                </Dialog.Description>
                <p className="text-xs text-muted-foreground">
                  Kontext: <span className="font-medium text-foreground">{sourceLabel}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  maxLength={1500}
                  placeholder="Např. materiál je špatně pojmenovaný, komentář obsahuje nesmysly, PDF není k tématu..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />

                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Zrušit
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={isPending || !message.trim()}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    Odeslat
                  </button>
                </div>
              </form>
            </>
          )}

          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
            <X className="size-4" />
            <span className="sr-only">Zavřít</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
