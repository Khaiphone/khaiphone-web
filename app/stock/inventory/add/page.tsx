"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { createStockItem } from "@/app/actions/stocks";
import type { AddStockForm, PhysicalCondition } from "@/lib/stock/types";

const STEPS = ["ข้อมูลเครื่อง", "สภาพกายภาพ", "ข้อมูลรับซื้อ", "ราคา", "อัปโหลดรูป", "ตรวจสอบ", "บันทึก"];
const PHYSICAL_PARTS = ["จอ", "เคส/ตัวเครื่อง", "กระจกหลัง", "ปุ่มต่างๆ", "ลำโพง", "กล้องหลัง", "กล้องหน้า", "ชาร์จพอร์ต"];
const CONDITIONS: PhysicalCondition[] = ["ปกติ", "มีตำหนิเล็ก", "มีปัญหา"];

const IPHONE_MODELS = [
  "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17 Air", "iPhone 17", "iPhone 17e",
  "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16",
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
  "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
  "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
  "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
  "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
];

const INIT_FORM: AddStockForm = {
  model: "", storage: "", color: "", imei: "", serial: "",
  grade: "", batteryHealth: "", cycleCount: "",
  icloudStatus: "ปลอดล็อกแล้ว", carrierLock: "ไม่มี (Unlocked)", accessories: "",
  physicalChecks: PHYSICAL_PARTS.map(label => ({ label, condition: "ปกติ" })),
  requestRef: "", sellerName: "", sellerPhone: "", sourceChannel: "", receiveMethod: "หน้าร้าน",
  costPrice: "", shippingCost: "80", otherCost: "0", sellingPrice: "",
  photos: [],
};

function inp(style?: React.CSSProperties): React.CSSProperties {
  return { width: "100%", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, ...style };
}

