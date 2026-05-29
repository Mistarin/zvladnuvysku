import Link from "next/link";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.42-4.04-1.42-.55-1.38-1.33-1.74-1.33-1.74-1.09-.74.08-.72.08-.72 1.2.09 1.84 1.23 1.84 1.23 1.08 1.83 2.83 1.3 3.52 1 .11-.77.42-1.3.76-1.6-2.67-.3-5.48-1.33-5.48-5.94 0-1.31.47-2.39 1.23-3.23-.12-.3-.53-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.44 11.44 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.88.12 3.18.77.84 1.23 1.92 1.23 3.23 0 4.62-2.82 5.64-5.5 5.94.43.37.82 1.1.82 2.23v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
      <path d="M20.32 4.37A17.4 17.4 0 0 0 16.02 3c-.19.34-.41.8-.56 1.16a16.18 16.18 0 0 0-4.92 0A12.2 12.2 0 0 0 9.98 3a17.16 17.16 0 0 0-4.3 1.37C2.96 8.42 2.2 12.36 2.58 16.25a17.62 17.62 0 0 0 5.28 2.64c.43-.58.82-1.2 1.15-1.86-.63-.24-1.23-.53-1.8-.87.15-.11.3-.23.45-.35 3.47 1.6 7.23 1.6 10.65 0 .15.12.3.24.45.35-.57.34-1.17.63-1.8.87.33.66.72 1.28 1.15 1.86a17.57 17.57 0 0 0 5.28-2.64c.45-4.5-.77-8.41-3.26-11.88ZM9.68 13.88c-1.03 0-1.88-.95-1.88-2.11 0-1.17.83-2.12 1.88-2.12 1.05 0 1.9.95 1.88 2.12 0 1.16-.83 2.11-1.88 2.11Zm4.64 0c-1.03 0-1.88-.95-1.88-2.11 0-1.17.83-2.12 1.88-2.12 1.05 0 1.9.95 1.88 2.12 0 1.16-.83 2.11-1.88 2.11Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v16H4z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-background/50 mt-auto">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded accent-gradient flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  ZV
                </div>
                <p className="text-sm text-muted-foreground">
                  © {year}{" "}
                  <span className="font-medium text-foreground">ZvládnuVýšku</span>
                  {" "}— studentský hub OU
                </p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Neoficiální studentský web vytvořený studentem pro studenty. Nemá žádnou
                oficiální spojitost s Ostravskou univerzitou ani s jednotlivými fakultami.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Projekt vznikl z jednoduchého důvodu: než si člověk něco zapíše, měl by mít
                na jednom místě reálné zkušenosti, materiály, kartičky a přehled o vyučujících,
                ne jen strohý sylabus.
              </p>
            </div>

            <nav className="flex flex-col items-start lg:items-end gap-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/predmety"
                  className="hover:text-foreground transition-colors"
                >
                  Předměty
                </Link>
                <Link
                  href="/flashcardy"
                  className="hover:text-foreground transition-colors"
                >
                  Kartičky
                </Link>
                <Link
                  href="/materialy"
                  className="hover:text-foreground transition-colors"
                >
                  Materiály
                </Link>
                <Link
                  href="/ucitele"
                  className="hover:text-foreground transition-colors"
                >
                  Vyučující
                </Link>
              </div>

              <Link
                href="https://github.com/Mistarin/zvladnuvysku"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted transition-colors"
              >
                <GitHubIcon />
                <span>GitHub projektu</span>
              </Link>
              <Link
                href="https://discord.gg/K2YzKtGaCj"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted transition-colors"
              >
                <DiscordIcon />
                <span>Discord komunity</span>
              </Link>
              <Link
                href="mailto:ismartinvision@gmail.com"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 hover:bg-muted transition-colors"
              >
                <MailIcon />
                <span>ismartinvision@gmail.com</span>
              </Link>
            </nav>
          </div>

          <div className="border-t border-border/50 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Projekt studentů pro studenty.</span>
            <span>Data a zkušenosti mohou být neúplné nebo subjektivní.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
