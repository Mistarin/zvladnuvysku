"use client";

import { useEffect, useMemo, useState } from "react";
import { Cookie, Settings2, X } from "lucide-react";
import {
  COOKIE_CONSENT_COOKIE_NAME,
  COOKIE_CONSENT_MAX_AGE,
  type CookieConsentState,
  createCookieConsentState,
  defaultCookieConsentState,
  serializeCookieConsent,
} from "@/lib/cookie-consent";

const OPEN_COOKIE_SETTINGS_EVENT = "zv:open-cookie-settings";

function writeConsentCookie(value: CookieConsentState) {
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${serializeCookieConsent(value)}; Max-Age=${COOKIE_CONSENT_MAX_AGE}; Path=/; SameSite=Lax`;
}

interface CookieConsentBannerProps {
  initialConsent: CookieConsentState | null;
}

export function CookieConsentBanner({ initialConsent }: CookieConsentBannerProps) {
  const [savedConsent, setSavedConsent] = useState<CookieConsentState | null>(initialConsent);
  const [showSettings, setShowSettings] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    initialConsent?.analytics ?? defaultCookieConsentState.analytics,
  );

  useEffect(() => {
    const openSettings = () => {
      setShowSettings(true);
      setSavedConsent((current) => current ?? initialConsent ?? null);
    };

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
  }, [initialConsent]);

  useEffect(() => {
    if (!savedConsent) {
      setAnalyticsEnabled(initialConsent?.analytics ?? false);
      return;
    }

    setAnalyticsEnabled(savedConsent.analytics);
  }, [initialConsent, savedConsent]);

  const isVisible = useMemo(() => !savedConsent || showSettings, [savedConsent, showSettings]);

  if (!isVisible) {
    return null;
  }

  const persist = (analytics: boolean) => {
    const next = createCookieConsentState(analytics);
    writeConsentCookie(next);
    setSavedConsent(next);
    setShowSettings(false);
    setAnalyticsEnabled(next.analytics);
    window.dispatchEvent(new CustomEvent("zv:cookie-consent-changed", { detail: next }));
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-[80] px-4 sm:bottom-6">
      <div className="mx-auto max-w-3xl rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_20px_60px_rgba(17,24,39,0.18)]">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-foreground">Cookies a analytika</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Používáme nezbytné cookies pro přihlášení a bezpečný provoz webu. Volitelně
                    můžeš povolit Google Analytics pro měření návštěvnosti a zlepšování produktu.
                  </p>
                </div>
                {showSettings ? (
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Zavřít nastavení cookies"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

            {showSettings ? (
              <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Nezbytné cookies</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Přihlášení, session, bezpečnost a zapamatování volby cookies. Tyto cookies
                      nelze vypnout.
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                    Vždy aktivní
                  </span>
                </div>
                <label className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Google Analytics</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Pomáhá nám chápat, které stránky a funkce dávají smysl zlepšovat.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={analyticsEnabled}
                    onChange={(event) => setAnalyticsEnabled(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </label>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setShowSettings((current) => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Settings2 className="h-4 w-4" />
                Nastavení cookies
              </button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => persist(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Jen nezbytné
                </button>
                <button
                  type="button"
                  onClick={() => persist(showSettings ? analyticsEnabled : true)}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {showSettings ? "Uložit volbu" : "Povolit analytiku"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}
