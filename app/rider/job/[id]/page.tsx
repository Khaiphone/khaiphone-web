"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Phone, MapPin, Camera, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  fetchRiderJob, fetchRiderJobs,
  riderAcceptJob, riderStartJob, riderArriveJob, riderNoShow,
  riderSaveInspection, riderConfirmPrice, riderAdjustPrice,
  riderCustomerAccepted, riderCustomerRejected,
  riderCompleteCash, riderCompleteTransfer,
} from "@/app/actions/rider";
import { saveContractUrls, markContractSigned } from "@/app/actions/admin-requests";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import { validateImageFile } from "@/lib/validate-file";
import { useRiderTheme } from "@/app/rider/theme";
import { fetchMyProfile } from "@/app/actions/admin-users";
import type { AdminRequest, InspectionCriterion, FunctionalTest } from "@/lib/types/admin";

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

const FONT_LINK = '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">';
const DOC_CSS = '*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Sarabun",sans-serif;max-width:780px;margin:0 auto;font-size:11px;color:#1a1a1a;line-height:1.6;background:#fff}.header{background:linear-gradient(135deg,#1a1a2e,#2a2a4e);padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}.logo-area{display:flex;align-items:center;gap:10px;min-width:160px}.logo-name{color:#FFD700;font-size:14px;font-weight:800}.logo-sub{color:rgba(255,255,255,.6);font-size:9px;margin-top:1px}.title-center{text-align:center;flex:1}.title-center h1{color:#FFD700;font-size:15px;font-weight:800}.title-center .between{color:rgba(255,255,255,.8);font-size:11px;margin-top:3px}.cno-box{background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.35);border-radius:8px;padding:9px 13px;text-align:right;min-width:160px}.cno-label{color:rgba(255,255,255,.5);font-size:8.5px;text-transform:uppercase;letter-spacing:.5px}.cno-value{color:#FFD700;font-size:15px;font-weight:800;font-family:monospace;letter-spacing:.5px;margin:2px 0}.cno-date{color:rgba(255,255,255,.65);font-size:10px}.content{padding:14px 20px}.top3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}.icard{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}.icard-hd{background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:700;color:#333}.hd-num{width:18px;height:18px;border-radius:5px;background:#1a1a2e;color:#FFD700;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0}.icard-body{padding:9px 11px;font-size:10.5px}.f{display:flex;flex-direction:column;margin-bottom:4px}.fl{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.4px}.fv{font-size:11px;font-weight:500;color:#1a1a1a;border-bottom:1px solid #f0f0f0;padding-bottom:2px;min-height:16px}.price-big{font-size:28px;font-weight:800;color:#c9a84c;font-family:monospace;text-align:center;padding:5px 0;line-height:1}.price-label{font-size:9px;color:#aaa;text-align:center;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}.pay-badge{display:inline-flex;align-items:center;gap:4px;background:#f0fdf4;border:1px solid #86efac;border-radius:4px;padding:3px 8px;font-size:10px;font-weight:600;color:#15803d;margin-bottom:6px}.sec{font-size:10px;font-weight:700;color:#1a1a2e;border-left:3px solid #c9a84c;padding-left:8px;margin:12px 0 7px;text-transform:uppercase;letter-spacing:.5px}.dtable{width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:10px}.dtable th{background:#1a1a2e;color:#FFD700;padding:6px 9px;text-align:left;font-weight:600;font-size:9.5px}.dtable td{padding:5px 9px;border-bottom:1px solid #f0f0f0;vertical-align:top}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:10px}.terms-ol{counter-reset:tc;list-style:none;padding:0;margin:0 0 8px}.terms-ol li{counter-increment:tc;padding:4px 0 4px 22px;position:relative;font-size:10.5px;border-bottom:1px solid #f8f8f8;line-height:1.5}.terms-ol li::before{content:counter(tc)".";position:absolute;left:0;top:4px;font-weight:700;color:#c9a84c}.check-list{list-style:none;padding:0;margin:0}.check-list li{padding:2px 0 2px 14px;position:relative;font-size:10.5px}.check-list li::before{content:"•";position:absolute;left:0;color:#c9a84c;font-weight:700}.pdpa-box{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 13px;font-size:10.5px}.pdpa-title{font-weight:700;color:#92400e;margin-bottom:5px}.pdpa-list{list-style:none;padding:0;margin:0}.pdpa-list li{padding:2px 0 2px 16px;position:relative;color:#78350f}.pdpa-list li::before{content:"✓";position:absolute;left:0;color:#c9a84c;font-weight:700}.id-photo-wrap{border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:10px 0}.id-photo-hd{background:#f5f4f0;padding:7px 11px;border-bottom:1px solid #e5e7eb;font-size:10.5px;font-weight:700;color:#333}.id-photo-wrap img{width:100%;max-height:200px;object-fit:contain;display:block;background:#f9f9f9}.footer{background:#1a1a2e;color:rgba(255,255,255,.65);padding:10px 20px;display:flex;align-items:flex-start;justify-content:space-between;font-size:9.5px;margin-top:14px}.fv-row{display:flex;gap:6px;margin-bottom:1px}.fv-lbl{color:rgba(255,255,255,.45)}.fv-val{color:#FFD700;font-family:monospace}.footer-brand{color:#FFD700;font-size:14px;font-weight:800;margin-bottom:3px}.footer-info{color:rgba(255,255,255,.5);font-size:9px;line-height:1.7}.rejected-box{background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:7px 9px;font-size:10px;color:#991b1b;margin-top:8px;line-height:1.7}@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}';

