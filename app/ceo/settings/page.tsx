"use client";

import { useEffect, useState } from "react";
import { getCeoSettings, saveCeoSettings, fetchExpenseCategories, type CeoSettings } from "@/app/actions/ceo";
import { PageTitle, Card, Loading, GOLD } from "../ui";

const NUM_FIELDS: { key: keyof CeoSettings; label: string; hint?: string }[] = [
  { key: "targetRevenue",  label: "เป้ารายได้ / เดือน (บาท)" },
  { key: "targetProfit",   label: "เป้ากำไรขั้นต้น / เดือน (บาท)" },
  { key: "targetAcquired", label: "เป้าจำนวนเครื่องรับซื้อ / เดือน" },
  { key: "targetSold",     label: "เป้าจำนวนเครื่องขาย / เดือน" },
  { key: "adsBudget",      label: "งบโฆษณา / เดือน (บาท)" },
  { key: "safeBuffer",     label: "เงินกันชนที่ต้องเหลือ (บาท)", hint: "เงินขั้นต่ำที่ต้องคงไว้ ไม่นำไปซื้อของ" },
];

export default function CeoSettingsPage() {
  const [s, setS] = useState<CeoSettings | null>(null);
  const [cats, setCats] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getCeoSettings().then(setS).catch(() => {});
    fetchExpenseCategories().then(setCats).catch(() => {});
  }, []);

  async function save() {
    if (!s) return;
    setSaving(true); setSaved(false);
    const r = await saveCeoSettings(s);
    setSaving(false);
    if (r.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  if (!s) return <><PageTitle title="ตั้งค่า" /><Loading /></>;

  const inputSt: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid #e0e0e4", fontSize: 14, fontFamily: "inherit", outline: "none" };

  return (
    <>
      <PageTitle title="ตั้งค่า" sub="กำหนดเป้าหมายเดือน · งบโฆษณา · เงินกันชน — ใช้คำนวณทุกหน้าใน Mission Control" />
      <Card style={{ maxWidth: 540 }}>
        {NUM_FIELDS.map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{f.label}</label>
            <input type="number" value={(s[f.key] as number) || ""} onChange={e => setS({ ...s, [f.key]: Number(e.target.value) || 0 })} style={inputSt} />
            {f.hint && <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#9ca3af" }}>{f.hint}</p>}
          </div>
        ))}

        {/* หมวดค่าโฆษณา → ดึงยอดอัตโนมัติจากค่าใช้จ่าย Finance */}
        <div style={{ marginBottom: 16, paddingTop: 8, borderTop: "1px dashed #e5e5e5" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>หมวดค่าใช้จ่ายที่เป็น &ldquo;ค่าโฆษณา&rdquo;</label>
          <select value={s.adsCategory} onChange={e => setS({ ...s, adsCategory: e.target.value })} style={{ ...inputSt, cursor: "pointer" }}>
            <option value="">— เดาอัตโนมัติ (หมวดที่มีคำว่า โฆษณา/ads/การตลาด) —</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
            {s.adsCategory && !cats.includes(s.adsCategory) && <option value={s.adsCategory}>{s.adsCategory}</option>}
          </select>
          <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#9ca3af" }}>ระบบจะรวมยอดค่าใช้จ่ายหมวดนี้ของเดือนปัจจุบันมาเป็นค่าโฆษณาให้อัตโนมัติ — ไม่ต้องกรอกซ้ำ</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>ยอดค่าโฆษณา (สำรอง)</label>
          <input type="number" value={s.adSpend || ""} onChange={e => setS({ ...s, adSpend: Number(e.target.value) || 0 })} style={inputSt} />
          <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#9ca3af" }}>ใช้เฉพาะกรณีไม่ได้บันทึกค่าโฆษณาในค่าใช้จ่าย — ถ้ามีในค่าใช้จ่ายแล้ว ระบบจะใช้ยอดจากนั้นแทน</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={save} disabled={saving} style={{ padding: "11px 22px", borderRadius: 10, background: saving ? "#9ca3af" : GOLD, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "inherit" }}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          {saved && <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 600 }}>✓ บันทึกแล้ว</span>}
        </div>
      </Card>
    </>
  );
}
