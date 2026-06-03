"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchRiderJob, riderConfirmPrice, riderAdjustPrice, riderCustomerAccepted, riderCustomerRejected } from "@/app/actions/rider";
import type { AdminRequest } from "@/lib/types/admin";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const BORDER = "#2C2C2E";
const ACCENT = "#4ADE80";
const GREEN  = "#30D158";
const RED    = "#FF453A";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

function fmt(n: number) { return n.toLocaleString("th-TH"); }

const ADJUST_REASONS = [
  "สภาพไม่ตรงกับที่แจ้ง",
  "แบตเตอรี่ต่ำกว่าที่ระบุ",
  "มีรอยบนหน้าจอ",
  "กรอบ/ฝาหลังมีรอย",
  "ชิ้นส่วนมีปัญหา",
  "อื่นๆ",
];

export default function PricePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [job, setJob]         = useState<AdminRequest | null>(null);
  const [mode, setMode]       = useState<"confirm" | "adjust" | "waiting">("confirm");
  const [newPrice, setNewPrice] = useState("");
  const [reason, setReason]   = useState(ADJUST_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetchRiderJob(id).then(j => {
      setJob(j);
      if (j?.status === "price_negotiation") setMode("waiting");
      if (j?.device.actualPrice) setNewPrice(String(j.device.actualPrice));
    });
  }, [id]);

  if (!job) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #2C2C2E", borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const agreedPrice = job.device.estimatedPrice;
  const finalReason = reason === "อื่นๆ" ? customReason : reason;

  async function handleConfirm() {
    setBusy(true);
    const result = await riderConfirmPrice(id, agreedPrice);
    if (!result.success) { setError(result.error ?? "เกิดข้อผิดพลาด"); setBusy(false); return; }
    router.push(`/rider/job/${id}/payment`);
  }

  async function handleAdjust() {
    if (!newPrice || isNaN(Number(newPrice))) { setError("กรุณากรอกราคาที่ถูกต้อง"); return; }
    if (!finalReason) { setError("กรุณาระบุเหตุผล"); return; }
    setBusy(true);
    const result = await riderAdjustPrice(id, Number(newPrice), finalReason);
    if (!result.success) { setError(result.error ?? "เกิดข้อผิดพลาด"); setBusy(false); return; }
    setMode("waiting");
    setBusy(false);
  }

  async function handleAccepted() {
    setBusy(true);
    await riderCustomerAccepted(id);
    router.push(`/rider/job/${id}/payment`);
  }

  async function handleRejected() {
    setBusy(true);
    await riderCustomerRejected(id);
    router.replace("/rider");
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={22} />
        </button>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>ยืนยันราคา</p>
      </div>

      <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Price display */}
        <div style={{ background: CARD, borderRadius: 16, padding: 24, textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: 13, color: TEXT2 }}>ราคาที่ตกลงไว้</p>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 800, color: ACCENT }}>฿{fmt(agreedPrice)}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: TEXT2 }}>{job.device.model} {job.device.storage}</p>
        </div>

        {/* Mode: Confirm */}
        {mode === "confirm" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button onClick={handleConfirm} disabled={busy} style={{
                padding: 16, borderRadius: 14, background: GREEN, border: "none", fontSize: 16,
                fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <CheckCircle2 size={18} />
                  ราคาตรงกัน — ไปชำระเงิน
                </div>
              </button>

              <button onClick={() => setMode("adjust")} style={{
                padding: 16, borderRadius: 14, background: "transparent", border: `1px solid ${BORDER}`,
                fontSize: 16, fontWeight: 600, color: TEXT2, cursor: "pointer", fontFamily: "inherit",
              }}>
                ราคาต้องปรับ — เสนอราคาใหม่
              </button>
            </div>
          </>
        )}

        {/* Mode: Adjust */}
        {mode === "adjust" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: CARD, borderRadius: 14, padding: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: TEXT2 }}>ราคาที่จะเสนอใหม่ (บาท)</p>
              <input
                type="number"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                placeholder="กรอกราคาใหม่"
                style={{ width: "100%", background: "none", border: "none", color: ACCENT, fontSize: 28, fontWeight: 700, fontFamily: "inherit", outline: "none" }}
              />
            </div>

            <div style={{ background: CARD, borderRadius: 14, padding: "0 16px" }}>
              <p style={{ padding: "12px 0 8px", margin: 0, fontSize: 13, color: TEXT2 }}>เหตุผล</p>
              {ADJUST_REASONS.map((r, i) => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", border: `2px solid ${reason === r ? ACCENT : BORDER}`,
                    background: reason === r ? ACCENT : "transparent", flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 14, color: TEXT }}>{r}</span>
                  <input type="radio" value={r} checked={reason === r} onChange={() => setReason(r)} style={{ display: "none" }} />
                </label>
              ))}
              {reason === "อื่นๆ" && (
                <textarea
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="ระบุเหตุผล..."
                  rows={2}
                  style={{ width: "100%", background: "none", border: "none", borderTop: `1px solid ${BORDER}`, color: TEXT, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none", padding: "10px 0" }}
                />
              )}
            </div>

            {error && <p style={{ margin: 0, fontSize: 13, color: RED }}>{error}</p>}

            <button onClick={handleAdjust} disabled={busy} style={{
              padding: 16, borderRadius: 14, background: ACCENT, border: "none", fontSize: 16,
              fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
            }}>
              {busy ? "กำลังส่ง..." : "แจ้งลูกค้าและรอยืนยัน →"}
            </button>

            <button onClick={() => setMode("confirm")} style={{
              padding: 12, borderRadius: 14, background: "transparent", border: "none",
              fontSize: 14, color: TEXT2, cursor: "pointer", fontFamily: "inherit",
            }}>← ย้อนกลับ</button>
          </div>
        )}

        {/* Mode: Waiting for customer */}
        {mode === "waiting" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 14, padding: 20, textAlign: "center" }}>
              <AlertCircle size={32} color={ACCENT} style={{ marginBottom: 10 }} />
              <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: TEXT }}>รอลูกค้ายืนยันราคา</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>เสนอราคา ฿{fmt(Number(newPrice) || job.device.actualPrice || 0)}</p>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: TEXT2, textAlign: "center" }}>
              ลูกค้าตอบรับหรือปฏิเสธแล้ว?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={handleAccepted} disabled={busy} style={{
                padding: 16, borderRadius: 14, background: GREEN, border: "none", fontSize: 16,
                fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
              }}>ลูกค้ายอมรับราคา →</button>
              <button onClick={handleRejected} disabled={busy} style={{
                padding: 16, borderRadius: 14, background: "transparent", border: `1px solid ${RED}`,
                fontSize: 16, fontWeight: 600, color: RED, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
              }}>ลูกค้าปฏิเสธ — ยกเลิกงาน</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
