"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Check, Eye, EyeOff, ChevronRight, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchProducts, updateProduct, createProduct } from "@/app/actions/products";
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
  { key: "iphone",  label: "iPhone"   },
  { key: "ipad",    label: "iPad"     },
  { key: "macbook", label: "MacBook"  },
  { key: "watch",   label: "Watch"    },
] as const;

type Category = typeof CATEGORIES[number]["key"];

const EMPTY_NEW = { model: "", storage: "", price_good: "", category: "iphone" as Category };

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

  async function load() {
    const data = await fetchProducts();
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setCurrentUserEmail(data.user?.email));
  }, []);

  const visible = products.filter(p => p.category === tab);

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

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      <div style={{ padding: "52px 16px 32px", maxWidth: 720, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => router.push("/admin/dashboard")}
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: 0 }}>จัดการราคา</h1>
            <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>แก้ไขราคาประเมินแต่ละรุ่น</p>
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 2 }}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setTab(c.key)}
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
                display: "grid", gridTemplateColumns: "1fr 140px 100px 36px",
                padding: "10px 16px", borderBottom: `1px solid ${BORDER}`,
                fontSize: 11, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
                <span>รุ่น</span>
                <span style={{ textAlign: "right" }}>ราคาตั้งต้น (฿)</span>
                <span></span>
                <span></span>
              </div>

              {visible.map((p, i) => {
                const editVal = priceEdits[p.id] ?? p.price_good.toLocaleString("th-TH");
                const isDirty = priceEdits[p.id] !== undefined &&
                  parseInt(priceEdits[p.id].replace(/,/g, ""), 10) !== p.price_good;

                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 140px 100px 36px 36px",
                      alignItems: "center",
                      padding: "12px 16px",
                      borderBottom: i < visible.length - 1 ? `1px solid ${BORDER}` : "none",
                      opacity: p.active ? 1 : 0.45,
                    }}
                  >
                    {/* Model — click to detail */}
                    <button
                      onClick={() => router.push(`/admin/prices/${p.id}`)}
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
                        }}
                      />
                    </div>

                    {/* Save button */}
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      {saved[p.id] ? (
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
                      ) : null}
                    </div>

                    {/* Toggle active */}
                    <button
                      onClick={() => handleToggleActive(p)}
                      title={p.active ? "ซ่อนรุ่น" : "แสดงรุ่น"}
                      style={{ background: "none", border: "none", cursor: "pointer", color: p.active ? "#10B981" : TEXT3, display: "flex", padding: 4 }}
                    >
                      {p.active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>

                    {/* Detail arrow */}
                    <button
                      onClick={() => router.push(`/admin/prices/${p.id}`)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: TEXT3, display: "flex", padding: 4 }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Add new product */}
        {!showAddForm ? (
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
        )}
      </div>
    </div>
  );
}