export default function AddStockPage() {
  const c = useThemeColors();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AddStockForm>(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string[]>([]);

  function set(field: keyof AddStockForm, value: unknown) {
    setForm(f => ({ ...f, [field]: value }));
  }

  const costNum = parseInt(form.costPrice) || 0;
  const shipNum = parseInt(form.shippingCost) || 0;
  const otherNum = parseInt(form.otherCost) || 0;
  const totalCost = costNum + shipNum + otherNum;
  const sellNum = parseInt(form.sellingPrice) || 0;
  const profit = sellNum - totalCost;
  const margin = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : "0";

  async function handleSave() {
    setSaving(true);
    const now = new Date().toISOString();
    const result = await createStockItem({
      id: "",
      model: form.model, storage: form.storage, color: form.color,
      imei: form.imei, serial: form.serial,
      grade: (form.grade || "A") as import("@/lib/stock/types").StockGrade,
      batteryHealth: parseInt(form.batteryHealth) || 0,
      cycleCount: parseInt(form.cycleCount) || 0,
      icloudStatus: form.icloudStatus, carrierLock: form.carrierLock,
      accessories: form.accessories, physicalChecks: form.physicalChecks,
      costPrice: costNum, shippingCost: shipNum, otherCost: otherNum,
      sellingPrice: sellNum,
      status: "รอตรวจ",
      sourceChannel: (form.sourceChannel || "หน้าร้าน") as import("@/lib/stock/types").SourceChannel,
      requestRef: form.requestRef || undefined,
      sellerName: form.sellerName, sellerPhone: form.sellerPhone,
      receivedAt: now, inspector: "",
      soldAt: undefined, soldPrice: undefined, buyerName: undefined, buyerPhone: undefined,
    });
    setSaving(false);
    if (result.success) {
      setSavedId(result.id);
      setStep(6);
    }
  }

  const inputStyle = { ...inp({ background: c.card2, border: `1px solid ${c.border}`, color: c.text }) };
  const labelStyle = { color: c.text2, fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 };

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="เพิ่มสินค้าเข้าสต็อก" subtitle={`ขั้นตอน ${step + 1} / ${STEPS.length}`} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
        {/* Step Indicator */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32, overflowX: "auto", paddingBottom: 8 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < step ? c.gold : i === step ? c.gold : c.card2,
                  border: `2px solid ${i <= step ? c.gold : c.border}`,
                  color: i <= step ? (c.dark ? "#000" : "#fff") : c.text3,
                  fontSize: 14, fontWeight: 700, transition: "all 200ms",
                }}>
                  {i < step ? <Check size={16} /> : i + 1}
                </div>
                <span style={{ color: i === step ? c.gold : c.text3, fontSize: 11, whiteSpace: "nowrap", fontWeight: i === step ? 700 : 400 }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: 40, height: 2, background: i < step ? c.gold : c.border, margin: "0 6px", marginBottom: 20, transition: "background 200ms", flexShrink: 0 }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ background: c.card, borderRadius: 20, padding: 28, border: `1px solid ${c.border}` }}
          >
            {/* Step 1: Device Info */}
            {step === 0 && (
              <div>
                <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>ข้อมูลเครื่อง</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>รุ่น *</label>
                    <select value={form.model} onChange={e => set("model", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="">เลือกรุ่น</option>
                      {IPHONE_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  {[
                    { label: "ความจุ", field: "storage", placeholder: "เช่น 256GB", opts: ["64GB","128GB","256GB","512GB","1TB"] },
                    { label: "สี", field: "color", placeholder: "เช่น Natural Titanium" },
                  ].map(({ label, field, opts }) => (
                    <div key={field}>
                      <label style={labelStyle}>{label}</label>
                      {opts ? (
                        <select value={(form as unknown as Record<string, string>)[field] as string} onChange={e => set(field as keyof AddStockForm, e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                          <option value="">เลือก{label}</option>
                          {opts.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input value={(form as unknown as Record<string, string>)[field] as string} onChange={e => set(field as keyof AddStockForm, e.target.value)} style={inputStyle} />
                      )}
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle}>IMEI *</label>
                    <input value={form.imei} onChange={e => set("imei", e.target.value)} placeholder="15 หลัก" style={{ ...inputStyle, fontFamily: "monospace" }} maxLength={15} />
                  </div>
                  <div>
                    <label style={labelStyle}>Serial Number</label>
                    <input value={form.serial} onChange={e => set("serial", e.target.value)} style={{ ...inputStyle, fontFamily: "monospace" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Battery Health (%)</label>
                    <input value={form.batteryHealth} onChange={e => set("batteryHealth", e.target.value)} type="number" min="0" max="100" style={inputStyle} />
                    {form.batteryHealth && (
                      <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: c.border, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${form.batteryHealth}%`, background: parseInt(form.batteryHealth) >= 85 ? "#22c55e" : "#facc15", transition: "width 300ms" }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Cycle Count</label>
                    <input value={form.cycleCount} onChange={e => set("cycleCount", e.target.value)} type="number" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>เกรด</label>
                    <select value={form.grade} onChange={e => set("grade", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="">เลือกเกรด</option>
                      {["A","A-","B+","B","B-","C"].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>iCloud Status</label>
                    <select value={form.icloudStatus} onChange={e => set("icloudStatus", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      {["ปลอดล็อกแล้ว","ยังไม่ออก iCloud","ไม่ทราบ"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Carrier Lock</label>
                    <select value={form.carrierLock} onChange={e => set("carrierLock", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      {["ไม่มี (Unlocked)","AIS","DTAC","TRUE","มี (Locked)"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>อุปกรณ์ที่มี</label>
                    <input value={form.accessories} onChange={e => set("accessories", e.target.value)} placeholder="เช่น กล่อง, สายชาร์จ, เข็มเจาะซิม" style={inputStyle} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Physical Condition */}
            {step === 1 && (
              <div>
                <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>สภาพกายภาพ</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {form.physicalChecks.map((check, i) => (
                    <div key={check.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: c.card2, borderRadius: 12, border: `1px solid ${c.border}` }}>
                      <span style={{ color: c.text, fontSize: 14, fontWeight: 500 }}>{check.label}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {CONDITIONS.map(cond => {
                          const condColor = cond === "ปกติ" ? "#22c55e" : cond === "มีตำหนิเล็ก" ? "#facc15" : "#ef4444";
                          const active = check.condition === cond;
                          return (
                            <button key={cond} onClick={() => {
                              const next = [...form.physicalChecks];
                              next[i] = { ...check, condition: cond };
                              set("physicalChecks", next);
                            }} style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${active ? condColor : c.border}`, background: active ? `${condColor}18` : "transparent", color: active ? condColor : c.text3, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer" }}>
                              {cond}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Purchase Info */}
            {step === 2 && (
              <div>
                <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>ข้อมูลการรับซื้อ</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={labelStyle}>เลขคำขออ้างอิง (ถ้ามี)</label>
                    <input value={form.requestRef} onChange={e => set("requestRef", e.target.value)} placeholder="เช่น KH-2026-1234" style={{ ...inputStyle, fontFamily: "monospace" }} />
                  </div>
                  <div>
                    <label style={labelStyle}>ชื่อผู้ขาย *</label>
                    <input value={form.sellerName} onChange={e => set("sellerName", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>เบอร์โทรศัพท์</label>
                    <input value={form.sellerPhone} onChange={e => set("sellerPhone", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>วิธีรับเครื่อง</label>
                    <select value={form.receiveMethod} onChange={e => set("receiveMethod", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      {["หน้าร้าน","ไรเดอร์รับถึงที่","ส่งพัสดุ"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>ช่องทางที่มา</label>
                    <select value={form.sourceChannel} onChange={e => set("sourceChannel", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="">เลือกช่องทาง</option>
                      {["หน้าร้าน","เว็บไซต์","LINE OA","Facebook","Shopee","โทรศัพท์"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Pricing */}
            {step === 3 && (
              <div>
                <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>ราคา</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  {[
                    { label: "ราคารับซื้อ (฿) *", field: "costPrice" },
                    { label: "ค่าส่ง (฿)", field: "shippingCost" },
                    { label: "ค่าใช้จ่ายอื่น (฿)", field: "otherCost" },
                    { label: "ราคาขาย (฿) *", field: "sellingPrice" },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label style={labelStyle}>{label}</label>
                      <input value={(form as unknown as Record<string, string>)[field] as string} onChange={e => set(field as keyof AddStockForm, e.target.value)} type="number" style={inputStyle} />
                    </div>
                  ))}
                </div>
                {/* Profit Preview */}
                <div style={{ background: c.card2, borderRadius: 14, padding: 16, border: `1px solid ${c.border}` }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[
                      { label: "ต้นทุนรวม", value: `฿${totalCost.toLocaleString("th-TH")}`, color: "#ef4444" },
                      { label: "กำไรคาดการณ์", value: `฿${profit.toLocaleString("th-TH")}`, color: profit >= 0 ? "#22c55e" : "#ef4444" },
                      { label: "Margin", value: `${margin}%`, color: c.gold },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <p style={{ color: c.text3, fontSize: 11, margin: "0 0 4px" }}>{label}</p>
                        <p style={{ color, fontSize: 20, fontWeight: 800, margin: 0 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Photos */}
            {step === 4 && (
              <div>
                <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>อัปโหลดรูปภาพ</h2>
                <label style={{ display: "block", border: `2px dashed ${c.border}`, borderRadius: 16, padding: 32, textAlign: "center", cursor: "pointer", transition: "border-color 150ms" }}>
                  <input type="file" accept="image/*" multiple style={{ display: "none" }}
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      set("photos", files);
                      setPhotoPreview(files.map(f => URL.createObjectURL(f)));
                    }}
                  />
                  <Camera size={32} color={c.text3} style={{ margin: "0 auto 12px" }} />
                  <p style={{ color: c.text2, margin: "0 0 6px", fontWeight: 600 }}>คลิกหรือลากไฟล์มาวาง</p>
                  <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>รองรับ JPG, PNG สูงสุด 10 รูป</p>
                </label>
                {photoPreview.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
                    {photoPreview.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 12, border: `1px solid ${c.border}` }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 6: Review */}
            {step === 5 && (
              <div>
                <h2 style={{ color: c.text, fontSize: 20, fontWeight: 700, margin: "0 0 20px" }}>ตรวจสอบข้อมูล</h2>
                {[
                  { label: "ข้อมูลเครื่อง", items: [["รุ่น", form.model], ["ความจุ", form.storage], ["สี", form.color], ["IMEI", form.imei], ["Battery", `${form.batteryHealth}%`], ["เกรด", form.grade]] },
                  { label: "ผู้ขาย", items: [["ชื่อ", form.sellerName], ["เบอร์", form.sellerPhone], ["ช่องทาง", form.sourceChannel]] },
                  { label: "ราคา", items: [["ต้นทุน", `฿${costNum.toLocaleString()}`], ["ราคาขาย", `฿${sellNum.toLocaleString()}`], ["กำไร", `฿${profit.toLocaleString()} (${margin}%)`]] },
                ].map(({ label, items }) => (
                  <div key={label} style={{ marginBottom: 16 }}>
                    <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>{label}</p>
                    <div style={{ background: c.card2, borderRadius: 12, padding: "4px 14px" }}>
                      {items.map(([k, v]) => v && (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}` }}>
                          <span style={{ color: c.text2, fontSize: 13 }}>{k}</span>
                          <span style={{ color: c.text, fontSize: 13, fontWeight: 500 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 7: Success */}
            {step === 6 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#22c55e18", border: "2px solid #22c55e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                    <Check size={40} color="#22c55e" />
                  </div>
                </motion.div>
                <h2 style={{ color: c.text, fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>บันทึกสำเร็จ!</h2>
                <p style={{ color: c.text2, margin: "0 0 8px" }}>เพิ่มสินค้าเข้าสต็อกเรียบร้อยแล้ว</p>
                {savedId && <p style={{ color: c.gold, fontFamily: "monospace", fontSize: 18, fontWeight: 700, margin: "0 0 24px" }}>{savedId}</p>}
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button onClick={() => router.push("/stock/inventory")} style={{ padding: "12px 24px", borderRadius: 12, background: c.gold, border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>ดูสต็อก</button>
                  <button onClick={() => { setStep(0); setForm(INIT_FORM); setPhotoPreview([]); setSavedId(""); }} style={{ padding: "12px 24px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer" }}>เพิ่มเครื่องใหม่</button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {step < 6 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button
              onClick={() => step > 0 ? setStep(s => s - 1) : router.push("/stock/inventory")}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 20px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer" }}
            >
              <ChevronLeft size={16} /> {step === 0 ? "ยกเลิก" : "ย้อนกลับ"}
            </button>
            <button
              onClick={() => step < 5 ? setStep(s => s + 1) : handleSave()}
              disabled={saving}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px", borderRadius: 12, background: c.gold, border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "กำลังบันทึก..." : step === 5 ? "บันทึก" : <>ถัดไป <ChevronRight size={16} /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
