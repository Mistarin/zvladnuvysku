"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, startTransition } from "react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => setMounted(true));
  }, []);

  if (!mounted) {
    return (
      <button
        className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Přepnout téma"
      >
        <span className="w-5 h-5 rounded-full bg-muted animate-pulse" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      id="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 hover:scale-110"
      aria-label={isDark ? "Přepnout na světlé téma" : "Přepnout na tmavé téma"}
      title={isDark ? "Světlé téma" : "Tmavé téma"}
    >
      <span
        className="text-lg transition-transform duration-300"
        style={{ transform: isDark ? "rotate(0deg)" : "rotate(180deg)" }}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
