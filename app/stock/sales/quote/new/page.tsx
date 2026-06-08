"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Trash2, ChevronLeft, ChevronRight, Check, User, FileText } from "lucide-react";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { GradeBadge } from "@/components/stock/StatusBadge";
import { fetchStockItems } from "@/app/actions/stocks";
import { createQuote, fetchQuote } from "@/app/actions/quotes";
import type { StockItem, StockStatus, QuoteItem } from "@/lib/stock/types";

const SELECTABLE_STATUSES = new Set<StockStatus>(["พร้อมขาย", "ลงขายแล้ว"]);

const DEFAULT_TERMS = `1. ใบเสนอราคานี้มีอายุตามวันที่ระบุด้านบน
2. ราคาที่เสนออาจเปลี่ยนแปลงได้ตามสภาพสินค้า ณ วันที่ชำระเงิน
3. กรุณายืนยันคำสั่งซื้อก่อนวันหมดอายุ`;

function fmt(n: number) { return "฿" + n.toLocaleString("th-TH"); }
function thDate(s: string) {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}
function defaultValidUntil() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

interface CartItem extends QuoteItem {
  stockRef: StockItem;
}

interface CustomerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  overallDiscount: string;
  vatEnabled: boolean;
  validUntil: string;
  note: string;
  terms: string;
}

const INIT_CUSTOMER: CustomerForm = {
  name: "", phone: "", email: "", address: "", taxId: "",
  overallDiscount: "0", vatEnabled: false,
  validUntil: defaultValidUntil(),
  note: "", terms: DEFAULT_TERMS,
};

