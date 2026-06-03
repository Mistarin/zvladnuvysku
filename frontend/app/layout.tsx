import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SoundProvider } from "@/components/layout/sound-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { FeedbackButton } from "@/components/layout/feedback-button";
import { WelcomeDisplayNameModal } from "@/components/layout/welcome-display-name-modal";
import { getPublicProfileIdentity, hasPublicProfileIdentity } from "@/lib/public-profile-identity";
import { createClient } from "@/lib/supabase/server";
import { Inter, Outfit } from "next/font/google";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

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
  const profile = user
    ? (
        await supabase
          .from("profiles")
          .select("display_name, faculty")
          .eq("user_id", user.id)
          .maybeSingle()
      ).data ?? null
    : null;
  const publicIdentity = getPublicProfileIdentity(profile);

  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} font-sans min-h-screen flex flex-col antialiased`}>
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
              initialOpen={Boolean(user) && shouldPromptDisplayName && !hasPublicProfileIdentity(profile)}
              initialDisplayName={publicIdentity.displayName}
              initialFaculty={publicIdentity.faculty}
              clearCookieOnClose
            />
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
