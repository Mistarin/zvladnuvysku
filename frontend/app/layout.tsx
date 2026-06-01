import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SoundProvider } from "@/components/layout/sound-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WelcomeDisplayNameModal } from "@/components/layout/welcome-display-name-modal";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: {
    template: "%s | ZvladnuVysku",
    default: "ZvladnuVysku — Studentský hub Ostravské univerzity",
  },
  description:
    "Najdi svůj předmět na Ostravské univerzitě. Hodnocení obtížnosti, kartičky, reálné zkušenosti studentů.",
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

import { FeedbackButton } from "@/components/layout/feedback-button";

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
  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data ?? null
    : null;
  const displayName = (profile as { display_name?: string | null } | null)?.display_name?.trim() ?? "";

  return (
    <html lang="cs" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <SoundProvider>
            <Navbar initialUser={user} />
            <main className="flex-1">{children}</main>
            <Footer />
            <FeedbackButton />
            <WelcomeDisplayNameModal
              initialOpen={Boolean(user) && shouldPromptDisplayName && !displayName}
              initialDisplayName={displayName}
              clearCookieOnClose
            />
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
