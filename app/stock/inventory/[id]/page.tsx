"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import StockTopbar from "@/components/stock/Topbar";
import StockStatusBadge, { GradeBadge } from "@/components/stock/StatusBadge";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchStockItem, verifyStockField } from "@/app/actions/stocks";
import SellModal from "@/components/stock/SellModal";
import type { StockItem } from "@/lib/stock/types";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s?: string) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const CHECK_FIELDS: Array<{ key: "imei" | "serial" | "model" | "storage" | "color"; label: string }> = [
  { key: "imei",    label: "IMEI" },
  { key: "serial",  label: "Serial" },
  { key: "model",   label: "รุ่น" },
  { key: "storage", label: "ความจุ" },
  { key: "color",   label: "สี" },
];

function CrossCheckSection({
  item, c, verifying, onVerify,
}: {
  item: StockItem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any;
  verifying: string | null;
  onVerify: (field: "imei" | "serial" | "model" | "storage" | "color", source: "inspection" | "stock") => void;
}) {
  const snap = item.inspectionSnapshot!;
  const stockVals: Record<string, string> = {
    imei: item.imei, serial: item.serial,
    model: item.model, storage: item.storage, color: item.color,
  };

  const rows = CHECK_FIELDS.map(({ key, label }) => {
    const inspVal  = snap[key] ?? "";
    const stockVal = stockVals[key] ?? "";
    const verified = (snap as Record<string, unknown>)[`${key}_verified`] === true;
    const verifiedSource = (snap as Record<string, unknown>)[`${key}_verified_source`] as string | undefined;
    const bothEmpty = !inspVal && !stockVal;
    const match = inspVal === stockVal;
    return { key, label, inspVal, stockVal, verified, verifiedSource, bothEmpty, match };
  }).filter(r => !r.bothEmpty);

  if (rows.length === 0) return null;

  const allOk = rows.every(r => r.match || r.verified);
  const mismatchCount = rows.filter(r => !r.match && !r.verified && r.inspVal && r.stockVal).length;

  return (
    <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${mismatchCount > 0 ? "rgba(249,115,22,0.4)" : c.border}`, marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        {allOk
          ? <ShieldCheck size={18} color="#22c55e" />
          : <AlertTriangle size={18} color="#f97316" />}
        <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: 0 }}>ตรวจสอบข้อมูล</p>
        {mismatchCount > 0 && (
          <span style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
            ไม่ตรงกัน {mismatchCount} รายการ
          </span>
        )}
        {allOk && (
          <span style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
            ผ่านการตรวจสอบ
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 80px 120px", gap: 0, fontSize: 11, color: c.text3, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.04em", padding: "0 0 8px", borderBottom: `1px solid ${c.border}` }}>
        <span>ฟิลด์</span>
        <span>ค่าจากตรวจ (หน้างาน)</span>
        <span>ค่าในสต็อก (ทีมสต็อก)</span>
        <span>สถานะ</span>
        <span></span>
      </div>

      {rows.map(({ key, label, inspVal, stockVal, verified, verifiedSource, match }) => {
        const isVerifying = verifying === key;
        const mismatch = !match && inspVal && stockVal && !verified;

        return (
          <div key={key} style={{ display: "grid", gridTemplateColumns: "100px 1fr 1fr 80px 120px", gap: 0, alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${c.border}` }}>
            <span style={{ color: c.text2, fontSize: 12, fontWeight: 600 }}>{label}</span>

            {/* Inspection value */}
            <span style={{ color: inspVal ? c.text : c.text3, fontSize: 12, fontFamily: (key === "imei" || key === "serial") ? "monospace" : "inherit" }}>
              {inspVal || <em style={{ color: c.text3 }}>ไม่ได้กรอก</em>}
            </span>

            {/* Stock value */}
            <span style={{ color: stockVal ? (mismatch ? "#f97316" : c.text) : c.text3, fontSize: 12, fontFamily: (key === "imei" || key === "serial") ? "monospace" : "inherit", fontWeight: mismatch ? 700 : 400 }}>
              {stockVal || <em style={{ color: c.text3 }}>ไม่ได้กรอก</em>}
            </span>

            {/* Status */}
            <span>
              {verified ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e", fontSize: 11 }}>
                  <CheckCircle2 size={13} /> {verifiedSource === "inspection" ? "ตรวจ" : "สต็อก"}
                </span>
              ) : match ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e", fontSize: 11 }}>
                  <CheckCircle2 size={13} /> ตรงกัน
                </span>
              ) : inspVal && stockVal ? (
                <span style={{ color: "#f97316", fontSize: 11, fontWeight: 600 }}>⚠️ ไม่ตรงกัน</span>
              ) : (
                <span style={{ color: c.text3, fontSize: 11 }}>—</span>
              )}
            </span>

            {/* Confirm buttons — only when mismatch */}
            <div style={{ display: "flex", gap: 4 }}>
              {mismatch && (
                <>
                  <button
                    disabled={!!verifying}
                    onClick={() => onVerify(key, "inspection")}
                    style={{ fontSize: 10, padding: "3px 7px", borderRadius: 6, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.08)", color: "#22c55e", cursor: "pointer", opacity: isVerifying ? 0.5 : 1, whiteSpace: "nowrap" as const }}
                    title={`ยืนยันค่าจากตรวจ: ${inspVal}`}
                  >
                    {isVerifying ? "..." : `ใช้ ${inspVal}`}
                  </button>
                  <button
                    disabled={!!verifying}
                    onClick={() => onVerify(key, "stock")}
                    style={{ fontSize: 10, padding: "3px 7px", borderRadius: 6, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.08)", color: "#3b82f6", cursor: "pointer", opacity: isVerifying ? 0.5 : 1, whiteSpace: "nowrap" as const }}
                    title={`ยืนยันค่าสต็อก: ${stockVal}`}
                  >
                    {isVerifying ? "..." : `ใช้ ${stockVal}`}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      <p style={{ color: c.text3, fontSize: 11, margin: "12px 0 0" }}>
        ข้อมูลจากตรวจ: เจ้าหน้าที่หน้างาน · ข้อมูลสต็อก: ทีมสต็อก
      </p>
    </div>
  );
}

type VerifyField = "imei" | "serial" | "model" | "storage" | "color";

export default function StockDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const c = useThemeColors();
  const router = useRouter();
  const [item, setItem] = useState<StockItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<VerifyField | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);

  async function reload() {
    const d = await fetchStockItem(id);
    setItem(d);
  }

  useEffect(() => { fetchStockItem(id).then(d => { setItem(d); setLoading(false); }); }, [id]);

  async function handleVerify(field: VerifyField, source: "inspection" | "stock") {
    setVerifying(field);
    await verifyStockField(id, field, source);
    await reload();
    setVerifying(null);
  }

  if (loading) return <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: c.text3 }}>กำลังโหลด...</div>;
  if (!item) return <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: c.text3 }}>ไม่พบสินค้า</div>;

  const totalCost = item.costPrice + item.shippingCost + item.otherCost;
  const hasSellPrice = item.sellingPrice > 0;
  const profit = hasSellPrice ? item.sellingPrice - totalCost : null;
  const margin = hasSellPrice && totalCost > 0 ? (((item.sellingPrice - totalCost) / totalCost) * 100).toFixed(2) : null;

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title={item.id} subtitle={`${item.model} · ${item.storage}`}>
        <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 13, cursor: "pointer" }}>
          <ArrowLeft size={15} /> กลับ
        </button>
      </StockTopbar>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
          {/* Main */}
          <div>
            {/* Image */}
            <div style={{ background: c.card, borderRadius: 20, padding: 32, textAlign: "center", border: `1px solid ${c.border}`, marginBottom: 20 }}>
              {item.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.photos[0]} alt={item.model} style={{ maxHeight: 240, objectFit: "contain" }} />
              ) : (
                <div style={{ fontSize: 80 }}>📱</div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
                <GradeBadge grade={item.grade} />
                <StockStatusBadge status={item.status} />
              </div>
            </div>

            {/* Specs */}
            <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}`, marginBottom: 20 }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ข้อมูลเครื่อง</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  ["รุ่น", item.model], ["ความจุ", item.storage], ["สี", item.color],
                  ["IMEI", item.imei], ["Serial", item.serial],
                  ["Battery Health", `${item.batteryHealth}%`], ["Cycle Count", String(item.cycleCount)],
                  ["iCloud", item.icloudStatus], ["Carrier Lock", item.carrierLock],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding: 12, background: c.card2, borderRadius: 12 }}>
                    <p style={{ color: c.text3, fontSize: 11, margin: "0 0 4px" }}>{k}</p>
                    <p style={{ color: c.text, fontSize: 14, fontWeight: 600, margin: 0, fontFamily: k === "IMEI" || k === "Serial" ? "monospace" : "inherit" }}>{v || "-"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cross-check section — only when snapshot exists */}
            {item.inspectionSnapshot && (
              <CrossCheckSection item={item} c={c} verifying={verifying} onVerify={handleVerify} />
            )}

            {/* Timeline */}
            <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}` }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ประวัติสถานะ</p>
              {item.statusLog.map((log, i) => (
                <div key={i} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.gold, marginTop: 4 }} />
                    {i < item.statusLog.length - 1 && <div style={{ width: 2, flex: 1, background: c.border, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                      <StockStatusBadge status={log.status} />
                      <span style={{ color: c.text3, fontSize: 11 }}>{log.by}</span>
                    </div>
                    {log.note && <p style={{ color: c.text2, fontSize: 12, margin: "4px 0 0" }}>{log.note}</p>}
                    <p style={{ color: c.text3, fontSize: 11, margin: "4px 0 0" }}>{fmtDate(log.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Profit Card */}
            <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}`, marginBottom: 20 }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ต้นทุน / กำไร</p>
              {[
                ["ต้นทุนสินค้า", `฿${fmt(item.costPrice)}`],
                ["ค่าส่ง", `฿${fmt(item.shippingCost)}`],
                ["ค่าใช้จ่ายอื่น", `฿${fmt(item.otherCost)}`],
                ["ต้นทุนรวม", `฿${fmt(totalCost)}`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}` }}>
                  <span style={{ color: c.text2, fontSize: 13 }}>{k}</span>
                  <span style={{ color: k === "ต้นทุนรวม" ? "#ef4444" : c.text, fontWeight: k === "ต้นทุนรวม" ? 700 : 400, fontSize: 13 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: 14, background: c.card2, borderRadius: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: c.text2, fontSize: 13 }}>ราคาขาย</span>
                  {hasSellPrice ? (
                    <span style={{ color: c.gold, fontSize: 20, fontWeight: 800 }}>฿{fmt(item.sellingPrice)}</span>
                  ) : (
                    <span style={{ color: "#f97316", fontSize: 13, fontWeight: 600, background: "rgba(249,115,22,0.1)", padding: "2px 10px", borderRadius: 8 }}>ยังไม่กำหนด</span>
                  )}
                </div>
                {profit !== null ? (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: c.text2, fontSize: 13 }}>กำไร ({margin}%)</span>
                    <span style={{ color: profit >= 0 ? "#22c55e" : "#ef4444", fontSize: 16, fontWeight: 700 }}>฿{fmt(profit)}</span>
                  </div>
                ) : (
                  <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>กำหนดราคาขายก่อนเพื่อดูกำไร</p>
                )}
              </div>
            </div>

            {/* Sell Button */}
            {item.status !== "ขายแล้ว" && (
              <div style={{ marginBottom: 20 }}>
                <button
                  onClick={() => setShowSellModal(true)}
                  style={{ width: "100%", padding: "14px", borderRadius: 14, background: "#22c55e", border: "none", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                >
                  บันทึกการขาย
                </button>
              </div>
            )}

            {/* Sold Info — only when sold */}
            {item.status === "ขายแล้ว" && (
              <div style={{ background: c.card, borderRadius: 20, padding: 24, border: "1px solid rgba(34,197,94,0.3)", marginBottom: 20 }}>
                <p style={{ color: "#22c55e", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ข้อมูลการขาย</p>
                {[
                  ["ราคาขายจริง", item.soldPrice !== undefined ? `฿${fmt(item.soldPrice)}` : "-"],
                  ["กำไรจริง", item.soldPrice !== undefined ? `฿${fmt(item.soldPrice - (item.costPrice + item.shippingCost + item.otherCost))}` : "-"],
                  ["ผู้ซื้อ", item.buyerName ?? "-"],
                  ["เบอร์โทร", item.buyerPhone ?? "-"],
                  ["วันที่ขาย", fmtDate(item.soldAt)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}` }}>
                    <span style={{ color: c.text2, fontSize: 13 }}>{k}</span>
                    <span style={{ color: c.text, fontSize: 13, fontWeight: k === "ราคาขายจริง" || k === "กำไรจริง" ? 700 : 400 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Purchase Info */}
            <div style={{ background: c.card, borderRadius: 20, padding: 24, border: `1px solid ${c.border}` }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 16px" }}>ข้อมูลรับซื้อ</p>
              {[
                ["เลขคำขอ", item.requestRef],
                ["ผู้ขาย", item.sellerName],
                ["เบอร์โทร", item.sellerPhone],
                ["ช่องทาง", item.sourceChannel],
                ["วันที่รับเข้า", fmtDate(item.receivedAt)],
                ["ผู้ตรวจ", item.inspector],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${c.border}` }}>
                  <span style={{ color: c.text2, fontSize: 13 }}>{k}</span>
                  <span style={{ color: c.text, fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showSellModal && (
        <SellModal
          item={item}
          onClose={() => setShowSellModal(false)}
          onSuccess={async () => { await reload(); }}
        />
      )}
    </div>
  );
}
