"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchRiderJob, riderSaveInspection } from "@/app/actions/rider";
import { useRiderTheme } from "@/app/rider/theme";
import type { AdminRequest, InspectionCriterion, FunctionalTest } from "@/lib/types/admin";

const INSPECT_KEYS = ["body", "screen", "display", "battery", "warranty", "icloud"] as const;
const INSPECT_LABELS: Record<string, string> = {
  body:     "สภาพตัวเครื่องภายนอก",
  screen:   "หน้าจอ",
  display:  "การแสดงผล",
  battery:  "แบตเตอรี่",
  warranty: "การรับประกัน",
  icloud:   "iCloud",
};

const FUNCTIONAL_TEST_DEFAULTS: FunctionalTest[] = [
  { label: "Face ID / Touch ID",         pass: true },
  { label: "กล้องหลัง (ถ่ายภาพ/วิดีโอ)", pass: true },
  { label: "กล้องหน้า (Selfie)",          pass: true },
  { label: "ลำโพง (Speaker)",             pass: true },
  { label: "ไมโครโฟน",                   pass: true },
  { label: "Wi-Fi",                       pass: true },
  { label: "Cellular / SIM",             pass: true },
  { label: "Bluetooth",                  pass: true },
  { label: "GPS",                        pass: true },
  { label: "Haptic / Vibration",         pass: true },
  { label: "ชาร์จพอร์ต",                 pass: true },
  { label: "ปุ่มด้านข้าง / Volume",       pass: true },
];

async function uploadPhoto(file: File, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("inspection-photos")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("inspection-photos").getPublicUrl(data.path);
  return publicUrl;
}

type IC = { CARD: string; CARD2: string; BORDER: string; ACCENT: string; GREEN: string; RED: string; TEXT: string; TEXT2: string };

function PhotoBox({ label, url, onCapture, required, c }: {
  label: string; url?: string; onCapture: (file: File) => void; required?: boolean; c: IC;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: c.TEXT2 }}>
        {label}{required && <span style={{ color: c.RED }}> *</span>}
      </p>
      <button onClick={() => ref.current?.click()} style={{
        width: "100%", aspectRatio: "16/9", background: c.CARD, border: `1.5px dashed ${url ? c.ACCENT : c.BORDER}`,
        borderRadius: 12, cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Camera size={28} color={c.TEXT2} />
            <span style={{ fontSize: 12, color: c.TEXT2 }}>แตะเพื่อถ่ายรูป</span>
          </div>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onCapture(f); }} />
    </div>
  );
}

