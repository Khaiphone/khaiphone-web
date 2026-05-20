"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronDown, ChevronUp, Check, Plus, X, ExternalLink } from "lucide-react";
import { fetchStockItems, updateStockItem, createManualStock } from "@/app/actions/stock";
import type { StockItem, StockStatus } from "@/app/actions/stock";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

const STATUS_CONFIG: Record<StockStatus, { label: string; bg: string; text: string }> = {
  in_stock:  { label: "รอขาย",      bg: "#EFF6FF", text: "#3B82F6" },
  repairing: { label: "กำลังซ่อม", bg: "#FEF3C7", text: "#D97706" },
  sold:      { label: "ขายแล้ว",   bg: "#D1FAE5", text: "#059669" },
};

const TABS: Array<{ value: StockStatus | "all"; label: string }> = [
  { value: "all",       label: "ทั้งหมด"    },
  { value: "in_stock",  label: "รอขาย"      },
  { value: "repairing", label: "กำลังซ่อม" },
  { value: "sold",      label: "ขายแล้ว"   },
];

const inputSt: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px",
  border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14,
  color: TEXT, fontFamily: "inherit", outline: "none", background: CARD,
};

function fmtDate(iso: string) {
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function ProfitChip({ cost, sell }: { cost: number; sell: number }) {
  const profit = sell - cost;
  const positive = profit >= 0;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: positive ? "#D1FAE5" : "#FEE2E2", color: positive ? "#059669" : "#DC2626" }}>
      {positive ? "+" : ""}฿{profit.toLocaleString("th-TH")}
    </span>
  );
}

const EMPTY_FORM = { model: "", storage: "", color: "", condition: "", costPrice: "", notes: "" };

