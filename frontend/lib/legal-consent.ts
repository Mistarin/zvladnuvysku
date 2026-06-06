export const CURRENT_LEGAL_ACCEPTANCE_VERSION = "2026-06-06";

type LegalAcceptanceRow = {
  display_name?: string | null;
  faculty?: string | null;
  secondary_faculty?: string | null;
  legal_accepted_at?: string | null;
  legal_accepted_version?: string | null;
} | null | undefined;

export function hasAcceptedCurrentLegalVersion(profile: LegalAcceptanceRow) {
  return (
    Boolean(profile?.legal_accepted_at) &&
    profile?.legal_accepted_version === CURRENT_LEGAL_ACCEPTANCE_VERSION
  );
}

export function hasCompletedPublicProfileSetup(profile: LegalAcceptanceRow) {
  const hasDisplayName = (profile?.display_name?.trim().length ?? 0) >= 2;
  const hasFaculty = Boolean(profile?.faculty?.trim());

  return hasDisplayName && hasFaculty && hasAcceptedCurrentLegalVersion(profile);
}
