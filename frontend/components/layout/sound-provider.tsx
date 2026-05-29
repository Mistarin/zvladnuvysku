"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface SoundContextType {
  isSoundEnabled: boolean;
  toggleSound: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  // Default to false. We initialize with false, but will override with localStorage after mount.
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sound_enabled");
    if (stored !== null) {
      setIsSoundEnabled(stored === "true");
    }
  }, []);

  const toggleSound = () => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("sound_enabled", String(next));
      return next;
    });
  };

  return (
    <SoundContext.Provider value={{ isSoundEnabled, toggleSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context;
}
