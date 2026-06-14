"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Printer, ChevronLeft, CheckCircle2, XCircle, Send, RotateCcw, Clock, Package } from "lucide-react";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchQuote, updateQuoteStatus, acceptQuoteAndReserve } from "@/app/actions/quotes";
import type { StockQuote, QuoteStatus } from "@/lib/stock/types";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "ส่งให้ลูกค้าแล้ว",
  accepted: "รับ Order แล้ว",
  rejected: "ลูกค้าปฏิเสธ",
  expired: "หมดอายุ",
  cancelled: "ยกเลิก",
};

const STATUS_COLOR: Record<QuoteStatus, string> = {
  draft: "#94a3b8", sent: "#3b82f6", accepted: "#22c55e",
  rejected: "#ef4444", expired: "#fbbf24", cancelled: "#64748b",
};

function fmt(n: number) { return "฿" + n.toLocaleString("th-TH"); }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}
function fmtDateShort(s: string) {
  return new Date(s).toLocaleString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const c = useThemeColors();
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);

  useEffect(() => {
    fetchQuote(id).then(q => { setQuote(q); setLoading(false); });
  }, [id]);

  async function handleStatus(status: QuoteStatus) {
    if (!quote) return;
    setActing(true);
    await updateQuoteStatus(id, status);
    setQuote(prev => prev ? { ...prev, status } : prev);
    setActionDone(STATUS_LABEL[status]);
    setActing(false);
  }

  async function handleAccept() {
    if (!quote) return;
    if (!confirm(`ยืนยันรับ Order? จะเปลี่ยนสถานะสินค้า ${quote.items.length} รายการเป็น "จองแล้ว"`)) return;
    setActing(true);
    const result = await acceptQuoteAndReserve(id);
    if (result.success) {
      setQuote(prev => prev ? { ...prev, status: "accepted" } : prev);
      setActionDone("รับ Order สำเร็จ");
    }
    setActing(false);
  }

  const cardSt: React.CSSProperties = { background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, padding: "20px 24px" };

  if (loading) return (
    <div style={{ background: c.bg, minHeight: "100vh" }}>
      <StockTopbar title="ใบเสนอราคา" subtitle="กำลังโหลด..." />
    </div>
  );

  if (!quote) return (
    <div style={{ background: c.bg, minHeight: "100vh" }}>
      <StockTopbar title="ใบเสนอราคา" subtitle="ไม่พบข้อมูล" />
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "#ef4444" }}>ไม่พบใบเสนอราคา {id}</p>
      </div>
    </div>
  );

  const statusColor = STATUS_COLOR[quote.status];
  const isExpired = quote.validUntil && quote.validUntil < new Date().toISOString().slice(0, 10);

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title={quote.id} subtitle="ใบเสนอราคา">
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => window.open(`${window.location.origin.replace(/^(https?:\/\/)stock\./, '$1')}/print/quote/${id}`, "_blank")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${c.border}`, background: "none", color: c.text2, fontSize: 13, cursor: "pointer" }}
          >
            <Printer size={14} /> พิมพ์ / PDF
          </button>
          <button onClick={() => router.push("/stock/sales/quote")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${c.border}`, background: "none", color: c.text2, fontSize: 13, cursor: "pointer" }}>
            <ChevronLeft size={14} /> รายการ
          </button>
        </div>
      </StockTopbar>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Action feedback */}
        {actionDone && (
          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "12px 16px", color: "#22c55e", fontSize: 13, fontWeight: 600 }}>
            ✓ {actionDone}
          </div>
        )}

        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={cardSt}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ color: c.text, fontSize: 20, fontWeight: 800, fontFamily: "monospace" }}>{quote.id}</span>
                <span style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${statusColor}20`, color: statusColor }}>
                  {STATUS_LABEL[quote.status]}
                </span>
              </div>
              <p style={{ color: c.text3, fontSize: 13, margin: "0 0 3px" }}>สร้างโดย {quote.createdBy}</p>
              <p style={{ color: c.text3, fontSize: 13, margin: 0 }}>{fmtDateShort(quote.createdAt)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: c.gold, fontSize: 26, fontWeight: 800, margin: "0 0 2px" }}>{fmt(quote.total)}</p>
              {quote.vatRate > 0 && <p style={{ color: c.text3, fontSize: 12, margin: "0 0 4px" }}>รวม VAT {quote.vatRate}%</p>}
              {quote.validUntil && (
                <p style={{ color: isExpired ? "#ef4444" : c.text3, fontSize: 12, margin: 0 }}>
                  {isExpired ? "⚠ หมดอายุแล้ว" : `หมดอายุ ${fmtDate(quote.validUntil)}`}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {!["accepted", "cancelled"].includes(quote.status) && (
            <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap", borderTop: `1px solid ${c.border}`, paddingTop: 16 }}>
              {quote.status === "draft" && (
                <button onClick={() => handleStatus("sent")} disabled={acting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: acting ? 0.6 : 1 }}>
                  <Send size={14} /> ส่งให้ลูกค้า
                </button>
              )}
              {quote.status === "sent" && (
                <>
                  <button onClick={handleAccept} disabled={acting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "none", background: "#22c55e", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: acting ? 0.6 : 1 }}>
                    <CheckCircle2 size={14} /> รับ Order — จองสินค้า
                  </button>
                  <button onClick={() => handleStatus("rejected")} disabled={acting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "none", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: acting ? 0.6 : 1 }}>
                    <XCircle size={14} /> ลูกค้าปฏิเสธ
                  </button>
                </>
              )}
              {(quote.status === "draft" || quote.status === "sent") && (
                <button onClick={() => handleStatus("cancelled")} disabled={acting} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: `1px solid ${c.border}`, background: "none", color: c.text3, fontSize: 12, cursor: "pointer", opacity: acting ? 0.6 : 1 }}>
                  ยกเลิกใบเสนอราคา
                </button>
              )}
              <button onClick={() => router.push(`/stock/sales/quote/new?from=${quote.id}`)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: `1px solid ${c.border}`, background: "none", color: c.text3, fontSize: 12, cursor: "pointer" }}>
                <RotateCcw size={13} /> สร้างใหม่จากใบนี้
              </button>
            </div>
          )}
          {quote.status === "accepted" && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${c.border}`, paddingTop: 16, display: "flex", gap: 8 }}>
              <button onClick={() => router.push("/stock/inventory")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "none", background: c.gold, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <Package size={14} /> ไปที่ Inventory เพื่อดำเนินการขาย
              </button>
              <button onClick={() => router.push(`/stock/sales/quote/new?from=${quote.id}`)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: `1px solid ${c.border}`, background: "none", color: c.text3, fontSize: 12, cursor: "pointer" }}>
                <RotateCcw size={13} /> Duplicate
              </button>
            </div>
          )}
        </motion.div>

        {/* Customer info */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={cardSt}>
          <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>ข้อมูลลูกค้า</p>
          <p style={{ color: c.text, fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>{quote.customerName}</p>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {quote.customerPhone && <span style={{ color: c.text2, fontSize: 13 }}>📞 {quote.customerPhone}</span>}
            {quote.customerEmail && <span style={{ color: c.text2, fontSize: 13 }}>✉ {quote.customerEmail}</span>}
          </div>
          {quote.customerAddress && <p style={{ color: c.text2, fontSize: 13, margin: "6px 0 0" }}>{quote.customerAddress}</p>}
          {quote.customerTaxId && <p style={{ color: c.text3, fontSize: 12, margin: "4px 0 0" }}>เลขผู้เสียภาษี: {quote.customerTaxId}</p>}
        </motion.div>

        {/* Items */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ ...cardSt, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 24px", borderBottom: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>รายการสินค้า</p>
          </div>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ background: c.bg }}>
                {["#", "รายละเอียด", "IMEI", "ราคา", "ส่วนลด", "รวม"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: h === "รวม" || h === "ราคา" || h === "ส่วนลด" ? "right" : "left", fontSize: 11, color: c.text3, fontWeight: 600, borderBottom: `1px solid ${c.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, i) => (
                <tr key={item.stockId} style={{ borderBottom: i < quote.items.length - 1 ? `1px solid ${c.border}` : "none" }}>
                  <td style={{ padding: "12px 16px", color: c.text3, fontSize: 12 }}>{i + 1}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{item.description}</p>
                    <span style={{ color: c.text3, fontSize: 11, fontFamily: "monospace" }}>{item.stockId}</span>
                  </td>
                  <td style={{ padding: "12px 16px", color: c.text3, fontSize: 11, fontFamily: "monospace" }}>{item.imei || "—"}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: c.text2, fontSize: 13 }}>{fmt(item.unitPrice)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: item.discount > 0 ? "#22c55e" : c.text3, fontSize: 13 }}>
                    {item.discount > 0 ? `-${fmt(item.discount)}` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: c.text, fontSize: 14, fontWeight: 700 }}>{fmt(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Totals */}
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${c.border}`, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ minWidth: 220 }}>
              {[
                { label: "ยอดรวมสินค้า", value: fmt(quote.subtotal) },
                ...(quote.discountAmount > 0 ? [{ label: "ส่วนลดรวม", value: `-${fmt(quote.discountAmount)}`, green: true }] : []),
                ...(quote.vatRate > 0 ? [{ label: `VAT ${quote.vatRate}%`, value: `+${fmt(quote.vatAmount)}` }] : []),
                { label: "ยอดรวมสุทธิ", value: fmt(quote.total), bold: true },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: (r as { bold?: boolean }).bold ? "none" : `1px solid ${c.border}` }}>
                  <span style={{ color: c.text2, fontSize: (r as { bold?: boolean }).bold ? 13 : 12, fontWeight: (r as { bold?: boolean }).bold ? 700 : 400 }}>{r.label}</span>
                  <span style={{ color: (r as { bold?: boolean }).bold ? c.gold : (r as { green?: boolean }).green ? "#22c55e" : c.text2, fontSize: (r as { bold?: boolean }).bold ? 15 : 12, fontWeight: (r as { bold?: boolean }).bold ? 800 : 400 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Note & Terms */}
        {(quote.note || quote.terms) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={cardSt}>
            {quote.note && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>หมายเหตุ</p>
                <p style={{ color: c.text2, fontSize: 13, margin: 0 }}>{quote.note}</p>
              </div>
            )}
            {quote.terms && (
              <div>
                <p style={{ color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>เงื่อนไขและข้อตกลง</p>
                <pre style={{ color: c.text3, fontSize: 12, margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{quote.terms}</pre>
              </div>
            )}
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={cardSt}>
          <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
            <Clock size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />Timeline
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.gold, marginTop: 5, flexShrink: 0 }} />
              <div>
                <p style={{ color: c.text2, fontSize: 13, fontWeight: 600, margin: 0 }}>สร้างใบเสนอราคา</p>
                <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>{fmtDateShort(quote.createdAt)} · โดย {quote.createdBy}</p>
              </div>
            </div>
            {quote.status !== "draft" && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLOR[quote.status], marginTop: 5, flexShrink: 0 }} />
                <div>
                  <p style={{ color: c.text2, fontSize: 13, fontWeight: 600, margin: 0 }}>{STATUS_LABEL[quote.status]}</p>
                  <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>{fmtDateShort(quote.updatedAt)}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
