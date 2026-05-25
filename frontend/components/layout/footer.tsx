import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/50 bg-background/50 mt-auto">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo & copyright */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded accent-gradient flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              ZV
            </div>
            <p className="text-sm text-muted-foreground">
              © {year}{" "}
              <span className="font-medium text-foreground">ZvládnuVyšku</span>
              {" "}— studentský hub OU
            </p>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              href="/predmety"
              className="hover:text-foreground transition-colors"
            >
              Předměty
            </Link>
            <span className="text-border">·</span>
            <Link
              href="/prihlaseni"
              className="hover:text-foreground transition-colors"
            >
              Přihlásit se
            </Link>
            <span className="text-border">·</span>
            <span className="text-xs">
              Projekt studentů pro studenty
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
