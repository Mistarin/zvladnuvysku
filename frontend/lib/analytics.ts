"use client";

export type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;
export const analyticsEvents = {
  clickLogin: "click_login",
  openPublicProfile: "open_public_profile",
  saveFlashcardDeck: "save_flashcard_deck",
  submitSubjectProposal: "submit_subject_proposal",
  submitSubjectReview: "submit_subject_review",
  submitTeacherReview: "submit_teacher_review",
  uploadMaterial: "upload_material",
  viewPublicProfile: "view_public_profile",
  viewSubjectDetail: "view_subject_detail",
} as const;

export const analyticsSources = {
  hallOfFameCta: "hall_of_fame_cta",
  navbarDesktop: "navbar_desktop",
  navbarMobile: "navbar_mobile",
  userLink: "user_link",
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params?: AnalyticsEventParams) => void;
  }
}

export function trackEvent(eventName: AnalyticsEventName, params?: AnalyticsEventParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}
