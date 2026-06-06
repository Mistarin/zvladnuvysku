"use client";

import { openCookieSettings } from "@/components/layout/cookie-consent-banner";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="hover:text-foreground transition-colors"
    >
      Nastavení cookies
    </button>
  );
}
