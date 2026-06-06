"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { fetchRankConfigs, updateRankConfig } from "@/app/actions/rider-stats";
import type { RankConfig, RiderTier } from "@/app/actions/rider-stats";

const DARK = "#1a1a2e";
const GOLD = "#c9a84c";
const BORDER = "#e5e7eb";
const TEXT = "#1a1a1a";
const TEXT2 = "#6b7280";
const GREEN = "#16a34a";
const RED = "#dc2626";

const TIER_META: Record<RiderTier, { emoji: string; color: string }> = {
  bronze:  { emoji: "🥉", color: "#cd7f32" },
  silver:  { emoji: "🥈", color: "#9ca3af" },
  gold:    { emoji: "🥇", color: "#c9a84c" },
  diamond: { emoji: "💎", color: "#60a5fa" },
};

const TIER_ORDER: RiderTier[] = ["bronze", "silver", "gold", "diamond"];

type EditState = Record<RiderTier, {
  min_jobs_month: string;
  commission_rate: string;
  fuel_rate_per_km: string;
  bonus_multiplier: string;
  job_target_reduction: string;
}>;

function makeEdit(configs: RankConfig[]): EditState {
  const out = {} as EditState;
  for (const c of configs) {
    out[c.tier] = {
      min_jobs_month:       String(c.min_jobs_month),
      commission_rate:      String(Math.round(c.commission_rate * 100)),
      fuel_rate_per_km:     String(c.fuel_rate_per_km),
      bonus_multiplier:     String(c.bonus_multiplier),
      job_target_reduction: String(c.job_target_reduction),
    };
  }
  return out;
}

export default function RankConfigPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<RankConfig[]>([]);
  const [edit, setEdit]       = useState<EditState | null>(null);
  const [saving, setSaving]   = useState<RiderTier | null>(null);
  const [saved, setSaved]     = useState<RiderTier | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await fetchRankConfigs();
    setConfigs(data);
    setEdit(makeEdit(data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(tier: RiderTier) {
    if (!edit) return;
    const e = edit[tier];
    setSaving(tier);
    const res = await updateRankConfig(tier, {
      min_jobs_month:       Number(e.min_jobs_month) || 0,
      commission_rate:      (Number(e.commission_rate) || 0) / 100,
      fuel_rate_per_km:     Number(e.fuel_rate_per_km) || 0,
      bonus_multiplier:     Number(e.bonus_multiplier) || 1,
      job_target_reduction: Number(e.job_target_reduction) || 0,
    });
    setSaving(null);
    if (res.success) {
      setSaved(tier);
      setTimeout(() => setSaved(null), 2000);
      load();
    } else {
      alert(res.error);
    }
  }

  function setField(tier: RiderTier, field: keyof EditState[RiderTier], value: string) {
    setEdit(prev => prev ? { ...prev, [tier]: { ...prev[tier], [field]: value } } : prev);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      <div style={{ background: DARK, padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, color: GOLD, fontSize: 18, fontWeight: 800 }}>ตั้งค่าระดับไรเดอร์</h1>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.5)" }}>แรงค์รีเซ็ตทุกเดือน · แรงค์เดือนนี้ส่งต่อเดือนหน้า</p>
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: TEXT2 }}>กำลังโหลด...</div>
        ) : TIER_ORDER.map(tier => {
          const meta = TIER_META[tier];
          const e    = edit?.[tier];
          if (!e) return null;
          const cfg  = configs.find(c => c.tier === tier);
          const isSaving = saving === tier;
          const isSaved  = saved  === tier;
          return (
            <div key={tier} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>{meta.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: meta.color }}>{cfg?.label_th ?? tier}</p>
                  <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>ต้องการ ≥ {e.min_jobs_month} งาน/เดือน</p>
                </div>
                <button
                  onClick={() => handleSave(tier)}
                  disabled={isSaving}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none", background: isSaved ? GREEN : DARK, color: isSaved ? "#fff" : GOLD, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: isSaving ? 0.6 : 1 }}
                >
                  <Save size={13} /> {isSaving ? "กำลังบันทึก..." : isSaved ? "บันทึกแล้ว ✓" : "บันทึก"}
                </button>
              </div>

              {/* Fields */}
              <div style={{ padding: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { label: "งานขั้นต่ำ/เดือน", field: "min_jobs_month" as const, suffix: "งาน", hint: "เพื่อได้แรงค์นี้" },
                  { label: "Commission", field: "commission_rate" as const, suffix: "%", hint: "จากมูลค่าสินค้า" },
                  { label: "ค่าน้ำมัน", field: "fuel_rate_per_km" as const, suffix: "฿/กม.", hint: "ต่อกิโลเมตร" },
                  { label: "โบนัส Multiplier", field: "bonus_multiplier" as const, suffix: "×", hint: "คูณโบนัสรายเดือน" },
                  { label: "ลดเป้าหมาย", field: "job_target_reduction" as const, suffix: "งาน", hint: "ลดเป้างานต่อเดือน" },
                ].map(({ label, field, suffix, hint }) => (
                  <div key={field}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: TEXT2, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number"
                        value={e[field]}
                        onChange={ev => setField(tier, field, ev.target.value)}
                        style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 14, fontFamily: "inherit", outline: "none", color: TEXT }}
                      />
                      <span style={{ fontSize: 12, color: TEXT2, whiteSpace: "nowrap" }}>{suffix}</span>
                    </div>
                    <p style={{ margin: "3px 0 0", fontSize: 10, color: TEXT2 }}>{hint}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ padding: "14px 18px", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14 }}>
          <p style={{ margin: 0, fontSize: 12, color: TEXT2, lineHeight: 1.7 }}>
            <strong style={{ color: TEXT }}>วิธีทำงาน:</strong> แรงค์คำนวณจากจำนวนงานสำเร็จในเดือนปัจจุบัน
            แรงค์ที่ได้จะส่งต่อเป็นแรงค์ตั้งต้นของเดือนหน้า
            ถ้าเดือนหน้าทำไม่ถึง threshold แรงค์จะลดลงตามผลงานจริง
          </p>
        </div>
      </div>
    </div>
  );
}
