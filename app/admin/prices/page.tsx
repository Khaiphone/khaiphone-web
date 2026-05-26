"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronLeft, Plus, Check, Eye, EyeOff, ChevronRight, Layers, X, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchProducts, updateProduct, createProduct, bulkUpdateProductPrices, syncProductsFromLib, syncStorageFromLib } from "@/app/actions/products";
import type { ProductRow } from "@/app/actions/products";
import { supabase } from "@/lib/supabase";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

const CATEGORIES = [
  { key: "iphone",    label: "iPhone"      },
  { key: "ipad",      label: "iPad"        },
  { key: "macbook",   label: "MacBook"     },
  { key: "watch",     label: "Watch"       },
  { key: "accessory", label: "Accessories" },
] as const;

type Category = typeof CATEGORIES[number]["key"];

const EMPTY_NEW = { model: "", storage: "", price_good: "", category: "iphone" as Category };

function modelSortKey(model: string): [number, number] {
  const gen = parseInt(model.match(/(\d+)/)?.[1] ?? "0", 10);
  const m = model.toLowerCase();
  let variant = 4;
  if (m.includes("pro max"))                                       variant = 0;
  else if (m.includes("pro"))                                      variant = 1;
  else if (m.includes("plus") || (m.includes("max") && !m.includes("pro max"))) variant = 2;
  else if (m.includes("air"))                                      variant = 3;
  else if (m.includes("mini") || /\d+e(\s|$)/.test(m))            variant = 5;
  return [gen, variant];
}

function storageSortKey(storage: string): number {
  const n = parseInt(storage.replace(/\D/g, ""), 10) || 0;
  return storage.toLowerCase().includes("tb") ? n * 1000 : n;
}

