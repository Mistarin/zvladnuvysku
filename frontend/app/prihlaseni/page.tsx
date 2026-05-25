import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Přihlášení",
  description: "Přihlas se ke svému účtu na ZvladnuVysku. Hodnoť předměty, tvořte flashcardy.",
};

export default function PrihlaseniPage() {
  return (
    <div className="container mx-auto max-w-md px-4 py-16 sm:py-24">
      {/* Card */}
      <div className="glass-card p-8 space-y-6 animate-scale-in">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl accent-gradient flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-primary/20">
            ZV
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Přihlásit se
          </h1>
          <p className="text-sm text-muted-foreground">
            Přihlas se a hodnoť předměty nebo tvořte flashcardy.
          </p>
        </div>

        {/* Magic link form */}
        <form className="space-y-4" action="#" method="POST">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              E-mailová adresa
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="tvuj@email.cz"
              autoComplete="email"
              required
              className="
                w-full px-4 py-2.5 rounded-xl border border-border bg-background
                text-foreground placeholder:text-muted-foreground
                focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                transition-all duration-150
              "
            />
          </div>

          <button
            id="send-magic-link-btn"
            type="submit"
            disabled
            className="
              w-full px-4 py-2.5 rounded-xl font-medium text-sm
              accent-gradient text-white
              opacity-60 cursor-not-allowed
              transition-all duration-150
            "
            title="Přihlášení bude dostupné v příští verzi"
          >
            Poslat magic link
          </button>

          <p className="text-center text-xs text-muted-foreground">
            📧 Pošleme ti odkaz pro přihlášení — bez hesla.
          </p>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-xs text-muted-foreground bg-card">
              nebo
            </span>
          </div>
        </div>

        {/* Coming soon note */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-1">
          <p className="text-sm font-medium text-primary">🚀 Brzy dostupné</p>
          <p className="text-xs text-muted-foreground">
            Přihlášení bude spuštěno ve Fázi 2. Zatím si prohlédni{" "}
            <Link href="/predmety" className="text-primary hover:underline">
              předměty
            </Link>
            .
          </p>
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    </div>
  );
}
