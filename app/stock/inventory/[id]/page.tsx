"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck,
  Edit2, Upload, RefreshCw, Tag, Printer, CheckSquare, Save, Truck,
} from "lucide-react";
import StockTopbar from "@/components/stock/Topbar";
import StockStatusBadge, { GradeBadge } from "@/components/stock/StatusBadge";
import { useThemeColors } from "@/components/stock/ThemeContext";
import {
  fetchStockItem, verifyStockField,
  updateStockItem, updateStockStatus, updateStockPrice,
  updateStockPhotos, confirmStockRecheck, confirmDelivery, addStockSlips,
} from "@/app/actions/stocks";
import SellModal from "@/components/stock/SellModal";
import type { StockItem, StockStatus } from "@/lib/stock/types";
import { STOCK_STATUS_COLORS } from "@/lib/stock/constants";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import { validateImageFiles } from "@/lib/validate-file";

const ALL_STATUSES: StockStatus[] = [
  "รอตรวจ", "พร้อมขาย", "ลงขายแล้ว", "จองแล้ว", "ขายแล้ว", "ส่งคืน", "ตีกลับ/ไม่รับซื้อ",
];

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
  return new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
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

const CHECK_FIELDS: Array<{ key: "imei" | "serial" | "model" | "storage" | "color"; label: string }> = [
  { key: "imei",    label: "IMEI" },
  { key: "serial",  label: "Serial" },
  { key: "model",   label: "รุ่น" },
  { key: "storage", label: "ความจุ" },
  { key: "color",   label: "สี" },
];

