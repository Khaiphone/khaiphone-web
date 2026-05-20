"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Upload, RefreshCw, Tag, Printer, CheckSquare, Battery } from "lucide-react";
import { useThemeColors } from "./ThemeContext";
import StockStatusBadge, { GradeBadge } from "./StatusBadge";
import type { StockItem, StockStatus } from "@/lib/stock/types";
import { STOCK_STATUS_COLORS } from "@/lib/stock/mockData";
import { updateStockStatus, updateStockPrice, markStockSold } from "@/app/actions/stocks";

const TABS = ["รายละเอียด", "รูปภาพ", "เอกสาร", "ประวัติสถานะ"] as const;
type Tab = typeof TABS[number];

const ALL_STATUSES: StockStatus[] = ["รอตรวจ", "พร้อมขาย", "ลงขายแล้ว", "จองแล้ว", "ขายแล้ว", "ส่งคืน", "ตีกลับ/ไม่รับซื้อ"];

interface Props {
  item: StockItem | null;
  onClose: () => void;
  onUpdate: (item: StockItem) => void;
}

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s?: string) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function StockDetailDrawer({ item, onClose, onUpdate }: Props) {
  const c = useThemeColors();
  const [tab, setTab] = useState<Tab>("รายละเอียด");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [editPrice, setEditPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  const totalCost = item.costPrice + item.shippingCost + item.otherCost;
  const profit = item.sellingPrice - totalCost;
  const margin = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(2) : "0";

  async function handleStatusChange(status: StockStatus) {
    setSaving(true);
    await updateStockStatus(item!.id, status, "", "admin");
    onUpdate({ ...item!, status });
    setShowStatusMenu(false);
    setSaving(false);
  }

  async function handlePriceSave() {
    const p = parseInt(priceDraft);
    if (!p || p <= 0) return;
    setSaving(true);
    await updateStockPrice(item!.id, p);
    onUpdate({ ...item!, sellingPrice: p });
    setEditPrice(false);
    setSaving(false);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          position: "fixed", right: 0, top: 0, bottom: 0, width: 380, zIndex: 50,
          background: c.card, borderLeft: `1px solid ${c.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ color: c.gold, fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>{item.id}</span>
              <StockStatusBadge status={item.status} />
            </div>
            <p style={{ color: c.text2, fontSize: 12, margin: 0 }}>{item.model} · {item.storage} · {item.color}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${c.border}`, background: c.card }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: "12px 4px", background: "none", border: "none",
              borderBottom: tab === t ? `2px solid ${c.gold}` : "2px solid transparent",
              color: tab === t ? c.gold : c.text3, fontSize: 12, fontWeight: tab === t ? 700 : 400,
              cursor: "pointer", fontFamily: "inherit", transition: "all 150ms",
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {tab === "รายละเอียด" && (
            <div>
              {/* Device image */}
              <div style={{ background: c.card2, borderRadius: 16, padding: 16, marginBottom: 16, textAlign: "center" }}>
                {item.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photos[0]} alt={item.model} style={{ height: 120, objectFit: "contain", borderRadius: 8 }} />
                ) : (
                  <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: c.text3, fontSize: 40 }}>📱</div>
                )}
              </div>

              {/* Device Info */}
              <Section label="ข้อมูลเครื่อง" c={c}>
                <Row label="รุ่น" value={item.model} c={c} />
                <Row label="ความจุ" value={item.storage} c={c} />
                <Row label="สี" value={item.color} c={c} />
                <Row label="IMEI" value={item.imei} mono c={c} />
                <Row label="Serial Number" value={item.serial} mono c={c} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${c.border}` }}>
                  <span style={{ color: c.text2, fontSize: 13 }}>Battery Health</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 60, height: 8, borderRadius: 4, background: c.border, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${item.batteryHealth}%`, background: item.batteryHealth >= 85 ? "#22c55e" : item.batteryHealth >= 70 ? "#facc15" : "#ef4444", borderRadius: 4 }} />
                    </div>
                    <span style={{ color: c.text, fontSize: 13, fontWeight: 600 }}>{item.batteryHealth}%</span>
                  </div>
                </div>
                <Row label="Cycle Count" value={String(item.cycleCount)} c={c} />
                <Row label="iCloud Status" value={item.icloudStatus} c={c} />
                <Row label="Carrier Lock" value={item.carrierLock} c={c} />
                <Row label="อุปกรณ์ที่มี" value={item.accessories} c={c} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                  <span style={{ color: c.text2, fontSize: 13 }}>เกรด</span>
                  <GradeBadge grade={item.grade} />
                </div>
              </Section>

              {/* Purchase Info */}
              <Section label="ข้อมูลรับซื้อ" c={c}>
                {item.requestRef && <Row label="เลขคำขอ" value={item.requestRef} c={c} mono />}
                <Row label="ผู้ขาย" value={item.sellerName} c={c} />
                <Row label="เบอร์โทร" value={item.sellerPhone} c={c} />
                <Row label="ราคาประเมิน" value={`฿${fmt(item.costPrice)}`} c={c} />
                <Row label="ช่องทาง" value={item.sourceChannel} c={c} />
                <Row label="วันที่รับเข้า" value={fmtDate(item.receivedAt)} c={c} />
                {item.inspector && <Row label="ผู้ตรวจ" value={item.inspector} c={c} />}
              </Section>

              {/* Cost / Profit */}
              <Section label="ต้นทุน / กำไร" c={c}>
                <div style={{ background: c.card2, borderRadius: 12, padding: 14, marginBottom: 4 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[
                      { label: "ต้นทุนสินค้า", value: `฿${fmt(item.costPrice)}` },
                      { label: "ค่าส่ง", value: `฿${fmt(item.shippingCost)}` },
                      { label: "ค่าใช้จ่ายอื่น", value: `฿${fmt(item.otherCost)}` },
                      { label: "ต้นทุนรวม", value: `฿${fmt(totalCost)}` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ color: c.text3, fontSize: 11, margin: "0 0 2px" }}>{label}</p>
                        <p style={{ color: c.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <p style={{ color: c.text3, fontSize: 11, margin: "0 0 2px" }}>ราคาขาย</p>
                      {editPrice ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input
                            value={priceDraft} onChange={e => setPriceDraft(e.target.value)}
                            style={{ background: c.card, border: `1px solid ${c.gold}`, borderRadius: 8, padding: "4px 10px", color: c.text, fontSize: 14, width: 100, fontFamily: "inherit", outline: "none" }}
                          />
                          <button onClick={handlePriceSave} disabled={saving} style={{ background: c.gold, border: "none", borderRadius: 8, padding: "4px 10px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>บันทึก</button>
                          <button onClick={() => setEditPrice(false)} style={{ background: "none", border: "none", color: c.text3, cursor: "pointer", fontSize: 12 }}>ยกเลิก</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <p style={{ color: c.gold, fontSize: 18, fontWeight: 800, margin: 0 }}>฿{fmt(item.sellingPrice)}</p>
                          <button onClick={() => { setPriceDraft(String(item.sellingPrice)); setEditPrice(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex", padding: 0 }}>
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ color: c.text3, fontSize: 11, margin: "0 0 2px" }}>กำไร / มาร์จิ้น</p>
                      <p style={{ color: profit >= 0 ? "#22c55e" : "#ef4444", fontSize: 16, fontWeight: 700, margin: 0 }}>฿{fmt(profit)}</p>
                      <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>{margin}%</p>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {tab === "รูปภาพ" && (
            <div>
              {item.photos.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {item.photos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12, border: `1px solid ${c.border}` }} />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "48px 0", color: c.text3 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                  <p style={{ margin: 0 }}>ยังไม่มีรูปภาพ</p>
                </div>
              )}
            </div>
          )}

          {tab === "เอกสาร" && (
            <div style={{ textAlign: "center", padding: "48px 0", color: c.text3 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <p style={{ margin: 0 }}>ยังไม่มีเอกสาร</p>
            </div>
          )}

          {tab === "ประวัติสถานะ" && (
            <div>
              {item.statusLog.map((log, i) => {
                const color = STOCK_STATUS_COLORS[log.status] ?? "#6b7280";
                return (
                  <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16, position: "relative" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 4 }} />
                      {i < item.statusLog.length - 1 && <div style={{ width: 2, flex: 1, background: c.border, marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <StockStatusBadge status={log.status as StockStatus} />
                        <span style={{ color: c.text3, fontSize: 11 }}>{log.by}</span>
                      </div>
                      {log.note && <p style={{ color: c.text2, fontSize: 12, margin: "4px 0 0" }}>{log.note}</p>}
                      <p style={{ color: c.text3, fontSize: 11, margin: "4px 0 0" }}>{fmtDate(log.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${c.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {[
              { icon: Edit2, label: "แก้ไขข้อมูล", action: () => {} },
              { icon: Upload, label: "อัปโหลดรูป", action: () => {} },
              { icon: RefreshCw, label: "เปลี่ยนสถานะ", action: () => setShowStatusMenu(v => !v) },
              { icon: Tag, label: "ตั้งราคาขาย", action: () => { setPriceDraft(String(item.sellingPrice)); setEditPrice(true); setTab("รายละเอียด"); } },
            ].map(({ icon: Icon, label, action }) => (
              <button key={label} onClick={action} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 8px", borderRadius: 10, border: `1px solid ${c.border}`,
                background: c.card2, color: c.text2, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* Status dropdown */}
          {showStatusMenu && (
            <div style={{ marginBottom: 8, background: c.card2, borderRadius: 12, border: `1px solid ${c.border}`, overflow: "hidden" }}>
              {ALL_STATUSES.map(s => (
                <button key={s} onClick={() => handleStatusChange(s)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", background: item.status === s ? c.goldBg : "transparent",
                  border: "none", cursor: "pointer", fontFamily: "inherit",
                  borderBottom: `1px solid ${c.border}`,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: STOCK_STATUS_COLORS[s] ?? "#6b7280" }} />
                  <span style={{ color: item.status === s ? c.gold : c.text2, fontSize: 13 }}>{s}</span>
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", borderRadius: 10, border: `1px solid ${c.border}`, background: "none", color: c.text2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <Printer size={14} />
              พิมพ์หน้าราคา
            </button>
            <button
              onClick={() => handleStatusChange("ขายแล้ว")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", borderRadius: 10, border: "none", background: "#ef444418", color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              <CheckSquare size={14} />
              กำหนดว่าขายแล้ว
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({ label, children, c }: { label: string; children: React.ReactNode; c: ReturnType<typeof useThemeColors> }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ color: c.text3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>{label}</p>
      <div style={{ background: c.card2, borderRadius: 12, padding: "4px 14px" }}>{children}</div>
    </div>
  );
}

function Row({ label, value, mono, c }: { label: string; value: string; mono?: boolean; c: ReturnType<typeof useThemeColors> }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${c.border}` }}>
      <span style={{ color: c.text2, fontSize: 13 }}>{label}</span>
      <span style={{ color: c.text, fontSize: 13, fontFamily: mono ? "monospace" : "inherit", maxWidth: "55%", textAlign: "right", wordBreak: "break-all" }}>{value || "-"}</span>
    </div>
  );
}

// suppress unused import warning
const _Battery = Battery;
