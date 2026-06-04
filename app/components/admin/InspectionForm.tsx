"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, Camera, Check, AlertCircle, ShieldCheck, ShieldAlert, ShieldX, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { saveInspectionPhotos } from "@/app/actions/inspection";
import { checkSickw } from "@/app/actions/device-scan";
import type { SickwResult } from "@/app/actions/device-scan";
import { compressImage } from "@/lib/compress-image";
import { validateImageFiles } from "@/lib/validate-file";
import type { InspectionData, InspectionCriterion, FunctionalTest, ExtraDeviceInspection } from "@/lib/types/admin";

const GOLD   = "#B8860B";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const BORDER = "#E5E5E5";

const MODEL_COLORS: Record<string, string[]> = {
  "iPhone 17 Pro Max":  ["Cosmic Orange", "Silver", "Deep Blue", "Black"],
  "iPhone 17 Pro":      ["Cosmic Orange", "Silver", "Deep Blue", "Black"],
  "iPhone 17 Air":      ["Sky Blue", "White", "Black", "Pink"],
  "iPhone 17":          ["Sky Blue", "White", "Black", "Pink", "Teal"],
  "iPhone 17e":         ["Black", "White", "Pink"],
  "iPhone 16 Pro Max":  ["Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium"],
  "iPhone 16 Pro":      ["Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium"],
  "iPhone 16 Plus":     ["Ultramarine", "Teal", "Pink", "White", "Black"],
  "iPhone 16":          ["Ultramarine", "Teal", "Pink", "White", "Black"],
  "iPhone 15 Pro Max":  ["Black Titanium", "White Titanium", "Natural Titanium", "Blue Titanium"],
  "iPhone 15 Pro":      ["Black Titanium", "White Titanium", "Natural Titanium", "Blue Titanium"],
  "iPhone 15 Plus":     ["Black", "Blue", "Green", "Yellow", "Pink"],
  "iPhone 15":          ["Black", "Blue", "Green", "Yellow", "Pink"],
  "iPhone 14 Pro Max":  ["Deep Purple", "Gold", "Silver", "Space Black"],
  "iPhone 14 Pro":      ["Deep Purple", "Gold", "Silver", "Space Black"],
  "iPhone 14 Plus":     ["Midnight", "Starlight", "Blue", "Purple", "(PRODUCT)RED"],
  "iPhone 14":          ["Midnight", "Starlight", "Blue", "Purple", "(PRODUCT)RED"],
  "iPhone 13 Pro Max":  ["Sierra Blue", "Alpine Green", "Gold", "Silver", "Graphite"],
  "iPhone 13 Pro":      ["Sierra Blue", "Alpine Green", "Gold", "Silver", "Graphite"],
  "iPhone 13 mini":     ["Midnight", "Starlight", "Blue", "Pink", "Green", "(PRODUCT)RED"],
  "iPhone 13":          ["Midnight", "Starlight", "Blue", "Pink", "Green", "(PRODUCT)RED"],
  "iPhone 12 Pro Max":  ["Pacific Blue", "Gold", "Silver", "Graphite"],
  "iPhone 12 Pro":      ["Pacific Blue", "Gold", "Silver", "Graphite"],
  "iPhone 12 mini":     ["Black", "White", "(PRODUCT)RED", "Green", "Blue", "Purple", "Yellow"],
  "iPhone 12":          ["Black", "White", "(PRODUCT)RED", "Green", "Blue", "Purple", "Yellow"],
  "iPhone 11 Pro Max":  ["Midnight Green", "Gold", "Silver", "Space Gray"],
  "iPhone 11 Pro":      ["Midnight Green", "Gold", "Silver", "Space Gray"],
  "iPhone 11":          ["Black", "White", "Green", "Yellow", "Purple", "(PRODUCT)RED"],
};

const INSPECT_KEYS  = ["body", "screen", "display", "battery", "warranty", "icloud", "accessories"] as const;
const INSPECT_LABELS: Record<string, string> = {
  body:        "ตัวเครื่อง",
  screen:      "หน้าจอ",
  display:     "ภาพหน้าจอ",
  battery:     "แบตเตอรี่",
  warranty:    "การรับประกัน",
  icloud:      "iCloud",
  accessories: "อุปกรณ์เสริม",
};

