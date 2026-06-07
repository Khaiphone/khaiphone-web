"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, ScanLine, ShieldCheck, ShieldX, Loader2, RefreshCw } from "lucide-react";
import { scanDeviceInfo, checkSickw } from "@/app/actions/device-scan";
import type { SickwResult } from "@/app/actions/device-scan";
import { compressImage } from "@/lib/compress-image";
import { supabase } from "@/lib/supabase";
import type { InspectionData, InspectionCriterion, FunctionalTest } from "@/lib/types/admin";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";
const GOLD   = "var(--admin-gold)";
const GREEN  = "#22c55e";
const RED    = "#ef4444";

const PHOTO_SLOTS = [
  { key: "top",    label: "ด้านบน"   },
  { key: "bottom", label: "ด้านล่าง" },
  { key: "right",  label: "ด้านขวา"  },
  { key: "left",   label: "ด้านซ้าย" },
  { key: "back",   label: "ด้านหลัง" },
  { key: "screen", label: "หน้าจอ"   },
] as const;

const INSPECT_KEYS = ["body", "screen", "display", "battery", "warranty", "icloud"] as const;
const INSPECT_LABELS: Record<string, string> = {
  body: "สภาพตัวเครื่องภายนอก", screen: "หน้าจอ", display: "การแสดงผล",
  battery: "แบตเตอรี่", warranty: "การรับประกัน", icloud: "iCloud",
};

const FUNCTIONAL_DEFAULTS: FunctionalTest[] = [
  { label: "Face ID / Touch ID",         pass: true },
  { label: "กล้องหลัง (ถ่ายภาพ/วิดีโอ)", pass: true },
  { label: "กล้องหน้า (Selfie)",          pass: true },
  { label: "ลำโพง (Speaker)",             pass: true },
  { label: "ไมโครโฟน",                    pass: true },
  { label: "Wi-Fi",                       pass: true },
  { label: "Cellular / SIM",             pass: true },
  { label: "Bluetooth",                  pass: true },
  { label: "GPS",                        pass: true },
  { label: "Haptic / Vibration",         pass: true },
  { label: "ชาร์จพอร์ต",                  pass: true },
  { label: "ปุ่มด้านข้าง / Volume",        pass: true },
];

const GRADE_OPTIONS = [
  { value: "A",  color: "#22c55e" },
  { value: "A-", color: "#84cc16" },
  { value: "B+", color: "#eab308" },
  { value: "B",  color: "#f97316" },
  { value: "B-", color: "#fb923c" },
  { value: "C",  color: "#ef4444" },
];

const CONDITION_OPTIONS = [
  { value: "สภาพดีมาก", color: "#22c55e" },
  { value: "สภาพดี",    color: "#84cc16" },
  { value: "สภาพพอใช้", color: "#eab308" },
  { value: "มีตำหนิ",   color: "#ef4444" },
];

async function uploadPhoto(file: File, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("inspection-photos").upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data: { publicUrl } } = supabase.storage.from("inspection-photos").getPublicUrl(data.path);
  return publicUrl;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PhotoBox({ slotKey, label, url, onCapture, uploading }: {
  slotKey: string; label: string; url?: string; onCapture: (f: File) => void; uploading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null!);
  return (
    <div>
      <button onClick={() => ref.current?.click()} disabled={uploading} style={{
        width: "100%", aspectRatio: "3/4", background: CARD,
        border: `1.5px solid ${url ? GOLD : BORDER}`, borderRadius: 10, cursor: "pointer",
        overflow: "hidden", padding: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
      }}>
        {url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <><Camera size={18} color={TEXT3} /><span style={{ fontSize: 9, color: TEXT3, textAlign: "center", lineHeight: 1.3, padding: "0 4px" }}>{label}</span></>
        }
      </button>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onCapture(f); e.target.value = ""; }} />
    </div>
  );
}

