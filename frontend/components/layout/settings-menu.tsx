"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Volume2, VolumeX, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSound } from "./sound-provider";

export function SettingsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { setTheme, resolvedTheme } = useTheme();
  const { isSoundEnabled, toggleSound } = useSound();
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
      <button className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <Settings className="w-5 h-5 opacity-50" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${
          isOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
        }`}
        aria-label="Nastavení"
        title="Nastavení"
      >
        <Settings className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-border bg-popover shadow-xl animate-scale-in p-1">
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
          
          <button
            onClick={toggleSound}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted rounded-lg transition-colors ${
              isSoundEnabled ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50 hover:text-muted-foreground"
            }`}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              Zvuky
            </span>
            <span className="text-xs font-medium bg-muted/50 px-1.5 py-0.5 rounded whitespace-nowrap">
              {isSoundEnabled ? "Zapnuto" : "Vypnuto"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
