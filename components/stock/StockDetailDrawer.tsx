"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Edit2, Upload, RefreshCw, Tag, Printer, CheckSquare, Save, ChevronLeft, ExternalLink, Truck } from "lucide-react";
import { useThemeColors, useStockTheme } from "./ThemeContext";
import StockStatusBadge, { GradeBadge } from "./StatusBadge";
import type { StockItem, StockStatus } from "@/lib/stock/types";
import { STOCK_STATUS_COLORS } from "@/lib/stock/constants";
import { updateStockStatus, updateStockPrice, updateStockItem, updateStockPhotos, updateStockDocuments, logDocumentView, confirmDelivery, confirmStockRecheck } from "@/app/actions/stocks";
import SellModal from "./SellModal";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import { validateImageFiles, validateImageFile } from "@/lib/validate-file";
import { getProductImage } from "@/lib/product-image";

const TABS = ["รายละเอียด", "รูปภาพ", "เอกสาร", "ประวัติ"] as const;
type Tab = typeof TABS[number];

const ALL_STATUSES: StockStatus[] = ["รอตรวจ", "พร้อมขาย", "ลงขายแล้ว", "จองแล้ว", "ขายแล้ว", "ส่งคืน", "ตีกลับ/ไม่รับซื้อ"];

interface Props {
  item: StockItem | null;
  onClose: () => void;
  onUpdate: (item: StockItem) => void;
}

