"use client";

import { createContext, useContext, useState } from "react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

export function StockThemeProvider({ children }: { children: React.ReactNode }) {
  // default = light, dark เป็นทางเลือก; อ่าน synchronous กัน flash
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window !== "undefined" && localStorage.getItem("stock-theme") === "dark" ? "dark" : "light"
  );

  function toggle() {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("stock-theme", next);
      return next;
    });
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      <div data-stock-theme={theme} style={{ minHeight: "100vh", background: theme === "dark" ? "#050505" : "#F9F9F7", transition: "background 200ms", color: theme === "dark" ? "#fff" : "#111" }}>
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}

export function useStockTheme() { return useContext(ThemeCtx); }

export function useThemeColors() {
  const { theme } = useStockTheme();
  const dark = theme === "dark";
  return {
    dark,
    bg:       dark ? "#050505" : "#F9F9F7",
    card:     dark ? "#0B0B0B" : "#FFFFFF",
    card2:    dark ? "#111111" : "#F3F4F6",
    border:   dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    border2:  dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    text:     dark ? "#FFFFFF" : "#111111",
    text2:    dark ? "rgba(255,255,255,0.65)" : "#6B7280",
    text3:    dark ? "rgba(255,255,255,0.35)" : "#9CA3AF",
    gold:     dark ? "#D4AF37" : "#B8860B",
    goldHov:  dark ? "#F4D03F" : "#D4AF37",
    goldBg:   dark ? "rgba(212,175,55,0.12)" : "rgba(184,134,11,0.08)",
    success:  "#22c55e",
    warning:  "#facc15",
    danger:   "#ef4444",
    info:     "#3b82f6",
    purple:   "#a855f7",
    orange:   "#f97316",
  };
}
