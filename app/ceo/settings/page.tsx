"use client";

import { useEffect, useState } from "react";
import { getCeoSettings, saveCeoSettings, type CeoSettings } from "@/app/actions/ceo";
import { PageTitle, Card, Loading, GOLD } from "../ui";

const FIELDS: { key: keyof CeoSettings; label: string; hint?: string }[] = [
  { key: "targetRevenue",  label: "เป้ารายได้ / เดือน (บาท)" },
  { key: "targetProfit",   label: "เป้ากำไรขั้นต้น / เดือน (บาท)" },
  { key: "targetAcquired", label: "เป้าจำนวนเครื่องรับซื้อ / เดือน" },
  { key: "targetSold",     label: "เป้าจำนวนเครื่องขาย / เดือน" },
  { key: "adsBudget",      label: "งบโฆษณา / เดือน (บาท)" },
  { key: "adSpend",        label: "ยอดใช้จ่ายโฆษณาจริงเดือนนี้ (บาท)", hint: "กรอกเอง — ระบบยังไม่เชื่อม Google/Facebook Ads" },
  { key: "safeBuffer",     label: "เงินกันชนที่ต้องเหลือ (บาท)", hint: "เงินขั้นต่ำที่ต้องคงไว้ ไม่นำไปซื้อของ" },
];

export default function CeoSettingsPage() {
  const [s, setS] = useState<CeoSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getCeoSettings().then(setS).catch(() => {}); }, []);

  async function save() {
    if (!s) return;
    setSaving(true); setSaved(false);
    const r = await saveCeoSettings(s);
    setSaving(false);
    if (r.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  if (!s) return <><PageTitle title="ตั้งค่า" /><Loading /></>;

  return (
    <>
      <PageTitle title="ตั้งค่า" sub="กำหนดเป้าหมายเดือน · งบโฆษณา · เงินกันชน — ใช้คำนวณทุกหน้าใน Mission Control" />
      <Card style={{ maxWidth: 520 }}>
        {FIELDS.map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{f.label}</label>
            <input
              type="number"
              value={s[f.key] || ""}
              onChange={e => setS({ ...s, [f.key]: Number(e.target.value) || 0 })}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #e0e0e4", fontSize: 14, fontFamily: "inherit", outline: "none" }}
            />
            {f.hint && <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#9ca3af" }}>{f.hint}</p>}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <button onClick={save} disabled={saving}
            style={{ padding: "11px 22px", borderRadius: 10, background: saving ? "#9ca3af" : GOLD, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "inherit" }}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          {saved && <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 600 }}>✓ บันทึกแล้ว</span>}
        </div>
      </Card>
    </>
  );
}
