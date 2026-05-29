import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SoundProvider } from "@/components/layout/sound-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="cs" suppressHydrationWarning className={inter.variable}>
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
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
