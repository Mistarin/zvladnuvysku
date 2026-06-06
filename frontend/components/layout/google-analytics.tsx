"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import type { CookieConsentState } from "@/lib/cookie-consent";

interface GoogleAnalyticsProps {
  initialConsent: CookieConsentState | null;
}

export function GoogleAnalytics({ initialConsent }: GoogleAnalyticsProps) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const [consent, setConsent] = useState(initialConsent);

  useEffect(() => {
    const handleConsentChange = (event: Event) => {
      const nextConsent = (event as CustomEvent<CookieConsentState>).detail;
      setConsent(nextConsent);
      const gtag = (window as Window & {
        gtag?: (command: string, action: string, params?: Record<string, unknown>) => void;
      }).gtag;

      if (typeof gtag === "function") {
        gtag("consent", "update", {
          analytics_storage: nextConsent.analytics ? "granted" : "denied",
        });
      }
    };

    window.addEventListener("zv:cookie-consent-changed", handleConsentChange as EventListener);
    return () => {
      window.removeEventListener("zv:cookie-consent-changed", handleConsentChange as EventListener);
    };
  }, []);

  if (!measurementId || !consent?.analytics) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('consent', 'default', { analytics_storage: 'granted' });
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
