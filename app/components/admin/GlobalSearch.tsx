"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, Phone, Hash, Smartphone } from "lucide-react";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types/admin";
import { fetchRequests } from "@/app/actions/admin-requests";
import type { AdminRequest } from "@/lib/types/admin";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "rgba(184,134,11,0.35)", color: "#F0C040", borderRadius: 2, padding: "0 1px" }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function matchRequest(req: AdminRequest, q: string): boolean {
  const lower = q.toLowerCase();
  return (
    req.orderNumber.toLowerCase().includes(lower) ||
    req.customer.name.toLowerCase().includes(lower) ||
    req.customer.phone.replace(/-/g, "").includes(q.replace(/-/g, "")) ||
    req.device.model.toLowerCase().includes(lower)
  );
}

export default function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [allRequests, setAllRequests] = useState<AdminRequest[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results = query.trim()
    ? allRequests.filter((r) => matchRequest(r, query.trim())).slice(0, 8)
    : allRequests.slice(0, 6);

  const navigate = useCallback(
    (req: AdminRequest) => {
      router.push(`/admin/requests/${req.id}`);
      onClose();
    },
    [router, onClose]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
      fetchRequests().then(setAllRequests);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[activeIdx]) { navigate(results[activeIdx]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, results, activeIdx, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 600,
          backgroundColor: "#161616",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          margin: "0 16px",
        }}
      >
        {/* Input row */}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", gap: 10 }}>
          <Search size={18} color="rgba(255,255,255,0.4)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาคำขอ ลูกค้า เบอร์โทร รุ่น iPhone..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#ffffff",
              fontSize: 15,
              fontFamily: "var(--font-prompt), sans-serif",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "rgba(255,255,255,0.4)", display: "flex" }}
            >
              <X size={16} />
            </button>
          )}
          <kbd
            style={{
              backgroundColor: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              padding: "2px 7px",
              fontSize: 11,
              color: "rgba(255,255,255,0.35)",
              fontFamily: "monospace",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: 420, overflowY: "auto" }}>
          {results.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
              ไม่พบผลลัพธ์สำหรับ &quot;{query}&quot;
            </div>
          ) : (
            <>
              {!query && (
                <div style={{ padding: "10px 16px 4px", fontSize: 11, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  คำขอล่าสุด
                </div>
              )}
              {results.map((req, i) => {
                const colors = STATUS_COLORS[req.status];
                const isActive = i === activeIdx;
                return (
                  <button
                    key={req.id}
                    onClick={() => navigate(req)}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      padding: "11px 16px",
                      gap: 12,
                      background: isActive ? "rgba(184,134,11,0.1)" : "transparent",
                      border: "none",
                      borderLeft: isActive ? "2px solid #B8860B" : "2px solid transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background 120ms",
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      backgroundColor: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Smartphone size={16} color="rgba(255,255,255,0.4)" />
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ color: "#ffffff", fontSize: 13, fontWeight: 600 }}>
                          {highlight(req.customer.name, query)}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 20,
                          backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
                          flexShrink: 0,
                        }}>
                          {STATUS_LABELS[req.status]}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <Hash size={11} />
                          {highlight(req.orderNumber, query)}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <Phone size={11} />
                          {highlight(req.customer.phone, query)}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                          {highlight(req.device.model, query)} · {req.device.storage}
                        </span>
                      </div>
                    </div>

                    <ArrowRight size={14} color={isActive ? "#B8860B" : "rgba(255,255,255,0.2)"} style={{ flexShrink: 0 }} />
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "8px 16px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 11,
          color: "rgba(255,255,255,0.25)",
        }}>
          <span><kbd style={{ fontFamily: "monospace" }}>↑↓</kbd> เลือก</span>
          <span><kbd style={{ fontFamily: "monospace" }}>↵</kbd> เปิด</span>
          <span><kbd style={{ fontFamily: "monospace" }}>ESC</kbd> ปิด</span>
          <span style={{ marginLeft: "auto" }}>ค้นหาในข้อมูล {allRequests.length} คำขอ</span>
        </div>
      </div>
    </div>
  );
}
