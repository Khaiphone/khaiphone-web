"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchRiderJob, riderSaveInspection } from "@/app/actions/rider";
import type { AdminRequest } from "@/lib/types/admin";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const BORDER = "#2C2C2E";
const ACCENT = "#4ADE80";
const GREEN  = "#30D158";
const RED    = "#FF453A";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

const DEFAULT_CRITERIA = [
  "หน้าจอ (รอยขีดข่วน / จอแตก)",
  "กรอบ / ขอบเครื่อง",
  "ฝาหลัง / เคส",
  "กล้องหน้า / กล้องหลัง",
  "ลำโพง / ไมโครโฟน",
  "ปุ่มกด (Home / Volume / Power)",
  "ช่องชาร์จ",
  "Face ID / Touch ID",
];

const FUNCTIONAL_TESTS = [
  "โทรออก / รับสายได้",
  "Wi-Fi เชื่อมต่อได้",
  "Bluetooth เชื่อมต่อได้",
  "GPS / Location ทำงาน",
  "กล้องถ่ายรูปได้",
  "ชาร์จแบตได้",
];

async function uploadPhoto(file: File, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("inspection-photos")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from("inspection-photos").getPublicUrl(data.path);
  return publicUrl;
}

function PhotoBox({ label, url, onCapture, required }: { label: string; url?: string; onCapture: (file: File) => void; required?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: 13, color: TEXT2 }}>
        {label}{required && <span style={{ color: RED }}> *</span>}
      </p>
      <button onClick={() => ref.current?.click()} style={{
        width: "100%", aspectRatio: "16/9", background: CARD, border: `1.5px dashed ${url ? ACCENT : BORDER}`,
        borderRadius: 12, cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Camera size={28} color={TEXT2} />
            <span style={{ fontSize: 12, color: TEXT2 }}>แตะเพื่อถ่ายรูป</span>
          </div>
        )}
      </button>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onCapture(f); }} />
    </div>
  );
}

function CheckRow({ label, pass, onToggle }: { label: string; pass: boolean | null; onToggle: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
      <span style={{ fontSize: 14, color: TEXT, flex: 1 }}>{label}</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onToggle(true)} style={{
          padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
          background: pass === true ? "rgba(48,209,88,0.2)" : CARD,
          color: pass === true ? GREEN : TEXT2, fontWeight: 600, fontSize: 13,
        }}>ปกติ</button>
        <button onClick={() => onToggle(false)} style={{
          padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit",
          background: pass === false ? "rgba(255,69,58,0.2)" : CARD,
          color: pass === false ? RED : TEXT2, fontWeight: 600, fontSize: 13,
        }}>มีปัญหา</button>
      </div>
    </div>
  );
}

export default function InspectPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [job, setJob] = useState<AdminRequest | null>(null);

  // Photos
  const [idCardPhotoUrl, setIdCardPhotoUrl]     = useState<string>();
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string>();
  const [uploading, setUploading] = useState(false);

  // Device info
  const [imei, setImei]             = useState("");
  const [serial, setSerial]         = useState("");
  const [battery, setBattery]       = useState("");
  const [warrantyExpiry, setWarranty] = useState("");

  // Checklists
  const [criteria, setCriteria]     = useState<Record<string, boolean | null>>(
    Object.fromEntries(DEFAULT_CRITERIA.map(k => [k, null]))
  );
  const [functional, setFunctional] = useState<Record<string, boolean | null>>(
    Object.fromEntries(FUNCTIONAL_TESTS.map(k => [k, null]))
  );

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => { fetchRiderJob(id).then(setJob); }, [id]);

  async function handlePhoto(type: "id" | "delivery", file: File) {
    setUploading(true);
    try {
      const ts   = Date.now();
      const path = `rider/${id}/${type}-${ts}.jpg`;
      const url  = await uploadPhoto(file, path);
      if (type === "id")       setIdCardPhotoUrl(url);
      if (type === "delivery") setDeliveryPhotoUrl(url);
    } catch (e) {
      setError("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!idCardPhotoUrl)    { setError("กรุณาถ่ายรูปบัตรปชช + เครื่อง"); return; }
    if (!deliveryPhotoUrl)  { setError("กรุณาถ่ายรูปส่งมอบเครื่อง"); return; }

    setSaving(true);
    setError("");

    const criteriaArr = DEFAULT_CRITERIA.map(label => ({
      label, stated: "", actual: "", pass: criteria[label] ?? true,
    }));
    const functionalArr = FUNCTIONAL_TESTS.map(label => ({
      label, pass: functional[label] ?? true,
    }));

    const result = await riderSaveInspection(id, {
      imei,
      serial,
      batteryHealth: battery ? parseInt(battery) : undefined,
      warrantyExpiry: warrantyExpiry || undefined,
      criteria: criteriaArr,
      functionalTests: functionalArr,
      photos: [idCardPhotoUrl, deliveryPhotoUrl].filter(Boolean) as string[],
      idCardPhotoUrl,
      deliveryPhotoUrl,
    });

    if (!result.success) { setError(result.error ?? "เกิดข้อผิดพลาด"); setSaving(false); return; }
    router.push(`/rider/job/${id}/price`);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={22} />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>ตรวจเครื่อง</p>
          <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job?.device.model} {job?.device.storage}</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Photos */}
        <section>
          <p style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: 0.5 }}>รูปถ่ายหลักฐาน</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <PhotoBox label="บัตรประชาชนคู่กับเครื่องที่ขาย" url={idCardPhotoUrl} onCapture={f => handlePhoto("id", f)} required />
            <PhotoBox label="ส่งมอบเครื่อง (ลูกค้าถือเครื่อง)" url={deliveryPhotoUrl} onCapture={f => handlePhoto("delivery", f)} required />
          </div>
        </section>

        {/* Device info */}
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

        {/* Condition checklist */}
        <section>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: 0.5 }}>สภาพเครื่อง</p>
          <div style={{ background: CARD, borderRadius: 14, padding: "0 16px" }}>
            {DEFAULT_CRITERIA.map(label => (
              <CheckRow key={label} label={label} pass={criteria[label]} onToggle={v => setCriteria(p => ({ ...p, [label]: v }))} />
            ))}
          </div>
        </section>

        {/* Functional tests */}
        <section>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: TEXT, textTransform: "uppercase", letterSpacing: 0.5 }}>ทดสอบการทำงาน</p>
          <div style={{ background: CARD, borderRadius: 14, padding: "0 16px" }}>
            {FUNCTIONAL_TESTS.map(label => (
              <CheckRow key={label} label={label} pass={functional[label]} onToggle={v => setFunctional(p => ({ ...p, [label]: v }))} />
            ))}
          </div>
        </section>

        {error && (
          <div style={{ background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.3)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontSize: 13, color: RED }}>{error}</p>
          </div>
        )}
      </div>

      {/* Save button */}
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
