"use client";

import { useEffect, useState } from "react";
import { useThemeColors } from "./ThemeContext";
import { updateStockSale, fetchStockStaff } from "@/app/actions/stocks";
import type { StockItem } from "@/lib/stock/types";

interface Props {
  item: StockItem;
  onClose: () => void;
  onSuccess: (updates: Partial<StockItem>) => void;
}

const SALE_TYPES = ["ขายปลีก", "ขายส่ง"] as const;

// แก้ไขข้อมูลการขายย้อนหลัง (กรณีลงข้อมูลพลาด)
export default function EditSaleModal({ item, onClose, onSuccess }: Props) {
  const c = useThemeColors();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [soldPrice, setSoldPrice] = useState(item.soldPrice !== undefined ? String(item.soldPrice) : "");
  const [buyerName, setBuyerName] = useState(item.buyerName ?? "");
  const [buyerPhone, setBuyerPhone] = useState(item.buyerPhone ?? "");
  const [soldAt, setSoldAt] = useState((item.soldAt ?? new Date().toISOString()).slice(0, 10));
  const [soldBy, setSoldBy] = useState(item.soldBy ?? "");
  const [saleType, setSaleType] = useState<"ขายปลีก" | "ขายส่ง">(item.saleType === "ขายส่ง" ? "ขายส่ง" : "ขายปลีก");
  const [deliveryChannel, setDeliveryChannel] = useState<string>(item.deliveryChannel ?? "");

  const [staff, setStaff] = useState<string[]>([]);
  useEffect(() => { fetchStockStaff().then(setStaff); }, []);

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: c.bg, border: `1px solid ${c.border}`,
    color: c.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none",
  };
  const labelSt: React.CSSProperties = { color: c.text2, fontSize: 12, fontWeight: 600, margin: "0 0 6px", display: "block" };

  async function handleSave() {
    const price = Number(soldPrice.replace(/,/g, ""));
    if (!price) { setError("กรุณากรอกราคาขาย"); return; }
    if (!buyerName.trim()) { setError("กรุณากรอกชื่อผู้ซื้อ/คู่ค้า"); return; }
    setSaving(true); setError("");
    const res = await updateStockSale(item.id, {
      soldPrice: price,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      soldAt,
      soldBy: soldBy || null,
      saleType,
      partnerName: saleType === "ขายส่ง" ? buyerName.trim() : null,
      deliveryChannel: deliveryChannel || null,
    });
    if (res.success) {
      onSuccess({
        soldPrice: price,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        soldAt,
        soldBy: soldBy || undefined,
        saleType,
        deliveryChannel: deliveryChannel || undefined,
      });
      onClose();
    } else {
      setError(res.error ?? "บันทึกไม่สำเร็จ");
    }
    setSaving(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, border: `1px solid ${c.border}`, maxHeight: "90vh", overflowY: "auto" }}>
        <p style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>แก้ไขข้อมูลการขาย</p>
        <p style={{ color: c.text3, fontSize: 12, margin: "0 0 22px" }}>{item.model} · {item.storage} · {item.id}</p>

        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>ราคาขายจริง (บาท) *</label>
          <input type="number" value={soldPrice} onChange={e => setSoldPrice(e.target.value)} style={inputSt} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>วันที่ขาย *</label>
          <input type="date" value={soldAt} onChange={e => setSoldAt(e.target.value)} style={{ ...inputSt, colorScheme: "auto" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>พนักงานขาย</label>
          <select value={soldBy} onChange={e => setSoldBy(e.target.value)} style={{ ...inputSt, cursor: "pointer", color: soldBy ? c.text : c.text3 }}>
            <option value="">— ไม่ระบุ —</option>
            {staff.map(s => <option key={s} value={s}>{s}</option>)}
            {soldBy && !staff.includes(soldBy) && <option value={soldBy}>{soldBy}</option>}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>ประเภทการขาย *</label>
          <div style={{ display: "flex", gap: 8 }}>
            {SALE_TYPES.map(type => (
              <button key={type} onClick={() => setSaleType(type)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10,
                  border: `1.5px solid ${saleType === type ? (type === "ขายส่ง" ? "#3b82f6" : "#22c55e") : c.border}`,
                  background: saleType === type ? (type === "ขายส่ง" ? "rgba(59,130,246,0.12)" : "rgba(34,197,94,0.12)") : c.bg,
                  color: saleType === type ? (type === "ขายส่ง" ? "#3b82f6" : "#22c55e") : c.text2,
                  fontSize: 14, fontWeight: saleType === type ? 700 : 400, cursor: "pointer", fontFamily: "inherit",
                }}>
                {type}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>{saleType === "ขายส่ง" ? "คู่ค้า / ผู้รับสินค้า *" : "ชื่อผู้ซื้อ *"}</label>
          <input type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} style={inputSt} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelSt}>เบอร์โทร</label>
          <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="08x-xxx-xxxx" style={inputSt} />
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={labelSt}>ช่องทางจัดส่ง</label>
          <select value={deliveryChannel} onChange={e => setDeliveryChannel(e.target.value)}
            style={{ ...inputSt, cursor: "pointer", color: deliveryChannel ? c.text : c.text3 }}>
            <option value="">— ไม่ระบุ —</option>
            <option value="หน้าร้าน">รับที่หน้าร้าน</option>
            <option value="ส่งถึงที่">เราไปส่งถึงที่</option>
            <option value="ส่งพัสดุ">ส่งพัสดุ</option>
          </select>
          <p style={{ color: c.text3, fontSize: 11, margin: "6px 0 0" }}>* สถานะจัดส่ง / เลข Tracking แก้ที่ปุ่ม &ldquo;ยืนยันส่งของ&rdquo; และช่อง Tracking</p>
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 14px" }}>{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 2, padding: "12px", borderRadius: 12, background: saving ? "#555" : "#22c55e", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </div>
      </div>
    </div>
  );
}