function CompareRow({ label, stated, actual, onActualChange }: {
  label: string; stated: string; actual: string; onActualChange: (v: string) => void;
}) {
  const pass = !stated || actual.trim().toLowerCase() === stated.trim().toLowerCase();
  return (
    <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{label}</span>
        {actual && (
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600,
            background: pass ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: pass ? GREEN : RED }}>
            {pass ? "ตรงกัน" : "ไม่ตรง"}
          </span>
        )}
      </div>
      {stated && <p style={{ margin: "0 0 8px", fontSize: 12, color: TEXT2 }}>ลูกค้าแจ้ง: <span style={{ color: TEXT, fontWeight: 500 }}>{stated}</span></p>}
      <input value={actual} onChange={e => onActualChange(e.target.value)} placeholder={stated || "กรอกสภาพจริง"}
        style={{ width: "100%", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT,
          fontSize: 14, fontFamily: "inherit", outline: "none", padding: "8px 10px", boxSizing: "border-box" }} />
    </div>
  );
}

function CheckRow({ label, pass, onToggle }: { label: string; pass: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 13, color: TEXT, flex: 1 }}>{label}</span>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onToggle(true)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", background: pass ? "rgba(34,197,94,0.2)" : BG, color: pass ? GREEN : TEXT3, fontWeight: 600, fontSize: 12 }}>ปกติ</button>
        <button onClick={() => onToggle(false)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", background: !pass ? "rgba(239,68,68,0.2)" : BG, color: !pass ? RED : TEXT3, fontWeight: 600, fontSize: 12 }}>มีปัญหา</button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  requestId: string;
  selections: Record<string, string>;
  estimatedPrice: number;
  deviceColor?: string;
  existing?: InspectionData;
  onSave: (data: InspectionData, newStatus: "contracting" | "price_negotiation" | "rejected", deviceColor: string) => Promise<void>;
  saving: boolean;
}

