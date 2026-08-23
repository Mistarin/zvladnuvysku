"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <button className="w-11 h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <Settings className="w-5 h-5 opacity-50" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors duration-200 ${
          isOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
        aria-label="Nastavení"
        title="Nastavení"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-border bg-popover   p-1">
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Téma vzhledu
            </span>
            <span className="text-xs font-medium bg-muted/50 px-1.5 py-0.5 rounded whitespace-nowrap">
              {isDark ? "Tmavé" : "Světlé"}
            </span>
          </button>

        </div>
      )}
    </div>
  );
}
