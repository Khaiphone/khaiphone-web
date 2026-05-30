"use client";

import { useEffect, useState } from "react";
import { useThemeColors } from "./ThemeContext";
import { markStockSold, fetchStockStaff, fetchWholesalePartners } from "@/app/actions/stocks";
import type { StockItem } from "@/lib/stock/types";

interface SellModalProps {
  item: StockItem;
  onClose: () => void;
  onSuccess: (updates: Partial<StockItem>) => void;
}

const SALE_TYPES = ["ขายปลีก", "ขายส่ง"] as const;
const DELIVERY_CHANNELS = [
  { value: "หน้าร้าน", label: "รับที่หน้าร้าน" },
  { value: "ส่งถึงที่", label: "เราไปส่งถึงที่" },
  { value: "ส่งพัสดุ", label: "ส่งพัสดุ" },
] as const;

export default function SellModal({ item, onClose, onSuccess }: SellModalProps) {
  const c = useThemeColors();
  const [selling, setSelling] = useState(false);

  // Form state
  const [soldPrice, setSoldPrice] = useState(item.sellingPrice ? String(item.sellingPrice) : "");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [sellDate, setSellDate] = useState(new Date().toISOString().slice(0, 10));
  const [soldBy, setSoldBy] = useState("");
  const [saleType, setSaleType] = useState<"ขายปลีก" | "ขายส่ง">("ขายปลีก");
  const [partnerName, setPartnerName] = useState("");
  const [newPartner, setNewPartner] = useState("");
  const [deliveryDone, setDeliveryDone] = useState(true);
  const [deliveryChannel, setDeliveryChannel] = useState<string>("หน้าร้าน");

  // Fetched data
  const [staff, setStaff] = useState<string[]>([]);
  const [partners, setPartners] = useState<{ name: string; phone: string }[]>([]);

  useEffect(() => {
    fetchStockStaff().then(setStaff);
    fetchWholesalePartners().then(setPartners);
  }, []);

  const isWholesale = saleType === "ขายส่ง";
  const effectivePartner = partnerName === "__new__" ? newPartner : partnerName;
  const canSubmit = !selling && !!soldPrice && (isWholesale ? !!effectivePartner.trim() : !!buyerName.trim());

  async function handleSubmit() {
    const price = Number(soldPrice.replace(/,/g, ""));
    if (!price) return;
    setSelling(true);
    const res = await markStockSold(
      item.id, price,
      isWholesale ? (effectivePartner.trim() || "-") : buyerName.trim(),
      buyerPhone.trim(),
      sellDate, soldBy || undefined,
      saleType,
      isWholesale ? effectivePartner.trim() : undefined,
      deliveryDone ? deliveryChannel : undefined,
    );
    if (res.success) {
      const effChannel = deliveryDone ? deliveryChannel : undefined;
      onSuccess({
        status: "ขายแล้ว",
        soldPrice: price,
        buyerName: isWholesale ? effectivePartner.trim() : buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        soldAt: sellDate,
        soldBy: soldBy || undefined,
        saleType,
        partnerName: isWholesale ? effectivePartner.trim() : undefined,
        deliveryChannel: effChannel,
        deliveryStatus: !deliveryDone ? "รอจัดส่ง" : effChannel === "หน้าร้าน" ? "จัดส่งแล้ว" : "รอจัดส่ง",
      });
      onClose();
    }
    setSelling(false);
  }

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: c.bg, border: `1px solid ${c.border}`,
    color: c.text, fontSize: 14, fontFamily: "inherit",
    boxSizing: "border-box", outline: "none",
  };
  const labelSt: React.CSSProperties = { color: c.text2, fontSize: 12, fontWeight: 600, margin: "0 0 6px", display: "block" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, border: `1px solid ${c.border}`, maxHeight: "90vh", overflowY: "auto" }}>
        <p style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>บันทึกการขาย</p>
        <p style={{ color: c.text3, fontSize: 12, margin: "0 0 22px" }}>{item.model} · {item.storage} · {item.id}</p>

        {/* ราคาขายจริง */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>ราคาขายจริง (บาท) *</label>
          <input type="number" value={soldPrice} onChange={e => setSoldPrice(e.target.value)}
            placeholder={item.sellingPrice ? String(item.sellingPrice) : "0"} style={inputSt} />
        </div>

        {/* วันที่ขาย */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>วันที่ขาย * <span style={{ color: c.text3, fontWeight: 400 }}>(เลือกย้อนหลังได้)</span></label>
          <input
            type="date"
            value={sellDate}
            onChange={e => setSellDate(e.target.value)}
            style={{ ...inputSt, colorScheme: "auto" }}
          />
        </div>

        {/* พนักงานขาย */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>พนักงานขาย</label>
          <select value={soldBy} onChange={e => setSoldBy(e.target.value)}
            style={{ ...inputSt, cursor: "pointer", color: soldBy ? c.text : c.text3 }}>
            <option value="">— เลือกพนักงาน —</option>
            {staff.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* ประเภทการขาย */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>ประเภทการขาย *</label>
          <div style={{ display: "flex", gap: 8 }}>
            {SALE_TYPES.map(type => (
              <button
                key={type}
                onClick={() => { setSaleType(type); setPartnerName(""); setNewPartner(""); setBuyerName(""); }}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10,
                  border: `1.5px solid ${saleType === type ? (type === "ขายส่ง" ? "#3b82f6" : "#22c55e") : c.border}`,
                  background: saleType === type ? (type === "ขายส่ง" ? "rgba(59,130,246,0.12)" : "rgba(34,197,94,0.12)") : c.bg,
                  color: saleType === type ? (type === "ขายส่ง" ? "#3b82f6" : "#22c55e") : c.text2,
                  fontSize: 14, fontWeight: saleType === type ? 700 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* สถานะการจัดส่ง */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>สถานะการจัดส่ง *</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { done: true,  label: "จัดส่งแล้ว",    color: "#22c55e" },
              { done: false, label: "ยังไม่จัดส่ง", color: "#f97316" },
            ].map(opt => (
              <button
                key={String(opt.done)}
                onClick={() => setDeliveryDone(opt.done)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10, fontSize: 13,
                  border: `1.5px solid ${deliveryDone === opt.done ? opt.color : c.border}`,
                  background: deliveryDone === opt.done ? `${opt.color}18` : c.bg,
                  color: deliveryDone === opt.done ? opt.color : c.text2,
                  fontWeight: deliveryDone === opt.done ? 700 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ช่องทางการรับสินค้า — แสดงเมื่อจัดส่งแล้ว */}
        {deliveryDone && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>ช่องทางการรับสินค้า *</label>
            <div style={{ display: "flex", gap: 8 }}>
              {DELIVERY_CHANNELS.map(ch => (
                <button
                  key={ch.value}
                  onClick={() => setDeliveryChannel(ch.value)}
                  style={{
                    flex: 1, padding: "9px 4px", borderRadius: 10, fontSize: 13,
                    border: `1.5px solid ${deliveryChannel === ch.value ? "#f59e0b" : c.border}`,
                    background: deliveryChannel === ch.value ? "rgba(245,158,11,0.12)" : c.bg,
                    color: deliveryChannel === ch.value ? "#f59e0b" : c.text2,
                    fontWeight: deliveryChannel === ch.value ? 700 : 400,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ขายส่ง: เลือกคู่ค้า */}
        {isWholesale && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelSt}>คู่ค้า / ผู้รับสินค้า *</label>
            <select value={partnerName} onChange={e => {
              const val = e.target.value;
              setPartnerName(val);
              const found = partners.find(p => p.name === val);
              if (found?.phone) setBuyerPhone(found.phone);
            }} style={{ ...inputSt, cursor: "pointer", color: partnerName ? c.text : c.text3, marginBottom: 8 }}>
              <option value="">— เลือกคู่ค้า —</option>
              {partners.map(p => <option key={p.name} value={p.name}>{p.name}{p.phone ? ` · ${p.phone}` : ""}</option>)}
              <option value="__new__">+ เพิ่มคู่ค้าใหม่</option>
            </select>
            {partnerName === "__new__" && (
              <input value={newPartner} onChange={e => setNewPartner(e.target.value)}
                placeholder="ชื่อคู่ค้าใหม่" style={inputSt} />
            )}
          </div>
        )}

        {/* ขายปลีก: ชื่อ-เบอร์ผู้ซื้อ */}
        {!isWholesale && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>ชื่อผู้ซื้อ *</label>
              <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)}
                placeholder="ชื่อลูกค้า" style={inputSt} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelSt}>เบอร์โทรผู้ซื้อ</label>
              <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)}
                placeholder="08x-xxx-xxxx" style={inputSt} />
            </div>
          </>
        )}

        {/* ขายส่ง: เบอร์คู่ค้า */}
        {isWholesale && (
          <div style={{ marginBottom: 22 }}>
            <label style={labelSt}>เบอร์ติดต่อ</label>
            <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)}
              placeholder="08x-xxx-xxxx" style={inputSt} />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            ยกเลิก
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ flex: 2, padding: "12px", borderRadius: 12, background: canSubmit ? "#22c55e" : "#555", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {selling ? "กำลังบันทึก..." : "ยืนยันการขาย"}
          </button>
        </div>
      </div>
    </div>
  );
}