export default function InspectionForm({ requestId, selections, deviceColor, existing, onSave, saving }: Props) {
  // ── Device info state ──────────────────────────────────────────────────────
  const [serial,  setSerial]  = useState(existing?.serial  ?? "");
  const [imei,    setImei]    = useState(existing?.imei    ?? "");
  const [color,   setColor]   = useState(deviceColor ?? "");
  const [battery, setBattery] = useState(existing?.batteryHealth ? String(existing.batteryHealth) : "");
  const [warrantyStatus, setWarrantyStatus] = useState<"valid" | "expired" | "">(
    existing?.warrantyExpiry === "expired" ? "expired" : existing?.warrantyExpiry ? "valid" : ""
  );
  const [warrantyExpiry, setWarrantyExpiry] = useState(
    existing?.warrantyExpiry && existing.warrantyExpiry !== "expired" ? existing.warrantyExpiry : ""
  );

  // ── Scan / SICKW state ─────────────────────────────────────────────────────
  const scanRef = useRef<HTMLInputElement>(null!);
  const [scanning,      setScanning]      = useState(false);
  const [sickwResult,   setSickwResult]   = useState<SickwResult | null>(null);
  const [sickwRaw,      setSickwRaw]      = useState(existing?.sickw_report ?? "");
  const [sickwExpanded, setSickwExpanded] = useState(false);
  const [sickwError,    setSickwError]    = useState("");
  const [sickwLoading,  setSickwLoading]  = useState(false);
  const [scanError,     setScanError]     = useState("");

  // ── Criteria / functional ──────────────────────────────────────────────────
  const [criteria, setCriteria] = useState<Record<string, { stated: string; actual: string }>>(() => {
    if (existing?.criteria?.length) {
      const init: Record<string, { stated: string; actual: string }> = {};
      existing.criteria.forEach(c => {
        const key = Object.entries(INSPECT_LABELS).find(([, v]) => v === c.label)?.[0];
        if (key) init[key] = { stated: c.stated, actual: c.actual };
      });
      return init;
    }
    const init: Record<string, { stated: string; actual: string }> = {};
    INSPECT_KEYS.forEach(k => { if (selections[k]) init[k] = { stated: selections[k], actual: selections[k] }; });
    return init;
  });
  const [functional, setFunctional] = useState<FunctionalTest[]>(
    existing?.functionalTests?.length ? existing.functionalTests : FUNCTIONAL_DEFAULTS.map(t => ({ ...t }))
  );

  // ── Accessories ────────────────────────────────────────────────────────────
  const [accessories,      setAccessories]      = useState<string[]>(existing?.accessories ?? ["ตัวเครื่อง"]);
  const [accessoriesOther, setAccessoriesOther] = useState("");

  // ── Overall assessment ─────────────────────────────────────────────────────
  const [conditionGrade, setConditionGrade] = useState((existing as { conditionGrade?: string } | undefined)?.conditionGrade ?? "");
  const [conditionLabel, setConditionLabel] = useState((existing as { conditionLabel?: string } | undefined)?.conditionLabel ?? "");

  // ── Photos ─────────────────────────────────────────────────────────────────
  const [slotPhotos,   setSlotPhotos]   = useState<Partial<Record<string, string>>>({});
  const [defectPhotos, setDefectPhotos] = useState<string[]>([]);
  const defectRef = useRef<HTMLInputElement>(null!);
  const [uploading, setUploading] = useState(false);

  // ── Result & error ─────────────────────────────────────────────────────────
  const [newStatus, setNewStatus] = useState<"contracting" | "price_negotiation" | "rejected">("contracting");
  const [error, setError] = useState("");

  // Restore SICKW result from saved raw text on mount
  useEffect(() => {
    if (!sickwRaw || sickwResult) return;
    const map: Record<string, string> = {};
    for (const line of sickwRaw.split("\n")) {
      const idx = line.indexOf(": ");
      if (idx > 0) map[line.slice(0, idx).trim()] = line.slice(idx + 2).trim();
    }
    const cfg = map["Device Configuration"] ?? "";
    const cfgParts = cfg.split(",");
    const colorFromCfg   = cfgParts.length >= 5 ? cfgParts[4].trim() : undefined;
    const colorFromModel = (map["Model Name"] ?? "").match(/\d+\s*[GT]B\s+(.+)$/i)?.[1]?.trim();
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

  function applySickwData(data: SickwResult) {
    setSickwResult(data);
    if (data.rawText) setSickwRaw(data.rawText);
    if (data.imei)  setImei(data.imei);
    if (data.color) setColor(data.color);
    if (data.warrantyStatus) {
      const ws = data.warrantyStatus.toLowerCase();
      if (ws === "no" || ws.includes("expir") || ws.includes("out of") || ws.includes("หมด")) {
        setWarrantyStatus("expired");
      } else if (ws === "yes" || ws.includes("active") || ws.includes("valid") || ws.includes("cover")) {
        setWarrantyStatus("valid");
        if (data.warrantyDate) {
          const parsed = new Date(data.warrantyDate);
          if (!isNaN(parsed.getTime())) setWarrantyExpiry(parsed.toISOString().slice(0, 10));
        }
      }
    }
  }

  async function handleScan(file: File) {
    setScanning(true); setScanError(""); setSickwResult(null); setSickwError("");
    try {
      const compressed = await compressImage(file);
      const buf = await compressed.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      const result = await scanDeviceInfo(b64);
      if (result.error) { setScanError(result.error); return; }
      if (!result.serial) { setScanError("อ่าน S/N ไม่ได้ — ถ่ายให้ชัดขึ้น หรือกรอกเอง"); return; }
      setSerial(result.serial);
      setSickwLoading(true);
      const sickw = await checkSickw(result.serial);
      if (!sickw.success) setSickwError(sickw.error ?? "เช็ค SICKW ไม่ได้");
      else if (sickw.data) applySickwData(sickw.data);
      setSickwLoading(false);
    } catch { setScanError("สแกนไม่สำเร็จ กรุณากรอกเอง"); }
    finally { setScanning(false); if (scanRef.current) scanRef.current.value = ""; }
  }

  async function handleSickwCheck() {
    const id = serial.trim() || imei.trim();
    if (!id) return;
    setSickwLoading(true); setSickwResult(null); setSickwError("");
    const res = await checkSickw(id);
    if (!res.success) setSickwError(res.error ?? "เช็ค SICKW ไม่ได้");
    else if (res.data) applySickwData(res.data);
    setSickwLoading(false);
  }

  async function handleSlotPhoto(key: string, file: File) {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const url = await uploadPhoto(compressed, `admin/${requestId}/slot-${key}-${Date.now()}.jpg`);
      setSlotPhotos(prev => ({ ...prev, [key]: url }));
    } catch { setError("อัปโหลดรูปไม่สำเร็จ"); }
    finally { setUploading(false); }
  }

  async function handleDefectPhotos(files: FileList) {
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(async f => {
        const compressed = await compressImage(f);
        return uploadPhoto(compressed, `admin/${requestId}/defect-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
      }));
      setDefectPhotos(prev => [...prev, ...urls]);
    } catch { setError("อัปโหลดรูปไม่สำเร็จ"); }
    finally { setUploading(false); if (defectRef.current) defectRef.current.value = ""; }
  }

  async function handleSave() {
    setError("");
    const criteriaArr: InspectionCriterion[] = INSPECT_KEYS.filter(k => criteria[k]).map(k => ({
      label:  INSPECT_LABELS[k],
      stated: criteria[k].stated,
      actual: criteria[k].actual,
      pass:   !criteria[k].stated || criteria[k].actual.trim().toLowerCase() === criteria[k].stated.trim().toLowerCase(),
    }));
    const warrantyValue = warrantyStatus === "expired" ? "expired" : warrantyExpiry || undefined;
    const photos = [...Object.values(slotPhotos).filter(Boolean), ...defectPhotos] as string[];
    const accList = [...accessories, ...(accessoriesOther.trim() ? [accessoriesOther.trim()] : [])];
    const now = new Date().toISOString();
    const data: InspectionData = {
      inspectedAt:         now,
      result:              criteriaArr.every(c => c.pass) ? "matched" : "adjusted",
      criteria:            criteriaArr,
      issues:              [],
      photos,
      originalPrice:       0,
      actualPrice:         0,
      priceReason:         "",
      negotiationResponse: null,
      negotiationRespondedAt:  null,
      negotiationRespondedBy:  null,
      functionalTests:     functional,
      imei:                imei.trim()   || undefined,
      serial:              serial.trim() || undefined,
      batteryHealth:       battery ? parseInt(battery) : undefined,
      warrantyExpiry:      warrantyValue,
      accessories:         accList.length ? accList : undefined,
      sickw_report:        sickwRaw || undefined,
      ...(conditionGrade ? { conditionGrade } : {}),
      ...(conditionLabel ? { conditionLabel } : {}),
    };
    await onSave(data, newStatus, color.trim());
  }

  // SICKW block verdict
  const sickwBlocked = sickwResult ? (() => {
    const getLine = (key: string) => {
      const line = sickwRaw.split("\n").find(l => new RegExp(`^${key}:`, "i").test(l.trim()));
      const idx = line?.indexOf(": ");
      return idx !== undefined && idx >= 0 ? line!.slice(idx + 2).trim().toLowerCase() : "";
    };
    const icloudLock = getLine("iCloud Lock");
    const icloudAcct = getLine("iCloud Status");
    if (icloudLock === "on") return true;
    if (icloudAcct === "on") return true;
    if (icloudLock.includes("lost") || icloudAcct.includes("lost")) return true;
    const mdmLine = sickwRaw.split("\n").find(l => /^MDM Lock:/i.test(l));
    if (mdmLine?.toLowerCase().includes(": on")) return true;
    const bl = sickwResult.blacklist?.toLowerCase() ?? "";
    if (bl && !["clean", "ok", "no", "clear", "not"].some(s => bl.includes(s))) return true;
    return false;
  })() : false;

  const labelStyle = { margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: TEXT2, textTransform: "uppercase" as const, letterSpacing: "0.07em" };
  const cardStyle  = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Photos ── */}
      <div>
        <p style={labelStyle}>รูปสภาพเครื่อง</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          {PHOTO_SLOTS.map(slot => (
            <PhotoBox key={slot.key} slotKey={slot.key} label={slot.label}
              url={slotPhotos[slot.key]} onCapture={f => handleSlotPhoto(slot.key, f)} uploading={uploading} />
          ))}
        </div>
        <p style={{ margin: "0 0 6px", fontSize: 12, color: TEXT2, fontWeight: 600 }}>รูปตำหนิเพิ่มเติม</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {defectPhotos.map((url, i) => (
            <div key={i} style={{ position: "relative", aspectRatio: "3/4", borderRadius: 10, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`ตำหนิ ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button onClick={() => setDefectPhotos(prev => prev.filter((_, j) => j !== i))} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          ))}
          <button onClick={() => defectRef.current?.click()} disabled={uploading} style={{ aspectRatio: "3/4", background: CARD, border: `1.5px dashed ${BORDER}`, borderRadius: 10, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, opacity: uploading ? 0.6 : 1 }}>
            <Camera size={18} color={TEXT2} />
            <span style={{ fontSize: 9, color: TEXT2 }}>+ ตำหนิ</span>
          </button>
        </div>
        <input ref={defectRef} type="file" accept="image/*" capture="environment" multiple style={{ display: "none" }}
          onChange={e => { if (e.target.files?.length) handleDefectPhotos(e.target.files); }} />
      </div>

      {/* ── Device info ── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ ...labelStyle, marginBottom: 0 }}>ข้อมูลเครื่อง</p>
          <button onClick={() => scanRef.current?.click()} disabled={scanning}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: "rgba(184,134,11,0.12)", border: `1px solid ${GOLD}`, cursor: "pointer", fontFamily: "inherit", opacity: scanning ? 0.7 : 1 }}>
            {scanning ? <Loader2 size={14} color={GOLD} style={{ animation: "spin 0.8s linear infinite" }} /> : <ScanLine size={14} color={GOLD} />}
            <span style={{ fontSize: 13, fontWeight: 600, color: GOLD }}>{scanning ? "กำลังอ่าน..." : "สแกน About"}</span>
          </button>
          <input ref={scanRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleScan(f); }} />
        </div>

        {scanError && <p style={{ margin: "0 0 8px", fontSize: 12, color: RED }}>{scanError}</p>}

        <div style={cardStyle}>
          {/* Serial */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2 }}>Serial Number</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input value={serial} onChange={e => { setSerial(e.target.value.toUpperCase()); setSickwResult(null); setSickwError(""); }}
                placeholder="กรอก Serial"
                style={{ flex: 1, background: "none", border: "none", color: TEXT, fontSize: 15, fontFamily: "inherit", outline: "none", textTransform: "uppercase" }} />
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

          {/* SICKW result */}
          {(sickwResult || sickwError || sickwLoading) && (
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: "rgba(10,132,255,0.04)" }}>
              {sickwLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={14} color="#0A84FF" style={{ animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 12, color: TEXT2 }}>กำลังตรวจสอบข้อมูล Apple...</span>
                </div>
              ) : sickwError ? (
                <p style={{ margin: 0, fontSize: 12, color: RED }}>{sickwError}</p>
              ) : sickwResult && (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
                    {[
                      ["รุ่น",         sickwResult.device],
                      ["iCloud",       sickwResult.icloudStatus],
                      ["Carrier Lock", sickwResult.carrierLock],
                      ["Blacklist",    sickwResult.blacklist],
                      ["ประกัน",       sickwResult.warrantyStatus],
                      ["หมดประกัน",    sickwResult.warrantyDate],
                    ].filter(([, v]) => v).map(([label, value]) => (
                      <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                        <span style={{ color: TEXT2 }}>{label}</span>
                        <span style={{ color: TEXT, fontWeight: 500 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  {/* Verdict */}
                  {(() => {
                    const parseLine = (key: string) => {
                      const line = sickwRaw.split("\n").find(l => new RegExp(`^${key}:`, "i").test(l.trim()));
                      const idx = line?.indexOf(": ");
                      return idx !== undefined && idx >= 0 ? line!.slice(idx + 2).trim().toLowerCase() : "";
                    };
                    const icloudLock = parseLine("iCloud Lock");
                    const icloudAcct = parseLine("iCloud Status");
                    const issues: string[] = [];
                    if (icloudLock === "on")                              issues.push("iCloud Lock เปิดอยู่ — เครื่องล็อคกับบัญชี Apple เดิม");
                    if (icloudAcct === "on")                              issues.push("ยังไม่ Sign Out iCloud — ต้องปลดออกก่อนรับซื้อ");
                    if (icloudLock.includes("lost") || icloudAcct.includes("lost")) issues.push("Find My iPhone / สถานะ Lost — เครื่องถูกรายงานสูญหาย");
                    const mdmLine = sickwRaw.split("\n").find(l => /^MDM Lock:/i.test(l));
                    if (mdmLine?.toLowerCase().includes(": on")) issues.push("MDM Lock เปิดอยู่ — เครื่องถูกล็อคโดยองค์กร");
                    const bl = sickwResult!.blacklist?.toLowerCase() ?? "";
                    if (bl && !["clean", "ok", "no", "clear", "not"].some(s => bl.includes(s))) issues.push(`Blacklist: ${sickwResult!.blacklist}`);
                    const passed = issues.length === 0;
                    return (
                      <div style={{ borderRadius: 10, border: `1.5px solid ${passed ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`, background: passed ? "rgba(34,197,94,0.07)" : "rgba(239,68,68,0.07)", padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: passed ? 0 : 8 }}>
                          {passed ? <ShieldCheck size={16} color={GREEN} /> : <ShieldX size={16} color={RED} />}
                          <span style={{ fontSize: 13, fontWeight: 700, color: passed ? GREEN : RED }}>
                            {passed ? "ผ่านการตรวจสอบ — รับเครื่องได้" : "ไม่ผ่านการตรวจสอบ — ห้ามรับเครื่อง"}
                          </span>
                        </div>
                        {!passed && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {issues.map(issue => (
                              <div key={issue} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                                <span style={{ fontSize: 14, lineHeight: 1.2, flexShrink: 0 }}>🚫</span>
                                <span style={{ fontSize: 12, color: RED, fontWeight: 500 }}>{issue}</span>
                              </div>
                            ))}
                          </div>
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
                        <pre style={{ margin: "6px 0 0", padding: "10px 12px", borderRadius: 8, background: BG, fontSize: 11, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", color: TEXT }}>{sickwRaw}</pre>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Color */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2 }}>สีตัวเครื่อง</p>
            <input value={color} onChange={e => setColor(e.target.value)} placeholder="เช่น Black Titanium, Midnight"
              style={{ width: "100%", background: "none", border: "none", color: TEXT, fontSize: 15, fontFamily: "inherit", outline: "none" }} />
          </div>

          {/* IMEI */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2 }}>IMEI</p>
            <input value={imei} onChange={e => setImei(e.target.value)} placeholder="กรอก IMEI (ไม่บังคับ)"
              style={{ width: "100%", background: "none", border: "none", color: TEXT, fontSize: 15, fontFamily: "inherit", outline: "none" }} />
          </div>

          {/* Battery Health */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2 }}>Battery Health</p>
            <select value={battery} onChange={e => setBattery(e.target.value)}
              style={{ width: "100%", background: "none", border: "none", color: battery ? TEXT : TEXT3, fontSize: 15, fontFamily: "inherit", outline: "none", appearance: "none" }}>
              <option value="">-- เลือก % --</option>
              {Array.from({ length: 51 }, (_, i) => 100 - i).map(v => <option key={v} value={String(v)}>{v}%</option>)}
            </select>
          </div>

          {/* Warranty */}
          <div style={{ padding: "12px 16px" }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: TEXT2 }}>การรับประกัน</p>
            <div style={{ display: "flex", gap: 8, marginBottom: warrantyStatus === "valid" ? 10 : 0 }}>
              {(["valid", "expired"] as const).map(s => (
                <button key={s} onClick={() => setWarrantyStatus(prev => prev === s ? "" : s)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                  background: warrantyStatus === s ? (s === "valid" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)") : BG,
                  color: warrantyStatus === s ? (s === "valid" ? GREEN : RED) : TEXT2 }}>
                  {s === "valid" ? "ยังมีประกัน" : "ประกันสิ้นสุดแล้ว"}
                </button>
              ))}
            </div>
            {warrantyStatus === "valid" && (
              <input type="date" value={warrantyExpiry} onChange={e => setWarrantyExpiry(e.target.value)}
                style={{ width: "100%", background: BG, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 14, fontFamily: "inherit", outline: "none", padding: "8px 10px", boxSizing: "border-box", appearance: "none" }} />
            )}
          </div>
        </div>
      </div>

      {/* ── Condition criteria ── */}
      {Object.keys(criteria).length > 0 && (
        <div>
          <p style={labelStyle}>สภาพเครื่อง</p>
          <div style={cardStyle}>
            {INSPECT_KEYS.filter(k => criteria[k]).map(k => (
              <CompareRow key={k} label={INSPECT_LABELS[k]}
                stated={criteria[k].stated} actual={criteria[k].actual}
                onActualChange={v => setCriteria(p => ({ ...p, [k]: { ...p[k], actual: v } }))} />
            ))}
          </div>
        </div>
      )}

      {/* ── Functional tests ── */}
      <div>
        <p style={labelStyle}>ฟังก์ชันการใช้งาน</p>
        <div style={cardStyle}>
          <div style={{ padding: "0 16px" }}>
            {functional.map((test, i) => (
              <CheckRow key={test.label} label={test.label} pass={test.pass}
                onToggle={v => setFunctional(prev => prev.map((t, j) => j === i ? { ...t, pass: v } : t))} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Accessories ── */}
      <div style={cardStyle}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TEXT }}>อุปกรณ์ที่ให้มา</p>
        </div>
        <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {["ตัวเครื่อง", "กล่อง", "สายชาร์จ", "หัวชาร์จ", "EarPods", "ฟิล์ม", "เคส"].map(a => (
            <button key={a} onClick={() => setAccessories(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}
              style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${accessories.includes(a) ? GOLD : BORDER}`, background: accessories.includes(a) ? "rgba(184,134,11,0.1)" : CARD, color: accessories.includes(a) ? GOLD : TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {a}
            </button>
          ))}
        </div>
        <div style={{ padding: "0 16px 12px" }}>
          <input placeholder="อื่นๆ (เช่น คู่มือ, หูฟัง)" value={accessoriesOther} onChange={e => setAccessoriesOther(e.target.value)}
            style={{ width: "100%", background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", color: TEXT, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* ── Overall assessment ── */}
      <div style={cardStyle}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TEXT }}>สรุปการประเมิน</p>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: TEXT2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>เกรด</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {GRADE_OPTIONS.map(g => {
                const active = conditionGrade === g.value;
                return (
                  <button key={g.value} onClick={() => setConditionGrade(prev => prev === g.value ? "" : g.value)}
                    style={{ minWidth: 48, padding: "8px 14px", borderRadius: 9, border: `2px solid ${active ? g.color : BORDER}`, background: active ? `${g.color}22` : CARD, color: active ? g.color : TEXT2, fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
                    {g.value}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 11, color: TEXT2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>สภาพสินค้า</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CONDITION_OPTIONS.map(o => {
                const active = conditionLabel === o.value;
                return (
                  <button key={o.value} onClick={() => setConditionLabel(prev => prev === o.value ? "" : o.value)}
                    style={{ padding: "8px 14px", borderRadius: 9, border: `2px solid ${active ? o.color : BORDER}`, background: active ? `${o.color}22` : CARD, color: active ? o.color : TEXT2, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    {o.value}
                  </button>
                );
              })}
            </div>
          </div>
          {(conditionGrade || conditionLabel) && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 9, background: BG, border: `1px solid ${BORDER}` }}>
              {conditionGrade && (
                <span style={{ padding: "3px 12px", borderRadius: 6, background: `${GRADE_OPTIONS.find(g => g.value === conditionGrade)?.color ?? GOLD}22`, color: GRADE_OPTIONS.find(g => g.value === conditionGrade)?.color ?? GOLD, fontWeight: 700, fontSize: 14 }}>
                  {conditionGrade}
                </span>
              )}
              {conditionLabel && <span style={{ fontSize: 13, color: TEXT, fontWeight: 500 }}>{conditionLabel}</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── Status picker ── */}
      <div>
        <p style={labelStyle}>ผลการตรวจ</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {([
            { value: "contracting",       label: "ผ่าน",        color: GREEN },
            { value: "price_negotiation", label: "ต่อรองราคา",  color: "#eab308" },
            { value: "rejected",          label: "ปฏิเสธ",      color: RED },
          ] as const).map(opt => (
            <button key={opt.value} onClick={() => setNewStatus(opt.value)}
              style={{ padding: "10px 8px", borderRadius: 10, border: `2px solid ${newStatus === opt.value ? opt.color : BORDER}`, background: newStatus === opt.value ? `${opt.color}18` : CARD, color: newStatus === opt.value ? opt.color : TEXT2, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: 13, color: RED }}>{error}</p>}
      {uploading && <p style={{ margin: 0, fontSize: 12, color: GOLD, textAlign: "center" }}>กำลังอัปโหลดรูป...</p>}
      {sickwBlocked && (
        <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ margin: 0, fontSize: 13, color: RED, fontWeight: 600 }}>⚠️ ตรวจพบปัญหาจาก Apple Check — ตรวจสอบก่อนดำเนินการต่อ</p>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: GOLD, color: "#fff", fontSize: 15, fontWeight: 700, cursor: (saving || uploading) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (saving || uploading) ? 0.6 : 1, touchAction: "manipulation" }}
      >
        {saving ? "กำลังบันทึก..." : "บันทึกผลตรวจ →"}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