const FUNCTIONAL_TEST_DEFAULTS: FunctionalTest[] = [
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

const ISSUE_LIST = [
  "เคยผ่านการซ่อม (ไม่ได้แจ้ง)",
  "iCloud ยังไม่ได้ออก",
  "Find My iPhone ยังเปิดอยู่",
  "ล็อคเครือข่าย (Carrier lock)",
  "MDM / Corporate lock",
  "Face ID / Touch ID ไม่ทำงาน",
  "ชาร์จพอร์ตมีปัญหา",
  "น้ำเข้า (Water damage)",
  "จอมีจุดตาย / ภาพผิดปกติ",
];

interface CriterionRow extends InspectionCriterion {
  _key: string;
}

interface ExtraDeviceRow {
  model: string;
  storage: string;
  estimatedPrice: number;
  details: Array<{ title: string; value: string }>;
}

interface Props {
  requestId: string;
  model?: string;
  selections: Record<string, string>;
  estimatedPrice: number;
  deviceColor?: string;
  existing?: InspectionData;
  extraDevices?: ExtraDeviceRow[];
  onSave: (data: InspectionData, newStatus: "contracting" | "price_negotiation" | "rejected", deviceColor: string) => Promise<void>;
  saving: boolean;
  showColorError?: boolean;
  onColorErrorCleared?: () => void;
  onColorChange?: (color: string) => void;
  requireCustomerConfirm?: boolean;
}

function buildInitCriteria(
  selections: Record<string, string>,
  existing?: InspectionData,
): CriterionRow[] {
  if (existing?.criteria?.length) {
    return existing.criteria.map((c, i) => ({ _key: String(i), ...c }));
  }
  return INSPECT_KEYS
    .filter(k => selections[k])
    .map(k => ({
      _key:   k,
      label:  INSPECT_LABELS[k],
      stated: selections[k],
      actual: selections[k],
      pass:   true,
    }));
}

export default function InspectionForm({
  requestId, model, selections, estimatedPrice, deviceColor, existing, extraDevices, onSave, saving,
  showColorError: externalColorError, onColorErrorCleared, onColorChange, requireCustomerConfirm,
}: Props) {
  const colorOptions = model ? (MODEL_COLORS[model] ?? []) : [];
  const [colorDraft,     setColorDraft]     = useState(deviceColor ?? "");
  const [customColor,    setCustomColor]    = useState(!colorOptions.includes(deviceColor ?? "") ? (deviceColor ?? "") : "");

  useEffect(() => {
    if (externalColorError) setColorError(true);
  }, [externalColorError]);

  useEffect(() => {
    if (existing?.sickw_report && !sickwRaw) setSickwRaw(existing.sickw_report);
  }, [existing?.sickw_report]);
  const [criteria,       setCriteria]       = useState<CriterionRow[]>(() => buildInitCriteria(selections, existing));
  const [functionalTests, setFunctionalTests] = useState<FunctionalTest[]>(
    existing?.functionalTests ?? FUNCTIONAL_TEST_DEFAULTS.map(t => ({ ...t }))
  );
  const [issues,      setIssues]      = useState<string[]>(existing?.issues ?? []);
  const [customIssue, setCustomIssue] = useState("");
  const [photos,      setPhotos]      = useState<string[]>(existing?.photos ?? []);
  const [actualPrice, setActualPrice] = useState(String(existing?.actualPrice ?? estimatedPrice));
  const [priceReason, setPriceReason] = useState(existing?.priceReason ?? "");
  const [imei,           setImei]           = useState(existing?.imei ?? "");
  const [serial,         setSerial]         = useState(existing?.serial ?? "");
  const [warrantyExpiry, setWarrantyExpiry] = useState(existing?.warrantyExpiry ?? "");
  const [batteryCycles,  setBatteryCycles]  = useState(existing?.batteryCycles !== undefined ? String(existing.batteryCycles) : "");
  const [batteryHealth,  setBatteryHealth]  = useState(existing?.batteryHealth !== undefined ? String(existing.batteryHealth) : "");

  const iphoneSeries = (() => { const m = model?.match(/iPhone\s+(\d+)/i); return m ? Number(m[1]) : 0; })();
  const showCycles = iphoneSeries >= 15;
  const showHealth = iphoneSeries > 0; // all iPhones have battery health; 15+ also shows cycles
  const [imeiError,    setImeiError]    = useState(false);
  const [serialError,  setSerialError]  = useState(false);
  const [sickwResult,   setSickwResult]   = useState<SickwResult | null>(null);
  const [sickwRaw,      setSickwRaw]      = useState(existing?.sickw_report ?? "");
  const [sickwExpanded, setSickwExpanded] = useState(false);
  const [sickwError,    setSickwError]    = useState("");
  const [sickwLoading,  setSickwLoading]  = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [uploadErr,    setUploadErr]   = useState<string | null>(null);
  const [photoSaving,  setPhotoSaving] = useState(false);
  const [photoSaved,   setPhotoSaved]  = useState(false);
  const fileRef    = useRef<HTMLInputElement>(null);
  const colorRef   = useRef<HTMLDivElement>(null);
  const imeiRef    = useRef<HTMLDivElement>(null);

  // ── Extra device inspection state ───────────────────────────────────────────

  interface ExtraInspState {
    model: string;
    storage: string;
    originalPrice: number;
    actualPrice: string;
    color: string;
    imei: string;
    serial: string;
    imeiError: boolean;
    serialError: boolean;
    criteria: CriterionRow[];
    functionalTests: FunctionalTest[];
    issues: string[];
    customIssue: string;
    photos: string[];
    uploading: boolean;
    photoSaving: boolean;
    photoSaved: boolean;
  }

  function buildExtraInit(d: ExtraDeviceRow, saved?: ExtraDeviceInspection): ExtraInspState {
    const savedCriteria: CriterionRow[] = saved?.criteria?.length
      ? saved.criteria.map((c, i) => ({ _key: String(i), ...c }))
      : d.details.map(det => ({
          _key: det.title,
          label: det.title,
          stated: det.value,
          actual: det.value,
          pass: true,
        }));
    return {
      model:          d.model,
      storage:        d.storage,
      originalPrice:  d.estimatedPrice,
      actualPrice:    String(saved?.actualPrice ?? d.estimatedPrice),
      color:          saved?.color ?? "",
      imei:           saved?.imei ?? "",
      serial:         saved?.serial ?? "",
      imeiError:      false,
      serialError:    false,
      criteria:       savedCriteria,
      functionalTests: saved?.functionalTests?.length
        ? saved.functionalTests
        : FUNCTIONAL_TEST_DEFAULTS.map(t => ({ ...t })),
      issues:         saved?.issues ?? [],
      customIssue:    "",
      photos:         saved?.photos ?? [],
      uploading:      false,
      photoSaving:    false,
      photoSaved:     false,
    };
  }

  const [extraStates, setExtraStates] = useState<ExtraInspState[]>(() =>
    (extraDevices ?? []).map((d, i) => buildExtraInit(d, existing?.extraInspections?.[i]))
  );

  function patchExtra(idx: number, patch: Partial<ExtraInspState>) {
    setExtraStates(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  function updateExtraCriteria(idx: number, key: string, patch: Partial<CriterionRow>) {
    setExtraStates(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      return { ...s, criteria: s.criteria.map(r => {
        if (r._key !== key) return r;
        const updated = { ...r, ...patch };
        if ("actual" in patch) updated.pass = updated.actual.trim().toLowerCase() === updated.stated.trim().toLowerCase();
        return updated;
      })};
    }));
  }

  const extraFileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const extraImeiRefs = useRef<(HTMLDivElement | null)[]>([]);

  async function handleExtraFiles(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const check = validateImageFiles(files);
    if (!check.valid) { alert(check.error); return; }
    patchExtra(idx, { uploading: true, photoSaved: false });
    const urls: string[] = [];
    for (const raw of files) {
      const file = await compressImage(raw);
      const path = `${requestId}/extra-${idx}/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const { data, error } = await supabase.storage
        .from("inspection-photos")
        .upload(path, file, { upsert: true });
      if (error) continue;
      const { data: pub } = supabase.storage.from("inspection-photos").getPublicUrl(data.path);
      urls.push(pub.publicUrl);
    }
    setExtraStates(prev => prev.map((s, i) => i === idx ? { ...s, photos: [...s.photos, ...urls], uploading: false } : s));
    if (extraFileRefs.current[idx]) extraFileRefs.current[idx]!.value = "";
  }

  async function removeExtraPhoto(idx: number, url: string) {
    const newPhotos = extraStates[idx].photos.filter(p => p !== url);
    patchExtra(idx, { photos: newPhotos, photoSaved: false, photoSaving: true });
    await saveInspectionPhotos(requestId, newPhotos);
    patchExtra(idx, { photoSaving: false, photoSaved: true });
  }

  const allPass      = criteria.every(c => c.pass) && issues.length === 0;
  const priceChanged = Number(actualPrice) !== estimatedPrice;

  // ── Criteria helpers ────────────────────────────────────────────────────────

  function updateRow(key: string, patch: Partial<CriterionRow>) {
    setCriteria(prev => prev.map(r => {
      if (r._key !== key) return r;
      const updated = { ...r, ...patch };
      if ("actual" in patch) {
        updated.pass = updated.actual.trim().toLowerCase() === updated.stated.trim().toLowerCase();
      }
      return updated;
    }));
  }

  function addRow() {
    setCriteria(prev => [...prev, { _key: String(Date.now()), label: "", stated: "", actual: "", pass: true }]);
  }

  function removeRow(key: string) {
    setCriteria(prev => prev.filter(r => r._key !== key));
  }

  // ── Issues helpers ───────────────────────────────────────────────────────────

  function toggleIssue(issue: string) {
    setIssues(prev => prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]);
  }

  function addCustomIssue() {
    const v = customIssue.trim();
    if (!v) return;
    setIssues(prev => [...prev, v]);
    setCustomIssue("");
  }

  // ── Photo upload ─────────────────────────────────────────────────────────────

  async function removePhoto(url: string) {
    const newPhotos = photos.filter(p => p !== url);
    setPhotos(newPhotos);
    setPhotoSaved(false);
    setPhotoSaving(true);
    await saveInspectionPhotos(requestId, newPhotos);
    setPhotoSaving(false);
    setPhotoSaved(true);
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const check = validateImageFiles(files);
    if (!check.valid) { setUploadErr(check.error); return; }
    setUploading(true);
    setUploadErr(null);
    const urls: string[] = [];
    for (const raw of files) {
      const file = await compressImage(raw);
      const path = `${requestId}/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
      const { data, error } = await supabase.storage
        .from("inspection-photos")
        .upload(path, file, { upsert: true });
      if (error) { setUploadErr("อัพโหลดไม่สำเร็จ: " + error.message); continue; }
      const { data: pub } = supabase.storage.from("inspection-photos").getPublicUrl(data.path);
      urls.push(pub.publicUrl);
    }
    setPhotos(prev => [...prev, ...urls]);
    setPhotoSaved(false);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  const [colorError, setColorError] = useState(false);

  async function handleSubmit(action: "contracting" | "price_negotiation" | "rejected") {
    // Validate required fields — collect first error to scroll to
    let firstErrorEl: HTMLElement | null = null;

    const colorMissing  = !colorDraft.trim();
    const imeiMissing   = !imei.trim();
    const serialMissing = !serial.trim();

    if (colorMissing)  { setColorError(true);  firstErrorEl = firstErrorEl ?? colorRef.current; }
    if (imeiMissing)   { setImeiError(true);   firstErrorEl = firstErrorEl ?? imeiRef.current; }
    if (serialMissing) { setSerialError(true);  firstErrorEl = firstErrorEl ?? (imeiMissing ? imeiRef.current : null) ?? null; }

    // Validate extra devices
    const extraErrors = extraStates.map((e, idx) => ({
      imei:   !e.imei.trim(),
      serial: !e.serial.trim(),
    }));
    extraErrors.forEach((err, idx) => {
      if (err.imei || err.serial) {
        setExtraStates(prev => prev.map((s, i) => i === idx ? { ...s, imeiError: err.imei, serialError: err.serial } : s));
        if (!firstErrorEl) firstErrorEl = extraImeiRefs.current[idx];
      }
    });

    if (colorMissing || imeiMissing || serialMissing || extraErrors.some(e => e.imei || e.serial)) {
      firstErrorEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setColorError(false);
    setImeiError(false);
    setSerialError(false);
    const data: InspectionData = {
      arrivedAt:              existing?.arrivedAt,
      inspectedAt:            new Date().toISOString(),
      result:                 action === "rejected" ? "rejected" : (allPass && !priceChanged ? "matched" : "adjusted") as import("@/lib/types/admin").InspectionResult,
      criteria:               criteria.map(({ _key: _, ...rest }) => rest),
      issues,
      photos,
      originalPrice:          estimatedPrice,
      actualPrice:            Number(actualPrice) || estimatedPrice,
      priceReason:            priceReason.trim(),
      negotiationResponse:    null,
      negotiationRespondedAt: null,
      negotiationRespondedBy: null,
      functionalTests,
      imei:           imei.trim() || undefined,
      serial:         serial.trim() || undefined,
      warrantyExpiry: warrantyExpiry.trim() || undefined,
      batteryCycles:  batteryCycles.trim() ? Number(batteryCycles) : undefined,
      batteryHealth:  batteryHealth.trim() ? Number(batteryHealth) : undefined,
      sickw_report:   sickwRaw || existing?.sickw_report || undefined,
      extraInspections: extraStates.length > 0 ? extraStates.map(e => ({
        model:          e.model,
        storage:        e.storage,
        originalPrice:  e.originalPrice,
        actualPrice:    Number(e.actualPrice) || e.originalPrice,
        result:         (Number(e.actualPrice) === e.originalPrice && e.issues.length === 0) ? "matched" as const : "adjusted" as const,
        criteria:       e.criteria.map(({ _key: _, ...rest }) => rest),
        issues:         e.issues,
        photos:         e.photos,
        functionalTests: e.functionalTests,
        imei:           e.imei || undefined,
        serial:         e.serial || undefined,
        color:          e.color || undefined,
      })) : undefined,
    };
    await onSave(data, action, colorDraft.trim());
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  function applySickwData(data: SickwResult) {
    setSickwResult(data);
    if (data.rawText) setSickwRaw(data.rawText);
    if (data.imei) { setImei(data.imei); setImeiError(false); }
    if (data.color) {
      setColorDraft(data.color);
      setCustomColor(colorOptions.includes(data.color) ? "" : data.color);
      setColorError(false);
      onColorChange?.(data.color);
    }
    if (data.warrantyStatus) {
      const ws = data.warrantyStatus.toLowerCase();
      if (ws === "no" || ws.includes("expir") || ws.includes("out of") || ws.includes("หมด")) {
        setWarrantyExpiry("expired");
      } else if (ws === "yes" || ws.includes("active") || ws.includes("valid") || ws.includes("cover")) {
        if (data.warrantyDate) {
          const parsed = new Date(data.warrantyDate);
          if (!isNaN(parsed.getTime())) setWarrantyExpiry(parsed.toISOString().slice(0, 10));
        }
      }
    }
  }

  async function handleSickwCheck() {
    const id = serial.trim() || imei.trim();
    if (!id) return;
    setSickwLoading(true);
    setSickwError("");
    setSickwResult(null);
    const res = await checkSickw(id);
    if (res.success && res.data) applySickwData(res.data);
    else setSickwError(res.error ?? "ตรวจสอบไม่สำเร็จ");
    setSickwLoading(false);
  }

  const sectionLabel = (text: string) => (
    <p style={{ color: TEXT3, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", margin: "0 0 10px" }}>
      {text}
    </p>
  );

  return (
    <div>

      {/* Color field */}
      <div ref={colorRef}>
      {sectionLabel("สีตัวเครื่อง (ตรวจจริง) *")}
      {colorOptions.length > 0 ? (
        <div style={{ marginBottom: colorError ? 6 : 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {colorOptions.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { setColorDraft(c); setCustomColor(""); setColorError(false); onColorErrorCleared?.(); onColorChange?.(c); }}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  background: colorDraft === c ? GOLD : "#F5F5F7",
                  color:      colorDraft === c ? "#fff" : TEXT2,
                  border:     colorDraft === c ? `1px solid ${GOLD}` : `1px solid ${BORDER}`,
                  fontWeight: colorDraft === c ? 600 : 400,
                }}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setColorDraft(""); setCustomColor(""); onColorChange?.(""); }}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                color: TEXT3, border: `1px dashed ${BORDER}`, background: "#F5F5F7",
              }}
            >
              อื่นๆ
            </button>
          </div>
          {(!colorOptions.includes(colorDraft) || colorDraft === "") && (
            <input
              value={customColor}
              onChange={e => { setCustomColor(e.target.value); setColorDraft(e.target.value); setColorError(false); onColorChange?.(e.target.value); }}
              placeholder="ระบุสีอื่น..."
              style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${colorError ? "#EF4444" : BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }}
            />
          )}
        </div>
      ) : (
        <input
          value={colorDraft}
          onChange={e => { setColorDraft(e.target.value); setColorError(false); onColorChange?.(e.target.value); }}
          placeholder="เช่น Natural Titanium, Midnight, Starlight"
          style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${colorError ? "#EF4444" : BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, marginBottom: colorError ? 6 : 20, fontFamily: "inherit" }}
        />
      )}
      {colorError && <p style={{ color: "#EF4444", fontSize: 12, marginBottom: 16, marginTop: 4 }}>กรุณาระบุสีตัวเครื่อง</p>}
      </div>

      {/* IMEI + Serial */}
      <div ref={imeiRef}>
      {sectionLabel("IMEI / Serial (ตรวจจริงหน้างาน) *")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
        <div>
          <label style={{ color: TEXT2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
            Serial Number <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={serial}
              onChange={e => { setSerial(e.target.value.toUpperCase()); setSickwResult(null); setSickwError(""); if (e.target.value.trim()) setSerialError(false); }}
              placeholder="เช่น F2LJH0X7XY"
              maxLength={20}
              style={{ flex: 1, background: "#F5F5F7", border: `1px solid ${serialError ? "#EF4444" : BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "monospace" }}
            />
            {serial.trim().length >= 10 && !sickwResult && (
              <button type="button" onClick={handleSickwCheck} disabled={sickwLoading}
                style={{ flexShrink: 0, padding: "0 10px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #BFDBFE", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, opacity: sickwLoading ? 0.6 : 1 }}>
                {sickwLoading
                  ? <Loader2 size={13} color="#1D4ED8" style={{ animation: "spin 0.8s linear infinite" }} />
                  : <ShieldCheck size={13} color="#1D4ED8" />}
                <span style={{ fontSize: 11, fontWeight: 600, color: "#1D4ED8", whiteSpace: "nowrap" }}>ตรวจสอบ Apple</span>
              </button>
            )}
          </div>
          {serialError && <p style={{ color: "#EF4444", fontSize: 11, marginTop: 4 }}>กรุณากรอก Serial Number</p>}
        </div>
        <div>
          <label style={{ color: TEXT2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
            IMEI <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            value={imei}
            onChange={e => { setImei(e.target.value); if (e.target.value.trim()) setImeiError(false); }}
            placeholder="เช่น 356789123456789"
            maxLength={20}
            style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${imeiError ? "#EF4444" : BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "monospace" }}
          />
          {imeiError && <p style={{ color: "#EF4444", fontSize: 11, marginTop: 4 }}>กรุณากรอก IMEI</p>}
        </div>
      </div>

      {/* SICKW result */}
      {sickwError && (
        <div style={{ marginTop: 8, padding: "8px 12px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#DC2626" }}>{sickwError}</p>
        </div>
      )}
      {sickwResult && (
        <div style={{ marginTop: 8, background: "#F8FAFF", border: "1px solid #BFDBFE", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={13} color="#1D4ED8" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8" }}>ผลตรวจสอบ Apple</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {[
              { label: "รุ่น",       value: sickwResult.device },
              { label: "Carrier",    value: sickwResult.carrier },
              { label: "SIM Lock",   value: sickwResult.carrierLock,  warn: sickwResult.carrierLock?.toLowerCase().includes("lock") },
              { label: "iCloud",     value: sickwResult.icloudStatus, warn: sickwResult.icloudStatus?.toLowerCase().includes("on") || sickwResult.icloudStatus?.toLowerCase().includes("lost") },
              { label: "Blacklist",  value: sickwResult.blacklist,    warn: sickwResult.blacklist?.toLowerCase() !== "clean" && !!sickwResult.blacklist },
              { label: "MDM Lock",   value: sickwResult.icloudStatus ? undefined : undefined },
              { label: "Warranty",   value: sickwResult.warrantyStatus },
            ].filter(r => r.value).map(({ label, value, warn }) => (
              <div key={label} style={{ padding: "6px 12px", borderBottom: "1px solid #BFDBFE", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: TEXT2 }}>{label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {warn && <ShieldAlert size={11} color="#DC2626" />}
                  <span style={{ fontSize: 11, fontWeight: 600, color: warn ? "#DC2626" : "#16A34A" }}>{value}</span>
                </div>
              </div>
            ))}
          </div>
          {(sickwResult.icloudStatus?.toLowerCase().includes("on") || sickwResult.carrierLock?.toLowerCase().includes("lock")) && (
            <div style={{ padding: "8px 12px", background: "#FEF2F2", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldX size={13} color="#DC2626" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#DC2626" }}>ควรแจ้งผู้บริหารก่อนรับเครื่อง</span>
            </div>
          )}
          {sickwRaw && (
            <div style={{ padding: "8px 12px", borderTop: "1px solid #BFDBFE" }}>
              <button onClick={() => setSickwExpanded(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, color: "#1D4ED8", fontFamily: "inherit" }}>
                {sickwExpanded ? "▲ ซ่อนรายงานเต็ม" : "▼ ดูรายงานเต็ม"}
              </button>
              {sickwExpanded && (
                <pre style={{ margin: "6px 0 0", padding: "8px 10px", borderRadius: 6, background: "#F1F5F9", fontSize: 10, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#1E293B" }}>{sickwRaw}</pre>
              )}
            </div>
          )}
        </div>
      )}
      {!sickwResult && sickwRaw && (
        <div style={{ marginTop: 8, background: "#F8FAFF", border: "1px solid #BFDBFE", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #BFDBFE", display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={13} color="#1D4ED8" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8" }}>รายงานตรวจสอบ Apple (บันทึกไว้แล้ว)</span>
          </div>
          <div style={{ padding: "8px 12px" }}>
            <button onClick={() => setSickwExpanded(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, color: "#1D4ED8", fontFamily: "inherit" }}>
              {sickwExpanded ? "▲ ซ่อนรายงาน" : "▼ ดูรายงาน"}
            </button>
            {sickwExpanded && (
              <pre style={{ margin: "6px 0 0", padding: "8px 10px", borderRadius: 6, background: "#F1F5F9", fontSize: 10, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", color: "#1E293B" }}>{sickwRaw}</pre>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Warranty + Battery Cycles (admin-only) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20, marginTop: 10 }}>
        <div>
          <label style={{ color: TEXT2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 6 }}>
            วันหมดประกัน
          </label>
          {/* Quick-select chips */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => setWarrantyExpiry("expired")}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", border: "none",
                background: warrantyExpiry === "expired" ? "#FEE2E2" : "#F5F5F7",
                color: warrantyExpiry === "expired" ? "#DC2626" : TEXT2,
                outline: warrantyExpiry === "expired" ? "1.5px solid #DC2626" : "none",
              }}
            >
              หมดแล้ว
            </button>
            <button
              type="button"
              onClick={() => { if (warrantyExpiry === "expired") setWarrantyExpiry(""); }}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", border: "none",
                background: warrantyExpiry && warrantyExpiry !== "expired" ? "#D1FAE5" : "#F5F5F7",
                color: warrantyExpiry && warrantyExpiry !== "expired" ? "#059669" : TEXT2,
                outline: warrantyExpiry && warrantyExpiry !== "expired" ? "1.5px solid #059669" : "none",
              }}
            >
              ระบุวันที่
            </button>
          </div>
          {warrantyExpiry === "expired" ? (
            <div style={{ padding: "8px 12px", borderRadius: 10, background: "#FEE2E2", border: "1px solid #FECACA", fontSize: 12, color: "#DC2626", fontWeight: 600 }}>
              ✗ ประกันสิ้นสุดแล้ว
            </div>
          ) : (
            <input
              type="date"
              value={warrantyExpiry}
              onChange={e => setWarrantyExpiry(e.target.value)}
              style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }}
            />
          )}
          {warrantyExpiry && warrantyExpiry !== "expired" && (() => {
            const exp = new Date(warrantyExpiry + "T00:00:00");
            const diffDays = Math.ceil((exp.getTime() - Date.now()) / 86400000);
            return (
              <p style={{ fontSize: 11, color: diffDays < 0 ? "#DC2626" : "#059669", margin: "4px 0 0", fontWeight: 600 }}>
                {diffDays < 0 ? `หมดประกันแล้ว ${Math.abs(diffDays)} วัน` : `เหลือ ${diffDays} วัน`}
              </p>
            );
          })()}
        </div>
        <div>
          {showCycles && (
            <>
              <label style={{ color: TEXT2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
                รอบชาร์จ (Battery Cycles)
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={9999}
                placeholder="เช่น 120"
                value={batteryCycles}
                onChange={e => setBatteryCycles(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }}
              />
              {batteryCycles && (
                <p style={{ fontSize: 11, color: Number(batteryCycles) > 500 ? "#F97316" : TEXT2, margin: "4px 0 0" }}>
                  {Number(batteryCycles) > 500 ? "⚠ รอบชาร์จสูง" : "รอบชาร์จปกติ"}
                </p>
              )}
            </>
          )}
          {showHealth && (
            <>
              <label style={{ color: TEXT2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
                สุขภาพแบต (%)
              </label>
              <div style={{ position: "relative" as const }}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  placeholder="เช่น 85"
                  value={batteryHealth}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 3);
                    if (!v || Number(v) <= 100) setBatteryHealth(v);
                  }}
                  style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 32px 9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }}
                />
                <span style={{ position: "absolute" as const, right: 12, top: "50%", transform: "translateY(-50%)", color: TEXT3, fontSize: 13, pointerEvents: "none" as const }}>%</span>
              </div>
              {batteryHealth && (
                <p style={{ fontSize: 11, color: Number(batteryHealth) < 80 ? "#F97316" : "#059669", margin: "4px 0 0", fontWeight: 600 }}>
                  {Number(batteryHealth) < 80 ? "⚠ แบตเตอรี่เสื่อม" : "สุขภาพแบตดี"}
                </p>
              )}
            </>
          )}
          {!showCycles && !showHealth && (
            <>
              <label style={{ color: TEXT2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>
                สุขภาพแบต / รอบชาร์จ
              </label>
              <input
                type="text"
                placeholder="เช่น 85% หรือ 120 รอบ"
                value={batteryHealth || batteryCycles}
                onChange={e => setBatteryHealth(e.target.value)}
                style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }}
              />
            </>
          )}
        </div>
      </div>

      {/* Quick status banner */}
      <div style={{ marginBottom: 16, padding: "10px 14px", background: allPass && !priceChanged ? "#F0FFF4" : "#FFFBEB", borderRadius: 12, border: `1px solid ${allPass && !priceChanged ? "#BBF7D0" : "#FDE68A"}` }}>
        <p style={{ color: allPass && !priceChanged ? "#065F46" : "#92400E", fontSize: 13, fontWeight: 600, margin: 0 }}>
          {allPass && !priceChanged ? "✅ สภาพตรงตามที่ลูกค้าแจ้งทุกรายการ" : "⚠️ มีรายการที่ไม่ตรงหรือราคาถูกปรับ"}
        </p>
      </div>

      {/* ── Criteria ─────────────────────────────────────────────────────────── */}
      {sectionLabel("เปรียบเทียบสภาพเครื่อง")}

      {criteria.length === 0 && (
        <p style={{ color: TEXT3, fontSize: 13, marginBottom: 12 }}>กด "+ เพิ่มรายการ" เพื่อเพิ่มรายการตรวจ</p>
      )}

      {criteria.map(row => (
        <div key={row._key} style={{ background: "#F5F5F7", borderRadius: 12, padding: 12, marginBottom: 8, border: `1px solid ${row.pass ? BORDER : "#FECACA"}`, position: "relative" }}>
          <button onClick={() => removeRow(row._key)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: TEXT3, cursor: "pointer", padding: 0, display: "flex" }}>
            <X size={14} />
          </button>

          <input
            value={row.label}
            onChange={e => updateRow(row._key, { label: e.target.value })}
            placeholder="รายการ เช่น หน้าจอ"
            style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${BORDER}`, padding: "2px 24px 6px 0", color: TEXT, fontSize: 13, fontWeight: 600, outline: "none", marginBottom: 8, boxSizing: "border-box" as const }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div>
              <p style={{ color: TEXT3, fontSize: 10, margin: "0 0 3px", fontWeight: 600 }}>ลูกค้าแจ้ง</p>
              <input
                value={row.stated}
                onChange={e => updateRow(row._key, { stated: e.target.value })}
                placeholder="—"
                style={{ width: "100%", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "4px 8px", color: TEXT2, fontSize: 13, outline: "none", boxSizing: "border-box" as const }}
              />
            </div>
            <div>
              <p style={{ color: TEXT3, fontSize: 10, margin: "0 0 3px", fontWeight: 600 }}>ตรวจจริง</p>
              <input
                value={row.actual}
                onChange={e => updateRow(row._key, { actual: e.target.value })}
                placeholder="กรอกผล"
                style={{ width: "100%", background: "#fff", border: `1px solid ${row.pass ? BORDER : "#FECACA"}`, borderRadius: 6, padding: "4px 8px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const }}
              />
            </div>
          </div>

          <button
            onClick={() => updateRow(row._key, { pass: !row.pass })}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: row.pass ? "#D1FAE5" : "#FEE2E2", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: row.pass ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600, touchAction: "manipulation" }}
          >
            {row.pass ? <><Check size={12} />ผ่าน</> : <><AlertCircle size={12} />ไม่ผ่าน</>}
          </button>
        </div>
      ))}

      <button
        onClick={addRow}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${BORDER}`, borderRadius: 10, padding: "8px 14px", color: TEXT2, fontSize: 13, cursor: "pointer", width: "100%", justifyContent: "center", marginBottom: 20, touchAction: "manipulation", fontFamily: "inherit" }}
      >
        <Plus size={14} /> เพิ่มรายการ
      </button>

      {/* ── Functional tests ─────────────────────────────────────────────────── */}
      {sectionLabel("ทดสอบการใช้งานภายใน")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 20 }}>
        {functionalTests.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setFunctionalTests(prev => prev.map((item, idx) => idx === i ? { ...item, pass: !item.pass } : item))}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
              background: t.pass ? "#F0FFF4" : "#FEF2F2",
              border: `1px solid ${t.pass ? "#BBF7D0" : "#FECACA"}`,
              borderRadius: 10, padding: "8px 10px",
              color: t.pass ? "#065F46" : "#991B1B",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              textAlign: "left", touchAction: "manipulation", fontFamily: "inherit",
            }}
          >
            <span style={{ flex: 1, lineHeight: 1.3 }}>{t.label}</span>
            <span style={{ flexShrink: 0, fontSize: 14 }}>{t.pass ? <Check size={14} /> : <AlertCircle size={14} />}</span>
          </button>
        ))}
      </div>

      {/* ── Issues ───────────────────────────────────────────────────────────── */}
      {sectionLabel("ปัญหาเพิ่มเติม")}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {ISSUE_LIST.map(issue => {
          const checked = issues.includes(issue);
          return (
            <label key={issue} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", background: checked ? "#FEF3C7" : "#F5F5F7", borderRadius: 10, border: `1px solid ${checked ? "rgba(184,134,11,0.3)" : BORDER}`, touchAction: "manipulation" }}>
              <input type="checkbox" checked={checked} onChange={() => toggleIssue(issue)} style={{ accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }} />
              <span style={{ color: TEXT, fontSize: 13 }}>{issue}</span>
            </label>
          );
        })}
      </div>

      {/* Custom issues */}
      <div style={{ display: "flex", gap: 8, marginBottom: issues.filter(i => !ISSUE_LIST.includes(i)).length ? 8 : 20 }}>
        <input
          value={customIssue}
          onChange={e => setCustomIssue(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomIssue(); } }}
          placeholder="ปัญหาอื่นๆ (กด Enter เพื่อเพิ่ม)"
          style={{ flex: 1, background: "#F5F5F7", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", color: TEXT, fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
        <button onClick={addCustomIssue} style={{ background: GOLD, border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit" }}>
          เพิ่ม
        </button>
      </div>

      {/* Custom issue tags */}
      {issues.filter(i => !ISSUE_LIST.includes(i)).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 20 }}>
          {issues.filter(i => !ISSUE_LIST.includes(i)).map(issue => (
            <span key={issue} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#FEF3C7", border: "1px solid rgba(184,134,11,0.3)", borderRadius: 8, padding: "3px 8px", fontSize: 12, color: "#92400E" }}>
              {issue}
              <button onClick={() => setIssues(prev => prev.filter(i => i !== issue))} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#92400E", display: "flex", lineHeight: 1 }}>
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Photos ───────────────────────────────────────────────────────────── */}
      {sectionLabel("รูปภาพหลักฐาน")}

      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
          {photos.map(url => (
            <div key={url} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => removePhoto(url)}
                disabled={photoSaving}
                style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: photoSaving ? "not-allowed" : "pointer", color: "#fff", padding: 0 }}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadErr && <p style={{ color: "#DC2626", fontSize: 12, marginBottom: 8 }}>{uploadErr}</p>}

      <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "#F5F5F7", border: `1px dashed ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT2, fontSize: 13, cursor: "pointer", justifyContent: "center", touchAction: "manipulation", fontFamily: "inherit", opacity: uploading ? 0.6 : 1 }}
        >
          <Camera size={16} />
          {uploading ? "กำลังอัพโหลด..." : "อัพโหลดรูปภาพ"}
        </button>
        {photos.length > 0 && (
          <button
            onClick={async () => {
              setPhotoSaving(true);
              const result = await saveInspectionPhotos(requestId, photos);
              setPhotoSaving(false);
              if (!result.success) setUploadErr("บันทึกรูปไม่สำเร็จ");
              else setPhotoSaved(true);
            }}
            disabled={photoSaving || uploading}
            style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: photoSaved ? "#D1FAE5" : GOLD, border: "none", borderRadius: 10, padding: "10px 16px", color: photoSaved ? "#065F46" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", opacity: (photoSaving || uploading) ? 0.6 : 1 }}
          >
            {photoSaving ? "กำลังบันทึก..." : photoSaved ? "✓ บันทึกแล้ว" : "บันทึกรูปภาพ"}
          </button>
        )}
      </div>

      {/* ── Price ────────────────────────────────────────────────────────────── */}
      {sectionLabel("ราคา")}

      <div style={{ background: "#F5F5F7", borderRadius: 12, padding: 14, marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ color: TEXT2, fontSize: 13 }}>ราคาประเมินเดิม</span>
          <span style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>฿{estimatedPrice.toLocaleString("th-TH")}</span>
        </div>

        <label style={{ color: TEXT2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>ราคาที่รับซื้อจริง (บาท)</label>
        <input
          type="number"
          value={actualPrice}
          onChange={e => setActualPrice(e.target.value)}
          style={{ width: "100%", background: "#fff", border: `1px solid ${priceChanged ? "rgba(184,134,11,0.6)" : BORDER}`, borderRadius: 10, padding: "9px 12px", color: priceChanged ? GOLD : TEXT, fontSize: 15, fontWeight: priceChanged ? 700 : 400, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }}
        />

        {priceChanged && (
          <>
            <label style={{ color: TEXT2, fontSize: 12, fontWeight: 600, display: "block", margin: "10px 0 4px" }}>เหตุผลที่ปรับราคา</label>
            <input
              value={priceReason}
              onChange={e => setPriceReason(e.target.value)}
              placeholder="เช่น หน้าจอมีรอย + แบตต่ำกว่าที่แจ้ง"
              style={{ width: "100%", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }}
            />
          </>
        )}
      </div>

      {/* ── Extra device inspections ─────────────────────────────────────────── */}
      {extraStates.map((e, idx) => (
        <div key={idx} style={{ marginBottom: 24, borderTop: `2px solid ${GOLD}`, paddingTop: 20 }}>
          {sectionLabel(`เครื่องที่ ${idx + 2}: ${e.model} ${e.storage}`)}

          {/* Color */}
          {sectionLabel("สีตัวเครื่อง (ตรวจจริง)")}
          <input
            value={e.color}
            onChange={ev => patchExtra(idx, { color: ev.target.value })}
            placeholder="เช่น Midnight, Natural Titanium"
            style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, marginBottom: 20, fontFamily: "inherit" }}
          />

          {/* IMEI + Serial */}
          <div ref={el => { extraImeiRefs.current[idx] = el; }}>
          {sectionLabel("IMEI / Serial (ตรวจจริงหน้างาน) *")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 4 }}>
            <div>
              <label style={{ color: TEXT2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>IMEI <span style={{ color: "#EF4444" }}>*</span></label>
              <input value={e.imei}
                onChange={ev => patchExtra(idx, { imei: ev.target.value, imeiError: false })}
                placeholder="เช่น 356789123456789" maxLength={20}
                style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${e.imeiError ? "#EF4444" : BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "monospace" }} />
              {e.imeiError && <p style={{ color: "#EF4444", fontSize: 11, marginTop: 4 }}>กรุณากรอก IMEI</p>}
            </div>
            <div>
              <label style={{ color: TEXT2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>Serial Number <span style={{ color: "#EF4444" }}>*</span></label>
              <input value={e.serial}
                onChange={ev => patchExtra(idx, { serial: ev.target.value.toUpperCase(), serialError: false })}
                placeholder="เช่น F2LJH0X7XY" maxLength={20}
                style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${e.serialError ? "#EF4444" : BORDER}`, borderRadius: 10, padding: "9px 12px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "monospace" }} />
              {e.serialError && <p style={{ color: "#EF4444", fontSize: 11, marginTop: 4 }}>กรุณากรอก Serial Number</p>}
            </div>
          </div>
          </div>
          <div style={{ marginBottom: 20 }} />

          {/* Criteria */}
          {sectionLabel("เปรียบเทียบสภาพเครื่อง")}
          {e.criteria.map(row => (
            <div key={row._key} style={{ background: "#F5F5F7", borderRadius: 12, padding: 12, marginBottom: 8, border: `1px solid ${row.pass ? BORDER : "#FECACA"}`, position: "relative" }}>
              <button onClick={() => setExtraStates(prev => prev.map((s, i) => i === idx ? { ...s, criteria: s.criteria.filter(r => r._key !== row._key) } : s))}
                style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: TEXT3, cursor: "pointer", padding: 0, display: "flex" }}>
                <X size={14} />
              </button>
              <input value={row.label} onChange={ev => updateExtraCriteria(idx, row._key, { label: ev.target.value })} placeholder="รายการ"
                style={{ width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${BORDER}`, padding: "2px 24px 6px 0", color: TEXT, fontSize: 13, fontWeight: 600, outline: "none", marginBottom: 8, boxSizing: "border-box" as const }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <p style={{ color: TEXT3, fontSize: 10, margin: "0 0 3px", fontWeight: 600 }}>ลูกค้าแจ้ง</p>
                  <input value={row.stated} onChange={ev => updateExtraCriteria(idx, row._key, { stated: ev.target.value })} placeholder="—"
                    style={{ width: "100%", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "4px 8px", color: TEXT2, fontSize: 13, outline: "none", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <p style={{ color: TEXT3, fontSize: 10, margin: "0 0 3px", fontWeight: 600 }}>ตรวจจริง</p>
                  <input value={row.actual} onChange={ev => updateExtraCriteria(idx, row._key, { actual: ev.target.value })} placeholder="กรอกผล"
                    style={{ width: "100%", background: "#fff", border: `1px solid ${row.pass ? BORDER : "#FECACA"}`, borderRadius: 6, padding: "4px 8px", color: TEXT, fontSize: 13, outline: "none", boxSizing: "border-box" as const }} />
                </div>
              </div>
              <button onClick={() => updateExtraCriteria(idx, row._key, { pass: !row.pass })}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: row.pass ? "#D1FAE5" : "#FEE2E2", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", color: row.pass ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 600, touchAction: "manipulation" }}>
                {row.pass ? <><Check size={12} />ผ่าน</> : <><AlertCircle size={12} />ไม่ผ่าน</>}
              </button>
            </div>
          ))}
          <button onClick={() => setExtraStates(prev => prev.map((s, i) => i === idx ? { ...s, criteria: [...s.criteria, { _key: String(Date.now()), label: "", stated: "", actual: "", pass: true }] } : s))}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${BORDER}`, borderRadius: 10, padding: "8px 14px", color: TEXT2, fontSize: 13, cursor: "pointer", width: "100%", justifyContent: "center", marginBottom: 20, touchAction: "manipulation", fontFamily: "inherit" }}>
            <Plus size={14} /> เพิ่มรายการ
          </button>

          {/* Functional tests */}
          {sectionLabel("ทดสอบการใช้งานภายใน")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 20 }}>
            {e.functionalTests.map((t, ti) => (
              <button key={t.label} onClick={() => setExtraStates(prev => prev.map((s, i) => i === idx ? { ...s, functionalTests: s.functionalTests.map((f, fi) => fi === ti ? { ...f, pass: !f.pass } : f) } : s))}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, background: t.pass ? "#F0FFF4" : "#FEF2F2", border: `1px solid ${t.pass ? "#BBF7D0" : "#FECACA"}`, borderRadius: 10, padding: "8px 10px", color: t.pass ? "#065F46" : "#991B1B", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", touchAction: "manipulation", fontFamily: "inherit" }}>
                <span style={{ flex: 1, lineHeight: 1.3 }}>{t.label}</span>
                <span style={{ flexShrink: 0 }}>{t.pass ? <Check size={14} /> : <AlertCircle size={14} />}</span>
              </button>
            ))}
          </div>

          {/* Issues */}
          {sectionLabel("ปัญหาเพิ่มเติม")}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {ISSUE_LIST.map(issue => {
              const checked = e.issues.includes(issue);
              return (
                <label key={issue} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", background: checked ? "#FEF3C7" : "#F5F5F7", borderRadius: 10, border: `1px solid ${checked ? "rgba(184,134,11,0.3)" : BORDER}`, touchAction: "manipulation" }}>
                  <input type="checkbox" checked={checked} onChange={() => patchExtra(idx, { issues: checked ? e.issues.filter(s => s !== issue) : [...e.issues, issue] })} style={{ accentColor: GOLD, width: 16, height: 16, flexShrink: 0 }} />
                  <span style={{ color: TEXT, fontSize: 13 }}>{issue}</span>
                </label>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input value={e.customIssue} onChange={ev => patchExtra(idx, { customIssue: ev.target.value })}
              onKeyDown={ev => { if (ev.key === "Enter") { ev.preventDefault(); if (e.customIssue.trim()) { patchExtra(idx, { issues: [...e.issues, e.customIssue.trim()], customIssue: "" }); } } }}
              placeholder="ปัญหาอื่นๆ (กด Enter เพื่อเพิ่ม)"
              style={{ flex: 1, background: "#F5F5F7", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", color: TEXT, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <button onClick={() => { if (e.customIssue.trim()) patchExtra(idx, { issues: [...e.issues, e.customIssue.trim()], customIssue: "" }); }}
              style={{ background: GOLD, border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit" }}>เพิ่ม</button>
          </div>

          {/* Photos */}
          {sectionLabel("รูปภาพหลักฐาน")}
          {e.photos.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
              {e.photos.map(url => (
                <div key={url} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => removeExtraPhoto(idx, url)}
                    style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", padding: 0 }}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input ref={el => { extraFileRefs.current[idx] = el; }} type="file" accept="image/*" multiple onChange={ev => handleExtraFiles(idx, ev)} style={{ display: "none" }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => extraFileRefs.current[idx]?.click()} disabled={e.uploading}
              style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "#F5F5F7", border: `1px dashed ${BORDER}`, borderRadius: 10, padding: "10px 14px", color: TEXT2, fontSize: 13, cursor: "pointer", justifyContent: "center", touchAction: "manipulation", fontFamily: "inherit", opacity: e.uploading ? 0.6 : 1 }}>
              <Camera size={16} />{e.uploading ? "กำลังอัพโหลด..." : "อัพโหลดรูปภาพ"}
            </button>
            {e.photos.length > 0 && (
              <button onClick={async () => { patchExtra(idx, { photoSaving: true }); await saveInspectionPhotos(requestId, e.photos); patchExtra(idx, { photoSaving: false, photoSaved: true }); }}
                disabled={e.photoSaving}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: e.photoSaved ? "#D1FAE5" : GOLD, border: "none", borderRadius: 10, padding: "10px 16px", color: e.photoSaved ? "#065F46" : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit" }}>
                {e.photoSaving ? "บันทึก..." : e.photoSaved ? "✓ บันทึกแล้ว" : "บันทึกรูป"}
              </button>
            )}
          </div>

          {/* Price */}
          {sectionLabel("ราคา")}
          <div style={{ background: "#F5F5F7", borderRadius: 12, padding: 14, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: TEXT2, fontSize: 13 }}>ราคาประเมินเดิม</span>
              <span style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>฿{e.originalPrice.toLocaleString("th-TH")}</span>
            </div>
            <label style={{ color: TEXT2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>ราคาที่รับซื้อจริง (บาท)</label>
            <input type="number" value={e.actualPrice}
              onChange={ev => patchExtra(idx, { actualPrice: ev.target.value })}
              style={{ width: "100%", background: "#fff", border: `1px solid ${Number(e.actualPrice) !== e.originalPrice ? "rgba(184,134,11,0.6)" : BORDER}`, borderRadius: 10, padding: "9px 12px", color: Number(e.actualPrice) !== e.originalPrice ? GOLD : TEXT, fontSize: 15, fontWeight: Number(e.actualPrice) !== e.originalPrice ? 700 : 400, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" }} />
          </div>
        </div>
      ))}

      {/* ── Action buttons ────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {(allPass && !priceChanged) ? (
          requireCustomerConfirm ? (
            <button
              onClick={() => handleSubmit("price_negotiation")}
              disabled={saving}
              style={{ background: GOLD, border: "none", borderRadius: 12, padding: 14, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "กำลังบันทึก..." : "📨 บันทึก — ส่งให้ลูกค้ายืนยันราคา"}
            </button>
          ) : (
            <button
              onClick={() => handleSubmit("contracting")}
              disabled={saving}
              style={{ background: "#065F46", border: "none", borderRadius: 12, padding: 14, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "กำลังบันทึก..." : "✅ บันทึก — สภาพตรงทุกรายการ"}
            </button>
          )
        ) : (
          <button
            onClick={() => handleSubmit("price_negotiation")}
            disabled={saving || !actualPrice}
            style={{ background: GOLD, border: "none", borderRadius: 12, padding: 14, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", opacity: (saving || !actualPrice) ? 0.6 : 1 }}
          >
            {saving ? "กำลังบันทึก..." : "⚠️ บันทึก — เสนอราคาใหม่ให้ลูกค้า"}
          </button>
        )}

        <button
          onClick={() => handleSubmit("rejected")}
          disabled={saving}
          style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 12, color: "#DC2626", fontSize: 14, fontWeight: 600, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
        >
          ❌ ปฏิเสธคำขอ
        </button>
      </div>
    </div>
  );
}
