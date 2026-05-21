"use client";
import { useCallback, useEffect, useState } from "react";

const LS_KEY = "khaiphone_admin_dark";

export function useAdminTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    setDark(stored != null
      ? stored === "1"
      : window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }, []);

  const toggle = useCallback(() => {
    setDark(d => { localStorage.setItem(LS_KEY, d ? "0" : "1"); return !d; });
  }, []);

  return { dark, toggle };
}

export function adminCssVars(dark: boolean): React.CSSProperties {
  return {
    "--admin-bg":       dark ? "#0F0F11" : "#F5F5F7",
    "--admin-card":     dark ? "#1C1C1E" : "#FFFFFF",
    "--admin-border":   dark ? "#2C2C2E" : "#E5E5E5",
    "--admin-text":     dark ? "#F2F2F7" : "#111111",
    "--admin-text2":    dark ? "#AEAEB2" : "#666666",
    "--admin-text3":    dark ? "#636366" : "#AAAAAA",
    "--admin-gold":     dark ? "#D4A843" : "#B8860B",
    "--admin-gold-bg":  dark ? "rgba(212,168,67,0.15)" : "#FEF3C7",
    "--admin-gold-text":dark ? "#D4A843" : "#92400E",
  } as React.CSSProperties;
}
