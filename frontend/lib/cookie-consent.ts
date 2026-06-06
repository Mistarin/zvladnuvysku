export const COOKIE_CONSENT_COOKIE_NAME = "zv_cookie_consent";
export const COOKIE_CONSENT_VERSION = "2026-06-06";
export const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

export type CookieConsentState = {
  version: string;
  analytics: boolean;
  updatedAt: string;
};

export const defaultCookieConsentState: CookieConsentState = {
  version: COOKIE_CONSENT_VERSION,
  analytics: false,
  updatedAt: "",
};

export function createCookieConsentState(analytics: boolean): CookieConsentState {
  return {
    version: COOKIE_CONSENT_VERSION,
    analytics,
    updatedAt: new Date().toISOString(),
  };
}

export function serializeCookieConsent(value: CookieConsentState) {
  return encodeURIComponent(JSON.stringify(value));
}

export function parseCookieConsent(rawValue: string | null | undefined): CookieConsentState | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue)) as Partial<CookieConsentState>;

    if (parsed.version !== COOKIE_CONSENT_VERSION || typeof parsed.analytics !== "boolean") {
      return null;
    }

    return {
      version: parsed.version,
      analytics: parsed.analytics,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}