export default function PricesPage() {
  const router = useRouter();
  const [products, setProducts]   = useState<ProductRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<Category>("iphone");
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [saving, setSaving]       = useState<Record<string, boolean>>({});
  const [saved, setSaved]         = useState<Record<string, boolean>>({});
  const [newProduct, setNewProduct] = useState(EMPTY_NEW);
  const [adding, setAdding]       = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | undefined>();

  // Sync
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncingStorage, setSyncingStorage] = useState(false);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await syncProductsFromLib();
    setSyncing(false);
    if (res.success) {
      setSyncMsg(res.inserted === 0 ? "✓ รายการครบแล้ว ไม่มีรุ่นใหม่ที่ต้องเพิ่ม" : `✓ เพิ่ม ${res.inserted} รุ่นเรียบร้อย`);
      if (res.inserted > 0) await load();
    } else {
      setSyncMsg(`✗ ${"error" in res ? res.error : "เกิดข้อผิดพลาด"}`);
    }
    setTimeout(() => setSyncMsg(null), 5000);
  }

  async function handleSyncStorage() {
    setSyncingStorage(true);
    setSyncMsg(null);
    const res = await syncStorageFromLib();
    setSyncingStorage(false);
    if (res.success) {
      setSyncMsg(`✓ อัปเดต storage ${res.updated} รุ่นเรียบร้อย`);
      await load();
    } else {
      setSyncMsg(`✗ ${"error" in res ? res.error : "เกิดข้อผิดพลาด"}`);
    }
    setTimeout(() => setSyncMsg(null), 5000);
  }

  // Bulk (tier) mode
  const [bulkMode, setBulkMode]   = useState(false);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [bulkType, setBulkType]   = useState<"flat" | "pct">("flat");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  async function load() {
    const data = await fetchProducts();
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setCurrentUserEmail(data.user?.email));
  }, []);

  const visible = useMemo(() => {
    return products
      .filter(p => p.category === tab)
      .sort((a, b) => {
        const [genA, varA] = modelSortKey(a.model);
        const [genB, varB] = modelSortKey(b.model);
        if (genB !== genA) return genB - genA;
        if (varA !== varB) return varA - varB;
        return storageSortKey(b.storage) - storageSortKey(a.storage);
      });
  }, [products, tab]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === visible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visible.map(p => p.id)));
    }
  }

  function exitBulkMode() {
    setBulkMode(false);
    setSelected(new Set());
    setBulkValue("");
    setBulkResult(null);
  }

  async function handleBulkApply() {
    const val = parseFloat(bulkValue);
    if (isNaN(val) || selected.size === 0) return;
    setBulkApplying(true);
    setBulkResult(null);
    const res = await bulkUpdateProductPrices([...selected], bulkType, val, currentUserEmail);
    setBulkApplying(false);
    if (res.success) {
      setBulkResult(`✓ ปรับราคา ${res.updated} รุ่นเรียบร้อย`);
      setBulkValue("");
      setSelected(new Set());
      await load();
    } else {
      setBulkResult(`✗ ${"error" in res ? res.error : "เกิดข้อผิดพลาด"}`);
    }
  }

  async function handleSavePrice(p: ProductRow) {
    const raw = priceEdits[p.id];
    const price = raw !== undefined ? parseInt(raw.replace(/,/g, ""), 10) : p.price_good;
    if (isNaN(price) || price < 0) return;

    setSaving(s => ({ ...s, [p.id]: true }));
    const now = new Date().toISOString();
    const res = await updateProduct(p.id, { price_good: price }, currentUserEmail);
    setSaving(s => ({ ...s, [p.id]: false }));

    if (res.success) {
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, price_good: price, updated_at: now, updated_by: currentUserEmail ?? null } : x));
      setPriceEdits(e => { const n = { ...e }; delete n[p.id]; return n; });
      setSaved(s => ({ ...s, [p.id]: true }));
      setTimeout(() => setSaved(s => ({ ...s, [p.id]: false })), 2000);
    }
  }

  async function handleToggleActive(p: ProductRow) {
    await updateProduct(p.id, { active: !p.active }, currentUserEmail);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !p.active } : x));
  }

  async function handleAddProduct() {
    if (!newProduct.model.trim() || !newProduct.storage.trim() || !newProduct.price_good) return;
    const price = parseInt(String(newProduct.price_good).replace(/,/g, ""), 10);
    if (isNaN(price)) return;

    setAdding(true);
    const res = await createProduct({
      model:      newProduct.model.trim(),
      storage:    newProduct.storage.trim(),
      price_good: price,
      category:   newProduct.category,
    });
    setAdding(false);

    if (res.success) {
      setNewProduct(EMPTY_NEW);
      setShowAddForm(false);
      setTab(newProduct.category);
      await load();
    }
  }

  const bulkPreview = (() => {
    const val = parseFloat(bulkValue);
    if (isNaN(val) || selected.size === 0) return null;
    const samples = [...selected].slice(0, 2).map(id => {
      const p = products.find(x => x.id === id);
      if (!p) return null;
      const newPrice = bulkType === "flat"
        ? Math.max(0, p.price_good + val)
        : Math.max(0, Math.round(p.price_good * (1 + val / 100)));
      return { model: p.model, storage: p.storage, from: p.price_good, to: newPrice };
    }).filter(Boolean);
    return samples;
  })();

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      <div style={{ padding: "52px 16px 140px", maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.push("/admin/dashboard")}
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}
          >
            <ChevronLeft size={22} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>จัดการราคา</h1>
            <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>แก้ไขราคาประเมินแต่ละรุ่น</p>
          </div>
          {/* Sync buttons */}
          {!bulkMode && (
            <>
              <button
                onClick={handleSync}
                disabled={syncing}
                title="เพิ่มรุ่นที่ขาดจาก estimate list เข้า DB"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: 10,
                  background: CARD, color: TEXT2, fontSize: 13, cursor: syncing ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: syncing ? 0.6 : 1,
                }}
              >
                <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
                {syncing ? "..." : "Sync"}
              </button>
              <button
                onClick={handleSyncStorage}
                disabled={syncingStorage}
                title="อัปเดต storage string และลบ storage ที่ไม่มีแล้วออกจาก storage_prices"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: 10,
                  background: CARD, color: TEXT2, fontSize: 13, cursor: syncingStorage ? "not-allowed" : "pointer",
                  fontFamily: "inherit", opacity: syncingStorage ? 0.6 : 1,
                }}
              >
                <RefreshCw size={15} className={syncingStorage ? "animate-spin" : ""} />
                {syncingStorage ? "..." : "Sync Storage"}
              </button>
            </>
          )}

          {/* Tier/bulk mode toggle */}
          {!bulkMode ? (
            <button
              onClick={() => { setBulkMode(true); setBulkResult(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", border: `1px solid ${BORDER}`, borderRadius: 10,
                background: CARD, color: TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Layers size={15} /> ปรับหลายรุ่น
            </button>
          ) : (
            <button
              onClick={exitBulkMode}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", border: `1px solid #EF4444`, borderRadius: 10,
                background: "rgba(239,68,68,0.06)", color: "#EF4444", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <X size={15} /> ยกเลิก
            </button>
          )}
        </div>

        {/* Sync message */}
        {syncMsg && (
          <div style={{
            marginBottom: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: syncMsg.startsWith("✓") ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            color: syncMsg.startsWith("✓") ? "#059669" : "#DC2626",
            border: `1px solid ${syncMsg.startsWith("✓") ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}>
            {syncMsg}
          </div>
        )}

        {/* Bulk result message */}
        {bulkResult && (
          <div style={{
            marginBottom: 12, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: bulkResult.startsWith("✓") ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            color: bulkResult.startsWith("✓") ? "#059669" : "#DC2626",
            border: `1px solid ${bulkResult.startsWith("✓") ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}>
            {bulkResult}
          </div>
        )}

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => { setTab(c.key); setSelected(new Set()); }}
              style={{
                padding: "8px 18px",
                borderRadius: 99,
                border: `1px solid ${tab === c.key ? GOLD : BORDER}`,
                background: tab === c.key ? `${GOLD}18` : CARD,
                color: tab === c.key ? GOLD : TEXT2,
                fontSize: 13,
                fontWeight: tab === c.key ? 700 : 400,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
          {loading ? (
            <p style={{ color: TEXT3, fontSize: 14, textAlign: "center", padding: "32px 0" }}>กำลังโหลด...</p>
          ) : visible.length === 0 ? (
            <p style={{ color: TEXT3, fontSize: 14, textAlign: "center", padding: "32px 0" }}>ยังไม่มีรุ่นในหมวดนี้</p>
          ) : (
            <>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: bulkMode ? "32px 1fr 140px 100px 36px" : "1fr 140px 100px 36px",
                padding: "10px 16px", borderBottom: `1px solid ${BORDER}`,
                fontSize: 11, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.05em",
                alignItems: "center",
              }}>
                {bulkMode && (
                  <input
                    type="checkbox"
                    checked={selected.size === visible.length && visible.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", accentColor: GOLD, width: 16, height: 16 }}
                  />
                )}
                <span>รุ่น {bulkMode && selected.size > 0 && <span style={{ color: GOLD }}>({selected.size} เลือกอยู่)</span>}</span>
                <span style={{ textAlign: "right" }}>ราคาตั้งต้น (฿)</span>
                <span></span>
                <span></span>
              </div>

              {visible.map((p, i) => {
                const editVal = priceEdits[p.id] ?? p.price_good.toLocaleString("th-TH");
                const isDirty = priceEdits[p.id] !== undefined &&
                  parseInt(priceEdits[p.id].replace(/,/g, ""), 10) !== p.price_good;
                const isSelected = selected.has(p.id);

                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: bulkMode ? "32px 1fr 140px 100px 36px 36px" : "1fr 140px 100px 36px 36px",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderBottom: i < visible.length - 1 ? `1px solid ${BORDER}` : "none",
                      opacity: p.active ? 1 : 0.45,
                      background: isSelected ? `${GOLD}08` : "transparent",
                      transition: "background 150ms",
                    }}
                  >
                    {bulkMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(p.id)}
                        style={{ cursor: "pointer", accentColor: GOLD, width: 16, height: 16 }}
                      />
                    )}

                    {/* Model — click to detail (disabled in bulk mode) */}
                    <button
                      onClick={() => bulkMode ? toggleSelect(p.id) : router.push(`/admin/prices/${p.id}`)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ color: TEXT, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{p.model}</p>
                        {p.deductions && <span style={{ fontSize: 10, background: `${GOLD}20`, color: GOLD, padding: "1px 6px", borderRadius: 99, fontWeight: 600 }}>กำหนดเอง</span>}
                      </div>
                      <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>{p.storage}</p>
                      {p.updated_at && (
                        <p style={{ color: TEXT3, fontSize: 10, margin: "3px 0 0" }}>
                          {new Date(p.updated_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                          {p.updated_by && ` · ${p.updated_by}`}
                        </p>
                      )}
                    </button>

                    {/* Price input */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editVal}
                        onChange={e => setPriceEdits(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onFocus={e => { if (!priceEdits[p.id]) setPriceEdits(prev => ({ ...prev, [p.id]: String(p.price_good) })); e.target.select(); }}
                        disabled={bulkMode}
                        style={{
                          width: 110,
                          textAlign: "right",
                          padding: "6px 10px",
                          border: `1px solid ${isDirty ? GOLD : BORDER}`,
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          color: TEXT,
                          background: isDirty ? `${GOLD}08` : BG,
                          outline: "none",
                          fontFamily: "inherit",
                          opacity: bulkMode ? 0.5 : 1,
                        }}
                      />
                    </div>

                    {/* Save button */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {!bulkMode && (saved[p.id] ? (
                        <span style={{ color: "#10B981", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <Check size={14} /> บันทึก
                        </span>
                      ) : isDirty ? (
                        <button
                          onClick={() => handleSavePrice(p)}
                          disabled={saving[p.id]}
                          style={{
                            background: GOLD, color: "#fff", border: "none",
                            borderRadius: 8, padding: "6px 12px", fontSize: 12,
                            fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                            opacity: saving[p.id] ? 0.6 : 1,
                          }}
                        >
                          {saving[p.id] ? "..." : "บันทึก"}
                        </button>
                      ) : null)}
                    </div>

                    {/* Toggle active */}
                    <button
                      onClick={() => !bulkMode && handleToggleActive(p)}
                      title={p.active ? "ซ่อนรุ่น" : "แสดงรุ่น"}
                      style={{ background: "none", border: "none", cursor: bulkMode ? "default" : "pointer", color: p.active ? "#10B981" : TEXT3, display: "flex", padding: 4, opacity: bulkMode ? 0.3 : 1 }}
                    >
                      {p.active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    {/* Detail arrow */}
                    <button
                      onClick={() => !bulkMode && router.push(`/admin/prices/${p.id}`)}
                      style={{ background: "none", border: "none", cursor: bulkMode ? "default" : "pointer", color: TEXT3, display: "flex", padding: 4, opacity: bulkMode ? 0.3 : 1 }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Add new product (hidden in bulk mode) */}
        {!bulkMode && (!showAddForm ? (
          <button
            onClick={() => { setShowAddForm(true); setNewProduct({ ...EMPTY_NEW, category: tab }); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 12,
              padding: "12px 16px", color: TEXT2, fontSize: 13,
              cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center",
            }}
          >
            <Plus size={16} /> เพิ่มรุ่นใหม่
          </button>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${GOLD}`, borderRadius: 16, padding: 16 }}>
            <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>เพิ่มรุ่นใหม่</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>ชื่อรุ่น</label>
                <input
                  value={newProduct.model}
                  onChange={e => setNewProduct(p => ({ ...p, model: e.target.value }))}
                  placeholder="เช่น iPhone 18 Pro Max"
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: TEXT, fontFamily: "inherit", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>Storage</label>
                <input
                  value={newProduct.storage}
                  onChange={e => setNewProduct(p => ({ ...p, storage: e.target.value }))}
                  placeholder="เช่น 256GB / 512GB / 1TB"
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: TEXT, fontFamily: "inherit", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>ราคาตั้งต้น (฿)</label>
                <input
                  type="number"
                  value={newProduct.price_good}
                  onChange={e => setNewProduct(p => ({ ...p, price_good: e.target.value }))}
                  placeholder="เช่น 40000"
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: TEXT, fontFamily: "inherit", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>หมวดหมู่</label>
                <select
                  value={newProduct.category}
                  onChange={e => setNewProduct(p => ({ ...p, category: e.target.value as Category }))}
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: TEXT, fontFamily: "inherit", outline: "none", background: "#fff" }}
                >
                  {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowAddForm(false); setNewProduct(EMPTY_NEW); }}
                style={{ padding: "8px 16px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "none", color: TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddProduct}
                disabled={adding}
                style={{ padding: "8px 20px", border: "none", borderRadius: 8, background: GOLD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: adding ? 0.6 : 1 }}
              >
                {adding ? "กำลังเพิ่ม..." : "เพิ่มรุ่น"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Floating bulk action bar */}
      {bulkMode && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#fff", borderTop: `1px solid ${BORDER}`,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          padding: "16px",
          zIndex: 50,
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: "0 0 12px" }}>
              ปรับราคา
              {selected.size > 0
                ? <span style={{ color: GOLD }}> {selected.size} รุ่นที่เลือก</span>
                : <span style={{ color: TEXT3 }}> (เลือกรุ่นในรายการก่อน)</span>
              }
            </p>

            {/* Type selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {([["flat", "บวก/ลบเป็นบาท"], ["pct", "บวก/ลบเป็น %"]] as const).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => { setBulkType(type); setBulkValue(""); }}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${bulkType === type ? GOLD : BORDER}`,
                    background: bulkType === type ? `${GOLD}15` : BG,
                    color: bulkType === type ? GOLD : TEXT2,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Value input + apply */}
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", background: BG }}>
                  <span style={{ padding: "0 10px", color: TEXT2, fontSize: 13, whiteSpace: "nowrap" }}>
                    {bulkType === "flat" ? "฿" : "%"}
                  </span>
                  <input
                    type="number"
                    value={bulkValue}
                    onChange={e => setBulkValue(e.target.value)}
                    placeholder={bulkType === "flat" ? "เช่น -2000 หรือ +500" : "เช่น -5 หรือ +3"}
                    style={{
                      flex: 1, padding: "10px 10px 10px 0", border: "none", background: "transparent",
                      fontSize: 14, fontWeight: 600, color: TEXT, outline: "none", fontFamily: "inherit",
                    }}
                  />
                </div>
                {/* Preview */}
                {bulkPreview && bulkPreview.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {bulkPreview.map((s, i) => s && (
                      <span key={i} style={{ fontSize: 11, color: TEXT2, background: BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "3px 8px" }}>
                        {s.model} {s.storage}: <b style={{ color: TEXT3, textDecoration: "line-through" }}>{s.from.toLocaleString("th-TH")}</b>
                        {" → "}<b style={{ color: s.to < s.from ? "#EF4444" : "#10B981" }}>{s.to.toLocaleString("th-TH")}</b>
                      </span>
                    ))}
                    {selected.size > 2 && <span style={{ fontSize: 11, color: TEXT3 }}>+{selected.size - 2} รุ่น</span>}
                  </div>
                )}
              </div>
              <button
                onClick={handleBulkApply}
                disabled={bulkApplying || selected.size === 0 || !bulkValue}
                style={{
                  padding: "10px 20px", border: "none", borderRadius: 10,
                  background: GOLD, color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: (bulkApplying || selected.size === 0 || !bulkValue) ? "not-allowed" : "pointer",
                  opacity: (bulkApplying || selected.size === 0 || !bulkValue) ? 0.5 : 1,
                  fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >
                {bulkApplying ? "กำลังปรับ..." : "ปรับราคา"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
