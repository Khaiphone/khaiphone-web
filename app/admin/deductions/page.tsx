"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { fetchPricingConfig, savePricingConfig } from "@/app/actions/pricing-config";
import { DEFAULT_PRICING_CONFIG } from "@/lib/pricing-defaults";
import type { PricingConfig } from "@/lib/pricing-defaults";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

export default function DeductionsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<PricingConfig>(deepClone(DEFAULT_PRICING_CONFIG));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    fetchPricingConfig().then(c => { setConfig(deepClone(c)); setLoading(false); });
  }, []);

  function setMultiplier(val: string) {
    const n = parseFloat(val);
    if (!isNaN(n)) setConfig(c => ({ ...c, storageMultiplier: n / 100 }));
  }

  function setDed(groupIdx: number, optIdx: number, val: string) {
    const n = parseInt(val, 10);
    setConfig(prev => {
      const next = deepClone(prev);
      next.groups[groupIdx].options[optIdx].ded = isNaN(n) ? 0 : n;
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const res = await savePricingConfig(config);
    setSaving(false);
    if (res.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  function handleReset() {
    if (!confirm("รีเซ็ตกลับค่าเริ่มต้นทั้งหมด?")) return;
    setConfig(deepClone(DEFAULT_PRICING_CONFIG));
  }

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      <div style={{ padding: "52px 16px 120px", maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>ตั้งค่าราคาคำนวณ</h1>
            <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>ปรับค่าหักสำหรับแต่ละตัวเลือกที่ลูกค้าเลือก</p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: TEXT3, textAlign: "center", padding: "40px 0" }}>กำลังโหลด...</p>
        ) : (
          <>
            {/* Storage multiplier */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 4px" }}>ค่าปรับตาม Storage</p>
              <p style={{ color: TEXT3, fontSize: 12, margin: "0 0 14px" }}>
                บวก/ลบ ___% ต่อขั้นจาก storage กลาง<br />
                เช่น iPhone 16 มี 3 ตัวเลือก → 256GB = ฐาน, 128GB = ฐาน−12%, 512GB = ฐาน+12%
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={1}
                  value={Math.round(config.storageMultiplier * 100)}
                  onChange={e => setMultiplier(e.target.value)}
                  style={{
                    width: 80, textAlign: "center",
                    padding: "8px 10px", border: `1px solid ${BORDER}`,
                    borderRadius: 8, fontSize: 16, fontWeight: 700,
                    color: TEXT, fontFamily: "inherit", outline: "none",
                  }}
                />
                <span style={{ color: TEXT2, fontSize: 14 }}>% ต่อขั้น</span>
              </div>
            </div>

            {/* Groups */}
            {config.groups.map((group, gi) => (
              <div
                key={group.key}
                style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}
              >
                {/* Group header */}
                <div style={{
                  padding: "12px 16px", borderBottom: `1px solid ${BORDER}`,
                  background: "#FAFAFA",
                }}>
                  <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0 }}>
                    ขั้นที่ {gi + 2} — {group.title}
                  </p>
                </div>

                {/* Column headers */}
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 120px",
                  padding: "8px 16px", borderBottom: `1px solid ${BORDER}`,
                  fontSize: 11, fontWeight: 600, color: TEXT3,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  <span>ตัวเลือก</span>
                  <span style={{ textAlign: "right" }}>ราคาปรับ (฿)</span>
                </div>

                {/* Options */}
                {group.options.map((opt, oi) => (
                  <div
                    key={oi}
                    style={{
                      display: "grid", gridTemplateColumns: "1fr 120px",
                      alignItems: "center", padding: "10px 16px",
                      borderBottom: oi < group.options.length - 1 ? `1px solid ${BORDER}` : "none",
                    }}
                  >
                    <div>
                      <p style={{ color: TEXT, fontSize: 13, margin: "0 0 1px" }}>{opt.label}</p>
                      {opt.sub && <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>{opt.sub}</p>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <input
                        type="number"
                        value={opt.ded}
                        onChange={e => setDed(gi, oi, e.target.value)}
                        style={{
                          width: 100, textAlign: "right",
                          padding: "6px 10px",
                          border: `1px solid ${opt.ded !== DEFAULT_PRICING_CONFIG.groups[gi]?.options[oi]?.ded ? GOLD : BORDER}`,
                          borderRadius: 8, fontSize: 13, fontWeight: 600,
                          color: opt.ded < 0 ? "#EF4444" : opt.ded > 0 ? "#10B981" : TEXT,
                          background: opt.ded !== DEFAULT_PRICING_CONFIG.groups[gi]?.options[oi]?.ded ? `${GOLD}08` : BG,
                          fontFamily: "inherit", outline: "none",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Note */}
            <p style={{ color: TEXT3, fontSize: 12, textAlign: "center", marginBottom: 24 }}>
              ราคาที่แสดงลูกค้า = ราคาคำนวณ ±5% (แสดงเป็นช่วง)
            </p>
          </>
        )}
      </div>

      {/* Sticky save bar */}
      {!loading && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: CARD, borderTop: `1px solid ${BORDER}`,
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          display: "flex", gap: 10, justifyContent: "center",
          zIndex: 50,
        }}>
          <button
            onClick={handleReset}
            style={{
              padding: "10px 20px", border: `1px solid ${BORDER}`,
              borderRadius: 10, background: "none", color: TEXT2,
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            รีเซ็ต
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, maxWidth: 320,
              padding: "12px 20px", border: "none",
              borderRadius: 10,
              background: saved ? "#10B981" : GOLD,
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: saving ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "background 0.2s",
            }}
          >
            {saved ? <><Check size={16} /> บันทึกแล้ว</> : saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>
      )}
    </div>
  );
}
