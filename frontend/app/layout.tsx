import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { SoundProvider } from "@/components/layout/sound-provider";
import { Navbar } from "@/components/layout/navbar";

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
    "Najdi svůj předmět na Ostravské univerzitě. Hodnocení obtížnosti, flashcardy, reálné zkušenosti studentů.",
  keywords: [
    "Ostravská univerzita",
    "předměty",
    "hodnocení",
    "flashcardy",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
            <Navbar />
            <main className="flex-1">{children}</main>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