function CrossCheckSection({
  item, c, verifying, onVerify,
}: {
  item: StockItem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any;
  verifying: string | null;
  onVerify: (field: "imei" | "serial" | "model" | "storage" | "color", source: "inspection" | "stock") => void;
}) {
  const snap = item.inspectionSnapshot!;
  const stockVals: Record<string, string> = {
    imei: item.imei, serial: item.serial,
    model: item.model, storage: item.storage, color: item.color,
  };

  const rows = CHECK_FIELDS.map(({ key, label }) => {
    const inspVal  = snap[key] ?? "";
    const stockVal = stockVals[key] ?? "";
    const verified = (snap as Record<string, unknown>)[`${key}_verified`] === true;
    const verifiedSource = (snap as Record<string, unknown>)[`${key}_verified_source`] as string | undefined;
    const bothEmpty = !inspVal && !stockVal;
    const match = inspVal === stockVal;
    return { key, label, inspVal, stockVal, verified, verifiedSource, bothEmpty, match };
  }).filter(r => !r.bothEmpty);

  if (rows.length === 0) return null;

  const allOk = rows.every(r => r.match || r.verified);
  const mismatchCount = rows.filter(r => !r.match && !r.verified && r.inspVal && r.stockVal).length;

  return (
    <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${mismatchCount > 0 ? "rgba(249,115,22,0.4)" : c.border}`, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {allOk
          ? <ShieldCheck size={18} color="#22c55e" />
          : <AlertTriangle size={18} color="#f97316" />}
        <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0 }}>ตรวจสอบข้อมูล</p>
        {mismatchCount > 0 && (
          <span style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
            ไม่ตรงกัน {mismatchCount} รายการ
          </span>
        )}
        {allOk && (
          <span style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
            ผ่านการตรวจสอบ
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 80px 120px", gap: 0, fontSize: 11, color: c.text3, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", padding: "0 0 8px", borderBottom: `1px solid ${c.border}` }}>
        <span>ฟิลด์</span>
        <span>ค่าจากตรวจ (หน้างาน)</span>
        <span>ค่าในสต็อก (ทีมสต็อก)</span>
        <span>สถานะ</span>
        <span></span>
      </div>

      {rows.map(({ key, label, inspVal, stockVal, verified, verifiedSource, match }) => {
        const isVerifying = verifying === key;
        const mismatch = !match && inspVal && stockVal && !verified;

        return (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 80px 120px", gap: 0, alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
            <span style={{ color: c.text2, fontSize: 12, fontWeight: 600 }}>{label}</span>

            <span style={{ color: inspVal ? c.text : c.text3, fontSize: 12, fontFamily: (key === "imei" || key === "serial") ? "monospace" : "inherit" }}>
              {inspVal || <em style={{ color: c.text3 }}>ไม่ได้กรอก</em>}
            </span>

            <span style={{ color: stockVal ? (mismatch ? "#f97316" : c.text) : c.text3, fontSize: 12, fontFamily: (key === "imei" || key === "serial") ? "monospace" : "inherit", fontWeight: mismatch ? 700 : 400 }}>
              {stockVal || <em style={{ color: c.text3 }}>ไม่ได้กรอก</em>}
            </span>

            <span>
              {verified ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e", fontSize: 11 }}>
                  <CheckCircle2 size={13} /> {verifiedSource === "inspection" ? "ตรวจ" : "สต็อก"}
                </span>
              ) : match ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e", fontSize: 11 }}>
                  <CheckCircle2 size={13} /> ตรงกัน
                </span>
              ) : inspVal && stockVal ? (
                <span style={{ color: "#f97316", fontSize: 11, fontWeight: 600 }}>⚠️ ไม่ตรงกัน</span>
              ) : (
                <span style={{ color: c.text3, fontSize: 11 }}>—</span>
              )}
            </span>

            <div style={{ display: "flex", gap: 4 }}>
              {mismatch && (
                <>
                  <button
                    disabled={!!verifying}
                    onClick={() => onVerify(key, "inspection")}
                    style={{ fontSize: 10, padding: "3px 7px", borderRadius: 6, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "#22c55e", cursor: "pointer", opacity: isVerifying ? 0.5 : 1, whiteSpace: "nowrap" as const }}
                    title={`ยืนยันค่าจากตรวจ: ${inspVal}`}
                  >
                    {isVerifying ? "..." : `ใช้ ${inspVal}`}
                  </button>
                  <button
                    disabled={!!verifying}
                    onClick={() => onVerify(key, "stock")}
                    style={{ fontSize: 10, padding: "3px 7px", borderRadius: 6, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.08)", color: "#3b82f6", cursor: "pointer", opacity: isVerifying ? 0.5 : 1, whiteSpace: "nowrap" as const }}
                    title={`ยืนยันค่าสต็อก: ${stockVal}`}
                  >
                    {isVerifying ? "..." : `ใช้ ${stockVal}`}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      <p style={{ color: c.text3, fontSize: 11, margin: "12px 0 0" }}>
        ข้อมูลจากตรวจ: เจ้าหน้าที่หน้างาน · ข้อมูลสต็อก: ทีมสต็อก
      </p>
    </div>
  );
}

type VerifyField = "imei" | "serial" | "model" | "storage" | "color";

export default function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const c = useThemeColors();
  const router = useRouter();
  const [item, setItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<VerifyField | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  // Status
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Price
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceDraftModal, setPriceDraftModal] = useState("");

  // Delivery
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState("");
  const [deliveryChannelDraft, setDeliveryChannelDraft] = useState("หน้าร้าน");
  const [deliveryAddressDraft, setDeliveryAddressDraft] = useState("");
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Photo upload
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Slip upload
  const [slipUploading, setSlipUploading] = useState(false);
  const [lightboxSlip, setLightboxSlip] = useState<string | null>(null);
  const slipInputRef = useRef<HTMLInputElement>(null);

  // Recheck
  const [showRecheck, setShowRecheck] = useState(false);
  const [recheckDraft, setRecheckDraft] = useState<{
    imei: string; serial: string; grade: string;
    batteryHealth: number; cycleCount: number; inspector: string; note: string;
  }>({ imei: "", serial: "", grade: "A", batteryHealth: 0, cycleCount: 0, inspector: "", note: "" });
  const [recheckCriteria, setRecheckCriteria] = useState<{ label: string; stated: string; fieldActual: string; stockActual: string; pass: boolean; verified: boolean }[]>([]);
  const [recheckFunctional, setRecheckFunctional] = useState<{ label: string; pass: boolean; verified: boolean }[]>([]);
  const [recheckSaving, setRecheckSaving] = useState(false);
  const [recheckErr, setRecheckErr] = useState<string | null>(null);

  function initRecheckState(d: StockItem) {
    setRecheckDraft({ imei: d.imei, serial: d.serial, grade: d.grade, batteryHealth: d.batteryHealth, cycleCount: d.cycleCount, inspector: d.inspector, note: "" });
    setRecheckCriteria((d.inspectionSnapshot?.criteria ?? []).map(cr => ({ label: cr.label, stated: cr.stated, fieldActual: cr.actual, stockActual: cr.actual, pass: cr.pass, verified: false })));
    setRecheckFunctional((d.inspectionSnapshot?.functionalTests ?? []).map(t => ({ ...t, verified: false })));
  }

  async function reload() {
    const d = await fetchStockItem(id);
    setItem(d);
    if (d) initRecheckState(d);
  }

  useEffect(() => {
    fetchStockItem(id).then(d => {
      setItem(d);
      setLoading(false);
      if (d) initRecheckState(d);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleVerify(field: VerifyField, source: "inspection" | "stock") {
    setVerifying(field);
    await verifyStockField(id, field, source);
    await reload();
    setVerifying(null);
  }

  function openEdit() {
    if (!item) return;
    setEditDraft({
      model: item.model, storage: item.storage, color: item.color, grade: item.grade,
      batteryHealth: String(item.batteryHealth), cycleCount: String(item.cycleCount),
      icloudStatus: item.icloudStatus, carrierLock: item.carrierLock, accessories: item.accessories,
      costPrice: String(item.costPrice), shippingCost: String(item.shippingCost),
      otherCost: String(item.otherCost), sellingPrice: String(item.sellingPrice),
      sellerName: item.sellerName, sellerPhone: item.sellerPhone, sourceChannel: item.sourceChannel,
    });
    setEditMode(true);
  }

  async function handleEditSave() {
    if (!editDraft || !item) return;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateStockItem(item.id, updates as any);
    await reload();
    setEditMode(false);
    setSaving(false);
  }

  async function handleStatusChange(status: StockStatus) {
    if (!item) return;
    setSaving(true);
    await updateStockStatus(item.id, status, "", "admin");
    await reload();
    setShowStatusMenu(false);
    setSaving(false);
  }

  async function handlePhotoUpload(files: FileList) {
    if (!files.length || !item) return;
    const check = validateImageFiles(Array.from(files));
    if (!check.valid) { setUploadErr(check.error ?? null); return; }
    setUploading(true);
    setUploadErr(null);
    const urls: string[] = [...item.photos];
    for (const raw of Array.from(files)) {
      const file = await compressImage(raw);
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `stocks/${item.id}/${Date.now()}-${safeName}`;
      const { data, error } = await supabase.storage.from("stock-photos").upload(path, file, { upsert: true });
      if (error) { setUploadErr(error.message); continue; }
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("stock-photos").getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }
    await updateStockPhotos(item.id, urls);
    await reload();
    setUploading(false);
  }

  async function handleSlipUpload(files: FileList) {
    if (!files.length || !item) return;
    setSlipUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `slips/${item.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data, error } = await supabase.storage.from("stock-photos").upload(path, file, { upsert: true });
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from("stock-photos").getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }
    if (urls.length > 0) {
      await addStockSlips(item.id, urls);
      await reload();
    }
    setSlipUploading(false);
  }

  if (loading) return <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: c.text3 }}>กำลังโหลด...</div>;
  if (!item) return <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: c.text3 }}>ไม่พบสินค้า</div>;

  const totalCost = item.costPrice + item.shippingCost + item.otherCost;
  const hasSellPrice = item.sellingPrice > 0;
  const profit = hasSellPrice ? item.sellingPrice - totalCost : null;
  const margin = hasSellPrice && totalCost > 0 ? (((item.sellingPrice - totalCost) / totalCost) * 100).toFixed(2) : null;

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "9px 12px", background: c.bg, border: `1px solid ${c.border}`,
    borderRadius: 8, color: c.text, fontSize: 13, fontFamily: "inherit",
    boxSizing: "border-box" as const, outline: "none",
  };
  const labelSt: React.CSSProperties = { color: c.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 };

  function edSet(field: keyof EditDraft, value: string) {
    setEditDraft(d => d ? { ...d, [field]: value } : d);
  }

  const actionBtnSt: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "10px 8px", borderRadius: 10, border: `1px solid ${c.border}`,
    background: c.card2, color: c.text2, fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title={item.id} subtitle={`${item.model} · ${item.storage}`}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 13, cursor: "pointer" }}>
          <ArrowLeft size={15} /> กลับ
        </button>
      </StockTopbar>

      {/* Hidden photo input */}
      <input
        ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
        onChange={e => e.target.files && handlePhotoUpload(e.target.files)}
      />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>

          {/* ─── Main column ─── */}
          <div>
            {/* Recheck panel — shown when รอตรวจ */}
            {item.status === "รอตรวจ" && (
              <div style={{ marginBottom: 20 }}>
                {!showRecheck ? (
                  <button
                    onClick={() => setShowRecheck(true)}
                    style={{ width: "100%", padding: "16px 20px", background: "linear-gradient(135deg,#1d4ed8,#2563eb)", border: "none", borderRadius: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", color: "#fff" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 22 }}>🔍</span>
                      <div style={{ textAlign: "left" }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>รีเช็คสินค้า</p>
                        <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>ยืนยันสภาพ · อัปเดตเกรด · เปลี่ยนเป็นพร้อมขาย</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 22, opacity: 0.7 }}>›</span>
                  </button>
                ) : (
                  <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: c.text }}>🔍 รีเช็คสินค้า</p>
                      <button onClick={() => { setShowRecheck(false); setRecheckErr(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, fontSize: 20, padding: 0 }}>×</button>
                    </div>

                    {item.inspectionSnapshot && (
                      <div style={{ marginBottom: 16, padding: "10px 14px", background: c.card2, borderRadius: 10, fontSize: 12, color: c.text3 }}>
                        <p style={{ margin: "0 0 4px", fontWeight: 600, color: c.text2 }}>ข้อมูลอ้างอิงจากการตรวจรับ</p>
                        <p style={{ margin: 0 }}>IMEI: <span style={{ fontFamily: "monospace", color: c.text }}>{item.inspectionSnapshot.imei ?? "—"}</span></p>
                        <p style={{ margin: 0 }}>Serial: <span style={{ fontFamily: "monospace", color: c.text }}>{item.inspectionSnapshot.serial ?? "—"}</span></p>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                      {[
                        { label: "IMEI", key: "imei", mono: true },
                        { label: "Serial Number", key: "serial", mono: true },
                      ].map(({ label, key, mono }) => (
                        <div key={key}>
                          <label style={labelSt}>{label}</label>
                          <input
                            value={recheckDraft[key as keyof typeof recheckDraft] as string}
                            onChange={e => setRecheckDraft(d => ({ ...d, [key]: e.target.value }))}
                            style={{ ...inputSt, fontFamily: mono ? "monospace" : "inherit" }}
                          />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={labelSt}>เกรด</label>
                        <select value={recheckDraft.grade} onChange={e => setRecheckDraft(d => ({ ...d, grade: e.target.value }))} style={inputSt}>
                          {["A","A-","B+","B","B-","C"].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelSt}>Battery %</label>
                        <input type="number" min={0} max={100} value={recheckDraft.batteryHealth}
                          onChange={e => setRecheckDraft(d => ({ ...d, batteryHealth: Number(e.target.value) }))} style={inputSt} />
                      </div>
                      <div>
                        <label style={labelSt}>Cycle Count</label>
                        <input type="number" min={0} value={recheckDraft.cycleCount}
                          onChange={e => setRecheckDraft(d => ({ ...d, cycleCount: Number(e.target.value) }))} style={inputSt} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                      <div>
                        <label style={labelSt}>ผู้ตรวจ</label>
                        <input value={recheckDraft.inspector} onChange={e => setRecheckDraft(d => ({ ...d, inspector: e.target.value }))} placeholder="ชื่อผู้ตรวจ" style={inputSt} />
                      </div>
                      <div>
                        <label style={labelSt}>หมายเหตุ (ไม่บังคับ)</label>
                        <input value={recheckDraft.note} onChange={e => setRecheckDraft(d => ({ ...d, note: e.target.value }))} placeholder="บันทึกเพิ่มเติม..." style={inputSt} />
                      </div>
                    </div>

                    {/* Criteria recheck */}
                    {recheckCriteria.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.text }}>ผลการตรวจสอบสภาพจริง</p>
                          <span style={{ fontSize: 11, color: recheckCriteria.filter(cr => cr.verified).length === recheckCriteria.length ? "#16a34a" : c.text3 }}>
                            {recheckCriteria.filter(cr => cr.verified).length}/{recheckCriteria.length} ยืนยันแล้ว
                          </span>
                        </div>
                        <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr auto", gap: 6, padding: "6px 12px", borderBottom: `1px solid ${c.border}`, background: c.card2 }}>
                            {["รายการ","ผลหน้างาน","ผลสต็อค",""].map((h, i) => (
                              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: c.text3 }}>{h}</span>
                            ))}
                          </div>
                          {recheckCriteria.map((cr, i) => {
                            const btnStyle: React.CSSProperties = cr.verified
                              ? cr.pass ? { background: "#16a34a", color: "#fff", border: "none" } : { background: "#dc2626", color: "#fff", border: "none" }
                              : { background: "transparent", color: c.text3, border: `1px solid ${c.border}` };
                            return (
                              <div key={i} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr auto", gap: 6, alignItems: "center", padding: "8px 12px", borderBottom: i < recheckCriteria.length - 1 ? `1px solid ${c.border}` : undefined }}>
                                <div>
                                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: c.text }}>{cr.label}</p>
                                  <p style={{ margin: 0, fontSize: 10, color: c.text3 }}>แจ้ง: {cr.stated}</p>
                                </div>
                                <span style={{ fontSize: 12, color: c.text2 }}>{cr.fieldActual || "ไม่ระบุ"}</span>
                                <input
                                  value={cr.stockActual}
                                  onChange={e => setRecheckCriteria(prev => prev.map((x, j) => j === i ? { ...x, stockActual: e.target.value } : x))}
                                  placeholder="บันทึก..."
                                  style={{ ...inputSt, fontSize: 12 }}
                                />
                                <button
                                  onClick={() => setRecheckCriteria(prev => prev.map((x, j) => {
                                    if (j !== i) return x;
                                    if (!x.verified) return { ...x, verified: true, pass: true };
                                    if (x.pass) return { ...x, pass: false };
                                    return { ...x, verified: false, pass: true };
                                  }))}
                                  style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" as const, ...btnStyle }}
                                >
                                  {!cr.verified ? "ยืนยัน" : cr.pass ? "✓ ผ่าน" : "✗ ไม่ผ่าน"}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <p style={{ margin: "5px 0 0", fontSize: 10, color: c.text3 }}>กดปุ่ม "ยืนยัน" เพื่อบันทึกผล · กดซ้ำเพื่อสลับ ผ่าน / ไม่ผ่าน</p>
                      </div>
                    )}

                    {/* Functional tests recheck */}
                    {recheckFunctional.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.text }}>ผลทดสอบการใช้งานภายใน</p>
                          <span style={{ fontSize: 11, color: recheckFunctional.filter(t => t.verified).length === recheckFunctional.length ? "#16a34a" : c.text3 }}>
                            {recheckFunctional.filter(t => t.verified).length}/{recheckFunctional.length} ยืนยันแล้ว
                          </span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {recheckFunctional.map((t, i) => {
                            const btnStyle: React.CSSProperties = t.verified
                              ? t.pass ? { background: "#16a34a", color: "#fff", border: "1px solid #16a34a" } : { background: "#dc2626", color: "#fff", border: "1px solid #dc2626" }
                              : { background: "transparent", color: c.text3, border: `1px solid ${c.border}` };
                            return (
                              <button key={i} onClick={() => setRecheckFunctional(prev => prev.map((x, j) => {
                                if (j !== i) return x;
                                if (!x.verified) return { ...x, verified: true, pass: true };
                                if (x.pass) return { ...x, pass: false };
                                return { ...x, verified: false, pass: true };
                              }))} style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 20, cursor: "pointer", ...btnStyle }}>
                                {!t.verified ? t.label : t.pass ? `✓ ${t.label}` : `✗ ${t.label}`}
                              </button>
                            );
                          })}
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: 10, color: c.text3 }}>กดครั้งแรก = ผ่าน · กดซ้ำ = ไม่ผ่าน · กดอีกครั้ง = ยกเลิก</p>
                      </div>
                    )}

                    {recheckErr && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 12px" }}>{recheckErr}</p>}

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
                        await reload();
                      }}
                      style={{ width: "100%", padding: "13px 0", background: recheckSaving || !recheckDraft.inspector.trim() ? c.border : "#16a34a", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: recheckSaving || !recheckDraft.inspector.trim() ? "not-allowed" : "pointer" }}
                    >
                      {recheckSaving ? "กำลังบันทึก..." : "✓ ยืนยันและเปลี่ยนเป็นพร้อมขาย"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Image */}
            <div style={{ background: c.card, borderRadius: 20, padding: 32, textAlign: "center", border: `1px solid ${c.border}`, marginBottom: 20 }}>
              {item.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img onClick={() => setLightboxIndex(0)} src={item.photos[0]} alt={item.model} style={{ maxHeight: 240, objectFit: "contain", cursor: "zoom-in" }} />
              ) : (
                <div style={{ fontSize: 80 }}>📱</div>
              )}
              {item.photos.length > 1 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 16 }}>
                  {item.photos.slice(1).map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} onClick={() => setLightboxIndex(i + 1)} src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10, border: `1px solid ${c.border}`, cursor: "zoom-in" }} />
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
                <GradeBadge grade={item.grade} />
                <StockStatusBadge status={item.status} />
              </div>
              {uploadErr && <p style={{ color: "#ef4444", fontSize: 12, margin: "12px 0 0" }}>{uploadErr}</p>}
            </div>

            {/* Specs */}
            <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}`, marginBottom: 20 }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ข้อมูลเครื่อง</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  ["รุ่น", item.model], ["ความจุ", item.storage], ["สี", item.color],
                  ["IMEI", item.imei], ["Serial", item.serial],
                  ["Battery Health", `${item.batteryHealth}%`], ["Cycle Count", String(item.cycleCount)],
                  ["iCloud", item.icloudStatus], ["Carrier Lock", item.carrierLock],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding: 12, background: c.card2, borderRadius: 12 }}>
                    <p style={{ color: c.text3, fontSize: 11, margin: "0 0 4px" }}>{k}</p>
                    <p style={{ color: c.text, fontSize: 14, fontWeight: 600, margin: 0, fontFamily: k === "IMEI" || k === "Serial" ? "monospace" : "inherit" }}>{v || "-"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cross-check */}
            {item.inspectionSnapshot && (
              <CrossCheckSection item={item} c={c} verifying={verifying} onVerify={handleVerify} />
            )}

            {/* Inspection 3-layer results */}
            {(() => {
              const snap = item.inspectionSnapshot;
              const criteria = snap?.criteria ?? [];
              const functionalTests = snap?.functionalTests ?? [];
              const recheckCrit = snap?.recheckCriteria ?? [];
              const recheckFn = snap?.recheckFunctionalTests ?? [];
              const issues = snap?.issues ?? [];
              if (criteria.length === 0 && functionalTests.length === 0) return null;
              const recheckMap = new Map(recheckCrit.map(r => [r.label, r]));
              const recheckFnMap = new Map(recheckFn.map(r => [r.label, r]));
              const thBase: React.CSSProperties = { padding: "8px 12px", fontSize: 11, fontWeight: 700, color: c.text3, textAlign: "left" as const, borderBottom: `1px solid ${c.border}`, background: "transparent" };
              const tdBase: React.CSSProperties = { padding: "10px 12px", fontSize: 12, borderBottom: `1px solid ${c.border}`, verticalAlign: "middle" as const };
              return (
                <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}`, marginBottom: 20 }}>
                  <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 16px" }}>
                    ผลการตรวจสภาพ
                  </p>

                  {criteria.length > 0 && (
                    <div style={{ overflowX: "auto", marginBottom: 20 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={thBase}>รายการ</th>
                            <th style={{ ...thBase, color: "#6b7280" }}>ลูกค้าแจ้ง</th>
                            <th style={{ ...thBase, color: "#2563eb" }}>เจ้าหน้าที่หน้างาน</th>
                            <th style={{ ...thBase, color: "#16a34a" }}>ทีมสต็อค</th>
                          </tr>
                        </thead>
                        <tbody>
                          {criteria.map((cr, i) => {
                            const rc = recheckMap.get(cr.label);
                            const fail = rc ? !rc.pass : !cr.pass;
                            return (
                              <tr key={i} style={{ background: fail ? "rgba(239,68,68,0.04)" : i % 2 === 0 ? "transparent" : (c.card2) }}>
                                <td style={{ ...tdBase, fontWeight: 600, color: c.text }}>{cr.label}</td>
                                <td style={{ ...tdBase, color: c.text3 }}>{cr.stated || "—"}</td>
                                <td style={{ ...tdBase, color: cr.pass ? c.text : "#f59e0b", fontWeight: cr.pass ? 400 : 600 }}>
                                  {cr.actual || "—"}
                                  {!cr.pass && <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(245,158,11,0.12)", color: "#b45309", padding: "1px 6px", borderRadius: 4 }}>ตำหนิ</span>}
                                </td>
                                <td style={{ ...tdBase, color: !rc ? c.text3 : rc.pass ? "#16a34a" : "#dc2626", fontWeight: rc && !rc.pass ? 700 : 400 }}>
                                  {rc ? (rc.stockActual || (rc.pass ? "✓ ผ่าน" : "✗ ไม่ผ่าน")) : <em style={{ color: c.text3 }}>รอตรวจ</em>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {issues.length > 0 && (
                    <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10 }}>
                      <p style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, margin: "0 0 4px" }}>ปัญหาที่พบเพิ่มเติม (หน้างาน)</p>
                      {issues.map((issue, i) => <p key={i} style={{ color: "#b91c1c", fontSize: 13, margin: "2px 0 0" }}>• {issue}</p>)}
                    </div>
                  )}

                  {functionalTests.length > 0 && (
                    <div>
                      <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 10px" }}>
                        การทำงานภายใน
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {functionalTests.map((t, i) => {
                          const rc = recheckFnMap.get(t.label);
                          const finalPass = rc ? rc.pass : t.pass;
                          const changed = rc && rc.pass !== t.pass;
                          return (
                            <span key={i} title={changed ? `หน้างาน: ${t.pass ? "ผ่าน" : "ไม่ผ่าน"} → สต็อค: ${rc!.pass ? "ผ่าน" : "ไม่ผ่าน"}` : undefined} style={{ fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 20, background: finalPass ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: finalPass ? "#16a34a" : "#dc2626", border: `1px solid ${finalPass ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, position: "relative" as const }}>
                              {finalPass ? "✓" : "✗"} {t.label}
                              {changed && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7 }}>*</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {snap?.recheckBy && (
                    <p style={{ margin: "14px 0 0", fontSize: 11, color: c.text3 }}>
                      รีเช็คโดยทีมสต็อค: <strong style={{ color: c.text2 }}>{snap.recheckBy}</strong>
                      {snap.recheckAt && ` · ${new Date(snap.recheckAt).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Timeline */}
            <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}` }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ประวัติสถานะ</p>
              {item.statusLog.map((log, i) => (
                <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.gold, marginTop: 4 }} />
                    {i < item.statusLog.length - 1 && <div style={{ width: 2, flex: 1, background: c.border, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                      <StockStatusBadge status={log.status} />
                      <span style={{ color: c.text3, fontSize: 11 }}>{log.by}</span>
                    </div>
                    {log.note && <p style={{ color: c.text2, fontSize: 12, margin: "4px 0 0" }}>{log.note}</p>}
                    <p style={{ color: c.text3, fontSize: 11, margin: "4px 0 0" }}>{fmtDate(log.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Sidebar ─── */}
          <div>
            {/* Action buttons */}
            <div style={{ background: c.card, borderRadius: 20, padding: 20, border: `1px solid ${c.border}`, marginBottom: 20 }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>การดำเนินการ</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                {[
                  { icon: Edit2,    label: "แก้ไขข้อมูล",   action: openEdit },
                  { icon: Upload,   label: uploading ? "กำลังอัปโหลด..." : "อัปโหลดรูป", action: () => photoInputRef.current?.click() },
                  { icon: RefreshCw, label: saving ? "กำลังบันทึก..." : "เปลี่ยนสถานะ", action: () => setShowStatusMenu(v => !v) },
                  { icon: Tag,      label: "ตั้งราคาขาย",  action: () => { setPriceDraftModal(item.sellingPrice ? String(item.sellingPrice) : ""); setShowPriceModal(true); } },
                ].map(({ icon: Icon, label, action }) => (
                  <button key={label} onClick={action} disabled={uploading || saving} style={{ ...actionBtnSt, opacity: (uploading || saving) ? 0.5 : 1 }}>
                    <Icon size={14} /> {label}
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
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: STOCK_STATUS_COLORS[s] ?? "#6b7280", flexShrink: 0 }} />
                      <span style={{ color: item.status === s ? c.gold : c.text2, fontSize: 13 }}>{s}</span>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => printPriceTag(item)} style={{ ...actionBtnSt, width: "100%", borderColor: c.border }}>
                <Printer size={14} /> พิมพ์หน้าราคา
              </button>
            </div>

            {/* Profit Card */}
            <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}`, marginBottom: 20 }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ต้นทุน / กำไร</p>
              {[
                ["ต้นทุนสินค้า", `฿${fmt(item.costPrice)}`],
                ["ค่าส่ง", `฿${fmt(item.shippingCost)}`],
                ["ค่าใช้จ่ายอื่น", `฿${fmt(item.otherCost)}`],
                ["ต้นทุนรวม", `฿${fmt(totalCost)}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}` }}>
                  <span style={{ color: c.text2, fontSize: 13 }}>{k}</span>
                  <span style={{ color: k === "ต้นทุนรวม" ? "#ef4444" : c.text, fontWeight: k === "ต้นทุนรวม" ? 700 : 400, fontSize: 13 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: 14, background: c.card2, borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: c.text2, fontSize: 13 }}>ราคาขาย</span>
                  {hasSellPrice ? (
                    <span style={{ color: c.gold, fontSize: 20, fontWeight: 800 }}>฿{fmt(item.sellingPrice)}</span>
                  ) : (
                    <span style={{ color: "#f97316", fontSize: 13, fontWeight: 600, background: "rgba(249,115,22,0.1)", padding: "2px 10px", borderRadius: 8 }}>ยังไม่กำหนด</span>
                  )}
                </div>
                {profit !== null ? (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: c.text2, fontSize: 13 }}>กำไร ({margin}%)</span>
                    <span style={{ color: profit >= 0 ? "#22c55e" : "#ef4444", fontSize: 16, fontWeight: 700 }}>฿{fmt(profit)}</span>
                  </div>
                ) : (
                  <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>กำหนดราคาขายก่อนเพื่อดูกำไร</p>
                )}
              </div>
            </div>

            {/* Sell Button */}
            {item.status !== "ขายแล้ว" && (
              <div style={{ marginBottom: 20 }}>
                <button
                  onClick={() => setShowSellModal(true)}
                  style={{ width: "100%", padding: "14px", borderRadius: 14, background: "#22c55e", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <CheckSquare size={18} /> บันทึกการขาย
                </button>
              </div>
            )}

            {/* Delivery confirm button */}
            {item.deliveryStatus === "รอจัดส่ง" && (
              <div style={{ marginBottom: 20 }}>
                <button
                  onClick={() => { setTrackingDraft(""); setDeliveryAddressDraft(item.deliveryAddress ?? ""); setDeliveryChannelDraft(item.deliveryChannel ?? "หน้าร้าน"); setShowDeliveryModal(true); }}
                  style={{ width: "100%", padding: "14px", borderRadius: 14, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <Truck size={16} /> ยืนยันส่งของ
                </button>
              </div>
            )}

            {/* Sold Info */}
            {item.status === "ขายแล้ว" && (
              <div style={{ background: c.card, borderRadius: 20, padding: 24, border: "1px solid rgba(34,197,94,0.3)", marginBottom: 20 }}>
                <p style={{ color: "#22c55e", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ข้อมูลการขาย</p>
                {[
                  ["ราคาขายจริง", item.soldPrice !== undefined ? `฿${fmt(item.soldPrice)}` : "-"],
                  ["กำไรจริง", item.soldPrice !== undefined ? `฿${fmt(item.soldPrice - totalCost)}` : "-"],
                  ["ผู้ซื้อ", item.buyerName ?? "-"],
                  ["เบอร์โทร", item.buyerPhone ?? "-"],
                  ["วันที่ขาย", fmtDate(item.soldAt)],
                  ["สถานะจัดส่ง", item.deliveryStatus ?? "-"],
                  ...(item.trackingNumber ? [["เลข Tracking", item.trackingNumber]] : []),
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}` }}>
                    <span style={{ color: c.text2, fontSize: 13 }}>{k}</span>
                    <span style={{ color: c.text, fontSize: 13, fontWeight: k === "ราคาขายจริง" || k === "กำไรจริง" ? 700 : 400 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Slip evidence — shown when sold */}
            {item.status === "ขายแล้ว" && (
              <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}`, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>หลักฐานการขาย (สลิป)</p>
                  <button onClick={() => slipInputRef.current?.click()} disabled={slipUploading}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, background: "transparent", border: `1px solid ${c.border}`, color: c.text2, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                    {slipUploading ? "กำลังอัปโหลด..." : "+ แนบสลิป"}
                  </button>
                  <input ref={slipInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
                    onChange={e => e.target.files && handleSlipUpload(e.target.files)} />
                </div>
                {( item.slipUrls ?? [] ).length === 0 ? (
                  <p style={{ color: c.text3, fontSize: 12, margin: 0, textAlign: "center", padding: "16px 0" }}>ยังไม่มีสลิป — กด "+ แนบสลิป" เพื่อเพิ่ม</p>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {(item.slipUrls ?? []).map((url, i) => (
                      <img key={i} src={url} alt={`slip-${i + 1}`} onClick={() => setLightboxSlip(url)}
                        style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 10, border: `1px solid ${c.border}`, cursor: "pointer" }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Purchase Info */}
            <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}` }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ข้อมูลรับซื้อ</p>
              {[
                ["เลขคำขอ", item.requestRef],
                ["ผู้ขาย", item.sellerName],
                ["เบอร์โทร", item.sellerPhone],
                ["ช่องทาง", item.sourceChannel],
                ["วันที่รับเข้า", fmtDate(item.receivedAt)],
                ["ผู้ตรวจ", item.inspector],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}` }}>
                  <span style={{ color: c.text2, fontSize: 13 }}>{k}</span>
                  <span style={{ color: c.text, fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Edit Modal ─── */}
      {editMode && editDraft && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, overflowY: "auto" }}>
          <div style={{ maxWidth: 660, margin: "40px auto 80px", background: c.card, borderRadius: 20, padding: 32, border: `1px solid ${c.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <p style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: 0 }}>แก้ไขข้อมูล — {item.id}</p>
              <button onClick={() => setEditMode(false)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, fontSize: 24, padding: 0, lineHeight: 1 }}>×</button>
            </div>

            <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>ข้อมูลเครื่อง</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelSt}>รุ่น</label>
                <input value={editDraft.model} onChange={e => edSet("model", e.target.value)} style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>ความจุ</label>
                <select value={editDraft.storage} onChange={e => edSet("storage", e.target.value)} style={inputSt}>
                  {["64GB","128GB","256GB","512GB","1TB"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>สี</label>
                <input value={editDraft.color} onChange={e => edSet("color", e.target.value)} style={inputSt} />
              </div>
              <div>
                <label style={labelSt}>เกรด</label>
                <select value={editDraft.grade} onChange={e => edSet("grade", e.target.value)} style={inputSt}>
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
                <select value={editDraft.icloudStatus} onChange={e => edSet("icloudStatus", e.target.value)} style={inputSt}>
                  {["ปลอดล็อกแล้ว","ยังไม่ออก iCloud","ไม่ทราบ"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelSt}>Carrier Lock</label>
                <select value={editDraft.carrierLock} onChange={e => edSet("carrierLock", e.target.value)} style={inputSt}>
                  {["ไม่มี (Unlocked)","AIS","DTAC","TRUE","มี (Locked)"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelSt}>อุปกรณ์ที่มี</label>
                <input value={editDraft.accessories} onChange={e => edSet("accessories", e.target.value)} style={inputSt} />
              </div>
            </div>

            <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>ข้อมูลรับซื้อ</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
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
                <select value={editDraft.sourceChannel} onChange={e => edSet("sourceChannel", e.target.value)} style={inputSt}>
                  {["หน้าร้าน","เว็บไซต์","LINE OA","Facebook","Shopee","โทรศัพท์"].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>ราคา</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
              {([["ราคารับซื้อ (฿)", "costPrice"], ["ค่าส่ง (฿)", "shippingCost"], ["ค่าอื่นๆ (฿)", "otherCost"], ["ราคาขาย (฿)", "sellingPrice"]] as [string, keyof EditDraft][]).map(([lbl, field]) => (
                <div key={field}>
                  <label style={labelSt}>{lbl}</label>
                  <input type="number" value={editDraft[field]} onChange={e => edSet(field, e.target.value)} style={inputSt} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setEditMode(false)} style={{ flex: 1, padding: "13px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button onClick={handleEditSave} disabled={saving} style={{ flex: 2, padding: "13px", borderRadius: 12, background: saving ? c.border : c.gold, border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: saving ? 0.6 : 1 }}>
                <Save size={16} /> {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Price Modal ─── */}
      {showPriceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 380, border: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>ตั้งราคาขาย</p>
            <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>{item.model} · {item.storage}</p>
            <label style={labelSt}>ราคาขาย (บาท)</label>
            <input
              type="number" value={priceDraftModal} onChange={e => setPriceDraftModal(e.target.value)}
              placeholder="0" autoFocus
              style={{ ...inputSt, fontSize: 18, fontWeight: 600, border: `1px solid ${c.gold}`, marginBottom: 20 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowPriceModal(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  const p = parseInt(priceDraftModal);
                  if (!p || p <= 0) return;
                  setSaving(true);
                  await updateStockPrice(item.id, p);
                  await reload();
                  setShowPriceModal(false);
                  setSaving(false);
                }}
                disabled={saving || !priceDraftModal || parseInt(priceDraftModal) <= 0}
                style={{ flex: 2, padding: "12px", borderRadius: 12, background: (!priceDraftModal || parseInt(priceDraftModal) <= 0) ? "#555" : c.gold, border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                {saving ? "กำลังบันทึก..." : "บันทึกราคา"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delivery Modal ─── */}
      {showDeliveryModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, border: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>ยืนยันส่งของ</p>
            <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>{item.model} · {item.id}</p>

            <label style={{ ...labelSt, marginBottom: 8 }}>ช่องทางการจัดส่ง *</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[
                { value: "หน้าร้าน", label: "รับที่หน้าร้าน" },
                { value: "ส่งถึงที่", label: "ส่งถึงที่" },
                { value: "ส่งพัสดุ",  label: "ส่งพัสดุ" },
              ].map(ch => (
                <button key={ch.value} onClick={() => setDeliveryChannelDraft(ch.value)} style={{
                  flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  border: `1.5px solid ${deliveryChannelDraft === ch.value ? "#f59e0b" : c.border}`,
                  background: deliveryChannelDraft === ch.value ? "rgba(245,158,11,0.12)" : c.bg,
                  color: deliveryChannelDraft === ch.value ? "#f59e0b" : c.text2,
                  fontWeight: deliveryChannelDraft === ch.value ? 700 : 400,
                }}>{ch.label}</button>
              ))}
            </div>

            {deliveryChannelDraft === "ส่งถึงที่" && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelSt}>ที่อยู่จัดส่ง *</label>
                <textarea value={deliveryAddressDraft} onChange={e => setDeliveryAddressDraft(e.target.value)}
                  placeholder="บ้านเลขที่ / ถนน / แขวง / เขต / จังหวัด" rows={3}
                  style={{ ...inputSt, resize: "vertical" as const }} />
              </div>
            )}
            {deliveryChannelDraft === "ส่งพัสดุ" && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelSt}>เลข Tracking (ถ้ามี)</label>
                <input value={trackingDraft} onChange={e => setTrackingDraft(e.target.value)} placeholder="TH123456789XX" style={inputSt} />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowDeliveryModal(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button
                disabled={confirmingDelivery || (deliveryChannelDraft === "ส่งถึงที่" && !deliveryAddressDraft.trim())}
                onClick={async () => {
                  setConfirmingDelivery(true);
                  const res = await confirmDelivery(item.id, trackingDraft.trim() || undefined, deliveryChannelDraft, deliveryAddressDraft.trim() || undefined);
                  if (res.success) {
                    await reload();
                    setShowDeliveryModal(false);
                  }
                  setConfirmingDelivery(false);
                }}
                style={{ flex: 2, padding: "12px", borderRadius: 12, background: "#f59e0b", border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (confirmingDelivery || (deliveryChannelDraft === "ส่งถึงที่" && !deliveryAddressDraft.trim())) ? 0.5 : 1 }}
              >
                {confirmingDelivery ? "กำลังบันทึก..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSellModal && (
        <SellModal
          item={item}
          onClose={() => setShowSellModal(false)}
          onSuccess={async () => { await reload(); }}
        />
      )}

      {/* ─── Lightbox ─── */}
      {lightboxIndex !== null && (
        <div
          onClick={() => setLightboxIndex(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {/* Prev */}
          {item.photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => ((i ?? 0) - 1 + item.photos.length) % item.photos.length); }}
              style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 22, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >‹</button>
          )}

          {/* Image */}
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photos[lightboxIndex]} alt="" style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 12 }} />
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: 0 }}>{lightboxIndex + 1} / {item.photos.length}</p>
          </div>

          {/* Next */}
          {item.photos.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); setLightboxIndex(i => ((i ?? 0) + 1) % item.photos.length); }}
              style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 22, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >›</button>
          )}

          {/* Close */}
          <button
            onClick={() => setLightboxIndex(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 36, height: 36, fontSize: 18, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >×</button>
        </div>
      )}

      {/* Slip lightbox */}
      {lightboxSlip && (
        <div onClick={() => setLightboxSlip(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={lightboxSlip} alt="slip" style={{ maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 12 }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightboxSlip(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 36, height: 36, fontSize: 18, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
      )}
    </div>
  );
}
