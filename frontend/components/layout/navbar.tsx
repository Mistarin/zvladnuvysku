"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SettingsMenu } from "./settings-menu";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";

interface NavbarProps {
  initialUser: User | null;
}
const navLinks = [
  { href: "/predmety", label: "Předměty", prefetch: true },
  { href: "/flashcardy", label: "Kartičky", prefetch: true },
  { href: "/materialy", label: "Materiály", prefetch: true },
  { href: "/ucitele", label: "Vyučující", prefetch: true },
  { href: "/#hall-of-fame", label: "Hall of Fame", prefetch: false },
];

function isActiveLink(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar({ initialUser }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");

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

  useEffect(() => {
    const updateHash = () => {
      setCurrentHash(window.location.hash);
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);

    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function linkIsActive(href: string) {
    if (href.includes("#")) {
      const [baseHref, hash] = href.split("#");
      const normalizedBaseHref = baseHref || "/";
      return pathname === normalizedBaseHref && currentHash === `#${hash}`;
    }

    return isActiveLink(pathname, href);
  }

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  const isAdmin = user && (() => {
    const role = user.app_metadata?.role as string | undefined;
    return role === 'admin' || role === 'moderator';
  })();

  const initials = user?.email
    ? user.email.split("@")[0].split(".").map((p) => p[0]?.toUpperCase() ?? "").join("").slice(0, 2)
    : "";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/95 supports-[backdrop-filter]:bg-background/90 md:supports-[backdrop-filter]:bg-background/80 md:supports-[backdrop-filter]:backdrop-blur-md">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            prefetch
            onClick={() => setMobileMenuOpen(false)}
            id="nav-logo"
            className="flex items-center gap-2 group"
          >
            <Image
              src="/logo-v2.png"
              alt="ZvládnuVýšku Logo"
              width={36}
              height={36}
              className="shrink-0 group-hover:scale-105 transition-transform duration-200"
            />
            <span className="font-semibold text-foreground tracking-tight">
              Zvládnu<span className="home-title-accent">Výšku</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={link.prefetch}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  linkIsActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="ml-1">
              <SettingsMenu />
            </div>

            {user ? (
              <div className="relative ml-1">
                {/* Avatar — min 44×44px touch target via padding trick */}
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="w-8 h-8 p-0 m-1.5 rounded-full accent-gradient flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity"
                  aria-label="Uživatelské menu"
                  aria-expanded={userMenuOpen}
                >
                  {initials}
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-border bg-popover shadow-xl animate-scale-in">
                      <div className="px-4 py-3 border-b border-border/50">
                        <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <Link
                          href="/moje-aktivita"
                          prefetch
                          onClick={() => setUserMenuOpen(false)}
                          className="block w-full rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Moje aktivita
                        </Link>
                        <Link
                          href="/navrhnout"
                          prefetch
                          onClick={() => setUserMenuOpen(false)}
                          className="block w-full rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          Navrhnout předmět
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            prefetch
                            onClick={() => setUserMenuOpen(false)}
                            className="block w-full rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            Administrace
                          </Link>
                        )}
                        <div className="my-1 border-t border-border/50" />
                        <button
                          onClick={handleSignOut}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                        >
                          Odhlásit se
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link
                  href="/prihlaseni"
                  prefetch
                  className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-foreground text-background hover:scale-105 transition-transform"
                >
                  Přihlásit
                </Link>
              </div>
            )}
          </div>

          {/* Mobile right side — settings + hamburger (only for user menu) */}
          <div className="flex items-center gap-1 md:hidden">
            <SettingsMenu />
            {user ? (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors"
                aria-label="Uživatelské menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                ) : (
                  <div className="w-7 h-7 rounded-full accent-gradient flex items-center justify-center text-white text-xs font-bold">
                    {initials}
                  </div>
                )}
              </button>
            ) : (
              <Link
                href="/prihlaseni"
                prefetch
                className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-foreground text-background"
              >
                Přihlásit
              </Link>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile scrollable nav tabs — always visible, replaces hamburger for navigation */}
      <div className="border-t border-border/40 md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar relative">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={link.prefetch}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  linkIsActive(link.href)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile user dropdown — only shown when logged in and hamburger tapped */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-border/50 bg-background px-4 py-4 space-y-1 shadow-xl">
          <div className="px-4 py-2 text-sm text-foreground opacity-70 truncate">{user.email}</div>
          <Link
            href="/moje-aktivita"
            prefetch
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Moje aktivita
          </Link>
          <Link
            href="/navrhnout"
            prefetch
            onClick={() => setMobileMenuOpen(false)}
            className="block rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Navrhnout předmět
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              prefetch
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Administrace
            </Link>
          )}
          <div className="border-t border-border/50 pt-2 mt-2">
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              Odhlásit se
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