function QuoteNewInner() {
  const c = useThemeColors();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");

  const [step, setStep] = useState(1);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<CustomerForm>(INIT_CUSTOMER);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    fetchStockItems()
      .then(data => setInventory(data.filter(s => SELECTABLE_STATUSES.has(s.status))))
      .finally(() => setLoadingInv(false));
  }, []);

  // Pre-fill from existing quote (duplicate)
  useEffect(() => {
    if (!fromId) return;
    fetchQuote(fromId).then(q => {
      if (!q) return;
      setCustomer(prev => ({
        ...prev,
        name: q.customerName, phone: q.customerPhone, email: q.customerEmail,
        address: q.customerAddress, taxId: q.customerTaxId,
        overallDiscount: String(q.discountAmount),
        vatEnabled: q.vatRate > 0,
        note: q.note, terms: q.terms || DEFAULT_TERMS,
      }));
    });
  }, [fromId]);

  const filteredInv = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return inventory;
    return inventory.filter(s =>
      s.model.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.imei.includes(q) ||
      s.color.toLowerCase().includes(q) ||
      s.storage.toLowerCase().includes(q)
    );
  }, [inventory, query]);

  const cartIds = useMemo(() => new Set(cart.map(c => c.stockId)), [cart]);

  function addToCart(item: StockItem) {
    if (cartIds.has(item.id)) return;
    setCart(prev => [...prev, {
      stockId: item.id,
      description: [item.model, item.storage, item.color, `เกรด ${item.grade}`].filter(Boolean).join(" "),
      imei: item.imei,
      unitPrice: item.sellingPrice,
      discount: 0,
      total: item.sellingPrice,
      stockRef: item,
    }]);
  }

  function removeFromCart(stockId: string) {
    setCart(prev => prev.filter(c => c.stockId !== stockId));
  }

  function updateCartItem(stockId: string, field: "unitPrice" | "discount", value: string) {
    setCart(prev => prev.map(c => {
      if (c.stockId !== stockId) return c;
      const price = field === "unitPrice" ? Number(value) || 0 : c.unitPrice;
      const disc = field === "discount" ? Number(value) || 0 : c.discount;
      return { ...c, unitPrice: price, discount: disc, total: Math.max(0, price - disc) };
    }));
  }

  const subtotal = cart.reduce((s, c) => s + c.total, 0);
  const overallDiscount = Number(customer.overallDiscount) || 0;
  const afterDiscount = Math.max(0, subtotal - overallDiscount);
  const vatAmount = customer.vatEnabled ? Math.round(afterDiscount * 0.07) : 0;
  const grandTotal = afterDiscount + vatAmount;

  function setCustomerField<K extends keyof CustomerForm>(k: K, v: CustomerForm[K]) {
    setCustomer(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave(status: "draft" | "sent") {
    if (cart.length === 0) return;
    if (!customer.name.trim()) return;
    setSaving(true);
    const result = await createQuote({
      customerName: customer.name.trim(),
      customerPhone: customer.phone.trim(),
      customerEmail: customer.email.trim(),
      customerAddress: customer.address.trim(),
      customerTaxId: customer.taxId.trim(),
      items: cart.map(({ stockRef: _, ...rest }) => rest),
      subtotal,
      discountAmount: overallDiscount,
      vatRate: customer.vatEnabled ? 7 : 0,
      vatAmount,
      total: grandTotal,
      validUntil: customer.validUntil || null,
      note: customer.note.trim(),
      terms: customer.terms.trim(),
      status,
    });
    setSaving(false);
    if (result.success) {
      setSavedId(result.id);
    }
  }

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${c.border}`, background: c.bg, color: c.text,
    fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
  const cardSt: React.CSSProperties = {
    background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}`,
  };
  const btnSt: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    padding: "11px 20px", borderRadius: 12, border: "none",
    fontSize: 13, fontWeight: 700, cursor: "pointer",
  };

  // ── Saved state ───────────────────────────────────────────────────────────
  if (savedId) {
    return (
      <div style={{ background: c.bg, minHeight: "100vh" }}>
        <StockTopbar title="ใบเสนอราคา" subtitle="สร้างสำเร็จ" />
        <div style={{ maxWidth: 560, margin: "60px auto", padding: 24, textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Check size={36} color="#22c55e" />
          </div>
          <h2 style={{ color: c.text, fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>บันทึกสำเร็จ</h2>
          <p style={{ color: c.text3, margin: "0 0 28px" }}>ใบเสนอราคา <strong style={{ color: c.gold }}>{savedId}</strong></p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => window.open(`/print/quote/${savedId}`, "_blank")} style={{ ...btnSt, background: c.gold, color: "#000" }}>
              <FileText size={14} /> พิมพ์ / PDF
            </button>
            <button onClick={() => router.push(`/stock/sales/quote/${savedId}`)} style={{ ...btnSt, background: c.card2, border: `1px solid ${c.border}`, color: c.text }}>
              ดูรายละเอียด
            </button>
            <button onClick={() => router.push("/stock/sales/quote")} style={{ ...btnSt, background: "none", border: `1px solid ${c.border}`, color: c.text2 }}>
              รายการทั้งหมด
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 100 }}>
      <StockTopbar title="สร้างใบเสนอราคา" subtitle={`ขั้นตอน ${step} / 3`} />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
          {[{ n: 1, label: "เลือกสินค้า" }, { n: 2, label: "ข้อมูลลูกค้า" }, { n: 3, label: "ตรวจสอบ" }].map(({ n, label }, i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: step > n ? "#22c55e" : step === n ? c.gold : c.border,
                  color: step >= n ? "#000" : c.text3, fontSize: 13, fontWeight: 700,
                }}>
                  {step > n ? <Check size={14} /> : n}
                </div>
                <span style={{ color: step === n ? c.text : c.text3, fontSize: 13, fontWeight: step === n ? 700 : 400 }}>{label}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1, background: step > n ? "#22c55e" : c.border, margin: "0 12px" }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: เลือกสินค้า ── */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

              {/* Inventory picker */}
              <div style={{ flex: "1 1 400px" }}>
                <div style={cardSt}>
                  <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>
                    เลือกสินค้า <span style={{ color: c.text3, fontSize: 12, fontWeight: 400 }}>({inventory.length} รายการพร้อมขาย)</span>
                  </p>
                  <div style={{ position: "relative", marginBottom: 12 }}>
                    <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหารุ่น, IMEI, รหัสสต็อก..." style={{ ...inputSt, paddingLeft: 30 }} />
                  </div>
                  {loadingInv ? (
                    <p style={{ color: c.text3, textAlign: "center", padding: 24 }}>กำลังโหลด...</p>
                  ) : (
                    <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                      {filteredInv.length === 0 && <p style={{ color: c.text3, textAlign: "center", padding: 20 }}>ไม่พบสินค้า</p>}
                      {filteredInv.map(item => {
                        const inCart = cartIds.has(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => !inCart && addToCart(item)}
                            style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "10px 12px", borderRadius: 10,
                              border: `1px solid ${inCart ? "#22c55e40" : c.border}`,
                              background: inCart ? "rgba(34,197,94,0.06)" : c.bg,
                              cursor: inCart ? "default" : "pointer",
                              opacity: inCart ? 0.7 : 1,
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ color: c.text, fontSize: 13, fontWeight: 700 }}>{item.model}</span>
                                <GradeBadge grade={item.grade} />
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <span style={{ color: c.text3, fontSize: 11, fontFamily: "monospace" }}>{item.id}</span>
                                {item.storage && <span style={{ color: c.text3, fontSize: 11 }}>{item.storage}</span>}
                                {item.color && <span style={{ color: c.text3, fontSize: 11 }}>{item.color}</span>}
                              </div>
                              {item.imei && <span style={{ color: c.text3, fontSize: 10, fontFamily: "monospace" }}>IMEI: {item.imei}</span>}
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <p style={{ color: c.gold, fontSize: 14, fontWeight: 700, margin: 0 }}>{fmt(item.sellingPrice)}</p>
                              {inCart ? (
                                <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>✓ เพิ่มแล้ว</span>
                              ) : (
                                <span style={{ fontSize: 10, color: c.text3 }}>
                                  <Plus size={10} style={{ verticalAlign: "middle" }} /> เพิ่ม
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart */}
              <div style={{ flex: "1 1 300px" }}>
                <div style={cardSt}>
                  <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>
                    รายการที่เลือก <span style={{ color: c.text3, fontSize: 12, fontWeight: 400 }}>({cart.length})</span>
                  </p>
                  {cart.length === 0 ? (
                    <p style={{ color: c.text3, textAlign: "center", padding: 32, fontSize: 13 }}>เลือกสินค้าจากรายการด้านซ้าย</p>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                        {cart.map(item => (
                          <div key={item.stockId} style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.bg }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                              <div>
                                <p style={{ color: c.text, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>{item.stockRef.model}</p>
                                <p style={{ color: c.text3, fontSize: 11, margin: 0, fontFamily: "monospace" }}>{item.stockId}</p>
                              </div>
                              <button onClick={() => removeFromCart(item.stockId)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 2 }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ color: c.text3, fontSize: 10, margin: "0 0 3px" }}>ราคา (฿)</p>
                                <input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={e => updateCartItem(item.stockId, "unitPrice", e.target.value)}
                                  style={{ ...inputSt, padding: "6px 8px", fontSize: 12 }}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <p style={{ color: c.text3, fontSize: 10, margin: "0 0 3px" }}>ส่วนลด (฿)</p>
                                <input
                                  type="number"
                                  value={item.discount}
                                  onChange={e => updateCartItem(item.stockId, "discount", e.target.value)}
                                  style={{ ...inputSt, padding: "6px 8px", fontSize: 12 }}
                                />
                              </div>
                              <div style={{ flexShrink: 0, textAlign: "right" }}>
                                <p style={{ color: c.text3, fontSize: 10, margin: "0 0 3px" }}>รวม</p>
                                <p style={{ color: c.gold, fontSize: 13, fontWeight: 700, margin: 0 }}>{fmt(item.total)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: c.text2, fontSize: 13 }}>ยอดรวม</span>
                          <span style={{ color: c.text, fontSize: 14, fontWeight: 700 }}>{fmt(subtotal)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={() => router.back()} style={{ ...btnSt, background: "none", border: `1px solid ${c.border}`, color: c.text2 }}>
                <ChevronLeft size={15} /> ยกเลิก
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={cart.length === 0}
                style={{ ...btnSt, background: cart.length > 0 ? c.gold : c.border, color: "#000", opacity: cart.length === 0 ? 0.5 : 1 }}
              >
                ถัดไป <ChevronRight size={15} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: ข้อมูลลูกค้า ── */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>

              {/* Customer form */}
              <div style={{ flex: "1 1 380px" }}>
                <div style={cardSt}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <User size={16} color={c.gold} />
                    <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0 }}>ข้อมูลลูกค้า</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>
                        ชื่อ-นามสกุล / บริษัท <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input value={customer.name} onChange={e => setCustomerField("name", e.target.value)} placeholder="ชื่อลูกค้าหรือชื่อบริษัท" style={inputSt} />
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>เบอร์โทร</label>
                        <input value={customer.phone} onChange={e => setCustomerField("phone", e.target.value)} placeholder="08x-xxx-xxxx" style={inputSt} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>อีเมล</label>
                        <input value={customer.email} onChange={e => setCustomerField("email", e.target.value)} placeholder="email@example.com" style={inputSt} />
                      </div>
                    </div>
                    <div>
                      <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>ที่อยู่</label>
                      <textarea value={customer.address} onChange={e => setCustomerField("address", e.target.value)} rows={2} placeholder="ที่อยู่สำหรับออกใบเสนอราคา" style={{ ...inputSt, resize: "vertical" }} />
                    </div>
                    <div>
                      <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>เลขประจำตัวผู้เสียภาษี</label>
                      <input value={customer.taxId} onChange={e => setCustomerField("taxId", e.target.value)} placeholder="13 หลัก (สำหรับนิติบุคคล)" style={inputSt} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial settings */}
              <div style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={cardSt}>
                  <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>เงื่อนไขทางการเงิน</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>ส่วนลดรวม (฿)</label>
                      <input type="number" value={customer.overallDiscount} onChange={e => setCustomerField("overallDiscount", e.target.value)} placeholder="0" style={inputSt} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ color: c.text2, fontSize: 12, fontWeight: 600, margin: "0 0 2px" }}>ภาษีมูลค่าเพิ่ม (VAT 7%)</p>
                        <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>
                          {customer.vatEnabled ? `+${fmt(vatAmount)}` : "ไม่รวม VAT"}
                        </p>
                      </div>
                      <button
                        onClick={() => setCustomerField("vatEnabled", !customer.vatEnabled)}
                        style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: customer.vatEnabled ? c.gold : c.border, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}
                      >
                        <span style={{ position: "absolute", top: 2, left: customer.vatEnabled ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </button>
                    </div>
                    <div>
                      <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>ใบเสนอราคามีอายุถึง</label>
                      <input type="date" value={customer.validUntil} onChange={e => setCustomerField("validUntil", e.target.value)} style={inputSt} />
                    </div>
                  </div>

                  {/* Summary */}
                  <div style={{ marginTop: 16, borderTop: `1px solid ${c.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { label: "ยอดรวมสินค้า", value: fmt(subtotal) },
                      ...(overallDiscount > 0 ? [{ label: "ส่วนลดรวม", value: `-${fmt(overallDiscount)}`, color: "#22c55e" }] : []),
                      ...(customer.vatEnabled ? [{ label: "VAT 7%", value: `+${fmt(vatAmount)}` }] : []),
                    ].map(r => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: c.text3, fontSize: 12 }}>{r.label}</span>
                        <span style={{ color: (r as { color?: string }).color ?? c.text2, fontSize: 12 }}>{r.value}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${c.border}`, paddingTop: 8, marginTop: 2 }}>
                      <span style={{ color: c.text, fontSize: 14, fontWeight: 700 }}>ยอดรวมสุทธิ</span>
                      <span style={{ color: c.gold, fontSize: 16, fontWeight: 800 }}>{fmt(grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Note & Terms */}
                <div style={cardSt}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>หมายเหตุ</label>
                      <textarea value={customer.note} onChange={e => setCustomerField("note", e.target.value)} rows={2} placeholder="หมายเหตุเพิ่มเติม..." style={{ ...inputSt, resize: "vertical" }} />
                    </div>
                    <div>
                      <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5 }}>เงื่อนไขและข้อตกลง</label>
                      <textarea value={customer.terms} onChange={e => setCustomerField("terms", e.target.value)} rows={4} style={{ ...inputSt, resize: "vertical", fontSize: 12 }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(1)} style={{ ...btnSt, background: "none", border: `1px solid ${c.border}`, color: c.text2 }}>
                <ChevronLeft size={15} /> กลับ
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!customer.name.trim()}
                style={{ ...btnSt, background: customer.name.trim() ? c.gold : c.border, color: "#000", opacity: !customer.name.trim() ? 0.5 : 1 }}
              >
                ตรวจสอบ <ChevronRight size={15} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Preview ── */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Preview card */}
            <div style={{ ...cardSt, marginBottom: 20 }}>
              {/* Document header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 20, borderBottom: `2px solid ${c.border}` }}>
                <div>
                  <p style={{ color: c.text, fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>KHAIPHONE</p>
                  <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>ใบเสนอราคา (Quotation)</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: c.text3, fontSize: 12, margin: "0 0 2px" }}>วันที่: <strong style={{ color: c.text }}>{thDate(new Date().toISOString().slice(0, 10))}</strong></p>
                  {customer.validUntil && (
                    <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>มีอายุถึง: <strong style={{ color: c.gold }}>{thDate(customer.validUntil)}</strong></p>
                  )}
                </div>
              </div>

              {/* Customer info */}
              <div style={{ background: c.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <p style={{ color: c.text3, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px", fontWeight: 600 }}>ข้อมูลผู้รับใบเสนอราคา</p>
                <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>{customer.name}</p>
                {customer.phone && <p style={{ color: c.text2, fontSize: 12, margin: "0 0 1px" }}>โทร {customer.phone}</p>}
                {customer.email && <p style={{ color: c.text2, fontSize: 12, margin: "0 0 1px" }}>{customer.email}</p>}
                {customer.address && <p style={{ color: c.text2, fontSize: 12, margin: "0 0 1px" }}>{customer.address}</p>}
                {customer.taxId && <p style={{ color: c.text2, fontSize: 12, margin: 0 }}>เลขผู้เสียภาษี: {customer.taxId}</p>}
              </div>

              {/* Items table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: c.bg }}>
                    {["#", "รายละเอียดสินค้า", "IMEI / S/N", "ราคา", "ส่วนลด", "รวม"].map(h => (
                      <th key={h} style={{ padding: "8px 10px", textAlign: h === "รวม" || h === "ราคา" || h === "ส่วนลด" ? "right" : "left", fontSize: 11, color: c.text3, fontWeight: 600, borderBottom: `1px solid ${c.border}` }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, i) => (
                    <tr key={item.stockId} style={{ borderBottom: `1px solid ${c.border}` }}>
                      <td style={{ padding: "10px", fontSize: 12, color: c.text3 }}>{i + 1}</td>
                      <td style={{ padding: "10px", fontSize: 13, color: c.text, fontWeight: 600 }}>
                        {item.description}
                        <div style={{ color: c.text3, fontSize: 11, fontFamily: "monospace", marginTop: 2 }}>{item.stockId}</div>
                      </td>
                      <td style={{ padding: "10px", fontSize: 11, color: c.text3, fontFamily: "monospace" }}>{item.imei || "—"}</td>
                      <td style={{ padding: "10px", textAlign: "right", fontSize: 13, color: c.text2 }}>{fmt(item.unitPrice)}</td>
                      <td style={{ padding: "10px", textAlign: "right", fontSize: 13, color: item.discount > 0 ? "#22c55e" : c.text3 }}>
                        {item.discount > 0 ? `-${fmt(item.discount)}` : "—"}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right", fontSize: 13, fontWeight: 700, color: c.text }}>{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ minWidth: 240 }}>
                  {[
                    { label: "ยอดรวมสินค้า", value: fmt(subtotal) },
                    ...(overallDiscount > 0 ? [{ label: "ส่วนลดรวม", value: `-${fmt(overallDiscount)}`, bold: false, green: true }] : []),
                    ...(customer.vatEnabled ? [{ label: "VAT 7%", value: `+${fmt(vatAmount)}`, bold: false, green: false }] : []),
                    { label: "ยอดรวมสุทธิ", value: fmt(grandTotal), bold: true, green: false },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: r.label === "ยอดรวมสุทธิ" ? `2px solid ${c.border}` : `1px solid ${c.border}` }}>
                      <span style={{ fontSize: r.bold ? 14 : 12, fontWeight: r.bold ? 700 : 400, color: c.text2 }}>{r.label}</span>
                      <span style={{ fontSize: r.bold ? 16 : 13, fontWeight: r.bold ? 800 : 400, color: r.bold ? c.gold : (r as { green?: boolean }).green ? "#22c55e" : c.text2 }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note & terms */}
              {customer.note && (
                <div style={{ marginTop: 20, padding: "10px 14px", background: c.bg, borderRadius: 8 }}>
                  <p style={{ color: c.text3, fontSize: 11, fontWeight: 600, margin: "0 0 4px" }}>หมายเหตุ</p>
                  <p style={{ color: c.text2, fontSize: 12, margin: 0 }}>{customer.note}</p>
                </div>
              )}
              {customer.terms && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ color: c.text3, fontSize: 11, fontWeight: 600, margin: "0 0 4px" }}>เงื่อนไขและข้อตกลง</p>
                  <pre style={{ color: c.text3, fontSize: 11, margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{customer.terms}</pre>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ ...btnSt, background: "none", border: `1px solid ${c.border}`, color: c.text2 }}>
                <ChevronLeft size={15} /> แก้ไข
              </button>
              <button onClick={() => handleSave("draft")} disabled={saving} style={{ ...btnSt, background: c.card2, border: `1px solid ${c.border}`, color: c.text2, opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "บันทึก Draft"}
              </button>
              <button onClick={() => handleSave("sent")} disabled={saving} style={{ ...btnSt, background: c.gold, color: "#000", opacity: saving ? 0.6 : 1 }}>
                {saving ? "กำลังบันทึก..." : "บันทึกและส่ง"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function QuoteNewPage() {
  return (
    <Suspense fallback={null}>
      <QuoteNewInner />
    </Suspense>
  );
}
