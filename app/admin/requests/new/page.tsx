"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Check, ExternalLink } from "lucide-react";
import { createRequest } from "@/app/actions/admin-requests";
import { fetchActiveProducts } from "@/app/actions/products";
import type { ProductRow } from "@/app/actions/products";
import { fetchPricingConfig } from "@/app/actions/pricing-config";
import type { PricingConfig } from "@/app/actions/pricing-config";
import { DEFAULT_PRICING_CONFIG, getModelTypeOpts } from "@/lib/pricing-defaults";
import type { SellMethod, PayMethod } from "@/lib/types/admin";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

const selectSt: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px",
  border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14,
  color: TEXT, fontFamily: "inherit", outline: "none", background: CARD,
  appearance: "none", WebkitAppearance: "none",
};
const inputSt: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px",
  border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14,
  color: TEXT, fontFamily: "inherit", outline: "none", background: CARD,
};
const labelSt: React.CSSProperties = {
  fontSize: 11, color: TEXT2, fontWeight: 600, display: "block",
  marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <p style={{ color: TEXT3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>{title}</p>
      {children}
    </div>
  );
}

type Source = "line" | "phone" | "facebook";

// map body condition label → summary string
const BODY_TO_CONDITION: Record<string, string> = {
  "ไม่มีรอยขีดข่วน":            "สภาพดีมาก",
  "มีรอยนิดหน่อย / รอยเคสกัด":  "สภาพดี",
  "มีรอยมาก / กลอก / สีหลุด":   "สภาพพอใช้",
  "ตัวเครื่องมีรอยตก":           "สภาพปานกลาง",
  "ฝาหลัง / กระจกหลังแตก":       "สภาพปานกลาง",
};

const INIT_FORM = {
  customerName: "", customerPhone: "", customerEmail: "",
  source: "line" as Source,
  deviceModel: "", deviceStorage: "", deviceColor: "",
  apptDate: "", apptTime: "", apptLocation: "",
  apptMethod: "branch" as SellMethod,
  paymentMethod: "cash" as PayMethod,
  paymentBank: "", paymentAccountName: "", paymentAccountNumber: "",
  notes: "",
};

// Common iPhone colors for datalist
const IPHONE_COLORS = [
  "Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium",
  "Midnight", "Starlight", "Blue", "Pink", "Yellow", "Green", "Purple",
  "Space Gray", "Silver", "Gold", "Deep Purple", "Product Red",
  "Ultramarine", "Teal", "Rose", "ดำ", "ขาว", "ทอง", "เงิน",
];

export default function NewRequestPage() {
  const router = useRouter();
  const [products,      setProducts]      = useState<ProductRow[]>([]);
  const [pricingCfg,   setPricingCfg]   = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [form,         setForm]         = useState(INIT_FORM);
  const [selections,    setSelections]    = useState<Record<string, string>>({});
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [saving,        setSaving]        = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [done,         setDone]         = useState<{ orderNumber: string; id: string } | null>(null);
  const [copied,       setCopied]       = useState(false);

  useEffect(() => {
    Promise.all([fetchActiveProducts(), fetchPricingConfig()]).then(([prods, cfg]) => {
      setProducts(prods);
      setPricingCfg(cfg);
    });
  }, []);

  // Unique models grouped by category
  const categories = useMemo(() => {
    const map = new Map<string, string[]>();
    products.forEach(p => {
      if (!map.has(p.category)) map.set(p.category, []);
      if (!map.get(p.category)!.includes(p.model)) map.get(p.category)!.push(p.model);
    });
    return Array.from(map.entries());
  }, [products]);

  // All rows for the selected model
  const selectedModelProducts = useMemo(
    () => products.filter(p => p.model === form.deviceModel),
    [products, form.deviceModel],
  );

  // Storage options: use storage_prices keys if present,
  // otherwise split the `storage` field (may contain "256GB / 512GB / 1TB")
  const storageOptions = useMemo(() => {
    if (selectedModelProducts.length === 0) return [];
    const first = selectedModelProducts[0];
    if (first.storage_prices && Object.keys(first.storage_prices).length > 0) {
      return Object.keys(first.storage_prices);
    }
    const raw = selectedModelProducts.flatMap(p =>
      p.storage ? p.storage.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean) : [],
    );
    return [...new Set(raw)];
  }, [selectedModelProducts]);

  // Condition groups — same logic as customer form:
  // If product has custom deductions → use as-is (model_type already customized in there)
  // Otherwise fall back to DB config groups, overriding model_type for this model
  const conditionGroups = useMemo(() => {
    const first = selectedModelProducts[0] ?? null;
    if (first?.deductions && first.deductions.length > 0) {
      return first.deductions;
    }
    return pricingCfg.groups.map(g =>
      g.key === "model_type" && first ? { ...g, options: getModelTypeOpts(first.model, g.options) ?? g.options } : g,
    );
  }, [selectedModelProducts, pricingCfg]);

  // Compute estimated price — same calcPrice logic as customer form
  const { estimatedPrice, priceRange } = useMemo(() => {
    const first = selectedModelProducts[0] ?? null;
    if (!first || !form.deviceStorage) return { estimatedPrice: 0, priceRange: "" };

    // Storage index for multiplier fallback
    const storages = first.storage.split(/\s*\/\s*/);
    const storageIdx = storages.indexOf(form.deviceStorage);

    let basePrice: number;
    if (first.storage_prices && first.storage_prices[form.deviceStorage] !== undefined) {
      basePrice = first.storage_prices[form.deviceStorage];
    } else {
      // Match customer: priceGood × (1 + (idx - midIdx) × multiplier)
      const midIdx = Math.floor((storages.length - 1) / 2);
      const idx = storageIdx >= 0 ? storageIdx : 0;
      basePrice = Math.round(first.price_good * (1 + (idx - midIdx) * pricingCfg.storageMultiplier));
    }

    let totalDed = 0;
    conditionGroups.forEach(g => {
      const sel = selections[g.key];
      if (sel) {
        const opt = g.options.find(o => o.label === sel);
        if (opt) totalDed += opt.ded;
      }
    });
    const price = Math.max(500, basePrice + totalDed);
    const lo = Math.max(0, price - 500);
    const hi = price + 500;
    return {
      estimatedPrice: price,
      priceRange: `฿${lo.toLocaleString("th-TH")} – ฿${hi.toLocaleString("th-TH")}`,
    };
  }, [selectedModelProducts, form.deviceStorage, selections, conditionGroups, pricingCfg]);

  // Derived condition summary from body selection
  const deviceCondition = BODY_TO_CONDITION[selections["body"] ?? ""] ?? "";
  const deviceConditionDetails = conditionGroups
    .map(g => selections[g.key])
    .filter((s): s is string => !!s && s !== "");

  function handleModelChange(model: string) {
    setForm(p => ({ ...p, deviceModel: model, deviceStorage: "" }));
    setSelections({});
    setPriceOverride("");
  }

  function setSelection(key: string, label: string) {
    setSelections(prev => ({ ...prev, [key]: label }));
  }

  function f(key: keyof typeof INIT_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.deviceModel) {
      setError("กรุณากรอก ชื่อลูกค้า, เบอร์โทร และ รุ่นเครื่อง");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await createRequest({
      customerName:          form.customerName.trim(),
      customerPhone:         form.customerPhone.trim(),
      customerEmail:         form.customerEmail.trim() || undefined,
      deviceModel:           form.deviceModel,
      deviceStorage:         form.deviceStorage,
      deviceColor:           form.deviceColor.trim() || undefined,
      deviceCondition,
      deviceConditionDetails,
      deviceSelections:      selections,
      estimatedPrice: priceOverride !== "" ? (parseInt(priceOverride) || estimatedPrice) : estimatedPrice,
      priceRange: (priceOverride !== "" && parseInt(priceOverride) !== estimatedPrice) ? "" : priceRange,
      apptDate:              form.apptDate,
      apptTime:              form.apptTime,
      apptLocation:          form.apptLocation.trim(),
      apptMethod:            form.apptMethod,
      paymentMethod:         form.paymentMethod,
      paymentBank:           form.paymentBank.trim() || undefined,
      paymentAccountName:    form.paymentAccountName.trim() || undefined,
      paymentAccountNumber:  form.paymentAccountNumber.trim() || undefined,
      source:                form.source,
      notes:                 form.notes.trim() || undefined,
    });
    setSaving(false);
    if (result.success) {
      setDone({ orderNumber: result.orderNumber, id: result.id });
    } else {
      setError(result.error);
    }
  }

  function trackingUrl(orderNumber: string) {
    const base = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL ?? "");
    return `${base}/track?order=${orderNumber}`;
  }

  async function copyLink(orderNumber: string) {
    const url = trackingUrl(orderNumber);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for HTTP / non-secure context
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── Success screen ────────────────────────────────────────────────────────
  if (done) {
    const url = trackingUrl(done.orderNumber);
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ maxWidth: 480, width: "100%", background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, padding: 28, textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={28} color="#059669" />
          </div>
          <h2 style={{ color: TEXT, fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>สร้างคิวสำเร็จ</h2>
          <p style={{ color: GOLD, fontSize: 22, fontWeight: 700, letterSpacing: "0.04em", margin: "0 0 20px" }}>{done.orderNumber}</p>

          <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 16, textAlign: "left" }}>
            <p style={{ color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 6px" }}>ลิงก์ติดตามสถานะ</p>
            <p style={{ color: TEXT2, fontSize: 12, margin: "0 0 10px", wordBreak: "break-all" }}>{url}</p>
            <button
              onClick={() => copyLink(done.orderNumber)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, background: CARD, color: copied ? "#059669" : TEXT2, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center" }}
            >
              {copied ? <><Check size={14} /> คัดลอกแล้ว</> : <><Copy size={14} /> คัดลอกลิงก์</>}
            </button>
          </div>

          <p style={{ color: TEXT3, fontSize: 12, margin: "0 0 20px" }}>ส่งลิงก์นี้ให้ลูกค้าเพื่อติดตามสถานะ</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => router.push(`/admin/requests/${done.id}`)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", border: "none", borderRadius: 12, background: GOLD, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
            >
              ดูรายละเอียดคำขอ <ExternalLink size={14} />
            </button>
            <button
              onClick={() => { setDone(null); setForm(INIT_FORM); setSelections({}); }}
              style={{ padding: "12px 0", border: `1px solid ${BORDER}`, borderRadius: 12, background: "none", color: TEXT2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
            >
              สร้างคิวใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "52px 16px 120px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}>
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>สร้างคิวนัดหมาย</h1>
            <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>สำหรับลูกค้าที่ติดต่อผ่าน LINE / โทรศัพท์</p>
          </div>
        </div>

        {/* 1. ลูกค้า */}
        <Section title="ข้อมูลลูกค้า">
          <label style={labelSt}>ติดต่อมาทาง</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {(["line", "phone", "facebook"] as Source[]).map(s => (
              <label key={s} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0", borderRadius: 10, cursor: "pointer", border: `1px solid ${form.source === s ? GOLD : BORDER}`, background: form.source === s ? `${GOLD}10` : BG, fontSize: 13, fontWeight: form.source === s ? 700 : 500, color: form.source === s ? GOLD : TEXT2 }}>
                <input type="radio" checked={form.source === s} onChange={() => setForm(p => ({ ...p, source: s }))} style={{ display: "none" }} />
                {s === "line" ? "LINE" : s === "phone" ? "โทรศัพท์" : "Facebook"}
              </label>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelSt}>ชื่อ-นามสกุล *</label>
              <input value={form.customerName} onChange={f("customerName")} placeholder="สมชาย ใจดี" style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>เบอร์โทร *</label>
              <input value={form.customerPhone} onChange={f("customerPhone")} placeholder="081-234-5678" type="tel" style={inputSt} />
            </div>
          </div>
          <div>
            <label style={labelSt}>อีเมล (ถ้ามี)</label>
            <input value={form.customerEmail} onChange={f("customerEmail")} placeholder="example@email.com" type="email" style={inputSt} />
          </div>
        </Section>

        {/* 2. เครื่อง */}
        <Section title="ข้อมูลเครื่อง">
          {/* Model dropdown */}
          <div style={{ marginBottom: 10 }}>
            <label style={labelSt}>รุ่นเครื่อง *</label>
            <div style={{ position: "relative" }}>
              <select
                value={form.deviceModel}
                onChange={e => handleModelChange(e.target.value)}
                style={selectSt}
              >
                <option value="">— เลือกรุ่น —</option>
                {categories.map(([cat, models]) => (
                  <optgroup key={cat} label={cat}>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </optgroup>
                ))}
              </select>
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: TEXT3, fontSize: 10 }}>▼</span>
            </div>
          </div>

          {/* Storage + Color */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelSt}>ความจุ</label>
              <div style={{ position: "relative" }}>
                <select
                  value={form.deviceStorage}
                  onChange={f("deviceStorage")}
                  disabled={storageOptions.length === 0}
                  style={{ ...selectSt, opacity: storageOptions.length === 0 ? 0.4 : 1 }}
                >
                  <option value="">— เลือก —</option>
                  {storageOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: TEXT3, fontSize: 10 }}>▼</span>
              </div>
            </div>
            <div>
              <label style={labelSt}>สี</label>
              <input
                value={form.deviceColor}
                onChange={f("deviceColor")}
                placeholder="เช่น Midnight"
                list="iphone-colors"
                style={inputSt}
              />
              <datalist id="iphone-colors">
                {IPHONE_COLORS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          {/* Estimated price — editable */}
          {selectedModelProducts.length > 0 && form.deviceStorage && (
            <div style={{ background: `${GOLD}08`, border: `1px solid ${GOLD}30`, borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ color: TEXT3, fontSize: 11, fontWeight: 600, margin: "0 0 8px" }}>ราคาที่ตกลงกับลูกค้า</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: GOLD, fontSize: 18, fontWeight: 700 }}>฿</span>
                <input
                  type="number"
                  value={priceOverride !== "" ? priceOverride : estimatedPrice || ""}
                  onChange={e => setPriceOverride(e.target.value)}
                  onFocus={e => { if (priceOverride === "") setPriceOverride(String(estimatedPrice)); e.target.select(); }}
                  placeholder={String(estimatedPrice)}
                  style={{ flex: 1, padding: "8px 10px", border: `1px solid ${GOLD}50`, borderRadius: 8, fontSize: 18, fontWeight: 700, color: GOLD, background: "transparent", fontFamily: "inherit", outline: "none", fontVariantNumeric: "tabular-nums" }}
                />
                {priceOverride !== "" && parseInt(priceOverride) !== estimatedPrice && (
                  <button
                    type="button"
                    onClick={() => setPriceOverride("")}
                    title="รีเซ็ตเป็นราคาประเมิน"
                    style={{ background: "none", border: "none", cursor: "pointer", color: TEXT3, fontSize: 11, padding: "4px 6px", fontFamily: "inherit", flexShrink: 0 }}
                  >
                    รีเซ็ต
                  </button>
                )}
              </div>
              {priceOverride !== "" && parseInt(priceOverride) !== estimatedPrice && estimatedPrice > 0 && (
                <p style={{ color: TEXT3, fontSize: 11, margin: "6px 0 0" }}>
                  ราคาประเมินอัตโนมัติ: ฿{estimatedPrice.toLocaleString("th-TH")}
                </p>
              )}
              {(!priceOverride || parseInt(priceOverride) === estimatedPrice) && priceRange && (
                <p style={{ color: TEXT2, fontSize: 11, margin: "6px 0 0" }}>{priceRange}</p>
              )}
            </div>
          )}
        </Section>

        {/* 3. สภาพเครื่อง (condition groups) */}
        {form.deviceModel && (
          <Section title="สภาพเครื่อง">
            {conditionGroups.map(group => (
              <div key={group.key} style={{ marginBottom: 16 }}>
                <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>{group.title}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {group.options.map(opt => {
                    const selected = selections[group.key] === opt.label;
                    return (
                      <label
                        key={opt.label}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                          border: `1px solid ${selected ? GOLD : BORDER}`,
                          background: selected ? `${GOLD}08` : BG,
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                          border: `2px solid ${selected ? GOLD : BORDER}`,
                          background: selected ? GOLD : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                        <input
                          type="radio"
                          name={group.key}
                          checked={selected}
                          onChange={() => setSelection(group.key, opt.label)}
                          style={{ display: "none" }}
                        />
                        <div style={{ flex: 1 }}>
                          <p style={{ color: selected ? GOLD : TEXT, fontSize: 13, fontWeight: selected ? 700 : 500, margin: 0 }}>{opt.label}</p>
                          {opt.sub && <p style={{ color: TEXT3, fontSize: 11, margin: "2px 0 0" }}>{opt.sub}</p>}
                          {opt.ded !== 0 && (
                            <p style={{ color: opt.ded < 0 ? "#EF4444" : "#059669", fontSize: 11, margin: "2px 0 0", fontWeight: 600 }}>
                              {opt.ded < 0 ? `หัก ฿${Math.abs(opt.ded).toLocaleString("th-TH")}` : "ไม่หัก"}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* 4. นัดหมาย */}
        <Section title="นัดหมาย">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelSt}>วันที่</label>
              <input type="date" value={form.apptDate} onChange={f("apptDate")} style={inputSt} />
            </div>
            <div>
              <label style={labelSt}>เวลา</label>
              <input type="time" value={form.apptTime} onChange={f("apptTime")} style={inputSt} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelSt}>วิธีรับเครื่อง</label>
            <div style={{ display: "flex", gap: 8 }}>
              {([["branch", "รับที่สาขา"], ["rider", "ไรเดอร์รับบ้าน"], ["parcel", "ส่งพัสดุ"]] as [SellMethod, string][]).map(([v, label]) => (
                <label key={v} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0", borderRadius: 10, cursor: "pointer", border: `1px solid ${form.apptMethod === v ? GOLD : BORDER}`, background: form.apptMethod === v ? `${GOLD}10` : BG, fontSize: 12, fontWeight: form.apptMethod === v ? 700 : 500, color: form.apptMethod === v ? GOLD : TEXT2 }}>
                  <input type="radio" checked={form.apptMethod === v} onChange={() => setForm(p => ({ ...p, apptMethod: v }))} style={{ display: "none" }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={labelSt}>{form.apptMethod === "branch" ? "สาขา" : form.apptMethod === "rider" ? "ที่อยู่รับเครื่อง" : "ที่อยู่สำหรับส่ง"}</label>
            <input value={form.apptLocation} onChange={f("apptLocation")} placeholder={form.apptMethod === "branch" ? "เช่น สาขาสยาม" : "กรอกที่อยู่"} style={inputSt} />
          </div>
        </Section>

        {/* 5. รับเงิน */}
        <Section title="ช่องทางรับเงิน">
          <div style={{ display: "flex", gap: 8, marginBottom: form.paymentMethod === "transfer" ? 12 : 0 }}>
            {([["cash", "เงินสด"], ["transfer", "โอนเงิน"]] as [PayMethod, string][]).map(([v, label]) => (
              <label key={v} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 0", borderRadius: 10, cursor: "pointer", border: `1px solid ${form.paymentMethod === v ? GOLD : BORDER}`, background: form.paymentMethod === v ? `${GOLD}10` : BG, fontSize: 14, fontWeight: form.paymentMethod === v ? 700 : 500, color: form.paymentMethod === v ? GOLD : TEXT2 }}>
                <input type="radio" checked={form.paymentMethod === v} onChange={() => setForm(p => ({ ...p, paymentMethod: v }))} style={{ display: "none" }} />
                {label}
              </label>
            ))}
          </div>
          {form.paymentMethod === "transfer" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelSt}>ธนาคาร</label>
                <div style={{ position: "relative" }}>
                  <select value={form.paymentBank} onChange={f("paymentBank")} style={selectSt}>
                    <option value="">— เลือกธนาคาร —</option>
                    {["กสิกรไทย (KBANK)", "กรุงไทย (KTB)", "ไทยพาณิชย์ (SCB)", "กรุงเทพ (BBL)", "ทหารไทยธนชาต (TTB)", "กรุงศรี (BAY)", "ออมสิน", "ธ.ก.ส.", "ซิตี้แบงก์", "พร้อมเพย์"].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: TEXT3, fontSize: 10 }}>▼</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelSt}>ชื่อบัญชี</label>
                  <input value={form.paymentAccountName} onChange={f("paymentAccountName")} placeholder="ชื่อ-นามสกุล" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>เลขบัญชี</label>
                  <input value={form.paymentAccountNumber} onChange={f("paymentAccountNumber")} placeholder="xxx-x-xxxxx-x" style={inputSt} />
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* 6. หมายเหตุ */}
        <Section title="หมายเหตุ">
          <textarea value={form.notes} onChange={f("notes")} placeholder="รายละเอียดเพิ่มเติม, สิ่งที่ตกลงกันไว้..." rows={3} style={{ ...inputSt, resize: "none" }} />
        </Section>

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
            <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>{error}</p>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: CARD, borderTop: `1px solid ${BORDER}`, padding: "12px 16px", paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)", zIndex: 20 }}>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ width: "100%", padding: "14px 0", border: "none", borderRadius: 14, background: GOLD, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "กำลังสร้าง..." : "สร้างคิวนัดหมาย"}
        </button>
      </div>
    </div>
  );
}
