"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Check, RotateCcw } from "lucide-react";
import {
  fetchProductById, updateProduct,
  updateProductStoragePrices, updateProductDeductions, updateProductFloor,
} from "@/app/actions/products";
import { fetchPricingConfig } from "@/app/actions/pricing-config";
import { DEFAULT_PRICING_CONFIG, getModelTypeOpts } from "@/lib/pricing-defaults";
import type { ProductRow } from "@/app/actions/products";
import type { PricingGroup } from "@/lib/pricing-defaults";
import { useAdminRole } from "@/app/admin/role-context";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

function groupsToDedInputs(gs: PricingGroup[]): Record<string, string> {
  const m: Record<string, string> = {};
  gs.forEach((g, gi) => g.options.forEach((o, oi) => { m[`${gi}-${oi}`] = String(o.ded); }));
  return m;
}

function autoCalcPrice(basePrice: number, storageIdx: number, totalStorages: number, multiplier: number) {
  const midIdx = Math.floor((totalStorages - 1) / 2);
  return Math.round(basePrice * (1 + (storageIdx - midIdx) * multiplier));
}

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { userEmail: currentUserEmail } = useAdminRole();

  const [product, setProduct]         = useState<ProductRow | null>(null);
  const [globalGroups, setGlobalGroups] = useState<PricingGroup[]>(DEFAULT_PRICING_CONFIG.groups);
  const [storageMultiplier, setStorageMultiplier] = useState(0.12);
  const [loading, setLoading]         = useState(true);

  // Storage prices (per-storage inputs)
  const [storagePriceInputs, setStoragePriceInputs] = useState<Record<string, string>>({});

  // Deductions
  const [useCustomDed, setUseCustomDed] = useState(false);
  const [groups, setGroups]             = useState<PricingGroup[]>(deepClone(DEFAULT_PRICING_CONFIG.groups));
  const [dedInputs, setDedInputs]       = useState<Record<string, string>>({});

  const [useCustomFloor, setUseCustomFloor] = useState(false);
  const [floorInput, setFloorInput]         = useState("60");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchProductById(id), fetchPricingConfig()]).then(([p, cfg]) => {
      if (!p) { router.replace("/admin/prices"); return; }
      setProduct(p);
      setGlobalGroups(cfg.groups);
      setStorageMultiplier(cfg.storageMultiplier);

      // Init storage price inputs
      const storages = p.storage.split(" / ");
      const inputs: Record<string, string> = {};
      storages.forEach((s, idx) => {
        const explicit = p.storage_prices?.[s];
        inputs[s] = explicit !== undefined
          ? String(explicit)
          : String(autoCalcPrice(p.price_good, idx, storages.length, cfg.storageMultiplier));
      });
      setStoragePriceInputs(inputs);

      // Init deductions
      const initGroups = (p.deductions && p.deductions.length > 0) ? deepClone(p.deductions) : deepClone(cfg.groups);
      setUseCustomDed(!!(p.deductions && p.deductions.length > 0));
      setGroups(initGroups);
      setDedInputs(groupsToDedInputs(initGroups));

      // Init floor
      if (p.floor_pct != null) {
        setUseCustomFloor(true);
        setFloorInput(String(Math.round(p.floor_pct * 100)));
      } else {
        setUseCustomFloor(false);
        setFloorInput(String(Math.round(cfg.floorPct * 100)));
      }
      setLoading(false);
    });
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetStoragePrices() {
    if (!product) return;
    const storages = product.storage.split(" / ");
    const inputs: Record<string, string> = {};
    storages.forEach((s, idx) => {
      inputs[s] = String(autoCalcPrice(product.price_good, idx, storages.length, storageMultiplier));
    });
    setStoragePriceInputs(inputs);
  }

  function setDedInput(gi: number, oi: number, val: string) {
    setDedInputs(prev => ({ ...prev, [`${gi}-${oi}`]: val }));
    const n = parseInt(val, 10);
    if (!isNaN(n)) {
      setGroups(prev => {
        const next = deepClone(prev);
        next[gi].options[oi].ded = n;
        return next;
      });
    }
  }

  function commitDedInput(gi: number, oi: number) {
    const raw = dedInputs[`${gi}-${oi}`] ?? "";
    const n = parseInt(raw, 10);
    if (isNaN(n)) {
      // revert to current groups value
      setDedInputs(prev => ({ ...prev, [`${gi}-${oi}`]: String(groups[gi]?.options[oi]?.ded ?? 0) }));
    }
  }

  async function handleSave() {
    if (!product) return;
    setSaving(true);
    setSaveError(null);

    // Commit any in-flight dedInput values into groups
    const finalGroups = deepClone(groups);
    Object.entries(dedInputs).forEach(([key, raw]) => {
      const [giS, oiS] = key.split("-");
      const gi = parseInt(giS, 10);
      const oi = parseInt(oiS, 10);
      const n = parseInt(raw, 10);
      if (!isNaN(n) && finalGroups[gi]?.options[oi]) {
        finalGroups[gi].options[oi].ded = n;
      }
    });

    const storages = product.storage.split(" / ");

    // Build storage_prices map — only save if any value differs from auto-calc
    const storagePricesMap: Record<string, number> = {};
    let hasExplicit = false;
    storages.forEach((s, idx) => {
      const val = parseInt(storagePriceInputs[s] ?? "", 10);
      const auto = autoCalcPrice(product.price_good, idx, storages.length, storageMultiplier);
      storagePricesMap[s] = isNaN(val) ? auto : val;
      if (!isNaN(val) && val !== auto) hasExplicit = true;
    });

    // Only update price_good if user explicitly changed storage prices
    const productUpdates: { price_good?: number } = {};
    if (hasExplicit) {
      const firstStorage = storages[0];
      productUpdates.price_good = storagePricesMap[firstStorage] ?? product.price_good;
    }

    const parsedFloor = parseFloat(floorInput) / 100;
    const floorToSave = useCustomFloor && !isNaN(parsedFloor) ? parsedFloor : null;

    const [r1, r2, r3, r4] = await Promise.all([
      updateProduct(product.id, productUpdates, currentUserEmail),
      updateProductStoragePrices(product.id, hasExplicit ? storagePricesMap : null, currentUserEmail),
      updateProductDeductions(product.id, useCustomDed ? finalGroups : null, currentUserEmail),
      updateProductFloor(product.id, floorToSave, currentUserEmail),
    ]);

    setSaving(false);

    const err = (!r1.success && r1.error) || (!r2.success && r2.error) || (!r3.success && r3.error) || (!r4.success && r4.error);
    if (err) {
      setSaveError(err);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: TEXT3 }}>กำลังโหลด...</p>
      </div>
    );
  }
  if (!product) return null;

  const storages = product.storage.split(" / ");

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      <div style={{ padding: "52px 16px 120px", maxWidth: 680, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.push("/admin/prices")}
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>{product.model}</h1>
            <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>
              {storages.length} ความจุ · ราคาก่อนหักตัวเลือก
            </p>
          </div>
        </div>

        {/* Per-storage pricing */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>ราคาแต่ละความจุ (฿)</p>
              <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>ราคาก่อนลูกค้าเลือกตัวเลือกสภาพเครื่อง</p>
            </div>
            <button
              onClick={resetStoragePrices}
              title="รีเซ็ตเป็นอัตโนมัติ"
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", color: TEXT2, fontSize: 11, fontFamily: "inherit" }}
            >
              <RotateCcw size={12} /> รีเซ็ต
            </button>
          </div>

          {storages.map((s, idx) => {
            const autoPrice = autoCalcPrice(product.price_good, idx, storages.length, storageMultiplier);
            const currentVal = storagePriceInputs[s] ?? String(autoPrice);
            const parsedVal = parseInt(currentVal, 10);
            const isExplicit = product.storage_prices?.[s] !== undefined;
            const isDiff = !isNaN(parsedVal) && parsedVal !== autoPrice;

            return (
              <div
                key={s}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: idx < storages.length - 1 ? `1px solid ${BORDER}` : "none",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ color: TEXT, fontSize: 15, fontWeight: 700, margin: 0 }}>{s}</p>
                    {isExplicit && !isDiff && (
                      <span style={{ fontSize: 10, color: TEXT3, background: "#F0F0F0", padding: "1px 7px", borderRadius: 99 }}>กำหนดเอง</span>
                    )}
                    {isDiff && (
                      <span style={{ fontSize: 10, color: GOLD, background: `${GOLD}15`, padding: "1px 7px", borderRadius: 99, fontWeight: 600 }}>แก้ไข</span>
                    )}
                  </div>
                  {isDiff && (
                    <p style={{ color: TEXT3, fontSize: 11, margin: "3px 0 0" }}>
                      อัตโนมัติ: ฿{autoPrice.toLocaleString("th-TH")}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: TEXT2, fontSize: 13 }}>฿</span>
                  <input
                    type="number"
                    value={currentVal}
                    onChange={e => setStoragePriceInputs(prev => ({ ...prev, [s]: e.target.value }))}
                    onFocus={e => e.target.select()}
                    style={{
                      width: 110, textAlign: "right",
                      padding: "8px 10px",
                      border: `1px solid ${isDiff ? GOLD : BORDER}`,
                      borderRadius: 8, fontSize: 15, fontWeight: 700,
                      color: TEXT,
                      background: isDiff ? `${GOLD}08` : BG,
                      fontFamily: "inherit", outline: "none",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Deduction mode toggle */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>ค่าหักราคา (ตามตัวเลือกลูกค้า)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { val: false, label: "ใช้ค่ามาตรฐาน",            sub: "ตามที่ตั้งไว้ใน \"ตั้งค่าคำนวณ\""         },
              { val: true,  label: "กำหนดเองสำหรับรุ่นนี้",    sub: "ค่าหักจะใช้เฉพาะรุ่น " + product.model },
            ].map(({ val, label, sub }) => (
              <label
                key={String(val)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${useCustomDed === val ? GOLD : BORDER}`,
                  background: useCustomDed === val ? `${GOLD}08` : BG,
                }}
              >
                <input
                  type="radio"
                  checked={useCustomDed === val}
                  onChange={() => {
                    setUseCustomDed(val);
                    if (!val) {
                      const g = deepClone(globalGroups);
                      setGroups(g);
                      setDedInputs(groupsToDedInputs(g));
                    } else {
                      const base = deepClone(globalGroups);
                      const modelTypeIdx = base.findIndex(g => g.key === "model_type");
                      const overrideOpts = modelTypeIdx !== -1
                        ? getModelTypeOpts(product.model, base[modelTypeIdx].options)
                        : null;
                      if (modelTypeIdx !== -1 && overrideOpts) base[modelTypeIdx].options = overrideOpts;
                      setGroups(base);
                      setDedInputs(groupsToDedInputs(base));
                    }
                  }}
                  style={{ marginTop: 2, accentColor: GOLD, flexShrink: 0 }}
                />
                <div>
                  <p style={{ color: TEXT, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{label}</p>
                  <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>{sub}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Floor price */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>ราคาต่ำสุด (Floor)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { val: false, label: "ใช้ค่ามาตรฐาน",         sub: "ตามที่ตั้งไว้ใน \"ตั้งค่าคำนวณ\""        },
              { val: true,  label: "กำหนดเองสำหรับรุ่นนี้", sub: "ราคาต่ำสุดเฉพาะรุ่น " + product.model },
            ].map(({ val, label, sub }) => (
              <label
                key={String(val)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${useCustomFloor === val ? GOLD : BORDER}`,
                  background: useCustomFloor === val ? `${GOLD}08` : BG,
                }}
              >
                <input
                  type="radio"
                  checked={useCustomFloor === val}
                  onChange={() => setUseCustomFloor(val)}
                  style={{ marginTop: 2, accentColor: GOLD, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ color: TEXT, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{label}</p>
                  <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>{sub}</p>
                  {val && useCustomFloor && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={floorInput}
                        onChange={e => setFloorInput(e.target.value)}
                        onFocus={e => e.target.select()}
                        style={{
                          width: 72, textAlign: "center",
                          padding: "7px 10px", border: `1px solid ${GOLD}`,
                          borderRadius: 8, fontSize: 15, fontWeight: 700,
                          color: TEXT, background: `${GOLD}08`,
                          fontFamily: "inherit", outline: "none",
                        }}
                      />
                      <span style={{ color: TEXT2, fontSize: 13 }}>% ของราคาฐาน</span>
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Deduction groups */}
        {useCustomDed && groups.map((group, gi) => (
          <div key={group.key} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: "#FAFAFA" }}>
              <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0 }}>ขั้นที่ {gi + 2} — {group.title}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", padding: "8px 16px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span>ตัวเลือก</span>
              <span style={{ textAlign: "right" }}>ราคาปรับ (฿)</span>
            </div>
            {group.options.map((opt, oi) => {
              const globalDed = globalGroups[gi]?.options[oi]?.ded;
              const isDiff = opt.ded !== globalDed;
              const inputVal = dedInputs[`${gi}-${oi}`] ?? String(opt.ded);
              const parsedInput = parseInt(inputVal, 10);
              const displayColor = !isNaN(parsedInput) ? (parsedInput < 0 ? "#EF4444" : parsedInput > 0 ? "#10B981" : TEXT) : TEXT;
              return (
                <div key={oi} style={{ display: "grid", gridTemplateColumns: "1fr 120px", alignItems: "center", padding: "10px 16px", borderBottom: oi < group.options.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div>
                    <p style={{ color: TEXT, fontSize: 13, margin: "0 0 1px" }}>{opt.label}</p>
                    {opt.sub && <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>{opt.sub}</p>}
                    {isDiff && <p style={{ color: TEXT3, fontSize: 11, margin: "2px 0 0" }}>ค่ามาตรฐาน: {globalDed?.toLocaleString("th-TH")} ฿</p>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <input
                      type="text"
                      inputMode="text"
                      value={inputVal}
                      onChange={e => setDedInput(gi, oi, e.target.value)}
                      onBlur={() => commitDedInput(gi, oi)}
                      onFocus={e => e.target.select()}
                      style={{
                        width: 100, textAlign: "right", padding: "6px 10px",
                        border: `1px solid ${isDiff ? GOLD : BORDER}`, borderRadius: 8,
                        fontSize: 13, fontWeight: 600,
                        color: displayColor,
                        background: isDiff ? `${GOLD}08` : BG,
                        fontFamily: "inherit", outline: "none",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sticky save bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: CARD,
        borderTop: `1px solid ${BORDER}`,
        padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6, zIndex: 50,
      }}>
        {saveError && (
          <p style={{ color: "#EF4444", fontSize: 12, margin: 0, textAlign: "center" }}>
            บันทึกไม่สำเร็จ: {saveError}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1, width: "100%", maxWidth: 400, padding: "12px 20px", border: "none", borderRadius: 10,
            background: saved ? "#10B981" : saveError ? "#EF4444" : GOLD, color: "#fff", fontSize: 14, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.2s",
          }}
        >
          {saved ? <><Check size={16} /> บันทึกแล้ว</> : saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  );
}
