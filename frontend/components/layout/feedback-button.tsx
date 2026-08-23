"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { submitFeedback } from "@/app/actions/feedback";

type FeedbackType = "bug" | "feature" | "other";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setError(null);

    startTransition(async () => {
      const result = await submitFeedback({
        type,
        message,
        sourceType: "general",
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
      }, 2500);
    });
  };

  return (
    <>
      {/* FAB … safe-area-inset-bottom for iPhones with gesture bar */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed z-50 flex items-center justify-center w-12 h-12 rounded-md primary-action text-white   transition-colors"
        style={{
          bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
          right: "1.5rem",
        }}
        aria-label="Odeslat zpětnou vazbu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      </button>

      {isOpen && (
        /* Modal … flex-start so keyboard doesn't cover textarea on mobile */
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-background/80 "
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div className="w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-xl  p-6  sm: relative max-h-[90dvh] overflow-y-auto">
            {/* Close button … proper touch target */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Zavřít"
            >
              <X size={16} />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-foreground pr-8">Zpětná vazba</h2>

            {success ? (
              <div className="text-center py-8 text-emerald-500 space-y-2">
                <div className="text-4xl"></div>
                <p className="font-medium">Díky za zprávu!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="feedback-type" className="block text-sm font-medium mb-1 text-foreground">Typ zprávy</label>
                  <select
                    id="feedback-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as FeedbackType)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="bug">Nahlásit chybu</option>
                    <option value="feature">Návrh vylepšení</option>
                    <option value="other">Jiné</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="feedback-message" className="block text-sm font-medium mb-1 text-foreground">Co máš na srdci?</label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Popiš nám, co nefunguje, nebo co bys tu rád viděl..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending || !message.trim()}
                  className="w-full py-2.5 rounded-xl font-medium text-sm primary-action text-white hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Odesílám..." : "Odeslat administrátorovi"}
                </button>
                {error && (
                  <p className="text-sm text-destructive" role="alert">{error}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Pokud jsi přihlášený, stav zprávy uvidíš v Mojí aktivitě.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
