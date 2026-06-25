"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Sun, Moon, Search, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStockTheme, useThemeColors } from "./ThemeContext";
import { useMobileMenu } from "./MobileMenuContext";
import { searchStockItems, type StockSearchResult } from "@/app/actions/stocks";

interface TopbarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onMenuClick?: () => void;
}

export default function StockTopbar({ title, subtitle, children, onMenuClick }: TopbarProps) {
  const { theme, toggle } = useStockTheme();
  const c = useThemeColors();
  const { toggle: toggleMenu } = useMobileMenu();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // ค้นทันทีระหว่างพิมพ์ (debounce 250ms)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(async () => {
      const r = await searchStockItems(term);
      setResults(r);
      setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function goTo(id: string) { setOpen(false); setQ(""); router.push(`/stock/inventory/${id}`); }
  function submitSearch() {
    const v = q.trim();
    if (v) { setOpen(false); router.push(`/stock/inventory?q=${encodeURIComponent(v)}`); }
  }

  return (
    <div style={{
      background: c.card,
      borderBottom: `1px solid ${c.border}`,
      position: "sticky", top: 0, zIndex: 30,
      paddingTop: "env(safe-area-inset-top)",
    }}>
    <div style={{
      height: 64, display: "flex", alignItems: "center", gap: 16,
      padding: "0 24px",
    }}>
      {/* Mobile menu */}
      <button onClick={onMenuClick ?? toggleMenu} className="md:hidden" style={{ background: "none", border: "none", color: c.text2, cursor: "pointer", padding: 4, display: "flex" }}>
        <Menu size={22} />
      </button>

      {/* Title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>{subtitle}</p>}
      </div>

      {/* Search */}
      <div ref={boxRef} className="hidden md:flex" style={{ position: "relative", alignItems: "center" }}>
        <Search size={15} style={{ position: "absolute", left: 12, color: c.text3, cursor: "pointer", zIndex: 1 }} onClick={submitSearch} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") submitSearch(); }}
          onFocus={() => { if (results.length) setOpen(true); }}
          placeholder="ค้นหาเครื่อง: IMEI / Serial / รหัส / รุ่น..."
          style={{
            background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10,
            padding: "8px 14px 8px 36px", color: c.text, fontSize: 13,
            width: 260, outline: "none", fontFamily: "inherit",
          }}
        />
        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: 340, background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,0.18)", zIndex: 50, overflow: "hidden", maxHeight: 380, overflowY: "auto" }}>
            {results.length === 0 ? (
              <div style={{ padding: "14px 16px", color: c.text3, fontSize: 13 }}>ไม่พบเครื่องที่ตรงกับ &ldquo;{q.trim()}&rdquo;</div>
            ) : (
              <>
                {results.map(r => (
                  <div key={r.id} onClick={() => goTo(r.id)}
                    style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${c.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <p style={{ margin: 0, color: c.text, fontSize: 13, fontWeight: 600 }}>{r.model} {r.storage}</p>
                      <span style={{ color: c.text3, fontSize: 11, whiteSpace: "nowrap" }}>{r.status}</span>
                    </div>
                    <p style={{ margin: "2px 0 0", color: c.text3, fontSize: 11, fontFamily: "monospace", wordBreak: "break-all" }}>
                      {r.id}{r.imei ? ` · IMEI ${r.imei}` : ""}{r.serial ? ` · SN ${r.serial}` : ""}
                    </p>
                  </div>
                ))}
                <div onClick={submitSearch} style={{ padding: "9px 14px", cursor: "pointer", color: c.gold, fontSize: 12, fontWeight: 600 }}>
                  ดูทั้งหมดในคลัง →
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {children}

      {/* Theme toggle */}
      <button
        onClick={toggle}
        style={{ background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10, padding: 8, cursor: "pointer", color: c.text2, display: "flex", transition: "all 150ms" }}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Bell */}
      <button onClick={() => router.push("/stock/requests")} style={{ background: "none", border: "none", cursor: "pointer", color: c.text2, position: "relative", display: "flex", padding: 4 }}>
        <Bell size={20} />
        <span style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, background: "#ef4444", borderRadius: "50%" }} />
      </button>
    </div>
    </div>
  );
}