interface EditDraft {
  model: string; storage: string; color: string; grade: string;
  batteryHealth: string; cycleCount: string; icloudStatus: string;
  carrierLock: string; accessories: string;
  costPrice: string; shippingCost: string; otherCost: string; sellingPrice: string;
  sellerName: string; sellerPhone: string; sourceChannel: string;
}

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s?: string) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function printPriceTag(item: StockItem) {
  const totalCost = item.costPrice + item.shippingCost + item.otherCost;
  const profit = item.sellingPrice - totalCost;
  const w = window.open("", "_blank", "width=420,height=320");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>ป้ายราคา ${item.id}</title>
  <style>
    body { font-family: -apple-system, sans-serif; margin: 24px; color: #111; }
    .id { font-size: 11px; color: #888; letter-spacing: 0.06em; margin-bottom: 4px; }
    .model { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
    .sub { font-size: 14px; color: #555; margin-bottom: 10px; }
    .grade { display: inline-block; padding: 2px 10px; border: 1.5px solid #B8860B; border-radius: 4px; font-size: 12px; font-weight: 700; color: #B8860B; margin-bottom: 12px; }
    .price { font-size: 36px; font-weight: 900; color: #B8860B; margin-bottom: 4px; }
    hr { border: none; border-top: 1px solid #eee; margin: 12px 0; }
    .row { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 4px; }
    .profit { color: ${profit >= 0 ? "#22c55e" : "#ef4444"}; font-weight: 700; }
  </style></head><body>
  <div class="id">${item.id}</div>
  <div class="model">${item.model}</div>
  <div class="sub">${[item.storage, item.color].filter(Boolean).join(" · ")}</div>
  <div class="grade">เกรด ${item.grade}</div>
  <div class="price">฿${fmt(item.sellingPrice)}</div>
  <hr/>
  <div class="row"><span>Battery Health</span><span>${item.batteryHealth}%</span></div>
  <div class="row"><span>iCloud</span><span>${item.icloudStatus}</span></div>
  <div class="row"><span>ต้นทุนรวม</span><span>฿${fmt(totalCost)}</span></div>
  <div class="row"><span>กำไร</span><span class="profit">฿${fmt(profit)}</span></div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
}

export default function StockDetailDrawer({ item, onClose, onUpdate }: Props) {
  const c = useThemeColors();
  const { theme } = useStockTheme();
  const isDark = theme === "dark";
  const [tab, setTab] = useState<Tab>("รายละเอียด");
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [editPrice, setEditPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocErr, setUploadDocErr] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceDraftModal, setPriceDraftModal] = useState("");
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState("");
  const [deliveryChannelDraft, setDeliveryChannelDraft] = useState("หน้าร้าน");
  const [deliveryAddressDraft, setDeliveryAddressDraft] = useState("");
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [showRecheck, setShowRecheck] = useState(false);
  const [recheckDraft, setRecheckDraft] = useState<{
    imei: string; serial: string; grade: string;
    batteryHealth: number; cycleCount: number; inspector: string; note: string;
  }>({
    imei: item?.imei ?? "",
    serial: item?.serial ?? "",
    grade: item?.grade ?? "A",
    batteryHealth: item?.batteryHealth ?? 0,
    cycleCount: item?.cycleCount ?? 0,
    inspector: item?.inspector ?? "",
    note: "",
  });
  const [recheckCriteria, setRecheckCriteria] = useState<{ label: string; stated: string; fieldActual: string; stockActual: string; pass: boolean; verified: boolean }[]>(
    (item?.inspectionSnapshot?.criteria ?? []).map(c => ({ label: c.label, stated: c.stated, fieldActual: c.actual, stockActual: c.actual, pass: c.pass, verified: false }))
  );
  const [recheckFunctional, setRecheckFunctional] = useState<{ label: string; pass: boolean; verified: boolean }[]>(
    (item?.inspectionSnapshot?.functionalTests ?? []).map(t => ({ ...t, verified: false }))
  );
  const [recheckSaving, setRecheckSaving] = useState(false);
  const [recheckErr, setRecheckErr] = useState<string | null>(null);

  if (!item) return null;

  const totalCost = item.costPrice + item.shippingCost + item.otherCost;
  const profit = item.sellingPrice - totalCost;
  const margin = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(2) : "0";

  function openEdit() {
    setEditDraft({
      model: item!.model, storage: item!.storage, color: item!.color, grade: item!.grade,
      batteryHealth: String(item!.batteryHealth), cycleCount: String(item!.cycleCount),
      icloudStatus: item!.icloudStatus, carrierLock: item!.carrierLock, accessories: item!.accessories,
      costPrice: String(item!.costPrice), shippingCost: String(item!.shippingCost),
      otherCost: String(item!.otherCost), sellingPrice: String(item!.sellingPrice),
      sellerName: item!.sellerName, sellerPhone: item!.sellerPhone, sourceChannel: item!.sourceChannel,
    });
    setEditMode(true);
  }

  async function handleEditSave() {
    if (!editDraft) return;
    setSaving(true);
    const updates = {
      model: editDraft.model.trim(), storage: editDraft.storage,
      color: editDraft.color.trim(), grade: editDraft.grade,
      batteryHealth: parseInt(editDraft.batteryHealth) || 0,
      cycleCount: parseInt(editDraft.cycleCount) || 0,
      icloudStatus: editDraft.icloudStatus, carrierLock: editDraft.carrierLock,
      accessories: editDraft.accessories.trim(),
      costPrice: parseInt(editDraft.costPrice) || 0,
      shippingCost: parseInt(editDraft.shippingCost) || 0,
      otherCost: parseInt(editDraft.otherCost) || 0,
      sellingPrice: parseInt(editDraft.sellingPrice) || 0,
      sellerName: editDraft.sellerName.trim(), sellerPhone: editDraft.sellerPhone.trim(),
      sourceChannel: editDraft.sourceChannel,
    };
    await updateStockItem(item!.id, updates);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUpdate({ ...item!, ...updates } as any);
    setEditMode(false);
    setSaving(false);
  }

  function openSellModal() {
    setShowStatusMenu(false);
    setShowSellModal(true);
  }

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

  async function handlePhotoUpload(files: FileList) {
    if (!files.length) return;
    const check = validateImageFiles(Array.from(files));
    if (!check.valid) { setUploadErr(check.error); return; }
    setUploading(true);
    setUploadErr(null);
    const urls: string[] = [...item!.photos];
    for (const raw of Array.from(files)) {
      const file = await compressImage(raw);
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `stocks/${item!.id}/${Date.now()}-${safeName}`;
      const { data, error } = await supabase.storage.from("stock-photos").upload(path, file, { upsert: true });
      if (error) { setUploadErr(error.message); continue; }
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("stock-photos").getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }
    await updateStockPhotos(item!.id, urls);
    onUpdate({ ...item!, photos: urls });
    setUploading(false);
  }

  async function handleDocumentUpload(files: FileList) {
    if (!files.length) return;
    const check = validateImageFiles(Array.from(files));
    if (!check.valid) { setUploadDocErr(check.error); return; }
    setUploadingDoc(true);
    setUploadDocErr(null);
    const urls: string[] = [...(item!.documents ?? [])];
    for (const raw of Array.from(files)) {
      const file = await compressImage(raw);
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `stocks/${item!.id}/docs/${Date.now()}-${safeName}`;
      const { data, error } = await supabase.storage.from("stock-photos").upload(path, file, { upsert: true });
      if (error) { setUploadDocErr(error.message); continue; }
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("stock-photos").getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }
    await updateStockDocuments(item!.id, urls);
    onUpdate({ ...item!, documents: urls });
    setUploadingDoc(false);
  }

  async function handleDocumentDelete(url: string) {
    const urls = (item!.documents ?? []).filter(u => u !== url);
    await updateStockDocuments(item!.id, urls);
    onUpdate({ ...item!, documents: urls });
  }

  const inputSt: React.CSSProperties = {
    background: c.card, border: `1px solid ${c.border}`, borderRadius: 8,
    padding: "8px 10px", color: c.text, fontSize: 13, fontFamily: "inherit",
    outline: "none", width: "100%", boxSizing: "border-box",
  };
  const labelSt: React.CSSProperties = { color: c.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 };

  function edSet(field: keyof EditDraft, value: string) {
    setEditDraft(d => d ? { ...d, [field]: value } : d);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          position: "fixed", right: 0, top: 0, bottom: 0, width: 400, zIndex: 50,
          background: c.card, borderLeft: `1px solid ${c.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Hidden photo input */}
        <input
          ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
          onChange={e => e.target.files && handlePhotoUpload(e.target.files)}
        />

        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            {editMode && (
              <button onClick={() => setEditMode(false)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex", alignItems: "center", gap: 4, padding: "0 0 6px", fontSize: 12 }}>
                <ChevronLeft size={14} /> กลับ
              </button>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ color: c.gold, fontSize: 13, fontWeight: 700, fontFamily: "monospace" }}>{item.id}</span>
              {!editMode && <StockStatusBadge status={item.status} />}
              {editMode && <span style={{ color: c.gold, fontSize: 11, fontWeight: 600 }}>โหมดแก้ไข</span>}
            </div>
            <p style={{ color: c.text2, fontSize: 12, margin: 0 }}>{item.model} · {item.storage} · {item.color}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs — hidden in edit mode */}
        {!editMode && (
          <div style={{ display: "flex", borderBottom: `1px solid ${c.border}`, background: c.card, flexShrink: 0 }}>
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
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>

          {/* ─── Edit Mode ─── */}
          {editMode && editDraft && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Device info */}
              <Section label="ข้อมูลเครื่อง" c={c}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "10px 0" }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelSt}>รุ่น</label>
                    <input value={editDraft.model} onChange={e => edSet("model", e.target.value)} style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>ความจุ</label>
                    <select value={editDraft.storage} onChange={e => edSet("storage", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                      {["64GB","128GB","256GB","512GB","1TB"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>สี</label>
                    <input value={editDraft.color} onChange={e => edSet("color", e.target.value)} style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>เกรด</label>
                    <select value={editDraft.grade} onChange={e => edSet("grade", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                      {["A","A-","B+","B","B-","C"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Battery Health (%)</label>
                    <input type="number" value={editDraft.batteryHealth} onChange={e => edSet("batteryHealth", e.target.value)} min="0" max="100" style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>Cycle Count</label>
                    <input type="number" value={editDraft.cycleCount} onChange={e => edSet("cycleCount", e.target.value)} min="0" style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>iCloud Status</label>
                    <select value={editDraft.icloudStatus} onChange={e => edSet("icloudStatus", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                      {["ปลอดล็อกแล้ว","ยังไม่ออก iCloud","ไม่ทราบ"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelSt}>Carrier Lock</label>
                    <select value={editDraft.carrierLock} onChange={e => edSet("carrierLock", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                      {["ไม่มี (Unlocked)","AIS","DTAC","TRUE","มี (Locked)"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelSt}>อุปกรณ์ที่มี</label>
                    <input value={editDraft.accessories} onChange={e => edSet("accessories", e.target.value)} style={inputSt} />
                  </div>
                </div>
              </Section>

              {/* Seller info */}
              <Section label="ข้อมูลรับซื้อ" c={c}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "10px 0" }}>
                  <div>
                    <label style={labelSt}>ชื่อผู้ขาย</label>
                    <input value={editDraft.sellerName} onChange={e => edSet("sellerName", e.target.value)} style={inputSt} />
                  </div>
                  <div>
                    <label style={labelSt}>เบอร์โทร</label>
                    <input value={editDraft.sellerPhone} onChange={e => edSet("sellerPhone", e.target.value)} style={inputSt} />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelSt}>ช่องทาง</label>
                    <select value={editDraft.sourceChannel} onChange={e => edSet("sourceChannel", e.target.value)} style={{ ...inputSt, cursor: "pointer" }}>
                      {["หน้าร้าน","เว็บไซต์","LINE OA","Facebook","Shopee","โทรศัพท์"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </Section>

              {/* Pricing */}
              <Section label="ราคา" c={c}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "10px 0" }}>
                  {([["ราคารับซื้อ (฿)", "costPrice"], ["ค่าส่ง (฿)", "shippingCost"], ["ค่าอื่นๆ (฿)", "otherCost"], ["ราคาขาย (฿)", "sellingPrice"]] as [string, keyof EditDraft][]).map(([lbl, field]) => (
                    <div key={field}>
                      <label style={labelSt}>{lbl}</label>
                      <input type="number" value={editDraft[field]} onChange={e => edSet(field, e.target.value)} style={inputSt} />
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* ─── Normal tabs ─── */}
          {!editMode && (
            <>
              {tab === "รายละเอียด" && (
                <div>
                  {/* ─── Re-check banner (รอตรวจ only) ─── */}
                  {item.status === "รอตรวจ" && (
                    <div style={{ marginBottom: 16 }}>
                      {!showRecheck ? (
                        <button
                          onClick={() => setShowRecheck(true)}
                          style={{ width: "100%", padding: "14px 16px", background: "linear-gradient(135deg,#1d4ed8,#2563eb)", border: "none", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 20 }}>🔍</span>
                            <div style={{ textAlign: "left" }}>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>รีเช็คสินค้า</p>
                              <p style={{ margin: 0, fontSize: 11, opacity: 0.8 }}>ยืนยันสภาพ · อัปเดตเกรด · เปลี่ยนเป็นพร้อมขาย</p>
                            </div>
                          </div>
                          <span style={{ fontSize: 18, opacity: 0.7 }}>›</span>
                        </button>
                      ) : (
                        <div style={{ background: c.card2, border: `1px solid ${c.border2}`, borderRadius: 12, padding: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.text }}>🔍 รีเช็คสินค้า</p>
                            <button onClick={() => { setShowRecheck(false); setRecheckErr(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, fontSize: 18, padding: 0 }}>×</button>
                          </div>

                          {/* IMEI + Serial */}
                          {item.inspectionSnapshot && (
                            <div style={{ marginBottom: 12, padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius: 8, fontSize: 11, color: c.text3 }}>
                              <p style={{ margin: "0 0 2px", fontWeight: 600 }}>ข้อมูลอ้างอิงจากการตรวจรับ</p>
                              <p style={{ margin: 0 }}>IMEI: <span style={{ fontFamily: "monospace", color: c.text2 }}>{item.inspectionSnapshot.imei ?? "—"}</span></p>
                              <p style={{ margin: 0 }}>Serial: <span style={{ fontFamily: "monospace", color: c.text2 }}>{item.inspectionSnapshot.serial ?? "—"}</span></p>
                            </div>
                          )}

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                            {[
                              { label: "IMEI", key: "imei", mono: true },
                              { label: "Serial Number", key: "serial", mono: true },
                            ].map(({ label, key, mono }) => (
                              <div key={key}>
                                <p style={{ margin: "0 0 4px", fontSize: 11, color: c.text3 }}>{label}</p>
                                <input
                                  value={recheckDraft[key as keyof typeof recheckDraft] as string}
                                  onChange={e => setRecheckDraft(d => ({ ...d, [key]: e.target.value }))}
                                  style={{ width: "100%", padding: "7px 10px", background: c.bg, border: `1px solid ${c.border2}`, borderRadius: 8, color: c.text, fontSize: 12, fontFamily: mono ? "monospace" : undefined, boxSizing: "border-box" }}
                                />
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                            <div>
                              <p style={{ margin: "0 0 4px", fontSize: 11, color: c.text3 }}>เกรด</p>
                              <select
                                value={recheckDraft.grade}
                                onChange={e => setRecheckDraft(d => ({ ...d, grade: e.target.value }))}
                                style={{ width: "100%", padding: "7px 8px", background: c.bg, border: `1px solid ${c.border2}`, borderRadius: 8, color: c.text, fontSize: 12 }}
                              >
                                {["A", "A-", "B+", "B", "B-", "C"].map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                            <div>
                              <p style={{ margin: "0 0 4px", fontSize: 11, color: c.text3 }}>Battery %</p>
                              <input
                                type="number" min={0} max={100}
                                value={recheckDraft.batteryHealth}
                                onChange={e => setRecheckDraft(d => ({ ...d, batteryHealth: Number(e.target.value) }))}
                                style={{ width: "100%", padding: "7px 10px", background: c.bg, border: `1px solid ${c.border2}`, borderRadius: 8, color: c.text, fontSize: 12, boxSizing: "border-box" }}
                              />
                            </div>
                            <div>
                              <p style={{ margin: "0 0 4px", fontSize: 11, color: c.text3 }}>Cycle Count</p>
                              <input
                                type="number" min={0}
                                value={recheckDraft.cycleCount}
                                onChange={e => setRecheckDraft(d => ({ ...d, cycleCount: Number(e.target.value) }))}
                                style={{ width: "100%", padding: "7px 10px", background: c.bg, border: `1px solid ${c.border2}`, borderRadius: 8, color: c.text, fontSize: 12, boxSizing: "border-box" }}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: 10 }}>
                            <p style={{ margin: "0 0 4px", fontSize: 11, color: c.text3 }}>ผู้ตรวจ</p>
                            <input
                              value={recheckDraft.inspector}
                              onChange={e => setRecheckDraft(d => ({ ...d, inspector: e.target.value }))}
                              placeholder="ชื่อผู้ตรวจ"
                              style={{ width: "100%", padding: "7px 10px", background: c.bg, border: `1px solid ${c.border2}`, borderRadius: 8, color: c.text, fontSize: 12, boxSizing: "border-box" }}
                            />
                          </div>

                          <div style={{ marginBottom: 14 }}>
                            <p style={{ margin: "0 0 4px", fontSize: 11, color: c.text3 }}>หมายเหตุ (ไม่บังคับ)</p>
                            <textarea
                              value={recheckDraft.note}
                              onChange={e => setRecheckDraft(d => ({ ...d, note: e.target.value }))}
                              placeholder="บันทึกเพิ่มเติม..."
                              rows={2}
                              style={{ width: "100%", padding: "7px 10px", background: c.bg, border: `1px solid ${c.border2}`, borderRadius: 8, color: c.text, fontSize: 12, resize: "vertical", boxSizing: "border-box" }}
                            />
                          </div>

                          {/* ─── ผลการตรวจสอบสภาพจริง ─── */}
                          {recheckCriteria.length > 0 && (() => {
                              const verifiedCount = recheckCriteria.filter(cr => cr.verified).length;
                              return (
                                <div style={{ marginBottom: 14 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c.text }}>ผลการตรวจสอบสภาพจริง</p>
                                    <span style={{ fontSize: 10, color: verifiedCount === recheckCriteria.length ? "#16a34a" : c.text3 }}>
                                      {verifiedCount}/{recheckCriteria.length} ยืนยันแล้ว
                                    </span>
                                  </div>
                                  <div style={{ border: `1px solid ${c.border}`, borderRadius: 8, overflow: "hidden" }}>
                                    {/* header */}
                                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr auto", gap: 6, padding: "5px 10px", borderBottom: `1px solid ${c.border}`, background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                                      {["รายการ","ผลหน้างาน","ผลสต็อค",""].map((h,i) => (
                                        <span key={i} style={{ fontSize: 10, fontWeight: 700, color: c.text3 }}>{h}</span>
                                      ))}
                                    </div>
                                    {recheckCriteria.map((cr, i) => {
                                      const btnStyle: React.CSSProperties = cr.verified
                                        ? cr.pass
                                          ? { background: "#16a34a", color: "#fff", border: "none" }
                                          : { background: "#dc2626", color: "#fff", border: "none" }
                                        : { background: "transparent", color: c.text3, border: `1px solid ${c.border2}` };
                                      return (
                                        <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr auto", gap: 6, alignItems: "center", padding: "7px 10px", borderBottom: i < recheckCriteria.length - 1 ? `1px solid ${c.border}` : undefined, background: cr.verified && !cr.pass ? (isDark ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.03)") : "transparent" }}>
                                          <div>
                                            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: c.text }}>{cr.label}</p>
                                            <p style={{ margin: 0, fontSize: 9, color: c.text3 }}>แจ้ง: {cr.stated}</p>
                                          </div>
                                          {/* field staff result — read only */}
                                          <span style={{ fontSize: 11, color: cr.fieldActual ? c.text2 : c.text3, fontStyle: cr.fieldActual ? "normal" : "italic" }}>
                                            {cr.fieldActual || "ไม่ระบุ"}
                                          </span>
                                          {/* stock team result — editable */}
                                          <input
                                            value={cr.stockActual}
                                            onChange={e => setRecheckCriteria(prev => prev.map((x, j) => j === i ? { ...x, stockActual: e.target.value } : x))}
                                            placeholder="บันทึก..."
                                            style={{ padding: "4px 7px", background: c.bg, border: `1px solid ${c.border2}`, borderRadius: 6, color: c.text, fontSize: 11, width: "100%", boxSizing: "border-box" }}
                                          />
                                          <button
                                            onClick={() => setRecheckCriteria(prev => prev.map((x, j) => {
                                              if (j !== i) return x;
                                              if (!x.verified) return { ...x, verified: true, pass: true };
                                              if (x.pass) return { ...x, pass: false };
                                              return { ...x, verified: false, pass: true };
                                            }))}
                                            style={{ padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 10, whiteSpace: "nowrap", ...btnStyle }}
                                          >
                                            {!cr.verified ? "ยืนยัน" : cr.pass ? "✓ ผ่าน" : "✗ ไม่ผ่าน"}
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <p style={{ margin: "5px 0 0", fontSize: 10, color: c.text3 }}>กดปุ่ม "ยืนยัน" เพื่อบันทึกผล · กดซ้ำเพื่อสลับ ผ่าน / ไม่ผ่าน</p>
                                </div>
                              );
                            })()}

                          {/* ─── ผลทดสอบการใช้งานภายใน ─── */}
                          {recheckFunctional.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                              {(() => {
                                const verifiedFn = recheckFunctional.filter(t => t.verified).length;
                                return (
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c.text }}>ผลทดสอบการใช้งานภายใน</p>
                                    <span style={{ fontSize: 10, color: verifiedFn === recheckFunctional.length ? "#16a34a" : c.text3 }}>
                                      {verifiedFn}/{recheckFunctional.length} ยืนยันแล้ว
                                    </span>
                                  </div>
                                );
                              })()}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {recheckFunctional.map((t, i) => {
                                  const btnStyle: React.CSSProperties = t.verified
                                    ? t.pass
                                      ? { background: "#16a34a", color: "#fff", border: "1px solid #16a34a" }
                                      : { background: "#dc2626", color: "#fff", border: "1px solid #dc2626" }
                                    : { background: "transparent", color: c.text3, border: `1px solid ${c.border2}` };
                                  return (
                                    <button
                                      key={i}
                                      onClick={() => setRecheckFunctional(prev => prev.map((x, j) => {
                                        if (j !== i) return x;
                                        if (!x.verified) return { ...x, verified: true, pass: true };
                                        if (x.pass) return { ...x, pass: false };
                                        return { ...x, verified: false, pass: true };
                                      }))}
                                      style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 20, cursor: "pointer", ...btnStyle }}
                                    >
                                      {!t.verified ? t.label : t.pass ? `✓ ${t.label}` : `✗ ${t.label}`}
                                    </button>
                                  );
                                })}
                              </div>
                              <p style={{ margin: "6px 0 0", fontSize: 10, color: c.text3 }}>กดครั้งแรก = ผ่าน · กดซ้ำ = ไม่ผ่าน · กดอีกครั้ง = ยกเลิกยืนยัน</p>
                            </div>
                          )}

                          {recheckErr && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 10px" }}>{recheckErr}</p>}

                          <button
                            disabled={recheckSaving || !recheckDraft.inspector.trim()}
                            onClick={async () => {
                              setRecheckSaving(true);
                              setRecheckErr(null);
                              const res = await confirmStockRecheck(item.id, {
                                imei: recheckDraft.imei.trim(),
                                serial: recheckDraft.serial.trim(),
                                grade: recheckDraft.grade,
                                batteryHealth: recheckDraft.batteryHealth,
                                cycleCount: recheckDraft.cycleCount,
                                inspector: recheckDraft.inspector.trim(),
                                note: recheckDraft.note.trim() || undefined,
                                recheckCriteria: recheckCriteria.length > 0
                                  ? recheckCriteria.map(cr => ({ label: cr.label, stockActual: cr.stockActual, pass: cr.pass }))
                                  : undefined,
                                recheckFunctionalTests: recheckFunctional.length > 0
                                  ? recheckFunctional.map(t => ({ label: t.label, pass: t.pass }))
                                  : undefined,
                              });
                              setRecheckSaving(false);
                              if (!res.success) { setRecheckErr(res.error ?? "เกิดข้อผิดพลาด"); return; }
                              setShowRecheck(false);
                              onUpdate({ ...item, status: "พร้อมขาย", imei: recheckDraft.imei.trim(), serial: recheckDraft.serial.trim(), grade: recheckDraft.grade as StockItem["grade"], batteryHealth: recheckDraft.batteryHealth, cycleCount: recheckDraft.cycleCount, inspector: recheckDraft.inspector.trim() });
                            }}
                            style={{ width: "100%", padding: "10px 0", background: recheckSaving || !recheckDraft.inspector.trim() ? c.border : "#16a34a", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 13, cursor: recheckSaving || !recheckDraft.inspector.trim() ? "not-allowed" : "pointer" }}
                          >
                            {recheckSaving ? "กำลังบันทึก..." : "✓ ยืนยันและเปลี่ยนเป็นพร้อมขาย"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ background: c.card2, borderRadius: 16, padding: 16, marginBottom: 16, textAlign: "center" }}>
                    {(() => {
                      const src = item.photos[0] || getProductImage(item.model);
                      return src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={item.model} style={{ height: 120, objectFit: "contain", borderRadius: 8 }} />
                      ) : (
                        <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: c.text3, fontSize: 40 }}>📱</div>
                      );
                    })()}
                  </div>

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

                  {(() => {
                    const snap = item.inspectionSnapshot;
                    const criteria = snap?.criteria ?? [];
                    const functionalTests = snap?.functionalTests ?? [];
                    const issues = snap?.issues ?? [];
                    const hasCriteria = criteria.length > 0;
                    const hasFunctional = functionalTests.length > 0;
                    const failedCriteria = criteria.filter(c => !c.pass);
                    const failedFunctional = functionalTests.filter(t => !t.pass);
                    if (!hasCriteria && !hasFunctional && issues.length === 0) return null;
                    const thStyle: React.CSSProperties = { padding: "6px 8px", fontSize: 11, fontWeight: 700, color: c.text3, textAlign: "left", borderBottom: `1px solid ${c.border}`, whiteSpace: "nowrap" };
                    const tdStyle: React.CSSProperties = { padding: "7px 8px", fontSize: 12, color: c.text2, borderBottom: `1px solid ${c.border}`, verticalAlign: "middle" };
                    return (
                      <>
                        {hasCriteria && (() => {
                          const recheckCrit = snap?.recheckCriteria ?? [];
                          const hasRecheck = recheckCrit.length > 0;
                          const recheckMap = new Map(recheckCrit.map(r => [r.label, r]));
                          return (
                            <Section label="ผลการตรวจสอบสภาพจริง" c={c}>
                              <div style={{ overflowX: "auto", margin: "0 -2px" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                  <thead>
                                    <tr style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}>
                                      <th style={thStyle}>รายการ</th>
                                      <th style={thStyle}>ลูกค้าแจ้ง</th>
                                      <th style={thStyle}>หน้างาน</th>
                                      {hasRecheck && <th style={thStyle}>ทีมสต็อค</th>}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {criteria.map((cr, i) => {
                                      const rc = recheckMap.get(cr.label);
                                      const fail = hasRecheck ? rc && !rc.pass : !cr.pass;
                                      return (
                                        <tr key={i} style={{ background: fail ? (isDark ? "rgba(239,68,68,0.05)" : "rgba(239,68,68,0.03)") : "transparent" }}>
                                          <td style={{ ...tdStyle, fontWeight: 600, color: c.text, fontSize: 11 }}>{cr.label}</td>
                                          <td style={{ ...tdStyle, color: c.text3, fontSize: 11 }}>{cr.stated || "—"}</td>
                                          <td style={{ ...tdStyle, color: cr.pass ? c.text2 : "#f59e0b", fontWeight: cr.pass ? 400 : 600, fontSize: 11 }}>{cr.actual || "—"}</td>
                                          {hasRecheck && (
                                            <td style={{ ...tdStyle, fontSize: 11, fontWeight: rc && !rc.pass ? 600 : 400, color: !rc ? c.text3 : rc.pass ? "#16a34a" : "#dc2626" }}>
                                              {rc ? (rc.stockActual || (rc.pass ? "ปกติ" : "ไม่ผ่าน")) : "—"}
                                            </td>
                                          )}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              {failedCriteria.length > 0 && !hasRecheck && (
                                <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 8 }}>
                                  <p style={{ color: "#b45309", fontSize: 11, fontWeight: 700, margin: "0 0 4px" }}>ตำหนิที่พบ (หน้างาน)</p>
                                  {failedCriteria.map((cr, i) => (
                                    <p key={i} style={{ color: "#92400e", fontSize: 12, margin: "2px 0 0" }}>• {cr.label}: {cr.actual || "ไม่ผ่าน"}</p>
                                  ))}
                                </div>
                              )}
                              {hasRecheck && snap?.recheckBy && (
                                <p style={{ margin: "6px 0 0", fontSize: 10, color: c.text3 }}>
                                  ทีมสต็อครีเช็คโดย {snap.recheckBy}{snap.recheckAt ? ` · ${new Date(snap.recheckAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                                </p>
                              )}
                            </Section>
                          );
                        })()}
                        {issues.length > 0 && (
                          <Section label="ปัญหาที่พบเพิ่มเติม" c={c}>
                            <div style={{ padding: "8px 10px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}>
                              {issues.map((issue, i) => (
                                <p key={i} style={{ color: "#dc2626", fontSize: 13, fontWeight: 600, margin: i === 0 ? 0 : "4px 0 0" }}>• {issue}</p>
                              ))}
                            </div>
                          </Section>
                        )}
                        {hasFunctional && (
                          <Section label="ผลทดสอบการใช้งานภายใน" c={c}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {functionalTests.map((t, i) => (
                                <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: t.pass ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: t.pass ? "#16a34a" : "#dc2626", border: `1px solid ${t.pass ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}` }}>
                                  {t.pass ? "✓" : "✗"} {t.label}
                                </span>
                              ))}
                            </div>
                            {failedFunctional.length > 0 && (
                              <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}>
                                <p style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, margin: "0 0 4px" }}>⚠ ปัญหาการใช้งาน</p>
                                {failedFunctional.map((t, i) => (
                                  <p key={i} style={{ color: "#b91c1c", fontSize: 12, margin: "2px 0 0" }}>• {t.label}</p>
                                ))}
                              </div>
                            )}
                          </Section>
                        )}
                      </>
                    );
                  })()}

                  {item.status === "ขายแล้ว" && (
                    <Section label="ข้อมูลการขาย" c={c}>
                      {item.soldAt && <Row label="วันที่ขาย" value={fmtDate(item.soldAt)} c={c} />}
                      {item.buyerName && <Row label="ผู้ซื้อ" value={item.buyerName} c={c} />}
                      {item.buyerPhone && <Row label="เบอร์" value={item.buyerPhone} c={c} />}
                      {item.soldPrice && <Row label="ราคาขาย" value={`฿${fmt(item.soldPrice)}`} c={c} />}
                      {item.soldBy && <Row label="พนักงานขาย" value={item.soldBy} c={c} />}
                      {item.saleType && <Row label="ประเภทการขาย" value={item.saleType} c={c} />}
                      {item.deliveryChannel && <Row label="ช่องทางรับสินค้า" value={item.deliveryChannel === "หน้าร้าน" ? "รับที่หน้าร้าน" : item.deliveryChannel === "ส่งถึงที่" ? "เราไปส่งถึงที่" : "ส่งพัสดุ"} c={c} />}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${c.border}` }}>
                        <span style={{ color: c.text2, fontSize: 13 }}>สถานะการจัดส่ง</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: item.deliveryStatus === "จัดส่งแล้ว" ? "#22c55e" : "#f59e0b", background: item.deliveryStatus === "จัดส่งแล้ว" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)", padding: "2px 10px", borderRadius: 8 }}>
                          {item.deliveryStatus ?? "—"}
                        </span>
                      </div>
                      {item.deliveryAddress && <Row label="ที่อยู่จัดส่ง" value={item.deliveryAddress} c={c} />}
                      {item.trackingNumber && <Row label="เลข Tracking" value={item.trackingNumber} c={c} mono />}
                    </Section>
                  )}

                  <Section label="ข้อมูลรับซื้อ" c={c}>
                    {item.requestRef && <Row label="เลขคำขอ" value={item.requestRef} c={c} mono />}
                    <Row label="ผู้ขาย" value={item.sellerName} c={c} />
                    <Row label="เบอร์โทร" value={item.sellerPhone} c={c} />
                    <Row label="ราคาประเมิน" value={`฿${fmt(item.costPrice)}`} c={c} />
                    <Row label="ช่องทาง" value={item.sourceChannel} c={c} />
                    <Row label="วันที่รับเข้า" value={fmtDate(item.receivedAt)} c={c} />
                    {item.inspector && <Row label="ผู้ตรวจ" value={item.inspector} c={c} />}
                  </Section>

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
                  {uploadErr && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{uploadErr}</p>}
                  <label style={{
                    display: "block", border: `2px dashed ${c.border}`, borderRadius: 12, padding: "16px",
                    textAlign: "center", cursor: uploading ? "not-allowed" : "pointer", marginBottom: 14, opacity: uploading ? 0.5 : 1,
                  }}>
                    <input type="file" accept="image/*" multiple style={{ display: "none" }} disabled={uploading}
                      onChange={e => e.target.files && handlePhotoUpload(e.target.files)} />
                    <Upload size={20} color={c.text3} style={{ margin: "0 auto 6px" }} />
                    <p style={{ color: c.text2, fontSize: 13, margin: 0 }}>{uploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดรูปภาพ"}</p>
                  </label>
                  {item.photos.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {item.photos.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12, border: `1px solid ${c.border}` }} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "32px 0", color: c.text3 }}>
                      <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
                      <p style={{ margin: 0 }}>ยังไม่มีรูปภาพ</p>
                    </div>
                  )}
                </div>
              )}

              {tab === "เอกสาร" && (
                <div>
                  {/* ─── Auto-linked documents from request API ─── */}
                  {item.requestRef && (
                    <div style={{ marginBottom: 20 }}>
                      <p style={{ color: c.text3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
                        เอกสารจากการรับซื้อ
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <DocCard
                          label="สัญญาซื้อขาย"
                          url={`/api/contract?order=${encodeURIComponent(item.requestRef)}&phone=${encodeURIComponent(item.sellerPhone)}&type=contract`}
                          itemId={item.id} c={c}
                        />
                        <DocCard
                          label="ใบสำคัญรับเงิน"
                          url={`/api/contract?order=${encodeURIComponent(item.requestRef)}&phone=${encodeURIComponent(item.sellerPhone)}&type=receipt`}
                          itemId={item.id} c={c}
                        />
                      </div>
                    </div>
                  )}

                  {/* ─── Additional manual documents ─── */}
                  <p style={{ color: c.text3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>
                    เอกสารเพิ่มเติม
                  </p>

                  {uploadDocErr && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 10 }}>{uploadDocErr}</p>}

                  <input
                    ref={docInputRef} type="file" accept="image/*,application/pdf" multiple
                    style={{ display: "none" }} disabled={uploadingDoc}
                    onChange={e => e.target.files && handleDocumentUpload(e.target.files)}
                  />
                  <button
                    onClick={() => docInputRef.current?.click()}
                    disabled={uploadingDoc}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      border: `2px dashed ${c.border}`, borderRadius: 12, padding: "14px",
                      background: "none", color: c.text2, fontSize: 13, fontWeight: 600,
                      cursor: uploadingDoc ? "not-allowed" : "pointer", marginBottom: 16,
                      opacity: uploadingDoc ? 0.5 : 1, fontFamily: "inherit",
                    }}
                  >
                    <Upload size={16} />
                    {uploadingDoc ? "กำลังอัปโหลด..." : "อัปโหลดเอกสาร (รูปภาพ / PDF)"}
                  </button>

                  {(item.documents ?? []).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "16px 0", color: c.text3 }}>
                      <p style={{ margin: 0, fontSize: 12 }}>ยังไม่มีเอกสารเพิ่มเติม</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(item.documents ?? []).map((url, i) => (
                        <div key={i} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: `1px solid ${c.border}` }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`เอกสาร ${i + 1}`} style={{ width: "100%", display: "block", objectFit: "contain", maxHeight: 280, background: c.card2 }} />
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: c.card2, borderTop: `1px solid ${c.border}` }}>
                            <span style={{ color: c.text2, fontSize: 12 }}>เอกสาร {i + 1}</span>
                            <div style={{ display: "flex", gap: 6 }}>
                              <a href={url} target="_blank" rel="noreferrer" style={{ color: c.gold, fontSize: 11, fontWeight: 600, textDecoration: "none" }}>เปิดเต็ม</a>
                              <button
                                onClick={() => handleDocumentDelete(url)}
                                style={{ background: "none", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                              >ลบ</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "ประวัติ" && (
                <div>
                  {(item.auditLog && item.auditLog.length > 0) ? (
                    [...item.auditLog].reverse().map((entry, i, arr) => {
                      const actionColor: Record<string, string> = {
                        "บันทึกเข้าสต็อก": "#22c55e",
                        "เปลี่ยนสถานะ": "#3b82f6",
                        "เปลี่ยนราคาขาย": "#f59e0b",
                        "แก้ไขข้อมูล": "#a855f7",
                        "อัปโหลดรูปภาพ": "#0ea5e9",
                        "เปิดดูเอกสาร":  "#8b5cf6",
                      };
                      const color = actionColor[entry.action] ?? "#6b7280";
                      return (
                        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 3 }} />
                            {i < arr.length - 1 && <div style={{ width: 2, flex: 1, background: c.border, marginTop: 4 }} />}
                          </div>
                          <div style={{ flex: 1, paddingBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: "2px 8px", borderRadius: 6 }}>{entry.action}</span>
                              <span style={{ color: c.text3, fontSize: 11 }}>{entry.by}</span>
                            </div>
                            {entry.detail && <p style={{ color: c.text2, fontSize: 12, margin: "4px 0 0", lineHeight: 1.5 }}>{entry.detail}</p>}
                            <p style={{ color: c.text3, fontSize: 11, margin: "4px 0 0" }}>{fmtDate(entry.timestamp)}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 0", color: c.text3 }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                      <p style={{ margin: 0, fontSize: 13 }}>ยังไม่มีประวัติการแก้ไข</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
          {editMode ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button onClick={() => setEditMode(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", borderRadius: 10, border: `1px solid ${c.border}`, background: "none", color: c.text2, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button onClick={handleEditSave} disabled={saving} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", borderRadius: 10, border: "none", background: c.gold, color: "#000", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
                <Save size={14} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {[
                  { icon: Edit2,    label: "แก้ไขข้อมูล",   action: openEdit },
                  { icon: Upload,   label: uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูป", action: () => photoInputRef.current?.click() },
                  { icon: RefreshCw, label: "เปลี่ยนสถานะ", action: () => setShowStatusMenu(v => !v) },
                  { icon: Tag,      label: "ตั้งราคาขาย",  action: () => { setPriceDraftModal(item.sellingPrice ? String(item.sellingPrice) : ""); setShowPriceModal(true); } },
                ].map(({ icon: Icon, label, action }) => (
                  <button key={label} onClick={action} disabled={uploading} style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 8px", borderRadius: 10, border: `1px solid ${c.border}`,
                    background: c.card2, color: c.text2, fontSize: 12, fontWeight: 600,
                    cursor: uploading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: uploading ? 0.5 : 1,
                  }}>
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

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

              <div style={{ display: "grid", gridTemplateColumns: item.status === "ขายแล้ว" ? "1fr" : "1fr 1fr", gap: 8 }}>
                <button onClick={() => printPriceTag(item)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", borderRadius: 10, border: `1px solid ${c.border}`, background: "none", color: c.text2, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  <Printer size={14} />
                  พิมพ์หน้าราคา
                </button>
                {item.status !== "ขายแล้ว" && (
                  <button
                    onClick={openSellModal}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", borderRadius: 10, border: "none", background: "rgba(34,197,94,0.15)", color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <CheckSquare size={14} />
                    บันทึกการขาย
                  </button>
                )}
              </div>
              {item.deliveryStatus === "รอจัดส่ง" && (
                <button
                  onClick={() => { setTrackingDraft(""); setDeliveryAddressDraft(item.deliveryAddress ?? ""); setDeliveryChannelDraft(item.deliveryChannel ?? "หน้าร้าน"); setShowDeliveryModal(true); }}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", borderRadius: 10, border: "none", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}
                >
                  <Truck size={14} />
                  ยืนยันส่งของ
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>

      {showPriceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, border: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>ตั้งราคาขาย</p>
            <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>{item!.model} · {item!.storage}</p>
            <p style={{ color: c.text2, fontSize: 12, fontWeight: 600, margin: "0 0 6px" }}>ราคาขาย (บาท)</p>
            <input
              type="number"
              value={priceDraftModal}
              onChange={e => setPriceDraftModal(e.target.value)}
              placeholder="0"
              autoFocus
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, background: c.bg, border: `1px solid ${c.gold}`, color: c.text, fontSize: 16, fontFamily: "inherit", boxSizing: "border-box" as const, outline: "none", marginBottom: 20 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowPriceModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  const p = parseInt(priceDraftModal);
                  if (!p || p <= 0) return;
                  setSaving(true);
                  await updateStockPrice(item!.id, p);
                  onUpdate({ ...item!, sellingPrice: p });
                  setShowPriceModal(false);
                  setSaving(false);
                }}
                disabled={saving || !priceDraftModal || parseInt(priceDraftModal) <= 0}
                style={{ flex: 2, padding: "12px", borderRadius: 12, background: !priceDraftModal || parseInt(priceDraftModal) <= 0 ? "#555" : c.gold, border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {saving ? "กำลังบันทึก..." : "บันทึกราคา"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeliveryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 400, border: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>ยืนยันส่งของ</p>
            <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>{item!.model} · {item!.id}</p>
            <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>ช่องทางการจัดส่ง *</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { value: "หน้าร้าน", label: "รับที่หน้าร้าน" },
                { value: "ส่งถึงที่", label: "ส่งถึงที่" },
                { value: "ส่งพัสดุ", label: "ส่งพัสดุ" },
              ].map(ch => (
                <button key={ch.value} onClick={() => setDeliveryChannelDraft(ch.value)} style={{
                  flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 12,
                  border: `1.5px solid ${deliveryChannelDraft === ch.value ? "#f59e0b" : c.border}`,
                  background: deliveryChannelDraft === ch.value ? "rgba(245,158,11,0.12)" : c.bg,
                  color: deliveryChannelDraft === ch.value ? "#f59e0b" : c.text2,
                  fontWeight: deliveryChannelDraft === ch.value ? 700 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                }}>{ch.label}</button>
              ))}
            </div>
            {deliveryChannelDraft === "ส่งถึงที่" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ที่อยู่จัดส่ง *</label>
                <textarea
                  value={deliveryAddressDraft}
                  onChange={e => setDeliveryAddressDraft(e.target.value)}
                  placeholder="บ้านเลขที่ / ถนน / แขวง / เขต / จังหวัด"
                  rows={3}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" as const, outline: "none", resize: "none" }}
                />
              </div>
            )}
            {deliveryChannelDraft === "ส่งพัสดุ" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>เลข Tracking (ถ้ามี)</label>
                <input
                  value={trackingDraft}
                  onChange={e => setTrackingDraft(e.target.value)}
                  placeholder="TH123456789XX"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" as const, outline: "none" }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowDeliveryModal(false)}
                style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button
                disabled={confirmingDelivery || (deliveryChannelDraft === "ส่งถึงที่" && !deliveryAddressDraft.trim())}
                onClick={async () => {
                  setConfirmingDelivery(true);
                  const res = await confirmDelivery(item!.id, trackingDraft.trim() || undefined, deliveryChannelDraft, deliveryAddressDraft.trim() || undefined);
                  if (res.success) {
                    onUpdate({ ...item!, deliveryStatus: "จัดส่งแล้ว", trackingNumber: trackingDraft.trim() || undefined, deliveryChannel: deliveryChannelDraft, deliveryAddress: deliveryAddressDraft.trim() || undefined });
                    setShowDeliveryModal(false);
                  }
                  setConfirmingDelivery(false);
                }}
                style={{ flex: 2, padding: "12px", borderRadius: 12, background: "#f59e0b", border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: (confirmingDelivery || (deliveryChannelDraft === "ส่งถึงที่" && !deliveryAddressDraft.trim())) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (confirmingDelivery || (deliveryChannelDraft === "ส่งถึงที่" && !deliveryAddressDraft.trim())) ? 0.5 : 1 }}>
                {confirmingDelivery ? "กำลังบันทึก..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSellModal && (
        <SellModal
          item={item!}
          onClose={() => setShowSellModal(false)}
          onSuccess={updates => { onUpdate({ ...item!, ...updates }); }}
        />
      )}
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

function DocCard({ label, url, itemId, c }: { label: string; url: string; itemId: string; c: ReturnType<typeof useThemeColors> }) {
  async function handleOpen() {
    window.open(url, "_blank", "noreferrer");
    await logDocumentView(itemId, label);
  }
  return (
    <button
      onClick={handleOpen}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px", borderRadius: 10, border: `1px solid ${c.border}`,
        background: c.card2, cursor: "pointer", fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>📄</span>
        <span style={{ color: c.text, fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, color: c.gold, fontSize: 12, fontWeight: 600 }}>
        เปิด <ExternalLink size={12} />
      </div>
    </button>
  );
}
