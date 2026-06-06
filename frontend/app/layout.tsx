import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SoundProvider } from "@/components/layout/sound-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { CookieConsentBanner } from "@/components/layout/cookie-consent-banner";
import { GoogleAnalytics } from "@/components/layout/google-analytics";
import { FeedbackButton } from "@/components/layout/feedback-button";
import { WelcomeDisplayNameModal } from "@/components/layout/welcome-display-name-modal";
import { getPublicProfileIdentity } from "@/lib/public-profile-identity";
import { parseCookieConsent } from "@/lib/cookie-consent";
import { hasAcceptedCurrentLegalVersion, hasCompletedPublicProfileSetup } from "@/lib/legal-consent";
import { createClient } from "@/lib/supabase/server";
import { Inter, Outfit } from "next/font/google";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

type LayoutProfile = {
  display_name?: string | null;
  faculty?: string | null;
  secondary_faculty?: string | null;
  legal_accepted_at?: string | null;
  legal_accepted_version?: string | null;
} | null;

export const metadata: Metadata = {
  title: {
    template: "%s | Zvládnu Výšku",
    default: "Zvládnu Výšku — Studentský hub Ostravské univerzity",
  },
  description:
    "Najdi předmět na Ostravské univerzitě. Hodnocení obtížnosti, kartičky, reálné zkušenosti studentů.",
  keywords: [
    "Ostravská univerzita",
    "předměty",
    "hodnocení",
    "kartičky",
    "studium",
    "OU",
  ],
  authors: [{ name: "ZvladnuVysku" }],
  openGraph: {
    siteName: "ZvladnuVysku",
    locale: "cs_CZ",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const shouldPromptDisplayName = cookieStore.get("needs_display_name")?.value === "1";
  const initialCookieConsent = parseCookieConsent(cookieStore.get("zv_cookie_consent")?.value ?? null);
  const profile: LayoutProfile = user
    ? (
        await supabase
          .from("profiles")
          .select("display_name, faculty, secondary_faculty, legal_accepted_at, legal_accepted_version")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data as LayoutProfile
    : null;
  const publicIdentity = getPublicProfileIdentity(profile);
  const hasAcceptedLegal = hasAcceptedCurrentLegalVersion(profile);
  const shouldShowOnboarding = Boolean(user) && (shouldPromptDisplayName || !hasCompletedPublicProfileSetup(profile));

  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans min-h-screen flex flex-col antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <GoogleAnalytics initialConsent={initialCookieConsent} />
          <SoundProvider>
            <Navbar initialUser={user} />
            <main className="flex-1 pb-[25vh]">{children}</main>
            <Footer />
            <CookieConsentBanner initialConsent={initialCookieConsent} />
            <FeedbackButton />
            <WelcomeDisplayNameModal
              initialOpen={shouldShowOnboarding}
              initialDisplayName={publicIdentity.displayName}
              initialFaculty={publicIdentity.faculty}
              initialSecondaryFaculty={publicIdentity.secondaryFaculty}
              initialLegalAcceptedAt={hasAcceptedLegal ? profile?.legal_accepted_at ?? null : null}
              initialLegalAcceptedVersion={profile?.legal_accepted_version ?? null}
              clearCookieOnClose
            />
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
