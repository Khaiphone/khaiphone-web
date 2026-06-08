"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { CheckCircle2, Circle, Search, ChevronLeft, ClipboardCheck, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { GradeBadge } from "@/components/stock/StatusBadge";
import { fetchStockItems } from "@/app/actions/stocks";
import { useRouter } from "next/navigation";
import type { StockItem, StockStatus } from "@/lib/stock/types";

const ACTIVE_STATUSES = new Set<StockStatus>(["รอตรวจ", "พร้อมขาย", "ลงขายแล้ว", "จองแล้ว"]);

type Phase = "idle" | "counting" | "done";

export default function StockCountPage() {
  const c = useThemeColors();
  const router = useRouter();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("idle");
  const [found, setFound] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStockItems()
      .then(data => setItems(data.filter(s => ACTIVE_STATUSES.has(s.status))))
      .finally(() => setLoading(false));
  }, []);

  const activeItems = useMemo(() => items, [items]);

  const filtered = useMemo(() => {
    if (!query.trim()) return activeItems;
    const q = query.toLowerCase();
    return activeItems.filter(s =>
      s.id.toLowerCase().includes(q) ||
      s.model.toLowerCase().includes(q) ||
      s.imei.includes(q) ||
      s.serial.toLowerCase().includes(q) ||
      s.color.toLowerCase().includes(q)
    );
  }, [activeItems, query]);

  const notFound = useMemo(() => activeItems.filter(s => !found.has(s.id)), [activeItems, found]);
  const foundList = useMemo(() => activeItems.filter(s => found.has(s.id)), [activeItems, found]);

  function startCount() {
    setFound(new Set());
    setQuery("");
    setPhase("counting");
    setStartedAt(new Date());
    setTimeout(() => searchRef.current?.focus(), 100);
  }

  function toggleFound(id: string) {
    setFound(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function finishCount() {
    setPhase("done");
    setQuery("");
  }

  function resetCount() {
    setFound(new Set());
    setQuery("");
    setPhase("idle");
    setStartedAt(null);
  }

  const pct = activeItems.length > 0 ? Math.round((found.size / activeItems.length) * 100) : 0;

  const cardSt: React.CSSProperties = { background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}` };
  const btnSt: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" };

  if (loading) return (
    <div style={{ background: c.bg, minHeight: "100vh" }}>
      <StockTopbar title="นับสต็อค" subtitle="ตรวจนับเครื่องจริง" />
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <p style={{ color: c.text3 }}>กำลังโหลด...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="นับสต็อค" subtitle="ตรวจนับเครื่องจริงกับระบบ" />

      <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>

        {/* ── IDLE ── */}
        {phase === "idle" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={cardSt}>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${c.gold}18`, border: `2px solid ${c.gold}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <ClipboardCheck size={32} color={c.gold} />
              </div>
              <h2 style={{ color: c.text, fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>นับสต็อค</h2>
              <p style={{ color: c.text2, margin: "0 0 6px" }}>เปรียบเทียบเครื่องที่มีจริงกับที่อยู่ในระบบ</p>
              <p style={{ color: c.text3, fontSize: 13, margin: "0 0 28px" }}>
                เครื่องที่ต้องนับ <strong style={{ color: c.gold }}>{activeItems.length} เครื่อง</strong>
                {" "}(สถานะ: รอตรวจ, พร้อมขาย, ลงขายแล้ว, จองแล้ว)
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button onClick={() => router.back()} style={{ ...btnSt, background: "none", border: `1px solid ${c.border}`, color: c.text2 }}>
                  <ChevronLeft size={16} /> ย้อนกลับ
                </button>
                <button onClick={startCount} style={{ ...btnSt, background: c.gold, color: "#000" }}>
                  <ClipboardCheck size={16} /> เริ่มนับ
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── COUNTING ── */}
        {phase === "counting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Progress bar */}
            <div style={{ ...cardSt, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 20 }}>
                  <div>
                    <p style={{ color: c.text3, fontSize: 11, margin: "0 0 2px" }}>พบแล้ว</p>
                    <p style={{ color: "#22c55e", fontSize: 22, fontWeight: 800, margin: 0 }}>{found.size}</p>
                  </div>
                  <div>
                    <p style={{ color: c.text3, fontSize: 11, margin: "0 0 2px" }}>รอนับ</p>
                    <p style={{ color: c.gold, fontSize: 22, fontWeight: 800, margin: 0 }}>{activeItems.length - found.size}</p>
                  </div>
                  <div>
                    <p style={{ color: c.text3, fontSize: 11, margin: "0 0 2px" }}>ทั้งหมด</p>
                    <p style={{ color: c.text, fontSize: 22, fontWeight: 800, margin: 0 }}>{activeItems.length}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={resetCount} style={{ ...btnSt, background: "none", border: `1px solid ${c.border}`, color: c.text3, padding: "9px 14px" }}>
                    <RotateCcw size={14} /> เริ่มใหม่
                  </button>
                  <button onClick={finishCount} style={{ ...btnSt, background: c.gold, color: "#000", padding: "9px 20px" }}>
                    สรุปผล
                  </button>
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: c.border, overflow: "hidden" }}>
                <motion.div
                  style={{ height: "100%", borderRadius: 4, background: "#22c55e" }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p style={{ color: c.text3, fontSize: 11, margin: "6px 0 0", textAlign: "right" }}>{pct}%</p>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ค้นหา IMEI, Serial, รุ่น, รหัสสต็อค..."
                style={{ width: "100%", paddingLeft: 36, paddingRight: 14, paddingTop: 11, paddingBottom: 11, borderRadius: 12, border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>

            {/* Item list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <AnimatePresence>
                {filtered.length === 0 && (
                  <p style={{ color: c.text3, textAlign: "center", padding: 24 }}>ไม่พบรายการ</p>
                )}
                {filtered.map(item => {
                  const isFound = found.has(item.id);
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                        borderRadius: 14, border: `1.5px solid ${isFound ? "#22c55e40" : c.border}`,
                        background: isFound ? "rgba(34,197,94,0.06)" : c.card,
                        cursor: "pointer", transition: "all 150ms",
                      }}
                      onClick={() => toggleFound(item.id)}
                    >
                      <div style={{ flexShrink: 0 }}>
                        {isFound
                          ? <CheckCircle2 size={26} color="#22c55e" />
                          : <Circle size={26} color={c.border} />
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ color: c.text, fontWeight: 700, fontSize: 14 }}>{item.model}</span>
                          <GradeBadge grade={item.grade} />
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                          <span style={{ color: c.text3, fontSize: 12, fontFamily: "monospace" }}>{item.id}</span>
                          {item.storage && <span style={{ color: c.text3, fontSize: 12 }}>{item.storage}</span>}
                          {item.color && <span style={{ color: c.text3, fontSize: 12 }}>{item.color}</span>}
                        </div>
                        {item.imei && (
                          <span style={{ color: c.text3, fontSize: 11, fontFamily: "monospace" }}>IMEI: {item.imei}</span>
                        )}
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                          background: isFound ? "rgba(34,197,94,0.12)" : `${c.gold}18`,
                          color: isFound ? "#16a34a" : c.gold,
                        }}>
                          {isFound ? "พบ" : "รอนับ"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── DONE / SUMMARY ── */}
        {phase === "done" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header summary */}
            <div style={{ ...cardSt, marginBottom: 20, textAlign: "center" }}>
              <p style={{ color: c.text3, fontSize: 12, margin: "0 0 12px" }}>
                {startedAt && `เริ่มนับ ${startedAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 32, marginBottom: 20 }}>
                <div>
                  <p style={{ color: "#22c55e", fontSize: 32, fontWeight: 800, margin: "0 0 4px" }}>{foundList.length}</p>
                  <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>✅ พบครบ</p>
                </div>
                <div>
                  <p style={{ color: "#ef4444", fontSize: 32, fontWeight: 800, margin: "0 0 4px" }}>{notFound.length}</p>
                  <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>❌ ไม่พบ</p>
                </div>
                <div>
                  <p style={{ color: c.text, fontSize: 32, fontWeight: 800, margin: "0 0 4px" }}>{activeItems.length}</p>
                  <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>ทั้งหมด</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={resetCount} style={{ ...btnSt, background: "none", border: `1px solid ${c.border}`, color: c.text2 }}>
                  <RotateCcw size={14} /> นับใหม่
                </button>
                <button onClick={() => setPhase("counting")} style={{ ...btnSt, background: c.card2, border: `1px solid ${c.border}`, color: c.text }}>
                  กลับไปนับต่อ
                </button>
              </div>
            </div>

            {/* ไม่พบ */}
            {notFound.length > 0 && (
              <div style={{ ...cardSt, marginBottom: 16, border: `1px solid rgba(239,68,68,0.3)` }}>
                <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 700, margin: "0 0 14px" }}>
                  ❌ ไม่พบในคลัง — {notFound.length} เครื่อง
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {notFound.map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(239,68,68,0.05)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.15)" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          <span style={{ color: c.text, fontWeight: 700, fontSize: 13 }}>{item.model}</span>
                          <GradeBadge grade={item.grade} />
                        </div>
                        <span style={{ color: c.text3, fontSize: 11, fontFamily: "monospace" }}>{item.id} · {item.color} {item.storage}</span>
                        {item.imei && <span style={{ color: c.text3, fontSize: 11, display: "block", fontFamily: "monospace" }}>IMEI: {item.imei}</span>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "rgba(239,68,68,0.12)", color: "#dc2626" }}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* พบแล้ว */}
            {foundList.length > 0 && (
              <div style={cardSt}>
                <p style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, margin: "0 0 14px" }}>
                  ✅ พบในคลัง — {foundList.length} เครื่อง
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {foundList.map(item => (
                    <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(34,197,94,0.05)", borderRadius: 10, border: "1px solid rgba(34,197,94,0.15)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: c.text, fontSize: 13, fontWeight: 600 }}>{item.model}</span>
                        <span style={{ color: c.text3, fontSize: 11, fontFamily: "monospace" }}>{item.id}</span>
                        {item.color && <span style={{ color: c.text3, fontSize: 11 }}>{item.color}</span>}
                      </div>
                      <GradeBadge grade={item.grade} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
