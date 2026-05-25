"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const navLinks = [
  { href: "/predmety", label: "Předměty" },
  { href: "/prihlaseni", label: "Přihlásit se" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            id="nav-logo"
            className="flex items-center gap-2 group"
            aria-label="ZvladnuVysku — domů"
          >
            <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center text-white font-bold text-xs shrink-0 group-hover:scale-110 transition-transform duration-200">
              ZV
            </div>
            <span className="font-semibold text-foreground tracking-tight">
              Zvládnu<span style={{ color: "var(--accent-color)" }}>Vyšku</span>
            </span>
          </Link>

          {/* Navigation links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                id={`nav-${link.href.replace("/", "")}`}
                className={`
                  px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }
                `}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-1">
              <ThemeToggle />
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
