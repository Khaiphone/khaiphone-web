"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, User, Phone, Briefcase, Calendar, FileText, Save, Loader2 } from "lucide-react";
import { fetchStaffProfile, updateStaffProfile } from "@/app/actions/admin-users";
import type { StaffProfile } from "@/app/actions/admin-users";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";
const GOLD   = "var(--admin-gold)";
const GREEN  = "#10B981";

const ROLE_LABEL: Record<string, string> = { owner: "เจ้าของ", staff: "พนักงาน" };

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ color: GOLD }}>{icon}</span>
        <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2 }}>{label}</label>
      </div>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "10px 12px", borderRadius: 10,
        border: `1px solid ${BORDER}`, background: BG,
        color: TEXT, fontSize: 14, outline: "none",
      }}
    />
  );
}

function Textarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "10px 12px", borderRadius: 10,
        border: `1px solid ${BORDER}`, background: BG,
        color: TEXT, fontSize: 14, outline: "none", resize: "vertical",
      }}
    />
  );
}

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading]  = useState(true);
  const [saving, setSaving]    = useState(false);
  const [saved, setSaved]      = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [name,      setName]      = useState("");
  const [phone,     setPhone]     = useState("");
  const [position,  setPosition]  = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [note,      setNote]      = useState("");

  useEffect(() => {
    fetchStaffProfile(id).then(p => {
      setLoading(false);
      if (!p) return;
      setProfile(p);
      setName(p.name ?? "");
      setPhone(p.phone ?? "");
      setPosition(p.position ?? "");
      setStartedAt(p.started_at ?? "");
      setNote(p.note ?? "");
    });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const res = await updateStaffProfile(id, {
      name:       name.trim()      || undefined,
      phone:      phone.trim()     || undefined,
      position:   position.trim()  || undefined,
      started_at: startedAt        || null,
      note:       note.trim()      || undefined,
    });
    setSaving(false);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setSaveError("บันทึกไม่สำเร็จ: " + res.error);
    }
  }

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} color={GOLD} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ background: BG, minHeight: "100vh", padding: 32, color: TEXT }}>
        ไม่พบข้อมูลพนักงาน
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", padding: "28px 20px", maxWidth: 600, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, padding: 4 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT }}>{profile.name}</h1>
          <p style={{ margin: 0, fontSize: 12, color: TEXT3 }}>{ROLE_LABEL[profile.role] ?? profile.role} · {profile.email}</p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20,
          background: profile.active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          color: profile.active ? GREEN : "#EF4444",
        }}>
          {profile.active ? "ใช้งานอยู่" : "ระงับแล้ว"}
        </span>
      </div>

      {saveError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#DC2626", fontWeight: 500 }}>{saveError}</p>
        </div>
      )}

      {/* Form */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 20px" }}>
        <p style={{ margin: "0 0 20px", fontSize: 13, fontWeight: 700, color: TEXT }}>ข้อมูลส่วนตัว</p>

        <Field label="ชื่อ-นามสกุล" icon={<User size={14} />}>
          <Input value={name} onChange={setName} placeholder="ชื่อ-นามสกุล" />
        </Field>

        <Field label="เบอร์โทรศัพท์" icon={<Phone size={14} />}>
          <Input value={phone} onChange={setPhone} placeholder="0812345678" type="tel" />
        </Field>

        <Field label="ตำแหน่ง" icon={<Briefcase size={14} />}>
          <Input value={position} onChange={setPosition} placeholder="เช่น ช่างซ่อม, แอดมิน" />
        </Field>

        <Field label="วันที่เริ่มงาน" icon={<Calendar size={14} />}>
          <Input value={startedAt} onChange={setStartedAt} type="date" />
        </Field>

        <Field label="หมายเหตุ" icon={<FileText size={14} />}>
          <Textarea value={note} onChange={setNote} placeholder="หมายเหตุเพิ่มเติม..." />
        </Field>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%", padding: "12px", borderRadius: 12,
            border: "none", cursor: saving ? "not-allowed" : "pointer",
            background: saved ? GREEN : GOLD,
            color: "#fff", fontWeight: 700, fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "background 0.2s",
          }}
        >
          {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
          {saved ? "บันทึกแล้ว ✓" : saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>

      {/* Meta info */}
      <p style={{ textAlign: "center", fontSize: 11, color: TEXT3, marginTop: 16 }}>
        เพิ่มเข้าระบบ {new Date(profile.created_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
