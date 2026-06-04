"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Phone, MapPin, Camera, AlertTriangle, CheckCircle2, ExternalLink, ScanLine, ShieldCheck, ShieldAlert, ShieldX, Loader2, RefreshCw } from "lucide-react";
import { scanDeviceInfo, checkSickw, scanIdCard } from "@/app/actions/device-scan";
import type { SickwResult } from "@/app/actions/device-scan";
import {
  fetchRiderJob, fetchRiderJobs,
  riderAcceptJob, riderStartJob, riderArriveJob, riderNoShow,
  riderSaveInspection, riderAutoSaveSickw, riderConfirmPrice, riderAdjustPrice,
  riderCustomerAccepted, riderCustomerRejected,
  riderCompleteCash, riderCompleteTransfer, riderRequestTransfer,
  riderRequestHelp,
} from "@/app/actions/rider";
import { uploadContractFiles, saveContractUrls, markContractSigned, savePaymentSlip, getDocumentSignedUrl, patchReceiptWithSlip } from "@/app/actions/admin-requests";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import { validateImageFile } from "@/lib/validate-file";
import { useRiderTheme } from "@/app/rider/theme";
import { fetchMyProfile, fetchAdminUsers } from "@/app/actions/admin-users";
import type { AdminRequest, InspectionCriterion, FunctionalTest } from "@/lib/types/admin";
import { FONT_LINK, DOC_CSS, buildContractPage, buildReceiptPage, thDate, thTime, shortDate } from "@/lib/contract-builder";
import type { ContractDevice, ContractCtx } from "@/lib/contract-builder";

// ── Constants ──────────────────────────────────────────────────────────────────
const STEPS = ["รับงาน", "เดินทาง", "ตรวจเครื่อง", "ราคา/สัญญา", "จบ"];

const PHOTO_SLOTS = [
  { key: "top",    label: "ด้านบน"  },
  { key: "bottom", label: "ด้านล่าง" },
  { key: "right",  label: "ด้านขวา" },
  { key: "left",   label: "ด้านซ้าย" },
  { key: "back",   label: "ด้านหลัง" },
  { key: "screen", label: "หน้าจอ"  },
] as const;

const INSPECT_KEYS = ["body", "screen", "display", "battery", "warranty", "icloud"] as const;
const INSPECT_LABELS: Record<string, string> = {
  body: "สภาพตัวเครื่องภายนอก", screen: "หน้าจอ", display: "การแสดงผล",
  battery: "แบตเตอรี่", warranty: "การรับประกัน", icloud: "iCloud",
};

const FUNCTIONAL_DEFAULTS: FunctionalTest[] = [
  { label: "Face ID / Touch ID", pass: true },
  { label: "กล้องหลัง (ถ่ายภาพ/วิดีโอ)", pass: true },
  { label: "กล้องหน้า (Selfie)", pass: true },
  { label: "ลำโพง (Speaker)", pass: true },
  { label: "ไมโครโฟน", pass: true },
  { label: "Wi-Fi", pass: true },
  { label: "Cellular / SIM", pass: true },
  { label: "Bluetooth", pass: true },
  { label: "GPS", pass: true },
  { label: "Haptic / Vibration", pass: true },
  { label: "ชาร์จพอร์ต", pass: true },
  { label: "ปุ่มด้านข้าง / Volume", pass: true },
];

// ── Utilities ──────────────────────────────────────────────────────────────────

function getDeviceImage(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("17 pro max")) return "/iPhone-17-pro-max.webp";
  if (m.includes("17 pro"))    return "/iPhone-17-pro-max.webp";
  if (m.includes("17 air"))    return "/iPhone-air.webp";
  if (m.includes("17"))        return "/iPhone-17.webp";
  if (m.includes("16 pro max")) return "/iPhone-16-pro-max.webp";
  if (m.includes("16 pro"))    return "/iPhone-16-pro-max.webp";
  if (m.includes("16"))        return "/iPhone-16.webp";
  if (m.includes("15 pro max")) return "/iPhone-15-pro-max.webp";
  if (m.includes("15 pro"))    return "/iPhone-15-pro-max.webp";
  if (m.includes("15"))        return "/iPhone-15.webp";
  if (m.includes("14 pro max")) return "/iPhone-14-pro-max.webp";
  if (m.includes("14 pro"))    return "/iPhone-14-pro-max.webp";
  if (m.includes("14"))        return "/iPhone-14.webp";
  if (m.includes("13 pro max")) return "/iPhone-13-pro-max.webp";
  if (m.includes("13 pro"))    return "/iPhone-13-pro-max.webp";
  if (m.includes("13"))        return "/iPhone-13.webp";
  if (m.includes("12 pro max")) return "/iPhone-12-pro-max.webp";
  if (m.includes("12"))        return "/iPhone-12.webp";
  if (m.includes("11 pro max")) return "/iPhone-11-pro-max.webp";
  if (m.includes("11"))        return "/iPhone-11.webp";
  return "/product-iphone.webp";
}

function stepFromStatus(status: string): number {
  if (status === "confirmed")         return 0;
  if (status === "pickup_scheduled")  return 1;
  if (status === "en_route")          return 1;
  if (status === "inspecting")        return 2;
  if (status === "price_negotiation") return 3;
  if (status === "contracting")       return 3;
  if (status === "awaiting_transfer") return 3;
  if (status === "completed")         return 4;
  if (status === "cancelled")         return 4;
  return 0;
}

async function uploadPhoto(file: File, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("inspection-photos").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("inspection-photos").getPublicUrl(data.path);
  return publicUrl;
}

// ── Shared mini-components ─────────────────────────────────────────────────────
type TC = { BG: string; CARD: string; CARD2: string; BORDER: string; ACCENT: string; GREEN: string; RED: string; TEXT: string; TEXT2: string };

function Spinner({ c }: { c: TC }) {
  return (
    <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${c.BORDER}`, borderTopColor: c.ACCENT, animation: "spin 0.8s linear infinite" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function BigBtn({ label, color, textColor = "#000", onClick, loading, outline, disabled }: {
  label: string; color?: string; textColor?: string; onClick?: () => void; loading?: boolean; outline?: boolean; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading || disabled} style={{
      width: "100%", padding: "15px", borderRadius: 14, fontSize: 15, fontWeight: 700,
      background: outline ? "transparent" : (color ?? "#4ADE80"),
      border: outline ? `1.5px solid ${color ?? "#4ADE80"}` : "none",
      color: outline ? (color ?? "#4ADE80") : textColor,
      cursor: (loading || disabled) ? "default" : "pointer",
      fontFamily: "inherit", opacity: (loading || disabled) ? 0.6 : 1, touchAction: "manipulation",
    }}>
      {loading ? "กำลังดำเนินการ..." : label}
    </button>
  );
}

function FieldRow({ label, value, c }: { label: string; value: string; c: TC }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <span style={{ fontSize: 13, color: c.TEXT2, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: c.TEXT, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Card({ children, c, style }: { children: React.ReactNode; c: TC; style?: React.CSSProperties }) {
  return (
    <div style={{ background: c.CARD, borderRadius: 14, overflow: "hidden", border: `1px solid ${c.BORDER}`, ...style }}>
      {children}
    </div>
  );
}

function CardHead({ icon, title, c }: { icon: React.ReactNode; title: string; c: TC }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
      {icon}
      <span style={{ fontSize: 13, fontWeight: 600, color: c.TEXT }}>{title}</span>
    </div>
  );
}

function SectionLabel({ children, c }: { children: React.ReactNode; c: TC }) {
  return <p style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: c.TEXT2, textTransform: "uppercase", letterSpacing: 0.8 }}>{children}</p>;
}

function StepChip({ label, done, c }: { label: string; done?: boolean; c: TC }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: done ? "rgba(74,222,128,0.08)" : c.CARD, border: `1px solid ${done ? c.GREEN : c.BORDER}`, borderRadius: 10 }}>
      <span style={{ fontSize: 16 }}>{done ? "✓" : "○"}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: done ? c.GREEN : c.TEXT2 }}>{label}</span>
    </div>
  );
}

// Locked future step
function LockedStepRow({ label, c }: { label: string; c: TC }) {
  return (
    <div style={{ padding: "14px 16px", background: c.CARD, borderRadius: 14, border: `1px solid ${c.BORDER}`, display: "flex", alignItems: "center", gap: 12, opacity: 0.4 }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${c.BORDER}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 10, color: c.TEXT2 }}>—</span>
      </div>
      <span style={{ fontSize: 14, color: c.TEXT2 }}>{label}</span>
    </div>
  );
}

// Completed step summary card (thin collapsed)
function DoneCard({ label, detail, c }: { label: string; detail: string; c: TC }) {
  return (
    <div style={{ padding: "12px 16px", background: "rgba(74,222,128,0.06)", borderRadius: 14, border: `1px solid ${c.GREEN}`, display: "flex", alignItems: "center", gap: 12 }}>
      <CheckCircle2 size={18} color={c.GREEN} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.GREEN }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: c.TEXT2 }}>{detail}</p>
      </div>
    </div>
  );
}

// ── StepBar ────────────────────────────────────────────────────────────────────
function StepBar({ current, c }: { current: number; c: TC }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: c.CARD, borderBottom: `1px solid ${c.BORDER}`, flexShrink: 0 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i < current ? c.GREEN : i === current ? c.ACCENT : c.BORDER,
              fontSize: 10, fontWeight: 700, color: i <= current ? "#000" : c.TEXT2, flexShrink: 0,
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 9, color: i === current ? c.ACCENT : c.TEXT2, whiteSpace: "nowrap", fontWeight: i === current ? 600 : 400 }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? c.GREEN : c.BORDER, margin: "0 4px", marginBottom: 14 }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Photo components (for inspect step) ───────────────────────────────────────
function SmallPhotoBox({ slotKey, label, url, onCapture, uploading, c }: {
  slotKey: string; label: string; url?: string; onCapture: (f: File) => void; uploading?: boolean; c: TC;
}) {
  const ref = useRef<HTMLInputElement>(null!);
  return (
    <div>
      <button onClick={() => ref.current?.click()} disabled={uploading} style={{
        width: "100%", aspectRatio: "3/4", background: c.CARD,
        border: `1.5px solid ${url ? c.ACCENT : c.BORDER}`,
        borderRadius: 10, cursor: "pointer", overflow: "hidden", padding: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
      }}>
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <><Camera size={18} color={c.TEXT2} /><span style={{ fontSize: 9, color: c.TEXT2, textAlign: "center", lineHeight: 1.3, padding: "0 4px" }}>{label}</span></>
        }
      </button>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onCapture(f); e.target.value = ""; }} />
    </div>
  );
}

function CompareRow({ label, stated, actual, onActualChange, c }: {
  label: string; stated: string; actual: string; onActualChange: (v: string) => void; c: TC;
}) {
  const pass = !stated || actual.trim().toLowerCase() === stated.trim().toLowerCase();
  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.BORDER}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: c.TEXT }}>{label}</span>
        {actual && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600, background: pass ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)", color: pass ? c.GREEN : c.RED }}>{pass ? "ตรงกัน" : "ไม่ตรง"}</span>}
      </div>
      {stated && <p style={{ margin: "0 0 8px", fontSize: 12, color: c.TEXT2 }}>ลูกค้าแจ้ง: <span style={{ color: c.TEXT, fontWeight: 500 }}>{stated}</span></p>}
      <input value={actual} onChange={e => onActualChange(e.target.value)} placeholder={stated || "กรอกสภาพจริง"}
        style={{ width: "100%", background: c.CARD2, border: `1px solid ${c.BORDER}`, borderRadius: 8, color: c.TEXT, fontSize: 14, fontFamily: "inherit", outline: "none", padding: "8px 10px", boxSizing: "border-box" }} />
    </div>
  );
}

function CheckRow({ label, pass, onToggle, c }: { label: string; pass: boolean; onToggle: (v: boolean) => void; c: TC }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${c.BORDER}` }}>
      <span style={{ fontSize: 13, color: c.TEXT, flex: 1 }}>{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onToggle(true)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", background: pass ? "rgba(48,209,88,0.2)" : c.CARD2, color: pass ? c.GREEN : c.TEXT2, fontWeight: 600, fontSize: 12 }}>ปกติ</button>
        <button onClick={() => onToggle(false)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", background: !pass ? "rgba(255,69,58,0.2)" : c.CARD2, color: !pass ? c.RED : c.TEXT2, fontWeight: 600, fontSize: 12 }}>มีปัญหา</button>
      </div>
    </div>
  );
}

