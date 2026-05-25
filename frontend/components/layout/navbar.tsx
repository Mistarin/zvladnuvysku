"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
const navLinks = [
  { href: "/predmety", label: "Předměty" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  // Iniciály z emailu (jmeno.prijmeni@osu.cz → JM)
  const initials = user?.email
    ? user.email.split("@")[0].split(".").map((p) => p[0]?.toUpperCase() ?? "").join("").slice(0, 2)
    : "";

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
            <Image
              src="/logo-v2.png"
              alt="ZvládnuVýšku Logo"
              width={56}
              height={56}
              className="shrink-0 group-hover:scale-105 transition-transform duration-200"
            />
            <span className="font-semibold text-foreground tracking-tight">
              Zvládnu<span className="home-title-accent">Výšku</span>
            </span>
          </Link>

          {/* Right side */}
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

            {user ? (
              // Přihlášený uživatel — avatar s dropdown
              <div className="relative ml-1">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity"
                  aria-label="Uživatelské menu"
                  id="nav-user-avatar"
                >
                  {initials}
                </button>

                {menuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-border bg-popover shadow-xl animate-scale-in">
                      <div className="px-3 py-2.5 border-b border-border">
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                          Odhlásit se
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Nepřihlášený
              <Link
                href="/prihlaseni"
                id="nav-prihlaseni"
                className="ml-1 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
              >
                Přihlásit se
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