export default function StockPage() {
  const router = useRouter();
  const [items,    setItems]    = useState<StockItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<StockStatus | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAdd,  setShowAdd]  = useState(false);

  // Edit state
  const [editStatus,    setEditStatus]    = useState<StockStatus>("in_stock");
  const [editSellPrice, setEditSellPrice] = useState("");
  const [editSellDate,  setEditSellDate]  = useState("");
  const [saving,        setSaving]        = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);

  // Add form state
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [adding,  setAdding]  = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    fetchStockItems().then(d => { setItems(d); setLoading(false); });
  }, []);

  function openEdit(item: StockItem) {
    if (expanded === item.id) { setExpanded(null); return; }
    setExpanded(item.id);
    setEditStatus(item.stockStatus);
    setEditSellPrice(item.sellPrice ? String(item.sellPrice) : "");
    setEditSellDate(item.sellDate ?? "");
    setSaveError(null);
  }

  async function handleSave(item: StockItem) {
    setSaving(true);
    setSaveError(null);
    const price = editSellPrice ? Number(editSellPrice) : undefined;
    const result = await updateStockItem(item.id, editStatus, price, editSellDate || undefined);
    if (result.success) {
      setItems(prev => prev.map(x => x.id === item.id ? {
        ...x,
        stockStatus: editStatus,
        sellPrice: editStatus === "sold" ? price : undefined,
        sellDate:  editStatus === "sold" ? (editSellDate || undefined) : undefined,
      } : x));
      setExpanded(null);
    } else {
      setSaveError(result.error ?? "เกิดข้อผิดพลาด");
    }
    setSaving(false);
  }

  async function handleAdd() {
    if (!form.model.trim() || !form.costPrice) return;
    setAdding(true);
    setAddError(null);
    const result = await createManualStock({
      model:     form.model.trim(),
      storage:   form.storage.trim(),
      color:     form.color.trim() || undefined,
      condition: form.condition.trim(),
      costPrice: Number(form.costPrice),
      notes:     form.notes.trim() || undefined,
    });
    if (result.success) {
      const newItem: StockItem = {
        id:          result.id,
        orderNumber: "",
        model:       form.model.trim(),
        storage:     form.storage.trim(),
        color:       form.color.trim() || undefined,
        condition:   form.condition.trim(),
        costPrice:   Number(form.costPrice),
        stockStatus: "in_stock",
        completedAt: new Date().toISOString(),
        source:      "manual",
      };
      setItems(prev => [newItem, ...prev]);
      setForm(EMPTY_FORM);
      setShowAdd(false);
    } else {
      setAddError(result.error ?? "เกิดข้อผิดพลาด");
    }
    setAdding(false);
  }

  const filtered = useMemo(() =>
    tab === "all" ? items : items.filter(x => x.stockStatus === tab),
    [items, tab]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    items.forEach(x => { c[x.stockStatus] = (c[x.stockStatus] || 0) + 1; });
    return c;
  }, [items]);

  const totalCost    = items.reduce((s, x) => s + x.costPrice, 0);
  const soldItems    = items.filter(x => x.stockStatus === "sold");
  const totalRevenue = soldItems.reduce((s, x) => s + (x.sellPrice ?? 0), 0);
  const totalProfit  = totalRevenue - soldItems.reduce((s, x) => s + x.costPrice, 0);

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "52px 16px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}>
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>สต็อคเครื่อง</h1>
              <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>{items.length} เครื่องทั้งหมด</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/stock/inventory"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: 10, background: CARD, color: TEXT2, fontSize: 13, fontWeight: 600, textDecoration: "none" }}
            >
              <ExternalLink size={14} /> ดูสต็อกเต็ม
            </Link>
            <button
              onClick={() => { setShowAdd(true); setAddError(null); setForm(EMPTY_FORM); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", borderRadius: 10, background: GOLD, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            >
              <Plus size={15} /> เพิ่มเครื่อง
            </button>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ background: CARD, border: `1px solid ${GOLD}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0 }}>เพิ่มเครื่องใหม่</p>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT3, display: "flex" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Model */}
              <div>
                <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>รุ่นเครื่อง *</label>
                <input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="เช่น iPhone 14 Pro Max" style={inputSt} />
              </div>

              {/* Storage + Color */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>ความจุ</label>
                  <input value={form.storage} onChange={e => setForm(p => ({ ...p, storage: e.target.value }))} placeholder="เช่น 256GB" style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>สี</label>
                  <input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} placeholder="เช่น Space Black" style={inputSt} />
                </div>
              </div>

              {/* Condition */}
              <div>
                <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>สภาพ</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {["สภาพดีมาก", "สภาพดี", "สภาพพอใช้", "สภาพปานกลาง"].map(c => (
                    <label
                      key={c}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, cursor: "pointer", border: `1px solid ${form.condition === c ? GOLD : BORDER}`, background: form.condition === c ? `${GOLD}10` : BG, fontSize: 12, color: form.condition === c ? GOLD : TEXT2 }}
                    >
                      <input type="radio" checked={form.condition === c} onChange={() => setForm(p => ({ ...p, condition: c }))} style={{ display: "none" }} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>

              {/* Cost price */}
              <div>
                <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>ราคาที่ซื้อมา / ต้นทุน (บาท) *</label>
                <input type="number" value={form.costPrice} onChange={e => setForm(p => ({ ...p, costPrice: e.target.value }))} placeholder="เช่น 18000" style={inputSt} />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>หมายเหตุ (ถ้ามี)</label>
                <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="แหล่งที่มา, รายละเอียดเพิ่มเติม..." style={inputSt} />
              </div>
            </div>

            {addError && <p style={{ color: "#DC2626", fontSize: 12, margin: "10px 0 0" }}>{addError}</p>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "none", color: TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !form.model.trim() || !form.costPrice}
                style={{ padding: "8px 20px", border: "none", borderRadius: 8, background: GOLD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (adding || !form.model.trim() || !form.costPrice) ? 0.5 : 1 }}
              >
                {adding ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        )}

        {/* Summary cards */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {[
              { label: "ต้นทุนรวม",  value: totalCost,    color: "#EF4444" },
              { label: "รายได้รวม",  value: totalRevenue, color: "#059669" },
              { label: "กำไรสุทธิ", value: totalProfit,  color: totalProfit >= 0 ? "#059669" : "#EF4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px" }}>
                <p style={{ color: TEXT3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 6px" }}>{label}</p>
                <p style={{ color, fontSize: 16, fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                  {value < 0 ? "-" : ""}฿{Math.abs(value).toLocaleString("th-TH")}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" } as React.CSSProperties}>
          {TABS.map(({ value, label }) => {
            const active = tab === value;
            const count  = counts[value] ?? 0;
            return (
              <button
                key={value}
                onClick={() => setTab(value)}
                style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 999, fontFamily: "inherit", fontSize: 13, fontWeight: active ? 700 : 500, border: active ? "1px solid rgba(184,134,11,0.3)" : `1px solid ${BORDER}`, background: active ? "#FEF3C7" : CARD, color: active ? "#92400E" : TEXT2, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {label} {count > 0 && <span style={{ opacity: 0.7 }}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Item list */}
        {loading ? (
          <p style={{ color: TEXT3, textAlign: "center", padding: "40px 0" }}>กำลังโหลด...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: TEXT3, textAlign: "center", padding: "40px 0" }}>ไม่มีเครื่องในหมวดนี้</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(item => {
              const cfg = STATUS_CONFIG[item.stockStatus];
              const isExpanded = expanded === item.id;
              return (
                <div key={item.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>

                  {/* Main row */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => openEdit(item)}
                    style={{ padding: "14px 16px", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <p style={{ color: TEXT, fontWeight: 700, fontSize: 14, margin: 0 }}>{item.model}</p>
                        {item.storage && <span style={{ color: TEXT2, fontSize: 12 }}>{item.storage}</span>}
                        {item.color   && <span style={{ color: TEXT3, fontSize: 12 }}>{item.color}</span>}
                        {item.source === "manual" && (
                          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "#F3F4F6", color: TEXT3, fontWeight: 600 }}>เพิ่มเอง</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.text, fontWeight: 600 }}>{cfg.label}</span>
                        <span style={{ color: TEXT3, fontSize: 12 }}>ต้นทุน ฿{item.costPrice.toLocaleString("th-TH")}</span>
                        {item.stockStatus === "sold" && item.sellPrice !== undefined && (
                          <ProfitChip cost={item.costPrice} sell={item.sellPrice} />
                        )}
                      </div>
                      {item.stockStatus === "sold" && item.sellPrice !== undefined && (
                        <p style={{ color: TEXT2, fontSize: 12, margin: "4px 0 0" }}>
                          ขาย ฿{item.sellPrice.toLocaleString("th-TH")}
                          {item.sellDate ? ` · ${fmtDate(item.sellDate)}` : ""}
                        </p>
                      )}
                    </div>
                    <div style={{ color: TEXT3, flexShrink: 0 }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded edit */}
                  {isExpanded && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 16px", background: "#FAFAFA" }}>
                      <p style={{ color: TEXT3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px" }}>อัปเดตสถานะ</p>

                      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                        {(Object.keys(STATUS_CONFIG) as StockStatus[]).map(s => (
                          <label
                            key={s}
                            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 10px", borderRadius: 10, cursor: "pointer", border: `1px solid ${editStatus === s ? STATUS_CONFIG[s].text : BORDER}`, background: editStatus === s ? STATUS_CONFIG[s].bg : CARD, fontSize: 12, fontWeight: editStatus === s ? 700 : 500, color: editStatus === s ? STATUS_CONFIG[s].text : TEXT2 }}
                          >
                            <input type="radio" checked={editStatus === s} onChange={() => setEditStatus(s)} style={{ display: "none" }} />
                            {STATUS_CONFIG[s].label}
                          </label>
                        ))}
                      </div>

                      {editStatus === "sold" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                          <div>
                            <label style={{ color: TEXT2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>ราคาขายออก (บาท)</label>
                            <input type="number" value={editSellPrice} onChange={e => setEditSellPrice(e.target.value)} placeholder="เช่น 22000" style={inputSt} />
                          </div>
                          <div>
                            <label style={{ color: TEXT2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>วันที่ขาย</label>
                            <input type="date" value={editSellDate} onChange={e => setEditSellDate(e.target.value)} style={inputSt} />
                          </div>
                        </div>
                      )}

                      {saveError && <p style={{ color: "#DC2626", fontSize: 12, margin: "0 0 10px" }}>{saveError}</p>}

                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setExpanded(null)} style={{ flex: 1, padding: "10px 0", border: `1px solid ${BORDER}`, borderRadius: 10, background: "none", color: TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                          ยกเลิก
                        </button>
                        <button
                          onClick={() => handleSave(item)}
                          disabled={saving}
                          style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", border: "none", borderRadius: 10, background: GOLD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
                        >
                          <Check size={15} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