// ── Inspect Step (stateful component) ─────────────────────────────────────────
function InspectStep({ job, reload, c }: { job: AdminRequest; reload: () => void; c: TC }) {
  const [slotPhotos, setSlotPhotos] = useState<Partial<Record<string, string>>>({});
  const [defectPhotos, setDefectPhotos] = useState<string[]>([]);
  const defectRef = useRef<HTMLInputElement>(null!);
  const [uploading, setUploading] = useState(false);
  const [imei,   setImei]   = useState(job.inspection?.imei ?? "");
  const [serial, setSerial] = useState(job.inspection?.serial ?? "");
  const [color,  setColor]  = useState(job.device?.color ?? "");
  const [battery, setBattery] = useState(job.inspection?.batteryHealth ? String(job.inspection.batteryHealth) : "");
  const [warrantyStatus, setWarrantyStatus] = useState<"valid" | "expired" | "">(
    job.inspection?.warrantyExpiry === "expired" ? "expired" : job.inspection?.warrantyExpiry ? "valid" : ""
  );
  const [warrantyExpiry, setWarranty] = useState(
    job.inspection?.warrantyExpiry && job.inspection.warrantyExpiry !== "expired" ? job.inspection.warrantyExpiry : ""
  );
  const [criteria, setCriteria] = useState<Record<string, { stated: string; actual: string }>>(() => {
    const sels = job.device.selections ?? {};
    const init: Record<string, { stated: string; actual: string }> = {};
    INSPECT_KEYS.forEach(k => { if (sels[k]) init[k] = { stated: sels[k], actual: sels[k] }; });
    return init;
  });
  const [functional, setFunctional] = useState<FunctionalTest[]>(FUNCTIONAL_DEFAULTS.map(t => ({ ...t })));
  const scanRef = useRef<HTMLInputElement>(null!);
  const [scanning,     setScanning]     = useState(false);
  const [sickwResult,  setSickwResult]  = useState<SickwResult | null>(null);
  const [sickwRaw,     setSickwRaw]     = useState((job.inspection as { sickw_report?: string } | undefined)?.sickw_report ?? "");
  const [sickwExpanded,setSickwExpanded]= useState(false);
  const [sickwError,   setSickwError]   = useState("");
  const [sickwLoading, setSickwLoading] = useState(false);
  const savedAcc = (job.inspection as { accessories?: string[] } | undefined)?.accessories;
  const [accessories, setAccessories] = useState<string[]>(savedAcc ?? ["ตัวเครื่อง"]);
  const [accessoriesOther, setAccessoriesOther] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Restore full SickwResult (including form auto-fill) from saved raw text on mount
  useEffect(() => {
    if (!sickwRaw || sickwResult) return;
    const map: Record<string, string> = {};
    for (const line of sickwRaw.split("\n")) {
      const idx = line.indexOf(": ");
      if (idx > 0) map[line.slice(0, idx).trim()] = line.slice(idx + 2).trim();
    }
    const cfg = map["Device Configuration"] ?? "";
    const cfgParts = cfg.split(",");
    const colorFromCfg = cfgParts.length >= 5 ? cfgParts[4].trim() : undefined;
    const colorFromModel = (map["Model Name"] ?? "").match(/\d+\s*[GT]B\s+(.+)$/i)?.[1]?.trim();
    // Parse DD/MM/YY warranty date
    const rawDate = map["Coverage End Date"] ?? map["Coverage Duration"] ?? "";
    const dm = rawDate.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    const warrantyDate = dm
      ? `${dm[3].length === 2 ? `20${dm[3]}` : dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`
      : undefined;
    applySickwData({
      imei:           map["IMEI"],
      device:         cfg || map["Model Name"],
      color:          colorFromCfg ?? colorFromModel,
      carrierLock:    map["Unlock Status"] ?? map["Sim-Lock"],
      icloudStatus:   [map["iCloud Lock"], map["iCloud Status"]].filter(Boolean).join(" / ") || undefined,
      blacklist:      map["Blacklist"],
      warrantyStatus: map["Limited Warranty"],
      warrantyDate,
      rawText:        sickwRaw,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sickwRaw]);

  function applySickwData(data: import("@/app/actions/device-scan").SickwResult) {
    setSickwResult(data);
    if (data.rawText) setSickwRaw(data.rawText);
    if (data.imei) setImei(data.imei);
    if (data.color) setColor(data.color);
    if (data.warrantyStatus) {
      const ws = data.warrantyStatus.toLowerCase();
      if (ws === "no" || ws.includes("expir") || ws.includes("out of") || ws.includes("หมด")) {
        setWarrantyStatus("expired");
      } else if (ws === "yes" || ws.includes("active") || ws.includes("valid") || ws.includes("cover")) {
        setWarrantyStatus("valid");
        if (data.warrantyDate) {
          const parsed = new Date(data.warrantyDate);
          if (!isNaN(parsed.getTime())) setWarranty(parsed.toISOString().slice(0, 10));
        }
      }
    }
  }

  async function handleScan(file: File) {
    setScanning(true); setError(""); setSickwResult(null); setSickwError("");
    try {
      const compressed = await compressImage(file);
      const buf = await compressed.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const result = await scanDeviceInfo(b64);
      if (result.error) { setError(result.error); return; }
      if (!result.serial) { setError("อ่าน S/N ไม่ได้ — ถ่ายให้ชัดขึ้น หรือกรอกเอง"); return; }
      setSerial(result.serial);
      setSickwLoading(true);
      const sickw = await checkSickw(result.serial);
      if (!sickw.success) setSickwError(sickw.error ?? "เช็ค SICKW ไม่ได้");
      else if (sickw.data) {
        applySickwData(sickw.data);
        if (sickw.data.rawText) riderAutoSaveSickw(job.id, { serial: result.serial, sickw_report: sickw.data.rawText });
      }
      setSickwLoading(false);
    } catch { setError("สแกนไม่สำเร็จ กรุณากรอกเอง"); }
    finally { setScanning(false); if (scanRef.current) scanRef.current.value = ""; }
  }

  async function handleSickwCheck() {
    const id = serial.trim() || imei.trim();
    if (!id) return;
    setSickwLoading(true); setSickwResult(null); setSickwError("");
    const res = await checkSickw(id);
    if (!res.success) setSickwError(res.error ?? "เช็ค SICKW ไม่ได้");
    else if (res.data) {
      applySickwData(res.data);
      if (res.data.rawText) riderAutoSaveSickw(job.id, { serial: id.length >= 10 && !id.match(/^\d{15}$/) ? id : undefined, sickw_report: res.data.rawText });
    }
    setSickwLoading(false);
  }

  // Price confirm sub-step (shown after inspection saved)
  const [showPrice, setShowPrice] = useState(!!job.inspection);
  const [priceMode, setPriceMode] = useState<"" | "confirm" | "adjust">("");
  const [adjustPrice, setAdjustPrice] = useState(String(job.device.estimatedPrice));
  const [adjustReason, setAdjustReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleAcc(acc: string) {
    setAccessories(prev => prev.includes(acc) ? prev.filter(a => a !== acc) : [...prev, acc]);
  }

  async function handleSlotPhoto(key: string, file: File) {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const url = await uploadPhoto(compressed, `rider/${job.id}/slot-${key}-${Date.now()}.jpg`);
      setSlotPhotos(prev => ({ ...prev, [key]: url }));
    } catch { setError("อัปโหลดรูปไม่สำเร็จ"); }
    finally { setUploading(false); }
  }

  async function handleDefectPhotos(files: FileList) {
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(async f => {
        const compressed = await compressImage(f);
        return uploadPhoto(compressed, `rider/${job.id}/defect-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
      }));
      setDefectPhotos(prev => [...prev, ...urls]);
    } catch { setError("อัปโหลดรูปไม่สำเร็จ"); }
    finally { setUploading(false); if (defectRef.current) defectRef.current.value = ""; }
  }

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const criteriaArr: InspectionCriterion[] = INSPECT_KEYS.filter(k => criteria[k]).map(k => ({
        label: INSPECT_LABELS[k], stated: criteria[k].stated, actual: criteria[k].actual,
        pass: !criteria[k].stated || criteria[k].actual.trim().toLowerCase() === criteria[k].stated.trim().toLowerCase(),
      }));
      const warrantyValue = warrantyStatus === "expired" ? "expired" : warrantyExpiry || undefined;
      const photos = [...Object.values(slotPhotos).filter(Boolean), ...defectPhotos] as string[];
      const accList = [...accessories, ...(accessoriesOther.trim() ? [accessoriesOther.trim()] : [])];
      const result = await riderSaveInspection(job.id, {
        imei, serial, color: color.trim() || undefined,
        batteryHealth: battery ? parseInt(battery) : undefined,
        warrantyExpiry: warrantyValue,
        criteria: criteriaArr, functionalTests: functional, photos,
        sickw_report: sickwRaw || undefined,
        accessories: accList.length ? accList : undefined,
      });
      if (!result.success) { setError((result as { success: false; error?: string }).error ?? "เกิดข้อผิดพลาด"); return; }
      setShowPrice(true);
      reload();
    } catch (e) { setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด"); }
    finally { setSaving(false); }
  }

  async function handleConfirmPrice() {
    setSubmitting(true);
    const result = await riderConfirmPrice(job.id, job.device.estimatedPrice);
    if (!result.success) { setError((result as { success: false; error?: string }).error ?? "เกิดข้อผิดพลาด"); setSubmitting(false); return; }
    reload();
  }

  async function handleAdjustPrice() {
    const np = parseInt(adjustPrice.replace(/,/g, ""));
    if (!np || !adjustReason.trim()) { setError("กรุณากรอกราคาและเหตุผล"); return; }
    setSubmitting(true);
    const result = await riderAdjustPrice(job.id, np, adjustReason);
    if (!result.success) { setError((result as { success: false; error?: string }).error ?? "เกิดข้อผิดพลาด"); setSubmitting(false); return; }
    reload();
  }

  const price = job.device.estimatedPrice;

  if (showPrice) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: c.CARD, borderRadius: 14, padding: 16, border: `1px solid ${c.BORDER}` }}>
          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: c.TEXT }}>ยืนยันราคา</p>
          <div style={{ background: c.CARD2, borderRadius: 10, padding: "14px", textAlign: "center", marginBottom: 14 }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: c.TEXT2 }}>ราคาประเมิน (ลูกค้าแจ้ง)</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: c.ACCENT }}>฿{price.toLocaleString("th-TH")}</p>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: c.TEXT2 }}>เครื่องตรงตามที่แจ้งหรือไม่?</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button onClick={() => setPriceMode("confirm")} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${priceMode === "confirm" ? c.GREEN : c.BORDER}`, background: priceMode === "confirm" ? "rgba(74,222,128,0.12)" : c.CARD, color: priceMode === "confirm" ? c.GREEN : c.TEXT2, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              ✓ ราคาตรงกัน
            </button>
            <button onClick={() => setPriceMode("adjust")} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `2px solid ${priceMode === "adjust" ? "#FF9500" : c.BORDER}`, background: priceMode === "adjust" ? "rgba(255,149,0,0.12)" : c.CARD, color: priceMode === "adjust" ? "#FF9500" : c.TEXT2, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              ปรับราคา
            </button>
          </div>
          {priceMode === "adjust" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: c.TEXT2 }}>ราคาที่เสนอใหม่ (บาท)</p>
                <input type="number" value={adjustPrice} onChange={e => setAdjustPrice(e.target.value)}
                  style={{ width: "100%", background: c.CARD2, border: `1px solid ${c.BORDER}`, borderRadius: 8, color: c.TEXT, fontSize: 16, fontFamily: "inherit", outline: "none", padding: "10px 12px", boxSizing: "border-box" }} />
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: c.TEXT2 }}>เหตุผล</p>
                <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="เช่น แบตเตอรี่น้อย, มีรอยขีดข่วน"
                  style={{ width: "100%", background: c.CARD2, border: `1px solid ${c.BORDER}`, borderRadius: 8, color: c.TEXT, fontSize: 14, fontFamily: "inherit", outline: "none", padding: "10px 12px", boxSizing: "border-box" }} />
              </div>
            </div>
          )}
        </div>

        {error && <p style={{ margin: 0, fontSize: 13, color: c.RED, padding: "0 4px" }}>{error}</p>}

        {priceMode === "confirm" && <BigBtn label="ยืนยันราคาและทำสัญญา →" loading={submitting} onClick={handleConfirmPrice} />}
        {priceMode === "adjust"  && <BigBtn label="เสนอราคาใหม่ →" color="#FF9500" loading={submitting} onClick={handleAdjustPrice} />}
        <button onClick={() => setShowPrice(false)} style={{ background: "none", border: "none", color: c.TEXT2, fontSize: 13, cursor: "pointer", padding: "4px 0", fontFamily: "inherit", textDecoration: "underline" }}>
          ← แก้ไขผลการตรวจ
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Photos */}
      <div>
        <SectionLabel c={c}>รูปสภาพเครื่อง</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          {PHOTO_SLOTS.map(slot => (
            <SmallPhotoBox key={slot.key} slotKey={slot.key} label={slot.label}
              url={slotPhotos[slot.key]} onCapture={f => handleSlotPhoto(slot.key, f)} uploading={uploading} c={c} />
          ))}
        </div>
        <p style={{ margin: "0 0 6px", fontSize: 12, color: c.TEXT2, fontWeight: 600 }}>รูปตำหนิเพิ่มเติม</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {defectPhotos.map((url, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "3/4", borderRadius: 10, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`ตำหนิ ${i+1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={() => setDefectPhotos(prev => prev.filter((_,j)=>j!==i))} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          ))}
          <button onClick={() => defectRef.current?.click()} disabled={uploading} style={{ aspectRatio: "3/4", background: c.CARD, border: `1.5px dashed ${c.BORDER}`, borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, opacity: uploading ? 0.6 : 1 }}>
            <Camera size={18} color={c.TEXT2} />
            <span style={{ fontSize: 9, color: c.TEXT2 }}>+ ตำหนิ</span>
          </button>
        </div>
        <input ref={defectRef} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }}
          onChange={e => { if (e.target.files?.length) handleDefectPhotos(e.target.files); }} />
      </div>

      {/* Device info */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: c.TEXT2, textTransform: "uppercase", letterSpacing: 0.8 }}>ข้อมูลเครื่อง</p>
          <button onClick={() => scanRef.current?.click()} disabled={scanning}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: "rgba(74,222,128,0.15)", border: `1px solid ${c.ACCENT}`, cursor: "pointer", fontFamily: "inherit", opacity: scanning ? 0.7 : 1 }}>
            {scanning ? <Loader2 size={14} color={c.ACCENT} style={{ animation: "spin 0.8s linear infinite" }} /> : <ScanLine size={14} color={c.ACCENT} />}
            <span style={{ fontSize: 13, fontWeight: 600, color: c.ACCENT }}>{scanning ? "กำลังอ่าน..." : "สแกน About"}</span>
          </button>
          <input ref={scanRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleScan(f); }} />
        </div>
        <Card c={c}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: c.TEXT2 }}>Serial Number</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input value={serial} onChange={e => { setSerial(e.target.value.toUpperCase()); setSickwResult(null); setSickwError(""); }} placeholder="กรอก Serial"
                style={{ flex: 1, background: "none", border: "none", color: c.TEXT, fontSize: 15, fontFamily: "inherit", outline: "none", textTransform: "uppercase" }} />
              {serial.trim().length >= 10 && !sickwResult && (
                <button onClick={handleSickwCheck} disabled={sickwLoading}
                  style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 8, background: "rgba(10,132,255,0.15)", border: "1px solid rgba(10,132,255,0.4)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, opacity: sickwLoading ? 0.6 : 1 }}>
                  {sickwLoading ? <Loader2 size={13} color="#0A84FF" style={{ animation: "spin 0.8s linear infinite" }} /> : <ShieldCheck size={13} color="#0A84FF" />}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0A84FF" }}>ตรวจสอบ Apple</span>
                </button>
              )}
              {serial.trim().length >= 10 && sickwResult && !sickwLoading && (
                <button onClick={() => { setSickwResult(null); setSickwRaw(""); setSickwError(""); handleSickwCheck(); }}
                  style={{ flexShrink: 0, padding: "5px 10px", borderRadius: 8, background: "rgba(255,159,10,0.12)", border: "1px solid rgba(255,159,10,0.4)", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                  <RefreshCw size={13} color="#FF9F0A" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#FF9F0A" }}>ตรวจซ้ำ</span>
                </button>
              )}
            </div>
          </div>
          {(sickwResult || sickwError || sickwLoading) && (
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.BORDER}`, background: "rgba(10,132,255,0.05)" }}>
              {sickwLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={14} color="#0A84FF" style={{ animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 12, color: c.TEXT2 }}>กำลังตรวจสอบข้อมูล Apple...</span>
                </div>
              ) : sickwError ? (
                <p style={{ margin: 0, fontSize: 12, color: c.RED }}>{sickwError}</p>
              ) : sickwResult && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {[
                      ["รุ่น", sickwResult.device],
                      ["iCloud", sickwResult.icloudStatus],
                      ["Carrier Lock", sickwResult.carrierLock],
                      ["Blacklist", sickwResult.blacklist],
                      ["ประกัน", sickwResult.warrantyStatus],
                      ["หมดประกัน", sickwResult.warrantyDate],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: c.TEXT2 }}>{label}</span>
                        <span style={{ color: c.TEXT, fontWeight: 500 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Verdict card */}
                  {(() => {
                    const issues: string[] = [];
                    const icloud = sickwResult.icloudStatus?.toLowerCase() ?? "";
                    if (icloud.includes("lock") && icloud.includes("on")) issues.push("iCloud Lock เปิดอยู่ — เครื่องล็อคกับบัญชี Apple เดิม");
                    if (icloud.includes("lost")) issues.push("Find My iPhone / สถานะ Lost — เครื่องถูกรายงานสูญหาย");
                    const mdmLine = sickwRaw.split("\n").find(l => /^MDM Lock:/i.test(l));
                    if (mdmLine?.toLowerCase().includes(": on")) issues.push("MDM Lock เปิดอยู่ — เครื่องถูกล็อคโดยองค์กร");
                    const bl = sickwResult.blacklist?.toLowerCase() ?? "";
                    if (bl && !["clean", "ok", "no", "clear", "not"].some(s => bl.includes(s))) issues.push(`Blacklist: ${sickwResult.blacklist}`);
                    const passed = issues.length === 0;
                    return (
                      <div style={{ marginTop: 10, borderRadius: 12, border: `1.5px solid ${passed ? "rgba(52,199,89,0.4)" : "rgba(255,69,58,0.4)"}`, background: passed ? "rgba(52,199,89,0.08)" : "rgba(255,69,58,0.08)", padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: passed ? 0 : 10 }}>
                          {passed ? <ShieldCheck size={18} color="#34C759" /> : <ShieldX size={18} color={c.RED} />}
                          <span style={{ fontSize: 14, fontWeight: 700, color: passed ? "#34C759" : c.RED }}>
                            {passed ? "ผ่านการตรวจสอบ — รับเครื่องได้" : "ไม่ผ่านการตรวจสอบ — ห้ามรับเครื่อง"}
                          </span>
                        </div>
                        {!passed && (
                          <>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {issues.map(issue => (
                                <div key={issue} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                  <span style={{ fontSize: 15, lineHeight: 1.2 }}>🚫</span>
                                  <span style={{ fontSize: 13, color: c.RED, fontWeight: 500 }}>{issue}</span>
                                </div>
                              ))}
                            </div>
                            <p style={{ margin: "10px 0 0", fontSize: 12, color: c.TEXT2 }}>แจ้งลูกค้าและติดต่อ admin ก่อนดำเนินการต่อ</p>
                          </>
                        )}
                      </div>
                    );
                  })()}
                  {sickwRaw && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => setSickwExpanded(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, color: "#0A84FF", fontFamily: "inherit" }}>
                        {sickwExpanded ? "▲ ซ่อนรายงานเต็ม" : "▼ ดูรายงานเต็ม"}
                      </button>
                      {sickwExpanded && (
                        <pre style={{ margin: "6px 0 0", padding: "10px 12px", borderRadius: 8, background: c.CARD2, fontSize: 11, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", color: c.TEXT }}>{sickwRaw}</pre>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: c.TEXT2 }}>สีตัวเครื่อง</p>
            <input value={color} onChange={e => setColor(e.target.value)} placeholder="เช่น Black Titanium, Midnight"
              style={{ width: "100%", background: "none", border: "none", color: c.TEXT, fontSize: 15, fontFamily: "inherit", outline: "none" }} />
          </div>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: c.TEXT2 }}>IMEI</p>
            <input value={imei} onChange={e => setImei(e.target.value)} placeholder="กรอก IMEI (ไม่บังคับ)"
              style={{ width: "100%", background: "none", border: "none", color: c.TEXT, fontSize: 15, fontFamily: "inherit", outline: "none" }} />
          </div>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: c.TEXT2 }}>Battery Health</p>
            <select value={battery} onChange={e => setBattery(e.target.value)}
              style={{ width: "100%", background: "none", border: "none", color: battery ? c.TEXT : c.TEXT2, fontSize: 15, fontFamily: "inherit", outline: "none", appearance: "none" }}>
              <option value="">-- เลือก % --</option>
              {Array.from({ length: 51 }, (_, i) => 100 - i).map(v => <option key={v} value={String(v)}>{v}%</option>)}
            </select>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: c.TEXT2 }}>การรับประกัน</p>
            <div style={{ display: "flex", gap: 8, marginBottom: warrantyStatus === "valid" ? 10 : 0 }}>
              {(["valid", "expired"] as const).map(s => (
                <button key={s} onClick={() => setWarrantyStatus(prev => prev === s ? "" : s)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: warrantyStatus === s ? (s === "valid" ? "rgba(48,209,88,0.2)" : "rgba(255,69,58,0.2)") : c.CARD2, color: warrantyStatus === s ? (s === "valid" ? c.GREEN : c.RED) : c.TEXT2 }}>
                  {s === "valid" ? "ยังมีประกัน" : "ประกันสิ้นสุดแล้ว"}
                </button>
              ))}
            </div>
            {warrantyStatus === "valid" && (
              <input type="date" value={warrantyExpiry} onChange={e => setWarranty(e.target.value)}
                style={{ width: "100%", background: c.CARD2, border: `1px solid ${c.BORDER}`, borderRadius: 8, color: c.TEXT, fontSize: 14, fontFamily: "inherit", outline: "none", padding: "8px 10px", boxSizing: "border-box", appearance: "none" }} />
            )}
          </div>
        </Card>
      </div>

      {/* Condition criteria */}
      <div>
        <SectionLabel c={c}>สภาพเครื่อง</SectionLabel>
        <Card c={c}>
          {INSPECT_KEYS.some(k => criteria[k]) ? (
            INSPECT_KEYS.filter(k => criteria[k]).map(k => (
              <CompareRow key={k} label={INSPECT_LABELS[k]} stated={criteria[k].stated} actual={criteria[k].actual}
                onActualChange={v => setCriteria(p => ({ ...p, [k]: { ...p[k], actual: v } }))} c={c} />
            ))
          ) : (
            <p style={{ margin: 0, padding: 16, fontSize: 13, color: c.TEXT2 }}>ลูกค้าไม่ได้ระบุสภาพเครื่องไว้</p>
          )}
        </Card>
      </div>

      {/* Functional tests */}
      <div>
        <SectionLabel c={c}>ฟังก์ชันการใช้งาน</SectionLabel>
        <Card c={c}>
          <div style={{ padding: "0 16px" }}>
            {functional.map((test, i) => (
              <CheckRow key={test.label} label={test.label} pass={test.pass}
                onToggle={v => setFunctional(prev => prev.map((t,j) => j===i ? {...t,pass:v} : t))} c={c} />
            ))}
          </div>
        </Card>
      </div>

      {/* Accessories */}
      <Card c={c}>
        <CardHead icon={null} title="อุปกรณ์ที่ให้มา" c={c} />
        <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["ตัวเครื่อง", "กล่อง", "สายชาร์จ", "หัวชาร์จ", "EarPods", "ฟิล์ม", "เคส"].map(a => (
            <button key={a} onClick={() => toggleAcc(a)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${accessories.includes(a) ? c.ACCENT : c.BORDER}`, background: accessories.includes(a) ? "rgba(74,222,128,0.12)" : c.CARD, color: accessories.includes(a) ? c.ACCENT : c.TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{a}</button>
          ))}
        </div>
        <div style={{ padding: "0 16px 12px" }}>
          <input placeholder="อื่นๆ (เช่น คู่มือ, หูฟัง)" value={accessoriesOther} onChange={e => setAccessoriesOther(e.target.value)}
            style={{ width: "100%", background: "none", border: `1px solid ${c.BORDER}`, borderRadius: 8, padding: "8px 10px", color: c.TEXT, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
      </Card>

      {error && <p style={{ margin: 0, fontSize: 13, color: c.RED }}>{error}</p>}
      {uploading && <p style={{ margin: 0, fontSize: 13, color: c.ACCENT, textAlign: "center" }}>กำลังอัปโหลดรูป...</p>}

      {(() => {
        const blocked = sickwResult ? (() => {
          const icloud = sickwResult.icloudStatus?.toLowerCase() ?? "";
          if (icloud.includes("lock") && icloud.includes("on")) return true;
          if (icloud.includes("lost")) return true;
          const mdmLine = sickwRaw.split("\n").find(l => /^MDM Lock:/i.test(l));
          if (mdmLine?.toLowerCase().includes(": on")) return true;
          const bl = sickwResult.blacklist?.toLowerCase() ?? "";
          if (bl && !["clean", "ok", "no", "clear", "not"].some(s => bl.includes(s))) return true;
          return false;
        })() : false;
        return (
          <BigBtn label={uploading ? "กำลังอัปโหลดรูป..." : saving ? "กำลังบันทึก..." : "บันทึกและยืนยันราคา →"}
            loading={saving} disabled={uploading || blocked} onClick={handleSave} />
        );
      })()}
    </div>
  );
}

// ── Price Negotiation Step ─────────────────────────────────────────────────────
function PriceNegotiationStep({ job, reload, c }: { job: AdminRequest; reload: () => void; c: TC }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const insp = job.inspection;
  const price = insp?.actualPrice ?? job.device.estimatedPrice;
  const response = insp?.negotiationResponse;

  async function handleAccepted() {
    setBusy(true);
    await riderCustomerAccepted(job.id);
    reload();
  }
  async function handleRejected() {
    setBusy(true);
    await riderCustomerRejected(job.id);
    reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: c.CARD, borderRadius: 14, padding: 16, border: `1px solid ${c.BORDER}` }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: c.TEXT }}>รอลูกค้ายืนยันราคา</p>
        <div style={{ background: c.CARD2, borderRadius: 10, padding: 14, textAlign: "center", marginBottom: 14 }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, color: c.TEXT2 }}>ราคาที่เสนอ</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#FF9500" }}>฿{price.toLocaleString("th-TH")}</p>
          {insp?.priceReason && <p style={{ margin: "6px 0 0", fontSize: 12, color: c.TEXT2 }}>เหตุผล: {insp.priceReason}</p>}
        </div>
        {!response && (
          <>
            <p style={{ margin: "0 0 10px", fontSize: 13, color: c.TEXT2 }}>ลูกค้าตัดสินใจอย่างไร?</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAccepted} disabled={busy} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: "rgba(48,209,88,0.15)", color: c.GREEN, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}>
                ✓ ยอมรับ
              </button>
              <button onClick={handleRejected} disabled={busy} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: "rgba(255,69,58,0.15)", color: c.RED, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1 }}>
                ✕ ปฏิเสธ
              </button>
            </div>
          </>
        )}
        {response === "accepted" && <p style={{ margin: 0, fontSize: 14, color: c.GREEN, fontWeight: 600 }}>✓ ลูกค้ายอมรับราคาแล้ว — กำลังโหลดขั้นตอนถัดไป...</p>}
        {response === "rejected" && <p style={{ margin: 0, fontSize: 14, color: c.RED, fontWeight: 600 }}>✕ ลูกค้าปฏิเสธราคา — งานถูกยกเลิก</p>}
      </div>
      {error && <p style={{ margin: 0, fontSize: 13, color: c.RED }}>{error}</p>}
    </div>
  );
}

// ── Contract Step ──────────────────────────────────────────────────────────────
function ContractStep({ job, reload, riderName, officerId, c }: { job: AdminRequest; reload: () => void; riderName: string; officerId: string; c: TC }) {
  const [buyerName, setBuyerName] = useState(job.customer.name);
  const [payMethod, setPayMethod] = useState<"cash"|"transfer">(job.payment.method as "cash"|"transfer");
  const [bankName, setBankName] = useState(job.payment.bankName ?? "");
  const [accountName, setAccountName] = useState(job.payment.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(job.payment.accountNumber ?? "");
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState(job.customer.address ?? "");
  const [serial, setSerial] = useState((job.inspection?.serial ?? "").toUpperCase());
  const [imei, setImei] = useState(job.inspection?.imei ?? "");
  const [deviceColor, setDeviceColor] = useState(job.device.color ?? "");
  const [txDate, setTxDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [idPhotoDataUrl, setIdPhotoDataUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError,   setOcrError]   = useState("");
  const [custProdPhotoDataUrl, setCustProdPhotoDataUrl] = useState<string | null>(null);
  const [paymentPhotoDataUrl, setPaymentPhotoDataUrl] = useState<string | null>(null);
  const [paymentPhotoUploading, setPaymentPhotoUploading] = useState(false);
  const [paymentPhotoStorageUrl, setPaymentPhotoStorageUrl] = useState<string | null>(null);
  const idFileRef = useRef<HTMLInputElement>(null!);
  const custFileRef = useRef<HTMLInputElement>(null!);
  const paymentFileRef = useRef<HTMLInputElement>(null!);

  const price = job.inspection?.actualPrice ?? job.device.estimatedPrice;

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const contractHTMLRef = useRef("");
  const receiptHTMLRef = useRef("");

  // Post-generation state
  const isCompleted = job.status === "completed";
  const [contractSigned, setContractSigned] = useState(!!job.payment.contractSignedAt || job.status === "awaiting_transfer");
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferNotified, setTransferNotified] = useState(job.status === "awaiting_transfer");
  const [slipUploading, setSlipUploading] = useState(false);
  const [completingBusy, setCompletingBusy] = useState(false);
  const slipFileRef = useRef<HTMLInputElement>(null!);

  // Animate when slip arrives via real-time
  const [slipJustArrived, setSlipJustArrived] = useState(false);
  const prevSlipRef = useRef(job.payment.slipUrl);

  const inputSt: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${c.BORDER}`, background: c.CARD2, fontSize: 14, color: c.TEXT, fontFamily: "inherit", outline: "none" };
  const labelSt: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: c.TEXT2, marginBottom: 4 };

  function calcAge(dobStr: string): number | null {
    if (!dobStr) return null;
    const birth = new Date(dobStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  }

  function formatId(raw: string) {
    const d = raw.replace(/\D/g,"").slice(0,13);
    if (d.length<=1) return d; if (d.length<=5) return `${d.slice(0,1)}-${d.slice(1)}`;
    if (d.length<=10) return `${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5)}`;
    if (d.length<=12) return `${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5,10)}-${d.slice(10)}`;
    return `${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5,10)}-${d.slice(10,12)}-${d.slice(12)}`;
  }

  function applyWatermark(file: File): Promise<string> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new window.Image();
        img.onload = () => {
          const scale = Math.min(1, 1400 / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale; canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Base font and maxWidth on diagonal so text spans the full image
          const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
          const fs = Math.max(20, Math.floor(diagonal / 18));
          const maxW = diagonal * 0.88;
          ctx.save();
          ctx.globalAlpha = 0.70;
          ctx.fillStyle = "#DC2626";
          ctx.textAlign = "center";
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-22 * Math.PI / 180);
          ctx.font = `bold ${fs}px Arial,sans-serif`;
          ctx.fillText("ใช้สำหรับขายให้ Khaiphone.com เท่านั้น", 0, 0, maxW);
          ctx.font = `${Math.floor(fs * 0.78)}px Arial,sans-serif`;
          ctx.fillText(`วันที่ ${thDate(txDate + "T00:00:00")}`, 0, fs * 1.5, maxW);
          ctx.restore();
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        };
        img.src = ev.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleIdPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const v = validateImageFile(file); if (!v.valid) { alert((v as { valid:false;error:string }).error); return; }
    const compressed = await compressImage(file);
    setOcrLoading(true); setOcrError("");
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target!.result as string).split(",")[1]);
        reader.readAsDataURL(compressed as File);
      });
      const result = await scanIdCard(base64);
      if (result.data) {
        const d = result.data;
        if (d.nameTh && !buyerName) setBuyerName(d.nameTh);
        if (d.id) setIdNumber(d.id.replace(/(\d)(\d{4})(\d{5})(\d{2})(\d)/, "$1-$2-$3-$4-$5"));
        if (d.dob) setDob(d.dob);
        if (d.address && !address) setAddress(d.address);
      } else if (result.error) { setOcrError(result.error); }
    } catch { setOcrError("สแกนบัตรไม่สำเร็จ"); }
    finally { setOcrLoading(false); }
    const url = await applyWatermark(compressed as File); setIdPhotoDataUrl(url);
    e.target.value = "";
  }

  async function handleCustPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const v = validateImageFile(file); if (!v.valid) { alert((v as { valid:false;error:string }).error); return; }
    const compressed = await compressImage(file);
    const reader = new FileReader();
    reader.onload = ev => setCustProdPhotoDataUrl(ev.target!.result as string);
    reader.readAsDataURL(compressed);
    e.target.value = "";
  }

  async function handlePaymentPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const v = validateImageFile(file); if (!v.valid) { alert((v as { valid:false;error:string }).error); return; }
    setPaymentPhotoUploading(true);
    try {
      const compressed = await compressImage(file);
      // Show preview via data URL
      const reader = new FileReader();
      reader.onload = ev => setPaymentPhotoDataUrl(ev.target!.result as string);
      reader.readAsDataURL(compressed);
      // Upload to storage immediately so we have the URL at generate time
      const storageUrl = await uploadPhoto(compressed, `rider/${job.id}/payment-${Date.now()}.jpg`);
      setPaymentPhotoStorageUrl(storageUrl);
    } catch { setError("อัปโหลดรูปหลักฐานไม่สำเร็จ"); }
    finally { setPaymentPhotoUploading(false); e.target.value = ""; }
  }

  async function openStoredDoc(path: string | undefined) {
    if (!path) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write("<p style='font-family:sans-serif;padding:20px'>กำลังโหลดเอกสาร...</p>");

    const signedUrl = await getDocumentSignedUrl(job.id, path);
    if (!signedUrl) { win.close(); return; }
    const resp = await fetch(signedUrl);
    const html = await resp.text();
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  useEffect(() => {
    if (job.payment.slipUrl && !prevSlipRef.current) {
      setSlipJustArrived(true);
      const t = setTimeout(() => setSlipJustArrived(false), 3000);
      return () => clearTimeout(t);
    }
    prevSlipRef.current = job.payment.slipUrl;
  }, [job.payment.slipUrl]);

  async function handleRiderSlipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const v = validateImageFile(file); if (!v.valid) { alert((v as { valid:false;error:string }).error); return; }
    setSlipUploading(true);
    try {
      const compressed = await compressImage(file);
      const storageUrl = await uploadPhoto(compressed, `rider/${job.id}/slip-${Date.now()}.jpg`);
      await savePaymentSlip(job.id, storageUrl);
      // job.payment.slipUrl จะอัปเดตผ่าน real-time subscription
    } catch { setError("อัปโหลดสลิปไม่สำเร็จ"); }
    finally { setSlipUploading(false); e.target.value = ""; }
  }

  async function handleRequestTransfer() {
    setTransferBusy(true);
    await riderRequestTransfer(job.id);
    setTransferNotified(true);
    setTransferBusy(false);
  }

  async function handleCompleteTransfer() {
    const slipUrl = job.payment.slipUrl;
    if (!slipUrl) { setError("ยังไม่มีสลิปโอนเงิน"); return; }
    setCompletingBusy(true);
    setError("");
    try {
      // Patch receipt HTML server-side: inject slip image into the stored HTML file
      await patchReceiptWithSlip(job.id).catch(e => console.error("Receipt slip patch failed (non-fatal):", e));
      await riderCompleteTransfer(job.id, slipUrl);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
      setCompletingBusy(false);
    }
  }

  async function handleGenerate() {
    setError("");
    const idDigits = idNumber.replace(/\D/g, "");
    if (!buyerName.trim())                               { setError("กรุณากรอกชื่อ-นามสกุลผู้ขาย"); return; }
    if (idDigits.length !== 13)                          { setError("กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก"); return; }
    if (!imei.trim())                                    { setError("กรุณากรอก IMEI"); return; }
    if (!serial.trim())                                  { setError("กรุณากรอก Serial Number"); return; }
    if (payMethod === "cash" && !paymentPhotoStorageUrl) { setError("กรุณาถ่ายรูปหลักฐานมอบเงินก่อนสร้างสัญญา"); return; }
    setGenerating(true);
    try {
      const r = job;
      const now = new Date();
      const docNo = r.orderNumber;
      const dateStr = thDate(txDate+"T00:00:00");
      const timeStr = thTime(now.toISOString());
      const dateShort = shortDate(txDate+"T00:00:00");
      const genTs = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;

      let logoSrc = "/logo-icon.webp";
      try {
        const resp = await fetch("/logo-icon.webp"); const blob = await resp.blob();
        logoSrc = await new Promise<string>(res => { const rd = new FileReader(); rd.onload = ()=>res(rd.result as string); rd.readAsDataURL(blob); });
      } catch {}

      const devPrice = r.inspection?.actualPrice ?? r.device.estimatedPrice;
      const accList = r.inspection?.accessories ?? ["ตัวเครื่อง"];

      const dev: ContractDevice = {
        label: "",
        model: r.device.model,
        storage: r.device.storage,
        color: deviceColor,
        condition: r.device.condition,
        imei,
        serial,
        accessories: accList,
        price: devPrice,
        criteria: (r.inspection?.criteria ?? []) as ContractDevice["criteria"],
        issues: r.inspection?.issues ?? [],
        functionalTests: (r.inspection?.functionalTests ?? []) as ContractDevice["functionalTests"],
        warrantyExpiry: r.inspection?.warrantyExpiry,
        batteryCycles: r.inspection?.batteryCycles,
        batteryHealth: r.inspection?.batteryHealth,
      };

      const ctx: ContractCtx = {
        docNo,
        totalDevices: 1,
        dateStr,
        timeStr,
        dateShort,
        genTs,
        logoSrc,
        cName: buyerName.trim() || r.customer.name,
        cPhone: r.customer.phone,
        cId: idNumber || "—",
        cAddr: address || "—",
        cEmail: r.customer.email || "—",
        payMethod,
        payTh: payMethod === "cash" ? "เงินสด" : "โอนผ่านธนาคาร",
        dobStr: dob ? thDate(dob+"T00:00:00") : "",
        staffName: riderName,
        officerId,
        bankName,
        accountName,
        accountNumber,
        idPhotoDataUrl,
        custProdPhotoDataUrl,
        slipImgSrc: paymentPhotoDataUrl ?? "",
      };

      const cBody = buildContractPage(dev, 0, true, ctx);
      const rBody = buildReceiptPage(dev, 0, true, ctx);
      const printCSS = "@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}";
      const wrap = (body: string) => `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">${FONT_LINK}<style>${DOC_CSS}${printCSS}</style></head><body>${body}</body></html>`;

      const uploadResult = await uploadContractFiles(job.id, docNo, wrap(cBody), wrap(rBody));
      if (!uploadResult.success) throw new Error("อัปโหลดสัญญาไม่สำเร็จ: " + uploadResult.error);

      await saveContractUrls(job.id, uploadResult.contractPath, uploadResult.receiptPath);
      await markContractSigned(job.id);

      contractHTMLRef.current = cBody;
      receiptHTMLRef.current  = rBody;

      if (payMethod === "cash") {
        await riderCompleteCash(job.id, paymentPhotoStorageUrl ?? "");
        reload();
      } else {
        setContractSigned(true);
        reload();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setGenerating(false);
    }
  }

  function openDoc(body: string) {
    const printCSS = "@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}";
    const full = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">${FONT_LINK}<style>${DOC_CSS}${printCSS}</style></head><body>${body}</body></html>`;
    const blob = new Blob([full], {type:"text/html;charset=utf-8"});
    const url = URL.createObjectURL(blob); window.open(url, "_blank"); setTimeout(()=>URL.revokeObjectURL(url), 60000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      <fieldset disabled={isCompleted} style={{ border: "none", padding: 0, margin: 0, opacity: isCompleted ? 0.55 : 1 }}>
      <div style={{ background: c.CARD, border: `1px solid ${c.BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${c.BORDER}`, background: c.CARD2, fontSize: 13, fontWeight: 700, color: c.TEXT }}>ข้อมูลสัญญา {isCompleted && <span style={{ fontSize: 11, color: c.GREEN, marginLeft: 6 }}>✓ ล็อกแล้ว</span>}</div>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>

          <div><label style={labelSt}>ชื่อ-นามสกุลผู้ขาย</label>
            <input type="text" value={buyerName} onChange={e=>setBuyerName(e.target.value)} style={inputSt} /></div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={labelSt}>เลขบัตรประชาชน</label>
              <input type="text" inputMode="numeric" placeholder="X-XXXX-XXXXX-XX-X" value={idNumber} onChange={e=>setIdNumber(formatId(e.target.value))} maxLength={17}
                style={{ ...inputSt, fontFamily:"monospace", letterSpacing:1 }} /></div>
            <div>
              <label style={labelSt}>
                วันเดือนปีเกิด
                {(() => { const age = calcAge(dob); return age !== null ? <span style={{ marginLeft: 6, fontWeight: 700, color: age < 20 ? "#FF453A" : "#30D158" }}>อายุ {age} ปี</span> : null; })()}
              </label>
              <input type="date" value={dob} onChange={e=>setDob(e.target.value)} style={{ ...inputSt, appearance:"none" }} />
            </div>
          </div>

          {(() => {
            const age = calcAge(dob);
            if (age === null || age >= 20) return null;
            return (
              <div style={{ borderRadius: 10, border: "1.5px solid rgba(255,69,58,0.5)", background: "rgba(255,69,58,0.08)", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>⚠️</span>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#FF453A" }}>ผู้ขายอายุต่ำกว่า 20 ปี — ต้องมีผู้ปกครอง</p>
                    <p style={{ margin: 0, fontSize: 12, color: "#FF453A", opacity: 0.85 }}>ตามกฎหมาย ผู้เยาว์ต้องได้รับความยินยอมจากผู้ปกครองก่อนทำสัญญา</p>
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={guardianConfirmed} onChange={e => setGuardianConfirmed(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "#FF453A", cursor: "pointer", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#FF453A" }}>ผู้ปกครองอยู่ต่อหน้าและลงนามยินยอมแล้ว</span>
                </label>
              </div>
            );
          })()}

          <div><label style={labelSt}>ที่อยู่</label>
            <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2}
              style={{ ...inputSt, resize:"vertical" }} /></div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={labelSt}>IMEI</label>
              <input value={imei} onChange={e=>setImei(e.target.value)} style={{ ...inputSt, fontFamily:"monospace" }} /></div>
            <div><label style={labelSt}>Serial Number</label>
              <input value={serial} onChange={e=>setSerial(e.target.value.toUpperCase())} style={{ ...inputSt, fontFamily:"monospace", textTransform:"uppercase" }} /></div>
          </div>

          <div><label style={labelSt}>สีตัวเครื่อง</label>
            <input value={deviceColor} onChange={e=>setDeviceColor(e.target.value)} placeholder="เช่น Black Titanium, Natural" style={inputSt} /></div>

          <div><label style={labelSt}>วิธีชำระเงิน</label>
            <select value={payMethod} onChange={e=>setPayMethod(e.target.value as "cash"|"transfer")} style={{ ...inputSt, appearance:"none", WebkitAppearance:"none" }}>
              <option value="cash">เงินสด</option>
              <option value="transfer">โอนเงิน</option>
            </select>
          </div>
          {payMethod === "transfer" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={labelSt}>ธนาคาร</label><input value={bankName} onChange={e=>setBankName(e.target.value)} style={inputSt} /></div>
                <div><label style={labelSt}>ชื่อบัญชี</label><input value={accountName} onChange={e=>setAccountName(e.target.value)} style={inputSt} /></div>
              </div>
              <div><label style={labelSt}>เลขที่บัญชี</label><input value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} style={{ ...inputSt, fontFamily:"monospace" }} /></div>
            </div>
          )}

          <div><label style={labelSt}>วันที่ทำสัญญา</label>
            <input type="date" value={txDate} onChange={e=>setTxDate(e.target.value)} style={{ ...inputSt, appearance:"none" }} /></div>

        </div>
      </div>

      {/* Photos */}
      <div style={{ background: c.CARD, border: `1px solid ${c.BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${c.BORDER}`, background: c.CARD2, fontSize: 13, fontWeight: 700, color: c.TEXT }}>รูปประกอบสัญญา</div>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: c.TEXT }}>สำเนาบัตรประชาชน (จะมี Watermark อัตโนมัติ)</p>
            {idPhotoDataUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={idPhotoDataUrl} alt="บัตรประชาชน" style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 8, border: `1px solid ${c.BORDER}`, marginBottom: 6 }} />
              : null}
            <button onClick={()=>idFileRef.current?.click()} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${c.BORDER}`, background: c.CARD, color: c.TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Camera size={16} />{idPhotoDataUrl ? "เปลี่ยนรูปบัตร" : "ถ่ายบัตรประชาชน"}
            </button>
            <input ref={idFileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleIdPhoto} />
            {!idPhotoDataUrl && !ocrLoading && <p style={{ margin: "6px 0 0", fontSize: 11, color: c.TEXT2, textAlign: "center" }}>📱 ถ่ายแนวตั้ง เพื่อให้ OCR อ่านภาษาไทยได้แม่นขึ้น</p>}
            {ocrLoading && <p style={{ margin: "6px 0 0", fontSize: 12, color: c.ACCENT, textAlign: "center" }}>🔍 กำลังอ่านข้อมูลจากบัตร...</p>}
            {ocrError && !ocrLoading && <p style={{ margin: "6px 0 0", fontSize: 12, color: c.RED }}>⚠️ {ocrError} — กรอกข้อมูลเองได้เลย</p>}
            {idPhotoDataUrl && !ocrLoading && !ocrError && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#30D158", textAlign: "center" }}>✓ อ่านข้อมูลจากบัตรแล้ว — ตรวจสอบด้านล่าง</p>}
          </div>
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: c.TEXT }}>รูปลูกค้าพร้อมสินค้า</p>
            {custProdPhotoDataUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={custProdPhotoDataUrl} alt="ลูกค้าพร้อมสินค้า" style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 8, border: `1px solid ${c.BORDER}`, marginBottom: 6 }} />
              : null}
            <button onClick={()=>custFileRef.current?.click()} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${c.BORDER}`, background: c.CARD, color: c.TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Camera size={16} />{custProdPhotoDataUrl ? "เปลี่ยนรูป" : "ถ่ายรูปลูกค้าพร้อมสินค้า"}
            </button>
            <input ref={custFileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleCustPhoto} />
          </div>
          {/* Payment evidence — cash only; transfer slip is captured after Finance transfers */}
          {payMethod === "cash" && (
            <div style={{ borderTop: `1px solid ${c.BORDER}`, paddingTop: 14 }}>
              <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: c.TEXT }}>💵 หลักฐานมอบเงินสด</p>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: c.TEXT2 }}>ถ่ายรูปขณะมอบเงิน — จะแนบในใบสำคัญรับเงิน</p>
              {paymentPhotoDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={paymentPhotoDataUrl} alt="หลักฐานชำระเงิน" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, border: `1px solid ${c.GREEN}`, marginBottom: 8 }} />
              )}
              <button onClick={()=>paymentFileRef.current?.click()} disabled={paymentPhotoUploading} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${paymentPhotoDataUrl ? c.GREEN : c.BORDER}`, background: paymentPhotoDataUrl ? "rgba(74,222,128,0.06)" : c.CARD, color: paymentPhotoDataUrl ? c.GREEN : c.TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: paymentPhotoUploading ? 0.6 : 1 }}>
                <Camera size={16} />
                {paymentPhotoUploading ? "กำลังอัปโหลด..." : paymentPhotoDataUrl ? "เปลี่ยนหลักฐาน ✓" : "ถ่ายรูปมอบเงิน"}
              </button>
              <input ref={paymentFileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePaymentPhoto} />
            </div>
          )}
        </div>
      </div>
      </fieldset>

      {error && <p style={{ margin: 0, fontSize: 13, color: c.RED }}>{error}</p>}

      {contractSigned && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => contractHTMLRef.current ? openDoc(contractHTMLRef.current) : openStoredDoc(job.contractUrl)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${c.BORDER}`, background: c.CARD, color: c.TEXT, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><span>เปิดสัญญา</span><ExternalLink size={13} /></button>
          <button onClick={() => receiptHTMLRef.current ? openDoc(receiptHTMLRef.current) : openStoredDoc(job.receiptUrl)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${c.BORDER}`, background: c.CARD, color: c.TEXT, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><span>เปิดใบรับเงิน</span><ExternalLink size={13} /></button>
        </div>
      )}

      {!isCompleted && (
        <BigBtn label={generating ? "กำลังสร้างสัญญา..." : contractSigned ? "สร้างสัญญาใหม่ →" : "สร้างสัญญาและบันทึก →"} loading={generating} onClick={handleGenerate} />
      )}

      {contractSigned && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {payMethod === "transfer" && (
            <>
              <style>{`
                @keyframes slip-arrive {
                  0%   { opacity: 0; transform: translateY(12px) scale(0.97); }
                  60%  { opacity: 1; transform: translateY(-3px) scale(1.01); }
                  100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pulse-ring {
                  0%, 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.35); }
                  50%       { box-shadow: 0 0 0 8px rgba(74,222,128,0); }
                }
                @keyframes waiting-pulse {
                  0%, 100% { opacity: 1; }
                  50%       { opacity: 0.45; }
                }
              `}</style>

              {/* Step 1: Notify Finance */}
              <div style={{ background: c.CARD, border: `1px solid ${c.BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: c.TEXT }}>📤 แจ้ง Finance โอนเงิน</p>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: c.TEXT2 }}>
                  กด "แจ้ง Finance" เพื่อให้ทีมโอน ฿{price.toLocaleString("th-TH")} ไปยังบัญชีลูกค้า
                </p>
                {transferNotified && (
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: c.GREEN, fontWeight: 600 }}>✓ แจ้ง Finance แล้ว — รอโอนเงิน</p>
                )}
                <BigBtn
                  label={transferNotified ? "แจ้งซ้ำอีกครั้ง" : "แจ้ง Finance โอนเงิน →"}
                  color="#4F46E5" textColor="#fff"
                  loading={transferBusy}
                  onClick={handleRequestTransfer}
                />
              </div>

              {/* Step 2: Slip — single source of truth: job.payment.slipUrl */}
              <div style={{ background: c.CARD, border: `1px solid ${job.payment.slipUrl ? c.GREEN : c.BORDER}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, transition: "border-color 0.4s" }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.TEXT }}>💳 หลักฐานการโอนเงิน</p>

                {job.payment.slipUrl ? (
                  <div style={{ animation: slipJustArrived ? "slip-arrive 0.4s ease-out" : "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Success banner */}
                    <div style={{ background: "rgba(74,222,128,0.10)", border: `1px solid ${c.GREEN}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, animation: slipJustArrived ? "pulse-ring 0.6s ease-out" : "none" }}>
                      <span style={{ fontSize: 20 }}>✅</span>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.GREEN }}>
                          {slipJustArrived ? "Finance โอนเงินแล้ว!" : "มีสลิปโอนเงินแล้ว"}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: c.TEXT2 }}>กดยืนยันเพื่อจบงาน</p>
                      </div>
                    </div>
                    {/* Slip image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={job.payment.slipUrl} alt="สลิปโอนเงิน" style={{ width: "100%", maxHeight: 280, objectFit: "contain", borderRadius: 10, border: `1px solid ${c.GREEN}` }} />
                    {/* Allow replacing */}
                    <button onClick={() => slipFileRef.current?.click()} disabled={slipUploading} style={{ background: "none", border: "none", color: c.TEXT2, fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline", opacity: slipUploading ? 0.5 : 1 }}>
                      {slipUploading ? "กำลังอัปโหลด..." : "เปลี่ยนสลิป"}
                    </button>
                    <BigBtn label="ยืนยันโอนสำเร็จ →" color={c.GREEN} loading={completingBusy} onClick={handleCompleteTransfer} />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Waiting indicator */}
                    <div style={{ background: c.CARD2, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, animation: "waiting-pulse 2s ease-in-out infinite" }}>
                      <span style={{ fontSize: 22 }}>⏳</span>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: c.TEXT }}>รอ Finance แนบสลิป...</p>
                        <p style={{ margin: 0, fontSize: 11, color: c.TEXT2 }}>สลิปจะปรากฏที่นี่ทันทีที่โอนแล้ว</p>
                      </div>
                    </div>
                    {/* Or rider uploads themselves */}
                    <p style={{ margin: 0, fontSize: 12, color: c.TEXT2, textAlign: "center" }}>— หรือ —</p>
                    <button onClick={() => slipFileRef.current?.click()} disabled={slipUploading} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${c.BORDER}`, background: c.CARD, color: c.TEXT2, fontSize: 13, cursor: slipUploading ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: slipUploading ? 0.6 : 1 }}>
                      <Camera size={16} />
                      {slipUploading ? "กำลังอัปโหลด..." : "📎 ฉันโอนเองและแนบสลิป"}
                    </button>
                    <BigBtn label="ยืนยันโอนสำเร็จ →" disabled loading={completingBusy} onClick={handleCompleteTransfer} />
                  </div>
                )}

                <input ref={slipFileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleRiderSlipUpload} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Wizard Page ───────────────────────────────────────────────────────────
export default function JobWizardPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { BG, CARD, CARD2, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2 } = useRiderTheme();
  const c: TC = { BG, CARD, CARD2, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2 };

  const [job, setJob]               = useState<AdminRequest | null>(null);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(false);
  const [riderName, setRiderName]   = useState("");
  const [officerId, setOfficerId]   = useState("");
  const [showNoShow, setShowNoShow]   = useState(false);
  const [blockingJob, setBlockingJob] = useState<string | null>(null);
  const [startError, setStartError]   = useState("");
  const [showHelp, setShowHelp]       = useState(false);
  const [helpMsg, setHelpMsg]         = useState("");
  const [helpSent, setHelpSent]       = useState(false);
  const [helpBusy, setHelpBusy]       = useState(false);

  const reload = useCallback(async () => {
    const j = await fetchRiderJob(id);
    setJob(j);
    setLoading(false);
    if (j?.status === "pickup_scheduled" && j.riderId) {
      const active = await fetchRiderJobs(j.riderId);
      const blocker = active.find(a => a.id !== id && ["en_route","inspecting","price_negotiation","contracting"].includes(a.status));
      setBlockingJob(blocker?.orderNumber ?? null);
    } else {
      setBlockingJob(null);
    }
  }, [id]);

  useEffect(() => {
    reload();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return;
      const uid = session.user.id;
      fetchMyProfile(uid).then(p => { if (p?.name) setRiderName(p.name); }).catch(()=>{});
      fetchAdminUsers().then(list => {
        const idx = list.findIndex(u => u.user_id === uid);
        if (idx >= 0) setOfficerId(`EMP-${String(idx + 1).padStart(3, "0")}`);
      }).catch(()=>{});
    });
  }, [reload]);

  useEffect(() => {
    const bc = supabase.channel("wizard-broadcast").on("broadcast", { event: "updated" }, p => { if (p.payload?.id === id) reload(); }).subscribe();
    const pg = supabase.channel(`wizard-pg-${id}`).on("postgres_changes", { event:"UPDATE", schema:"public", table:"requests" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => { if (p.new?.id === id) reload(); }).subscribe();
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { supabase.removeChannel(bc); supabase.removeChannel(pg); document.removeEventListener("visibilitychange", onVisible); };
  }, [id, reload]);

  async function handleAccept() {
    setBusy(true);
    await riderAcceptJob(id);
    reload(); setBusy(false);
  }
  async function handleStart() {
    setBusy(true); setStartError("");
    const result = await riderStartJob(id);
    if (!result.success) { setStartError((result as { success:false; error?:string }).error ?? "ไม่สามารถออกเดินทางได้"); setBusy(false); return; }
    reload(); setBusy(false);
  }
  async function handleArrive() {
    setBusy(true);
    await riderArriveJob(id);
    reload();
  }
  async function handleNoShow() {
    setBusy(true);
    await riderNoShow(id);
    router.replace("/rider");
  }

  if (loading) return (
    <div style={{ height:"100%", background:BG, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <Spinner c={c} />
    </div>
  );
  if (!job) return (
    <div style={{ height:"100%", background:BG, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ color:TEXT2 }}>ไม่พบงานนี้</p>
    </div>
  );

  const step      = stepFromStatus(job.status);
  const price     = job.inspection?.actualPrice ?? job.device.estimatedPrice;
  const isCash    = job.payment.method === "cash";
  const deviceImg = getDeviceImage(job.device.model);
  const mapsUrl   = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent("เดอะแพลนท์ วงแหวน-รังสิต อำเภอธัญบุรี ปทุมธานี 12110")}&destination=${encodeURIComponent(job.appointment.location)}`;

  const isCancelled = job.status === "cancelled";
  const isCompleted = job.status === "completed";

  return (
    <div style={{ height:"100%", overflow:"hidden", background:BG, display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <div style={{ background:CARD, borderBottom:`1px solid ${BORDER}`, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <button onClick={()=>router.push("/rider")} style={{ background:"none", border:"none", color:TEXT2, cursor:"pointer", padding:0, display:"flex" }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontSize:15, fontWeight:700, color:TEXT, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{job.customer.name}</p>
          <p style={{ margin:0, fontSize:12, color:TEXT2 }}>{job.orderNumber}</p>
        </div>
        <a href={`tel:${job.customer.phone}`} style={{ background:`rgba(48,209,88,0.12)`, borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", gap:6, textDecoration:"none", flexShrink:0 }}>
          <Phone size={16} color={GREEN} />
          <span style={{ fontSize:13, fontWeight:600, color:GREEN }}>โทร</span>
        </a>
        {!isCancelled && !isCompleted && step > 0 && (
          <button onClick={()=>{ setShowHelp(true); setHelpSent(false); setHelpMsg(""); }} style={{ background:"rgba(239,68,68,0.12)", borderRadius:10, padding:"8px 10px", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
            <AlertTriangle size={15} color={RED} />
            <span style={{ fontSize:12, fontWeight:700, color:RED }}>ขอความช่วยเหลือ</span>
          </button>
        )}
      </div>

      {/* Step bar */}
      <StepBar current={step} c={c} />

      {/* Scroll body */}
      <div style={{ flex:1, minHeight:0, overflowY:"auto" }}>
        <div style={{ padding:"16px 16px 32px", display:"flex", flexDirection:"column", gap:12 }}>

          {/* ── Step 0: รับงาน ── */}
          {step > 0 ? (
            <DoneCard label="รับงานแล้ว ✓" detail={`${job.device.model} · นัด ${job.appointment.date} ${job.appointment.time}`} c={c} />
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {/* Device card */}
              <Card c={c}>
                <div style={{ padding:"14px 16px", display:"flex", gap:14, alignItems:"center" }}>
                  <div style={{ width:60, height:60, borderRadius:10, background:"#F0F0F3", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" }}>
                    <Image src={deviceImg} alt={job.device.model} width={52} height={52} style={{ objectFit:"contain" }} unoptimized />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ margin:"0 0 4px", fontSize:16, fontWeight:700, color:TEXT }}>{job.device.model}</p>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {job.device.storage && <span style={{ background:BORDER, color:TEXT2, fontSize:11, padding:"2px 7px", borderRadius:5 }}>{job.device.storage}</span>}
                      {job.device.color   && <span style={{ background:BORDER, color:TEXT2, fontSize:11, padding:"2px 7px", borderRadius:5 }}>{job.device.color}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ padding:"0 16px 14px", borderTop:`1px solid ${BORDER}`, paddingTop:12, display:"flex", flexDirection:"column", gap:8 }}>
                  <FieldRow label="ราคาประเมิน" value={`฿${price.toLocaleString("th-TH")}`} c={c} />
                  <FieldRow label="วิธีชำระ" value={isCash ? "เงินสด" : "โอนเงิน"} c={c} />
                  {!isCash && job.payment.bankName && <FieldRow label="ธนาคาร" value={job.payment.bankName} c={c} />}
                </div>
              </Card>

              {/* Location */}
              <Card c={c}>
                <CardHead icon={<MapPin size={14} color={ACCENT} />} title="ที่อยู่และนัดหมาย" c={c} />
                <div style={{ padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <p style={{ margin:0, fontSize:14, color:TEXT, flex:1 }}>{job.appointment.location || "ไม่ระบุที่อยู่"}</p>
                  {job.appointment.location && (
                    <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ background:ACCENT, borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#000", textDecoration:"none", whiteSpace:"nowrap", flexShrink:0, display:"inline-flex", alignItems:"center", gap:5 }}>นำทาง <ExternalLink size={11} /></a>
                  )}
                </div>
                <div style={{ padding:"0 16px 12px", display:"flex", gap:16 }}>
                  <FieldRow label="วันที่" value={job.appointment.date} c={c} />
                  <FieldRow label="เวลา"  value={job.appointment.time}  c={c} />
                </div>
              </Card>

              {job.customerNotes && (
                <div style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:12, padding:"10px 14px" }}>
                  <p style={{ margin:"0 0 4px", fontSize:11, color:"#F59E0B", fontWeight:600 }}>หมายเหตุจากลูกค้า</p>
                  <p style={{ margin:0, fontSize:13, color:TEXT }}>{job.customerNotes}</p>
                </div>
              )}

              <BigBtn label="รับงานนี้ ✓" loading={busy} onClick={handleAccept} />
              <BigBtn label="ปฏิเสธงาน" color={RED} textColor="#fff" outline onClick={()=>setShowNoShow(true)} />
            </div>
          )}

          {/* ── Step 1: เดินทาง ── */}
          {step > 1 ? (
            <DoneCard label="ถึงที่แล้ว ✓" detail={`${job.appointment.location}`} c={c} />
          ) : step === 1 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {/* Location with map */}
              <Card c={c}>
                <CardHead icon={<MapPin size={14} color={ACCENT} />} title="ปลายทาง" c={c} />
                <div style={{ padding:14 }}>
                  <p style={{ margin:"0 0 10px", fontSize:15, fontWeight:600, color:TEXT }}>{job.appointment.location}</p>
                  <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, background:ACCENT, borderRadius:10, padding:"12px", fontSize:15, fontWeight:700, color:"#000", textDecoration:"none" }}>
                    เปิด Google Maps <ExternalLink size={14} />
                  </a>
                </div>
                <div style={{ padding:"0 14px 14px", display:"flex", gap:16 }}>
                  <FieldRow label="วันที่" value={job.appointment.date} c={c} />
                  <FieldRow label="เวลา"  value={job.appointment.time}  c={c} />
                  {job.distanceKm != null && <FieldRow label="ระยะทาง" value={`${job.distanceKm} กม.`} c={c} />}
                </div>
              </Card>

              {job.status === "pickup_scheduled" && (
                <>
                  {blockingJob ? (
                    <div style={{ background:"rgba(255,69,58,0.08)", border:"1px solid rgba(255,69,58,0.25)", borderRadius:12, padding:"12px 14px" }}>
                      <p style={{ margin:"0 0 4px", fontSize:13, fontWeight:700, color:RED }}>ยังออกเดินทางไม่ได้</p>
                      <p style={{ margin:0, fontSize:12, color:TEXT2 }}>ต้องเสร็จงาน <strong style={{ color:TEXT }}>{blockingJob}</strong> ก่อน</p>
                    </div>
                  ) : (
                    <div style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:12, padding:"10px 14px" }}>
                      <p style={{ margin:0, fontSize:13, color:ACCENT, fontWeight:600 }}>✓ รับงานแล้ว — กดเมื่อพร้อมออกเดินทาง</p>
                    </div>
                  )}
                  {startError && <p style={{ margin:0, fontSize:13, color:RED }}>{startError}</p>}
                  <BigBtn label="ออกเดินทาง →" loading={busy} onClick={handleStart} />
                </>
              )}
              {job.status === "en_route" && (
                <>
                  <div style={{ background:"rgba(74,222,128,0.08)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:12, padding:"10px 14px" }}>
                    <p style={{ margin:0, fontSize:13, color:ACCENT, fontWeight:600 }}>กำลังเดินทาง...</p>
                  </div>
                  <BigBtn label="ถึงที่แล้ว — เริ่มตรวจเครื่อง →" loading={busy} onClick={handleArrive} />
                </>
              )}
              <BigBtn label="ลูกค้าไม่อยู่ / ยกเลิก" color={RED} textColor="#fff" outline onClick={()=>setShowNoShow(true)} />
            </div>
          ) : step < 1 ? (
            <LockedStepRow label="เดินทาง" c={c} />
          ) : null}

          {/* ── Step 2: ตรวจเครื่อง ── */}
          {step > 2 ? (
            <DoneCard label="ตรวจเครื่องแล้ว ✓"
              detail={[job.inspection?.imei && `IMEI: ${job.inspection.imei}`, job.inspection?.batteryHealth && `แบต ${job.inspection.batteryHealth}%`].filter(Boolean).join(" · ") || job.device.model}
              c={c} />
          ) : step === 2 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div style={{ background:CARD, borderRadius:14, padding:"12px 14px", border:`1px solid ${BORDER}` }}>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:TEXT }}>ตรวจสภาพ: {job.device.model}</p>
              </div>
              <InspectStep job={job} reload={reload} c={c} />
            </div>
          ) : step < 2 ? (
            <LockedStepRow label="ตรวจเครื่อง" c={c} />
          ) : null}

          {/* ── Step 3: ราคา/สัญญา ── */}
          {step > 3 ? (
            <DoneCard label="ออกเอกสารแล้ว ✓" detail={`฿${price.toLocaleString("th-TH")} · ${isCash ? "เงินสด" : "โอนเงิน"}`} c={c} />
          ) : step === 3 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {job.status === "price_negotiation" && (
                <PriceNegotiationStep job={job} reload={reload} c={c} />
              )}
              {(job.status === "contracting" || job.status === "awaiting_transfer") && (
                <>
                  <div style={{ background:CARD, borderRadius:14, padding:"12px 14px", border:`1px solid ${BORDER}` }}>
                    <p style={{ margin:"0 0 4px", fontSize:12, color:TEXT2 }}>ราคาตกลง</p>
                    <p style={{ margin:0, fontSize:24, fontWeight:800, color:ACCENT }}>฿{price.toLocaleString("th-TH")}</p>
                  </div>
                  <ContractStep job={job} reload={reload} riderName={riderName} officerId={officerId} c={c} />
                </>
              )}
            </div>
          ) : step < 3 ? (
            <LockedStepRow label="ราคา/สัญญา" c={c} />
          ) : null}

          {/* ── Step 4: จบ ── */}
          {isCompleted ? (
            <div style={{ background:"rgba(74,222,128,0.08)", border:`1px solid ${GREEN}`, borderRadius:14, padding:20, textAlign:"center" }}>
              <CheckCircle2 size={40} color={GREEN} style={{ marginBottom:8 }} />
              <p style={{ margin:"0 0 4px", fontSize:18, fontWeight:800, color:GREEN }}>งานเสร็จสิ้น!</p>
              <p style={{ margin:0, fontSize:14, color:TEXT2 }}>฿{price.toLocaleString("th-TH")} · {job.orderNumber}</p>
            </div>
          ) : isCancelled ? (
            <div style={{ background:"rgba(255,69,58,0.08)", border:`1px solid rgba(255,69,58,0.3)`, borderRadius:14, padding:16 }}>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:RED }}>งานถูกยกเลิก</p>
            </div>
          ) : step < 4 ? (
            <LockedStepRow label="จบ" c={c} />
          ) : null}

        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"flex-end", zIndex:50 }} onClick={()=>setShowHelp(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", background:CARD, borderRadius:"20px 20px 0 0", padding:"24px 20px", paddingBottom:"calc(24px + env(safe-area-inset-bottom))" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <AlertTriangle size={20} color={RED} />
              <p style={{ margin:0, fontSize:16, fontWeight:700, color:TEXT }}>ขอความช่วยเหลือจาก Admin</p>
            </div>
            {helpSent ? (
              <div style={{ background:"rgba(74,222,128,0.1)", border:`1px solid ${GREEN}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:GREEN }}>✓ ส่งแจ้งเตือนให้ Admin แล้ว</p>
                <p style={{ margin:"4px 0 0", fontSize:12, color:TEXT2 }}>Admin จะติดต่อกลับในไม่ช้า</p>
              </div>
            ) : (
              <>
                <p style={{ margin:"0 0 10px", fontSize:13, color:TEXT2 }}>ระบุปัญหาที่พบ:</p>
                <textarea
                  value={helpMsg}
                  onChange={e=>setHelpMsg(e.target.value)}
                  placeholder="เช่น ลูกค้าไม่ยอมให้ตรวจ, เครื่องไม่ตรงรุ่น, ต้องการคำแนะนำ..."
                  rows={3}
                  style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:`1px solid ${BORDER}`, background:BG, color:TEXT, fontSize:14, fontFamily:"inherit", outline:"none", resize:"none", boxSizing:"border-box", marginBottom:12 }}
                />
                <BigBtn
                  label="ส่งแจ้งเตือน Admin →"
                  color={RED} textColor="#fff"
                  loading={helpBusy}
                  disabled={!helpMsg.trim()}
                  onClick={async ()=>{
                    setHelpBusy(true);
                    await riderRequestHelp(id, helpMsg.trim());
                    setHelpSent(true); setHelpBusy(false);
                  }}
                />
              </>
            )}
            <button onClick={()=>setShowHelp(false)} style={{ width:"100%", marginTop:8, background:"none", border:"none", color:TEXT2, fontSize:13, cursor:"pointer", fontFamily:"inherit", padding:"8px 0" }}>ปิด</button>
          </div>
        </div>
      )}

      {/* No-show modal */}
      {showNoShow && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"flex-end", zIndex:50 }} onClick={()=>setShowNoShow(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", background:CARD, borderRadius:"20px 20px 0 0", padding:"24px 20px", paddingBottom:"calc(24px + env(safe-area-inset-bottom))" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <AlertTriangle size={20} color={RED} />
              <p style={{ margin:0, fontSize:16, fontWeight:700, color:TEXT }}>ยืนยันการยกเลิก?</p>
            </div>
            <p style={{ margin:"0 0 20px", fontSize:13, color:TEXT2 }}>ระบบจะบันทึกว่าลูกค้าไม่อยู่และแจ้ง admin ทันที</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <BigBtn label="ยืนยัน — ลูกค้าไม่อยู่" color={RED} textColor="#fff" onClick={handleNoShow} loading={busy} />
              <BigBtn label="ยกเลิก" color={BORDER} textColor={TEXT} onClick={()=>setShowNoShow(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
