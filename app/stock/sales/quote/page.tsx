"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, FileText, Printer, ChevronRight, Clock, CheckCircle2, XCircle, Ban, RotateCcw } from "lucide-react";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchQuotes, updateQuoteStatus } from "@/app/actions/quotes";
import type { StockQuote, QuoteStatus } from "@/lib/stock/types";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "ส่งแล้ว",
  accepted: "รับ Order",
  rejected: "ปฏิเสธ",
  expired: "หมดอายุ",
  cancelled: "ยกเลิก",
};

const STATUS_COLOR: Record<QuoteStatus, { bg: string; text: string }> = {
  draft:     { bg: "rgba(148,163,184,0.15)", text: "#94a3b8" },
  sent:      { bg: "rgba(59,130,246,0.15)",  text: "#3b82f6" },
  accepted:  { bg: "rgba(34,197,94,0.15)",   text: "#22c55e" },
  rejected:  { bg: "rgba(239,68,68,0.15)",   text: "#ef4444" },
  expired:   { bg: "rgba(251,191,36,0.15)",  text: "#fbbf24" },
  cancelled: { bg: "rgba(100,116,139,0.15)", text: "#64748b" },
};

const TABS: Array<QuoteStatus | "all"> = ["all", "sent", "draft", "accepted", "rejected", "expired", "cancelled"];
const TAB_LABEL: Record<string, string> = {
  all: "ทั้งหมด", ...STATUS_LABEL,
};

function fmt(n: number) { return "฿" + n.toLocaleString("th-TH"); }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export default function QuoteListPage() {
  const c = useThemeColors();
  const router = useRouter();
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<QuoteStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchQuotes().then(d => { setQuotes(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = quotes;
    if (tab !== "all") list = list.filter(q => q.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(x =>
        x.id.toLowerCase().includes(q) ||
        x.customerName.toLowerCase().includes(q) ||
        (x.customerPhone ?? "").includes(q)
      );
    }
    return list;
  }, [quotes, tab, search]);

  const counts = useMemo(() => {
    const m: Partial<Record<QuoteStatus | "all", number>> = { all: quotes.length };
    for (const s of TABS.slice(1)) m[s] = quotes.filter(q => q.status === s).length;
    return m;
  }, [quotes]);

  async function handleCancelQuote(id: string) {
    if (!confirm(`ยืนยันยกเลิกใบเสนอราคา ${id}?`)) return;
    await updateQuoteStatus(id, "cancelled");
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: "cancelled" } : q));
  }

  const cardSt: React.CSSProperties = { background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, overflow: "hidden" };

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="ใบเสนอราคา" subtitle="Quote Management">
        <button
          onClick={() => router.push("/stock/sales/quote/new")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "none", background: c.gold, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          <Plus size={15} /> สร้างใบเสนอราคา
        </button>
      </StockTopbar>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่, ชื่อลูกค้า, เบอร์โทร..."
            style={{ width: "100%", paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 10, border: `1px solid ${c.border}`, background: c.card, color: c.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map(t => {
            const active = tab === t;
            const cnt = counts[t] ?? 0;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${active ? c.gold : c.border}`, background: active ? c.goldBg : "transparent", color: active ? c.gold : c.text2, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}
              >
                {TAB_LABEL[t]} {cnt > 0 && <span style={{ opacity: 0.7 }}>({cnt})</span>}
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <p style={{ color: c.text3, textAlign: "center", padding: 48 }}>กำลังโหลด...</p>
        ) : filtered.length === 0 ? (
          <div style={{ ...cardSt, padding: 48, textAlign: "center" }}>
            <FileText size={40} color={c.text3} style={{ margin: "0 auto 12px" }} />
            <p style={{ color: c.text2, fontWeight: 600, margin: "0 0 4px" }}>ไม่มีใบเสนอราคา</p>
            <p style={{ color: c.text3, fontSize: 13, margin: 0 }}>กด "สร้างใบเสนอราคา" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div style={cardSt}>
            {filtered.map((q, i) => {
              const sc = STATUS_COLOR[q.status];
              const isLast = i === filtered.length - 1;
              return (
                <AnimatePresence key={q.id}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "16px 20px",
                      borderBottom: isLast ? "none" : `1px solid ${c.border}`,
                    }}
                  >
                    {/* Status icon */}
                    <div style={{ flexShrink: 0 }}>
                      {q.status === "accepted" ? <CheckCircle2 size={20} color="#22c55e" /> :
                       q.status === "rejected" || q.status === "cancelled" ? <XCircle size={20} color="#ef4444" /> :
                       q.status === "expired" ? <Clock size={20} color="#fbbf24" /> :
                       q.status === "sent" ? <ChevronRight size={20} color="#3b82f6" /> :
                       <FileText size={20} color={c.text3} />}
                    </div>

                    {/* Main info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                        <span style={{ color: c.text, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{q.id}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.text }}>
                          {STATUS_LABEL[q.status]}
                        </span>
                      </div>
                      <p style={{ color: c.text2, fontSize: 13, margin: "0 0 2px", fontWeight: 600 }}>{q.customerName}</p>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span style={{ color: c.text3, fontSize: 12 }}>{q.items.length} รายการ</span>
                        {q.validUntil && (
                          <span style={{ color: q.status === "sent" && q.validUntil < new Date().toISOString().slice(0, 10) ? "#ef4444" : c.text3, fontSize: 12 }}>
                            หมดอายุ {fmtDate(q.validUntil)}
                          </span>
                        )}
                        <span style={{ color: c.text3, fontSize: 12 }}>{fmtDate(q.createdAt)}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div style={{ flexShrink: 0, textAlign: "right", marginRight: 8 }}>
                      <p style={{ color: c.gold, fontSize: 16, fontWeight: 800, margin: 0 }}>{fmt(q.total)}</p>
                      {q.vatRate > 0 && <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>รวม VAT {q.vatRate}%</p>}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => router.push(`/stock/sales/quote/${q.id}`)}
                        style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${c.border}`, background: "none", color: c.text2, fontSize: 12, cursor: "pointer" }}
                      >
                        ดูรายละเอียด
                      </button>
                      <button
                        onClick={() => window.open(`/print/quote/${q.id}`, "_blank")}
                        title="พิมพ์"
                        style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: "none", color: c.text3, cursor: "pointer" }}
                      >
                        <Printer size={14} />
                      </button>
                      {(q.status === "draft" || q.status === "sent") && (
                        <button
                          onClick={() => handleCancelQuote(q.id)}
                          title="ยกเลิก"
                          style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid rgba(239,68,68,0.3)`, background: "none", color: "#ef4444", cursor: "pointer" }}
                        >
                          <Ban size={14} />
                        </button>
                      )}
                      {(q.status === "rejected" || q.status === "expired" || q.status === "cancelled") && (
                        <button
                          onClick={() => router.push(`/stock/sales/quote/new?from=${q.id}`)}
                          title="สร้างใหม่จากใบนี้"
                          style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${c.border}`, background: "none", color: c.text3, cursor: "pointer" }}
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