// ── Utilities ──────────────────────────────────────────────────────────────────
function esc(s: string) {
  return (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function thDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}
function thTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function shortDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")} / ${String(d.getMonth()+1).padStart(2,"0")} / ${d.getFullYear()+543}`;
}
function bahtWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "(ศูนย์บาทถ้วน)";
  const u = ["","หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า"];
  const p = ["","สิบ","ร้อย","พัน","หมื่น","แสน"];
  function chunk(m: number): string {
    if (m === 0) return "";
    const s = String(m); let out = "";
    for (let i = 0; i < s.length; i++) {
      const d = +s[i]; const pos = s.length - 1 - i;
      if (d === 0) continue;
      if (pos === 1) { if (d === 1) out += "สิบ"; else if (d === 2) out += "ยี่สิบ"; else out += u[d] + "สิบ"; }
      else if (pos === 0 && d === 1 && m >= 10) out += "เอ็ด";
      else out += u[d] + p[pos];
    }
    return out;
  }
  const mil = Math.floor(n / 1_000_000); const rem = n % 1_000_000;
  return `(${mil > 0 ? chunk(mil) + "ล้าน" : ""}${rem > 0 ? chunk(rem) : ""}บาทถ้วน)`;
}

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
  const [imei, setImei] = useState(job.inspection?.imei ?? "");
  const [serial, setSerial] = useState(job.inspection?.serial ?? "");
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Price confirm sub-step (shown after inspection saved)
  const [showPrice, setShowPrice] = useState(!!job.inspection);
  const [priceMode, setPriceMode] = useState<"" | "confirm" | "adjust">("");
  const [adjustPrice, setAdjustPrice] = useState(String(job.device.estimatedPrice));
  const [adjustReason, setAdjustReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const result = await riderSaveInspection(job.id, {
        imei, serial,
        batteryHealth: battery ? parseInt(battery) : undefined,
        warrantyExpiry: warrantyValue,
        criteria: criteriaArr, functionalTests: functional, photos,
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
        <SectionLabel c={c}>ข้อมูลเครื่อง</SectionLabel>
        <Card c={c}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: c.TEXT2 }}>IMEI</p>
            <input value={imei} onChange={e => setImei(e.target.value)} placeholder="กรอก IMEI หรือ *#06#"
              style={{ width: "100%", background: "none", border: "none", color: c.TEXT, fontSize: 15, fontFamily: "inherit", outline: "none" }} />
          </div>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${c.BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: c.TEXT2 }}>Serial Number</p>
            <input value={serial} onChange={e => setSerial(e.target.value.toUpperCase())} placeholder="กรอก Serial"
              style={{ width: "100%", background: "none", border: "none", color: c.TEXT, fontSize: 15, fontFamily: "inherit", outline: "none", textTransform: "uppercase" }} />
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

      {error && <p style={{ margin: 0, fontSize: 13, color: c.RED }}>{error}</p>}
      {uploading && <p style={{ margin: 0, fontSize: 13, color: c.ACCENT, textAlign: "center" }}>กำลังอัปโหลดรูป...</p>}

      <BigBtn label={uploading ? "กำลังอัปโหลดรูป..." : saving ? "กำลังบันทึก..." : "บันทึกและยืนยันราคา →"}
        loading={saving} disabled={uploading} onClick={handleSave} />
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
function ContractStep({ job, reload, riderName, c }: { job: AdminRequest; reload: () => void; riderName: string; c: TC }) {
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
  const [accessories, setAccessories] = useState<string[]>(["ตัวเครื่อง"]);
  const [accessoriesOther, setAccessoriesOther] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));

  const [idPhotoDataUrl, setIdPhotoDataUrl] = useState<string | null>(null);
  const [custProdPhotoDataUrl, setCustProdPhotoDataUrl] = useState<string | null>(null);
  const [paymentPhotoDataUrl, setPaymentPhotoDataUrl] = useState<string | null>(null);
  const [paymentPhotoUploading, setPaymentPhotoUploading] = useState(false);
  const [paymentPhotoStorageUrl, setPaymentPhotoStorageUrl] = useState<string | null>(null);
  const idFileRef = useRef<HTMLInputElement>(null!);
  const custFileRef = useRef<HTMLInputElement>(null!);
  const paymentFileRef = useRef<HTMLInputElement>(null!);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const contractHTMLRef = useRef("");
  const receiptHTMLRef = useRef("");

  const inputSt: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: `1px solid ${c.BORDER}`, background: c.CARD2, fontSize: 14, color: c.TEXT, fontFamily: "inherit", outline: "none" };
  const labelSt: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: c.TEXT2, marginBottom: 4 };

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
          const fs = Math.max(18, Math.floor(canvas.width / 18));
          ctx.save(); ctx.globalAlpha = 0.72; ctx.fillStyle = "#DC2626";
          ctx.font = `bold ${fs}px Arial,sans-serif`; ctx.textAlign = "center";
          ctx.translate(canvas.width/2, canvas.height/2); ctx.rotate(-22*Math.PI/180);
          ctx.fillText("ใช้สำหรับขายโทรศัพท์ให้ Khaiphone.com เท่านั้น", 0, 0);
          ctx.font = `${Math.floor(fs*.75)}px Arial,sans-serif`;
          ctx.fillText(`วันที่ ${thDate(txDate+"T00:00:00")}`, 0, fs*1.4);
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
    const url = await applyWatermark(file); setIdPhotoDataUrl(url);
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

  function toggleAcc(acc: string) {
    setAccessories(prev => prev.includes(acc) ? prev.filter(a=>a!==acc) : [...prev, acc]);
  }

  async function handleGenerate() {
    setGenerating(true); setError("");
    try {
      const r = job;
      const now = new Date();
      const docNo = r.orderNumber;
      const dateStr = thDate(txDate+"T00:00:00");
      const timeStr = thTime(now.toISOString());
      const dateShort = shortDate(txDate+"T00:00:00");
      const genTs = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;

      const cName  = buyerName.trim() || r.customer.name;
      const cPhone = r.customer.phone;
      const cId    = idNumber || "—";
      const cAddr  = address || "—";
      const cEmail = r.customer.email || "—";
      const payTh  = payMethod === "cash" ? "เงินสด" : "โอนผ่านธนาคาร";
      const dobStr = dob ? thDate(dob+"T00:00:00") : "";
      const accStr = esc([...accessories, ...(accessoriesOther.trim() ? [accessoriesOther.trim()] : [])].join(", ") || "—");
      const price  = r.inspection?.actualPrice ?? r.device.estimatedPrice;

      let logoSrc = "/logo-icon.webp";
      try {
        const resp = await fetch("/logo-icon.webp"); const blob = await resp.blob();
        logoSrc = await new Promise<string>(res => { const rd = new FileReader(); rd.onload = ()=>res(rd.result as string); rd.readAsDataURL(blob); });
      } catch {}

      function contractPage(): string {
        let p = `<div class="header">
          <div class="logo-area"><img src="${logoSrc}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div><div class="logo-name">Khaiphone.com</div><div class="logo-sub">รับซื้อ-ขาย Apple มือสอง</div></div></div>
          <div class="title-center"><h1>สัญญาซื้อขายโทรศัพท์มือถือมือสอง</h1><div class="between">ระหว่าง <strong>ผู้ขาย</strong> และ <strong style="color:#FFD700">Khaiphone.com</strong></div></div>
          <div class="cno-box"><div class="cno-label">เลขที่สัญญา</div><div class="cno-value">${esc(docNo)}</div><div class="cno-date">วันที่ ${dateStr}<br>เวลา ${timeStr} น.</div></div>
        </div>
        <div class="content">
          <div class="top3">
            <div class="icard"><div class="icard-hd"><div class="hd-num">1</div> ผู้รับซื้อ</div><div class="icard-body">
              <div style="font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:5px">Khaiphone.com</div>
              <div style="font-size:10px;color:#666;line-height:1.5;margin-bottom:8px">ประกอบธุรกิจรับซื้อ-ขายโทรศัพท์มือถือ</div>
              ${riderName ? `<div style="margin-top:8px;padding:6px 9px;background:#1a1a2e;border-radius:6px"><div style="font-size:8px;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">เจ้าหน้าที่ผู้ดำเนินการ</div><div style="font-size:11px;font-weight:600;color:#fff">${esc(riderName)}</div></div>` : ""}
            </div></div>
            <div class="icard"><div class="icard-hd"><div class="hd-num">2</div> ผู้ขาย</div><div class="icard-body">
              <div class="f"><span class="fl">ชื่อ-นามสกุล</span><span class="fv">${esc(cName)}</span></div>
              <div class="f"><span class="fl">เลขบัตรประชาชน</span><span class="fv" style="font-family:monospace">${esc(cId)}</span></div>
              ${dobStr ? `<div class="f"><span class="fl">วันเกิด</span><span class="fv">${esc(dobStr)}</span></div>` : ""}
              <div class="f"><span class="fl">ที่อยู่</span><span class="fv" style="white-space:pre-line">${esc(cAddr)}</span></div>
              <div class="f"><span class="fl">เบอร์โทร</span><span class="fv">${esc(cPhone)}</span></div>
              <div class="f"><span class="fl">อีเมล</span><span class="fv">${esc(cEmail)}</span></div>
            </div></div>
            <div class="icard"><div class="icard-hd"><div class="hd-num">3</div> ราคาและการชำระเงิน</div><div class="icard-body">
              <div class="price-label">ราคาซื้อขายรวม</div>
              <div class="price-big">${price.toLocaleString("th-TH")}</div>
              <div style="text-align:center;font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:4px">บาท</div>
              <div style="text-align:center;font-size:10px;color:#666;margin-bottom:7px">${bahtWords(price)}</div>
              <div class="pay-badge">✓ ${payTh}</div>
              ${payMethod==="transfer" ? `<div class="f"><span class="fl">ธนาคาร</span><span class="fv">${esc(bankName||"—")}</span></div><div class="f"><span class="fl">ชื่อบัญชี</span><span class="fv">${esc(accountName||"—")}</span></div><div class="f"><span class="fl">เลขบัญชี</span><span class="fv" style="font-family:monospace">${esc(accountNumber||"—")}</span></div>` : ""}
            </div></div>
          </div>
          <div class="sec">📱 รายละเอียดทรัพย์สิน</div>
          <table class="dtable">
            <tr><th>ประเภท</th><th>IMEI</th><th>ยี่ห้อ/รุ่น</th><th>Serial Number</th></tr>
            <tr><td>โทรศัพท์มือถือ</td><td style="font-family:monospace">${esc(imei||"—")}</td><td style="font-weight:600">${esc(r.device.model)}</td><td style="font-family:monospace">${esc(serial||"—")}</td></tr>
            <tr><th>ความจุ</th><th>สภาพ</th><th>สี</th><th>อุปกรณ์</th></tr>
            <tr><td>${esc(r.device.storage)}</td><td>${esc(r.device.condition)}</td><td>${esc(r.device.color||"—")}</td><td>${accStr}</td></tr>
          </table>
          <div class="two-col">
            <div>
              <div class="sec">✅ ข้อตกลงของผู้ขาย</div>
              <ol class="terms-ol">
                <li>ผู้ขายเป็นเจ้าของทรัพย์สินโดยชอบด้วยกฎหมาย และมีสิทธิ์ขาย โอน และส่งมอบทรัพย์สิน</li>
                <li>ทรัพย์สินไม่ได้มาจากการกระทำผิดกฎหมาย ลักทรัพย์ ฉ้อโกง หรือยักยอก</li>
                <li>ผู้ขายได้ลบข้อมูลส่วนตัวทั้งหมดแล้ว และยินยอมให้รีเซ็ตอุปกรณ์</li>
                <li>ผู้ขายรับรองว่าไม่มี iCloud lock, MDM หรือระบบล็อคใดๆ</li>
                <li>หากตรวจพบข้อมูลเป็นเท็จ ผู้ขายยอมรับผิดชอบค่าเสียหายทั้งหมด</li>
              </ol>
            </div>
            <div>
              <div class="sec">🔒 PDPA</div>
              <div class="pdpa-box"><div class="pdpa-title">การคุ้มครองข้อมูลส่วนบุคคล</div>
              <ul class="pdpa-list"><li>ใช้ในการทำธุรกรรมซื้อขาย</li><li>ตรวจสอบและยืนยันตัวตน</li><li>ป้องกันการทุจริต</li><li>จัดเก็บเป็นหลักฐานทางกฎหมาย</li></ul>
              </div>
              <div class="rejected-box" style="background:#fef2f2">หากตรวจพบความผิดปกติ ผู้รับซื้อมีสิทธิ์<br>• ปรับราคา<br>• ยกเลิกธุรกรรม<br>• ระงับการชำระเงิน</div>
            </div>
          </div>
          ${idPhotoDataUrl ? `<div class="id-photo-wrap"><div class="id-photo-hd">📷 สำเนาบัตรประชาชน (มี Watermark)</div><img src="${idPhotoDataUrl}" alt="บัตรประชาชน"></div>` : ""}
          ${custProdPhotoDataUrl ? `<div class="id-photo-wrap"><div class="id-photo-hd">📸 รูปลูกค้าพร้อมสินค้า</div><img src="${custProdPhotoDataUrl}" alt="ลูกค้าพร้อมสินค้า" style="max-height:300px;object-fit:contain"></div>` : ""}
        </div>
        <div class="footer">
          <div><div style="font-size:11px;font-weight:700;color:#FFD700;margin-bottom:4px">🛡️ ยืนยันเอกสารดิจิทัล</div>
          <div class="fv-row"><span class="fv-lbl">Document ID :</span><span class="fv-val">${esc(docNo)}</span></div>
          <div class="fv-row"><span class="fv-lbl">Generated :</span><span class="fv-val">${genTs}</span></div></div>
          <div style="text-align:right"><div class="footer-brand">Khaiphone.com</div><div class="footer-info">รับซื้อ-ขาย Apple มือสอง<br>📞 095-553-5167</div></div>
        </div>`;
        return p;
      }

      function receiptPage(): string {
        return `<div class="header">
          <div class="logo-area"><img src="${logoSrc}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">
          <div><div class="logo-name">Khaiphone.com</div><div class="logo-sub">รับซื้อ-ขาย Apple มือสอง</div></div></div>
          <div class="title-center"><h1>ใบสำคัญรับเงิน</h1><div class="between">PAYMENT RECEIPT</div></div>
          <div class="cno-box"><div class="cno-label">เลขที่ใบรับเงิน</div><div class="cno-value">${esc(docNo)}-R</div><div class="cno-date">วันที่ ${dateStr}<br>เวลา ${timeStr} น.</div></div>
        </div>
        <div class="content">

          <div class="two-col" style="margin-bottom:12px">
            <div class="icard"><div class="icard-hd"><div class="hd-num">1</div> ผู้รับเงิน (ผู้ขาย)</div><div class="icard-body">
              <div class="f"><span class="fl">ชื่อ-นามสกุล</span><span class="fv" style="font-size:13px;font-weight:700;color:#1a1a2e">${esc(cName)}</span></div>
              <div class="f"><span class="fl">เลขบัตร</span><span class="fv" style="font-family:monospace">${esc(cId)}</span></div>
              <div class="f"><span class="fl">เบอร์โทร</span><span class="fv">${esc(cPhone)}</span></div>
            </div></div>
            <div class="icard"><div class="icard-hd"><div class="hd-num">2</div> ผู้จ่ายเงิน</div><div class="icard-body">
              <div style="font-weight:700;font-size:13px;color:#1a1a2e;margin-bottom:5px">Khaiphone.com</div>
              <div style="font-size:10px;color:#666">📞 095-553-5167</div>
            </div></div>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:12px">
            <div style="background:#1a1a2e;padding:10px 14px;text-align:center">
              <div style="font-size:9px;color:rgba(255,255,255,.5);text-transform:uppercase;margin-bottom:2px">จำนวนเงิน</div>
              <div style="font-size:30px;font-weight:800;color:#FFD700;font-family:monospace">${price.toLocaleString("th-TH")}</div>
              <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8)">บาท</div>
              <div style="font-size:10px;color:rgba(255,255,255,.5);margin-top:3px">${bahtWords(price)}</div>
            </div>
            <div style="padding:10px 12px;font-size:10.5px;line-height:1.8">
              <div style="display:flex;justify-content:space-between"><span style="color:#aaa">รุ่น</span><span style="font-weight:600">${esc(r.device.model)} ${esc(r.device.storage)}</span></div>
              <div style="display:flex;justify-content:space-between"><span style="color:#aaa">วิธีชำระ</span><span style="font-weight:600">${payTh}</span></div>
              ${payMethod==="transfer" ? `<div style="display:flex;justify-content:space-between"><span style="color:#aaa">ธนาคาร</span><span style="font-weight:600">${esc(bankName||"—")}</span></div><div style="display:flex;justify-content:space-between"><span style="color:#aaa">เลขบัญชี</span><span style="font-weight:600;font-family:monospace">${esc(accountNumber||"—")}</span></div>` : ""}
            </div>
          </div>
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:12px 14px;font-size:10.5px;color:#166534">
            ข้าพเจ้า <strong>${esc(cName)}</strong> ได้รับเงินจำนวน <strong>${price.toLocaleString("th-TH")} บาทถ้วน</strong> จาก <strong>${esc(riderName||"Khaiphone.com")}</strong> เป็นค่าขายโทรศัพท์ <strong>${esc(r.device.model)}</strong> ตามสัญญาเลขที่ <strong>${esc(docNo)}</strong> เรียบร้อยแล้ว
          </div>
          ${idPhotoDataUrl ? `<div class="id-photo-wrap"><div class="id-photo-hd">📷 สำเนาบัตรประชาชน (มี Watermark)</div><img src="${idPhotoDataUrl}" alt="บัตรประชาชน"></div>` : ""}
          ${custProdPhotoDataUrl ? `<div class="id-photo-wrap"><div class="id-photo-hd">📸 รูปลูกค้าพร้อมสินค้า</div><img src="${custProdPhotoDataUrl}" alt="ลูกค้าพร้อมสินค้า" style="max-height:300px;object-fit:contain"></div>` : ""}
          ${paymentPhotoDataUrl ? `<div class="id-photo-wrap"><div class="id-photo-hd">${payMethod === "cash" ? "💵 หลักฐานมอบเงินสด" : "📎 หลักฐานการโอนเงิน (สลิป)"}</div><img src="${paymentPhotoDataUrl}" alt="หลักฐานชำระเงิน" style="max-height:340px;object-fit:contain"></div>` : ""}
        </div>
        <div class="footer">
          <div><div class="fv-row"><span class="fv-lbl">Document ID :</span><span class="fv-val">${esc(docNo)}-R</span></div>
          <div class="fv-row"><span class="fv-lbl">Generated :</span><span class="fv-val">${genTs}</span></div></div>
          <div style="text-align:right"><div class="footer-brand">Khaiphone.com</div><div class="footer-info">รับซื้อ-ขาย Apple มือสอง</div></div>
        </div>`;
      }

      const cBody = contractPage();
      const rBody = receiptPage();
      const printCSS = "@media print{.header,.footer{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{max-width:none}}";
      const wrap = (body: string) => `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">${FONT_LINK}<style>${DOC_CSS}${printCSS}</style></head><body>${body}</body></html>`;

      const [cBlob, rBlob] = [new Blob([wrap(cBody)], {type:"text/html;charset=utf-8"}), new Blob([wrap(rBody)], {type:"text/html;charset=utf-8"})];
      const cPath = `contracts/${job.id}/${docNo}-contract.html`;
      const rPath = `contracts/${job.id}/${docNo}-receipt.html`;

      const [cu, ru] = await Promise.all([
        supabase.storage.from("inspection-photos").upload(cPath, cBlob, { upsert: true, contentType: "text/html" }),
        supabase.storage.from("inspection-photos").upload(rPath, rBlob, { upsert: true, contentType: "text/html" }),
      ]);
      if (cu.error || ru.error) throw new Error("อัปโหลดสัญญาไม่สำเร็จ");

      await saveContractUrls(job.id, cu.data.path, ru.data.path);
      await markContractSigned(job.id);

      // Complete the job inline — payment evidence is already embedded in receipt
      if (payMethod === "cash") {
        await riderCompleteCash(job.id, paymentPhotoStorageUrl ?? "");
      } else {
        await riderCompleteTransfer(job.id, paymentPhotoStorageUrl ?? undefined);
      }

      contractHTMLRef.current = cBody;
      receiptHTMLRef.current  = rBody;
      reload();
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

  const accOptions = ["ตัวเครื่อง", "กล่อง", "สายชาร์จ", "หูฟัง", "ฟิล์ม", "เคส"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      <div style={{ background: c.CARD, border: `1px solid ${c.BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${c.BORDER}`, background: c.CARD2, fontSize: 13, fontWeight: 700, color: c.TEXT }}>ข้อมูลสัญญา</div>
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>

          <div><label style={labelSt}>ชื่อ-นามสกุลผู้ขาย</label>
            <input type="text" value={buyerName} onChange={e=>setBuyerName(e.target.value)} style={inputSt} /></div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={labelSt}>เลขบัตรประชาชน</label>
              <input type="text" inputMode="numeric" placeholder="X-XXXX-XXXXX-XX-X" value={idNumber} onChange={e=>setIdNumber(formatId(e.target.value))} maxLength={17}
                style={{ ...inputSt, fontFamily:"monospace", letterSpacing:1 }} /></div>
            <div><label style={labelSt}>วันเดือนปีเกิด</label>
              <input type="date" value={dob} onChange={e=>setDob(e.target.value)} style={{ ...inputSt, appearance:"none" }} /></div>
          </div>

          <div><label style={labelSt}>ที่อยู่</label>
            <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2}
              style={{ ...inputSt, resize:"vertical" }} /></div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label style={labelSt}>IMEI</label>
              <input value={imei} onChange={e=>setImei(e.target.value)} style={{ ...inputSt, fontFamily:"monospace" }} /></div>
            <div><label style={labelSt}>Serial Number</label>
              <input value={serial} onChange={e=>setSerial(e.target.value.toUpperCase())} style={{ ...inputSt, fontFamily:"monospace", textTransform:"uppercase" }} /></div>
          </div>

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

          <div>
            <label style={labelSt}>อุปกรณ์ที่ให้มา</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {accOptions.map(a => (
                <button key={a} onClick={()=>toggleAcc(a)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${accessories.includes(a) ? c.ACCENT : c.BORDER}`, background: accessories.includes(a) ? "rgba(74,222,128,0.12)" : c.CARD, color: accessories.includes(a) ? c.ACCENT : c.TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{a}</button>
              ))}
            </div>
            <input placeholder="อื่นๆ" value={accessoriesOther} onChange={e=>setAccessoriesOther(e.target.value)} style={{ ...inputSt, marginTop: 6 }} />
          </div>
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
          {/* Payment evidence — embedded into receipt at generate time */}
          <div style={{ borderTop: `1px solid ${c.BORDER}`, paddingTop: 14 }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: c.TEXT }}>
              {payMethod === "cash" ? "💵 หลักฐานมอบเงินสด" : "📎 สลิปโอนเงิน"}
            </p>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: c.TEXT2 }}>
              {payMethod === "cash" ? "ถ่ายรูปขณะมอบเงิน — จะแนบในใบสำคัญรับเงิน" : "อัปโหลดสลิปที่ลูกค้าโอน — จะแนบในใบสำคัญรับเงิน"}
            </p>
            {paymentPhotoDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={paymentPhotoDataUrl} alt="หลักฐานชำระเงิน" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, border: `1px solid ${c.GREEN}`, marginBottom: 8 }} />
            )}
            <button onClick={()=>paymentFileRef.current?.click()} disabled={paymentPhotoUploading} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${paymentPhotoDataUrl ? c.GREEN : c.BORDER}`, background: paymentPhotoDataUrl ? "rgba(74,222,128,0.06)" : c.CARD, color: paymentPhotoDataUrl ? c.GREEN : c.TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: paymentPhotoUploading ? 0.6 : 1 }}>
              <Camera size={16} />
              {paymentPhotoUploading ? "กำลังอัปโหลด..." : paymentPhotoDataUrl ? "เปลี่ยนหลักฐาน ✓" : (payMethod === "cash" ? "ถ่ายรูปมอบเงิน" : "ถ่าย/อัปโหลดสลิป")}
            </button>
            <input ref={paymentFileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePaymentPhoto} />
          </div>
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: 13, color: c.RED }}>{error}</p>}

      {contractHTMLRef.current ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ background: "rgba(74,222,128,0.08)", border: `1px solid ${c.GREEN}`, borderRadius: 10, padding: "12px 14px" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: c.GREEN }}>✓ สร้างสัญญาสำเร็จแล้ว</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={()=>openDoc(contractHTMLRef.current)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${c.BORDER}`, background: c.CARD, color: c.TEXT, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>เปิดสัญญา ↗</button>
            <button onClick={()=>openDoc(receiptHTMLRef.current)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1px solid ${c.BORDER}`, background: c.CARD, color: c.TEXT, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>เปิดใบรับเงิน ↗</button>
          </div>
        </div>
      ) : (
        <BigBtn label={generating ? "กำลังสร้างสัญญา..." : "สร้างสัญญาและบันทึก →"} loading={generating} onClick={handleGenerate} />
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
  const [showNoShow, setShowNoShow] = useState(false);
  const [blockingJob, setBlockingJob] = useState<string | null>(null);
  const [startError, setStartError]   = useState("");

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
      if (session?.user?.id) fetchMyProfile(session.user.id).then(p => { if (p?.name) setRiderName(p.name); }).catch(()=>{});
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
                    <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ background:ACCENT, borderRadius:8, padding:"6px 12px", fontSize:12, fontWeight:700, color:"#000", textDecoration:"none", whiteSpace:"nowrap", flexShrink:0 }}>นำทาง ↗</a>
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
                  <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display:"block", background:ACCENT, borderRadius:10, padding:"12px", textAlign:"center", fontSize:15, fontWeight:700, color:"#000", textDecoration:"none" }}>
                    เปิด Google Maps ↗
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
            <DoneCard label="สัญญาลงนามแล้ว ✓" detail={`฿${price.toLocaleString("th-TH")} · ${isCash ? "เงินสด" : "โอนเงิน"}`} c={c} />
          ) : step === 3 ? (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {job.status === "price_negotiation" && (
                <PriceNegotiationStep job={job} reload={reload} c={c} />
              )}
              {job.status === "contracting" && (
                <>
                  <div style={{ background:CARD, borderRadius:14, padding:"12px 14px", border:`1px solid ${BORDER}` }}>
                    <p style={{ margin:"0 0 4px", fontSize:12, color:TEXT2 }}>ราคาตกลง</p>
                    <p style={{ margin:0, fontSize:24, fontWeight:800, color:ACCENT }}>฿{price.toLocaleString("th-TH")}</p>
                  </div>
                  <ContractStep job={job} reload={reload} riderName={riderName} c={c} />
                </>
              )}
              {/* contracting + signed → completed immediately via handleGenerate, so this state should not be reached */}
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
