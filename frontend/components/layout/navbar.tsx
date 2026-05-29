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
  { href: "/predmety", label: "Předměty" },
  { href: "/flashcardy", label: "Kartičky" },
  { href: "/materialy", label: "Materiály" },
  { href: "/ucitele", label: "Vyučující" },
  { href: "/#hall-of-fame", label: "Hall of Fame" },
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
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            id="nav-logo"
            className="flex items-center gap-2 group"
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

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  linkIsActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <Link
                href="/navrhnout"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  pathname === "/navrhnout" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Navrhnout předmět
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  pathname === "/admin" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                Admin
              </Link>
            )}

            <div className="ml-1">
              <SettingsMenu />
            </div>

            {user ? (
              <div className="relative ml-1">
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="w-8 h-8 rounded-full accent-gradient flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity"
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
                          onClick={() => setUserMenuOpen(false)}
                          className="block w-full rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/navrhnout"
                          onClick={() => setUserMenuOpen(false)}
                          className="block w-full rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          Navrhnout předmět
                        </Link>
                        <Link
                          href="/moje-aktivita"
                          onClick={() => setUserMenuOpen(false)}
                          className="block w-full rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                          Moje aktivita
                        </Link>
                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="block w-full rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                          >
                            Admin page
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
                  className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-foreground text-background hover:scale-105 transition-transform"
                >
                  Přihlásit
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Side (Hamburger + Settings) */}
          <div className="flex items-center gap-2 sm:hidden">
            <SettingsMenu />
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 -mr-2 text-foreground"
              aria-label="Menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {mobileMenuOpen ? (
                  <>
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </>
                ) : (
                  <>
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </>
                )}
              </svg>
            </button>
          </div>
        </nav>
      </div>

      <div className="border-t border-border/40 md:hidden">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
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

      {/* Mobile Collapse Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-border/50 bg-background px-4 py-4 space-y-3 shadow-xl">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                linkIsActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <Link
              href="/navrhnout"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                pathname === "/navrhnout" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Navrhnout předmět
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-2 rounded-lg text-sm font-medium ${
                pathname === "/admin" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Admin
            </Link>
          )}
          <div className="border-t border-border pt-3 mt-3">
            {user ? (
              <div className="space-y-2">
                <div className="px-4 py-2 text-sm text-foreground opacity-70 truncate">{user.email}</div>
                <Link
                  href="/moje-aktivita"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Dashboard
                </Link>
                <Link
                  href="/navrhnout"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Navrhnout předmět
                </Link>
                <Link
                  href="/moje-aktivita"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Moje aktivita
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Admin page
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  Odhlásit se
                </button>
              </div>
            ) : (
              <Link
                href="/prihlaseni"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center px-4 py-2 text-sm font-semibold rounded-lg bg-foreground text-background"
              >
                Přihlásit
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
