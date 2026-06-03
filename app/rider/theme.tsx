"use client";

import { createContext, useContext, useState, useEffect } from "react";

export const DARK = {
  BG:        "#0B0B0D",
  CARD:      "#1A1A1C",
  CARD2:     "#222224",
  BORDER:    "#2C2C2E",
  ACCENT:    "#4ADE80",
  GREEN:     "#30D158",
  RED:       "#FF453A",
  BLUE:      "#0A84FF",
  TEXT:      "#F2F2F7",
  TEXT2:     "#8E8E93",
  CARD_SKEL: "#2C2C2E",
};

export const LIGHT = {
  BG:        "#F2F2F7",
  CARD:      "#FFFFFF",
  CARD2:     "#EBEBF0",
  BORDER:    "#C7C7CC",
  ACCENT:    "#16A34A",   // dark green — readable on white (contrast 5.2:1)
  GREEN:     "#15803D",
  RED:       "#DC2626",
  BLUE:      "#1D4ED8",
  TEXT:      "#1C1C1E",
  TEXT2:     "#48484A",
  CARD_SKEL: "#D8D8DC",
};

type Colors = typeof DARK;
type ThemeCtx = Colors & { isDark: boolean; toggleTheme: () => void };

export const Ctx = createContext<ThemeCtx | null>(null);

export function RiderThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("rider-theme") === "light") setIsDark(false);
  }, []);

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("rider-theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <Ctx.Provider value={{ ...(isDark ? DARK : LIGHT), isDark, toggleTheme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRiderTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRiderTheme must be within RiderThemeProvider");
  return ctx;
}