function CompareRow({ label, stated, actual, onActualChange, c }: {
  label: string; stated: string; actual: string; onActualChange: (v: string) => void; c: IC;
}) {
  const pass = !stated || actual.trim().toLowerCase() === stated.trim().toLowerCase();
  return (
    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${c.BORDER}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: c.TEXT }}>{label}</span>
        {actual && (
          <span style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600,
            background: pass ? "rgba(48,209,88,0.15)" : "rgba(255,69,58,0.15)",
            color: pass ? c.GREEN : c.RED,
          }}>
            {pass ? "ตรงกัน" : "ไม่ตรง"}
          </span>
        )}
      </div>
      {stated && (
        <p style={{ margin: "0 0 8px", fontSize: 12, color: c.TEXT2 }}>
          ลูกค้าแจ้ง: <span style={{ color: c.TEXT, fontWeight: 500 }}>{stated}</span>
        </p>
      )}
      <input
        value={actual}
        onChange={e => onActualChange(e.target.value)}
        placeholder={stated || "กรอกสภาพจริง"}
        style={{
          width: "100%", background: c.CARD2, border: `1px solid ${c.BORDER}`,
          borderRadius: 8, color: c.TEXT, fontSize: 14, fontFamily: "inherit", outline: "none",
          padding: "8px 10px", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function CheckRow({ label, pass, onToggle, c }: { label: string; pass: boolean; onToggle: (v: boolean) => void; c: IC }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${c.BORDER}` }}>
      <span style={{ fontSize: 14, color: c.TEXT, flex: 1 }}>{label}</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onToggle(true)} style={{
          padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
          background: pass ? "rgba(48,209,88,0.2)" : c.CARD2,
          color: pass ? c.GREEN : c.TEXT2, fontWeight: 600, fontSize: 13,
        }}>ปกติ</button>
        <button onClick={() => onToggle(false)} style={{
          padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
          background: !pass ? "rgba(255,69,58,0.2)" : c.CARD2,
          color: !pass ? c.RED : c.TEXT2, fontWeight: 600, fontSize: 13,
        }}>มีปัญหา</button>
      </div>
    </div>
  );
}

export default function InspectPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { BG, CARD, CARD2, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2 } = useRiderTheme();
  const ic: IC = { CARD, CARD2, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2 };

  const [job, setJob] = useState<AdminRequest | null>(null);

  const [idCardPhotoUrl,   setIdCardPhotoUrl]   = useState<string>();
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string>();
  const [frontPhotoUrl,    setFrontPhotoUrl]    = useState<string>();
  const [backPhotoUrl,     setBackPhotoUrl]     = useState<string>();
  const [sidePhotoUrl,     setSidePhotoUrl]     = useState<string>();
  const [extraPhotoUrl,    setExtraPhotoUrl]    = useState<string>();
  const [uploading, setUploading] = useState(false);

  const [imei,          setImei]     = useState("");
  const [serial,        setSerial]   = useState("");
  const [battery,       setBattery]  = useState("");
  const [warrantyExpiry, setWarranty] = useState("");

  const [criteria, setCriteria] = useState<Record<string, { stated: string; actual: string }>>({});
  const [functional, setFunctional] = useState<FunctionalTest[]>(FUNCTIONAL_TEST_DEFAULTS.map(t => ({ ...t })));

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    fetchRiderJob(id).then(j => {
      setJob(j);
      if (j) {
        const sels = j.device.selections ?? {};
        const init: Record<string, { stated: string; actual: string }> = {};
        INSPECT_KEYS.forEach(k => {
          if (sels[k]) init[k] = { stated: sels[k], actual: sels[k] };
        });
        setCriteria(init);
      }
    });
  }, [id]);

  async function handlePhoto(type: "id" | "delivery" | "front" | "back" | "side" | "extra", file: File) {
    setUploading(true);
    try {
      const url = await uploadPhoto(file, `rider/${id}/${type}-${Date.now()}.jpg`);
      if (type === "id")       setIdCardPhotoUrl(url);
      if (type === "delivery") setDeliveryPhotoUrl(url);
      if (type === "front")    setFrontPhotoUrl(url);
      if (type === "back")     setBackPhotoUrl(url);
      if (type === "side")     setSidePhotoUrl(url);
      if (type === "extra")    setExtraPhotoUrl(url);
    } catch {
      setError("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!idCardPhotoUrl)   { setError("กรุณาถ่ายรูปบัตรปชช + เครื่อง"); return; }
    if (!deliveryPhotoUrl) { setError("กรุณาถ่ายรูปส่งมอบเครื่อง"); return; }
    if (!frontPhotoUrl)    { setError("กรุณาถ่ายรูปหน้าจอเครื่อง"); return; }
    if (!backPhotoUrl)     { setError("กรุณาถ่ายรูปด้านหลังเครื่อง"); return; }

    setSaving(true);
    setError("");

    const criteriaArr: InspectionCriterion[] = INSPECT_KEYS
      .filter(k => criteria[k])
      .map(k => ({
        label:  INSPECT_LABELS[k],
        stated: criteria[k].stated,
        actual: criteria[k].actual,
        pass:   !criteria[k].stated || criteria[k].actual.trim().toLowerCase() === criteria[k].stated.trim().toLowerCase(),
      }));

    const result = await riderSaveInspection(id, {
      imei,
      serial,
      batteryHealth:  battery ? parseInt(battery) : undefined,
      warrantyExpiry: warrantyExpiry || undefined,
      criteria:       criteriaArr,
      functionalTests: functional,
      photos: [idCardPhotoUrl, deliveryPhotoUrl, frontPhotoUrl, backPhotoUrl, sidePhotoUrl, extraPhotoUrl].filter(Boolean) as string[],
      idCardPhotoUrl,
      deliveryPhotoUrl,
    });

    if (!result.success) { setError(result.error ?? "เกิดข้อผิดพลาด"); setSaving(false); return; }
    router.push(`/rider/job/${id}/price`);
  }

  if (!job) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const hasCriteria = INSPECT_KEYS.some(k => criteria[k]);

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>ตรวจเครื่อง</p>
          <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job.device.model} {job.device.storage}</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>

        <section>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: 0.5 }}>รูปสภาพเครื่อง</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <PhotoBox label="หน้าจอ"            url={frontPhotoUrl}  onCapture={f => handlePhoto("front", f)}  required c={ic} />
            <PhotoBox label="ด้านหลัง"           url={backPhotoUrl}   onCapture={f => handlePhoto("back", f)}   required c={ic} />
            <PhotoBox label="ด้านข้าง / รอยต่างๆ" url={sidePhotoUrl}   onCapture={f => handlePhoto("side", f)}  c={ic} />
            <PhotoBox label="อื่นๆ"              url={extraPhotoUrl}  onCapture={f => handlePhoto("extra", f)} c={ic} />
          </div>
        </section>

        <section>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: 0.5 }}>รูปถ่ายหลักฐาน</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <PhotoBox label="บัตรประชาชนคู่กับเครื่องที่ขาย"    url={idCardPhotoUrl}   onCapture={f => handlePhoto("id", f)}       required c={ic} />
            <PhotoBox label="ส่งมอบเครื่อง (ลูกค้าถือเครื่อง)"  url={deliveryPhotoUrl} onCapture={f => handlePhoto("delivery", f)} required c={ic} />
          </div>
        </section>

        <section>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: 0.5 }}>ข้อมูลเครื่อง</p>
          <div style={{ background: CARD, borderRadius: 14, overflow: "hidden" }}>
            {[
              { label: "IMEI",           value: imei,           setter: setImei,     placeholder: "กรอก IMEI หรือ *#06#" },
              { label: "Serial Number",  value: serial,         setter: setSerial,   placeholder: "กรอก Serial" },
              { label: "Battery Health", value: battery,        setter: setBattery,  placeholder: "เช่น 87", suffix: "%" },
              { label: "ประกันหมด",      value: warrantyExpiry, setter: setWarranty, placeholder: "เช่น 2025-12-31" },
            ].map(({ label, value, setter, placeholder }, i, arr) => (
              <div key={label} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2 }}>{label}</p>
                <input
                  value={value}
                  onChange={e => setter(e.target.value)}
                  placeholder={placeholder}
                  style={{ width: "100%", background: "none", border: "none", color: TEXT, fontSize: 15, fontFamily: "inherit", outline: "none" }}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: 0.5 }}>สภาพเครื่อง</p>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: TEXT2 }}>เปรียบเทียบสิ่งที่ลูกค้าแจ้งกับสภาพจริง</p>
          <div style={{ background: CARD, borderRadius: 14, overflow: "hidden" }}>
            {hasCriteria ? (
              INSPECT_KEYS.filter(k => criteria[k]).map(k => (
                <CompareRow
                  key={k}
                  label={INSPECT_LABELS[k]}
                  stated={criteria[k].stated}
                  actual={criteria[k].actual}
                  onActualChange={v => setCriteria(p => ({ ...p, [k]: { ...p[k], actual: v } }))}
                  c={ic}
                />
              ))
            ) : (
              <p style={{ margin: 0, padding: "16px", fontSize: 13, color: TEXT2 }}>ลูกค้าไม่ได้ระบุสภาพเครื่องไว้</p>
            )}
          </div>
        </section>

        <section>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: 0.5 }}>ฟังก์ชันการใช้งาน</p>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: TEXT2 }}>กดที่แต่ละรายการหากมีปัญหา</p>
          <div style={{ background: CARD, borderRadius: 14, padding: "0 16px" }}>
            {functional.map((test, i) => (
              <CheckRow
                key={test.label}
                label={test.label}
                pass={test.pass}
                onToggle={v => setFunctional(prev => prev.map((t, j) => j === i ? { ...t, pass: v } : t))}
                c={ic}
              />
            ))}
          </div>
        </section>

        {error && (
          <div style={{ background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.3)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontSize: 13, color: RED }}>{error}</p>
          </div>
        )}
      </div>

      <div style={{ padding: "16px 20px", paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: BG, borderTop: `1px solid ${BORDER}` }}>
        <button onClick={handleSave} disabled={saving || uploading} style={{
          width: "100%", padding: 16, borderRadius: 14, background: ACCENT, border: "none",
          fontSize: 16, fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit",
          opacity: (saving || uploading) ? 0.6 : 1,
        }}>
          {uploading ? "กำลังอัปโหลดรูป..." : saving ? "กำลังบันทึก..." : "บันทึกและไปยืนยันราคา →"}
        </button>
      </div>
    </div>
  );
}
