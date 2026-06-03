"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import { fetchRiderJob, riderConfirmPrice, riderAdjustPrice, riderCustomerAccepted, riderCustomerRejected } from "@/app/actions/rider";
import { supabase } from "@/lib/supabase";
import { useRiderTheme } from "@/app/rider/theme";
import type { AdminRequest } from "@/lib/types/admin";

function fmt(n: number) { return n.toLocaleString("th-TH"); }

const ADJUST_REASONS = [
  "สภาพไม่ตรงกับที่แจ้ง",
  "แบตเตอรี่ต่ำกว่าที่ระบุ",
  "มีรอยบนหน้าจอ",
  "กรอบ/ฝาหลังมีรอย",
  "ชิ้นส่วนมีปัญหา",
  "อื่นๆ",
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, padding: "8px 0" }}>
      <span style={{ fontSize: 13, color: "var(--t2)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "var(--t)", fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function PricePage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const { BG, CARD, CARD2, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2 } = useRiderTheme();
  const [job, setJob]         = useState<AdminRequest | null>(null);
  const [mode, setMode]       = useState<"confirm" | "adjust" | "waiting">("confirm");
  const [newPrice, setNewPrice] = useState("");
  const [reason, setReason]   = useState(ADJUST_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  const loadJob = useCallback(() => {
    fetchRiderJob(id).then(j => {
      if (!j) return;
      setJob(j);
      if (j.device.actualPrice) setNewPrice(String(j.device.actualPrice));
      if (j.status === "contracting") { router.replace(`/rider/job/${id}/contract`); return; }
      if (j.status === "cancelled")   { router.replace("/rider"); return; }
      if (j.status === "price_negotiation") setMode("waiting");
    });
  }, [id, router]);

  useEffect(() => { loadJob(); }, [loadJob]);

  useEffect(() => {
    const broadcastCh = supabase
      .channel("request-updates")
      .on("broadcast", { event: "updated" }, (payload) => {
        if (payload.payload?.id !== id) return;
        loadJob();
      })
      .subscribe();

    const pgCh = supabase
      .channel(`rider-price-pg-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => { if (payload.new?.id === id) loadJob(); })
      .subscribe();

    const onVisible = () => { if (document.visibilityState === "visible") loadJob(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(broadcastCh);
      supabase.removeChannel(pgCh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, loadJob]);

  if (!job) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const agreedPrice  = job.device.actualPrice ?? job.device.estimatedPrice;
  const isCash       = job.payment.method === "cash";
  const insp         = job.inspection;
  const finalReason  = reason === "อื่นๆ" ? customReason : reason;

  function handleCopyBank() {
    if (!job) return;
    const lines = [
      `ธนาคาร: ${job.payment.bankName ?? ""}`,
      `ชื่อบัญชี: ${job.payment.accountName ?? ""}`,
      `เลขบัญชี: ${job.payment.accountNumber ?? ""}`,
      `จำนวนเงิน: ${fmt(agreedPrice)} บาท`,
    ].join("\n");
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      const result = await riderConfirmPrice(id, agreedPrice);
      if (!result.success) { setError(result.error ?? "เกิดข้อผิดพลาด"); return; }
      router.push(`/rider/job/${id}/contract`);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdjust() {
    if (!newPrice || isNaN(Number(newPrice))) { setError("กรุณากรอกราคาที่ถูกต้อง"); return; }
    if (!finalReason) { setError("กรุณาระบุเหตุผล"); return; }
    setBusy(true);
    try {
      const result = await riderAdjustPrice(id, Number(newPrice), finalReason);
      if (!result.success) { setError(result.error ?? "เกิดข้อผิดพลาด"); return; }
      setMode("waiting");
    } finally {
      setBusy(false);
    }
  }

  async function handleAccepted() {
    setBusy(true);
    await riderCustomerAccepted(id);
    router.push(`/rider/job/${id}/contract`);
  }

  async function handleRejected() {
    setBusy(true);
    await riderCustomerRejected(id);
    router.replace("/rider");
  }

  return (
    <div style={{ height: "100%", overflow: "hidden", background: BG, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>สรุปก่อนออกสัญญา</p>
          <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job.orderNumber} · {job.customer.name}</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Price card */}
        <div style={{ background: CARD, borderRadius: 16, padding: "20px 20px 16px", textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>ราคาซื้อขาย</p>
          <p style={{ margin: 0, fontSize: 40, fontWeight: 800, color: ACCENT }}>฿{fmt(agreedPrice)}</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: TEXT2 }}>{job.device.model} · {job.device.storage}</p>
        </div>

        {/* Inspection summary */}
        {insp && (
          <div style={{ background: CARD, borderRadius: 14, padding: "14px 16px" }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: TEXT }}>ผลตรวจเครื่อง</p>
            <div style={{ borderTop: `1px solid ${BORDER}` }}>
              {insp.imei    && <InfoRow label="IMEI"          value={insp.imei} />}
              {insp.serial  && <InfoRow label="Serial Number" value={insp.serial} />}
              {insp.batteryHealth && <InfoRow label="Battery Health" value={`${insp.batteryHealth}%`} />}
              {insp.warrantyExpiry && (
                <InfoRow
                  label="ประกัน"
                  value={insp.warrantyExpiry === "expired" ? "ประกันสิ้นสุดแล้ว" : `ถึง ${insp.warrantyExpiry}`}
                />
              )}
              {(insp.criteria ?? []).map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 13, color: TEXT2 }}>{c.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                    background: c.pass ? "rgba(48,209,88,0.12)" : "rgba(255,69,58,0.12)",
                    color: c.pass ? GREEN : RED }}>
                    {c.pass ? "ตรงกัน" : "ไม่ตรง"}
                  </span>
                </div>
              ))}
              {(insp.functionalTests ?? []).filter(t => !t.pass).length > 0 && (
                <div style={{ padding: "8px 0", borderTop: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 12, color: RED, fontWeight: 600 }}>
                    มีปัญหา: {(insp.functionalTests ?? []).filter(t => !t.pass).map(t => t.label).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment info */}
        <div style={{ background: CARD, borderRadius: 14, padding: "14px 16px" }}>
          <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: TEXT }}>ช่องทางชำระเงิน</p>
          {isCash ? (
            <div style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: GREEN }}>💵 เงินสด ฿{fmt(agreedPrice)}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: TEXT2 }}>มอบเงินสดให้ลูกค้าโดยตรง</p>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                {[
                  ["ธนาคาร",    job.payment.bankName    ?? "—"],
                  ["ชื่อบัญชี", job.payment.accountName  ?? "—"],
                  ["เลขบัญชี",  job.payment.accountNumber ?? "—"],
                  ["จำนวนเงิน", `฿${fmt(agreedPrice)}`],
                ].map(([label, value], i, arr) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px",
                    borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none",
                    background: i % 2 === 0 ? CARD : CARD2 }}>
                    <span style={{ fontSize: 13, color: TEXT2 }}>{label}</span>
                    <span style={{ fontSize: 13, color: label === "จำนวนเงิน" ? ACCENT : TEXT, fontWeight: label === "จำนวนเงิน" ? 700 : 500, fontFamily: label === "เลขบัญชี" ? "monospace" : "inherit" }}>{value}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleCopyBank} style={{
                marginTop: 10, width: "100%", padding: "12px 0", borderRadius: 10,
                background: copied ? "rgba(48,209,88,0.12)" : CARD2,
                border: `1px solid ${copied ? GREEN : BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                fontSize: 14, fontWeight: 600, color: copied ? GREEN : TEXT, cursor: "pointer", fontFamily: "inherit",
              }}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "คัดลอกแล้ว ✓" : "คัดลอกข้อมูลบัญชี"}
              </button>
            </div>
          )}
        </div>

        {/* Price action */}
        {mode === "confirm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {error && <p style={{ margin: 0, fontSize: 13, color: RED }}>{error}</p>}
            <button onClick={handleConfirm} disabled={busy} style={{
              padding: 16, borderRadius: 14, background: ACCENT, border: "none", fontSize: 16,
              fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <CheckCircle2 size={18} />
                {busy ? "กำลังดำเนินการ..." : "ยืนยันราคาและออกสัญญา →"}
              </div>
            </button>
            <button onClick={() => setMode("adjust")} style={{
              padding: 14, borderRadius: 14, background: "transparent", border: `1px solid ${BORDER}`,
              fontSize: 14, fontWeight: 600, color: TEXT2, cursor: "pointer", fontFamily: "inherit",
            }}>
              ราคาต้องปรับ — เสนอราคาใหม่
            </button>
          </div>
        )}

        {mode === "adjust" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: CARD, borderRadius: 14, padding: 16 }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, color: TEXT2 }}>ราคาที่จะเสนอใหม่ (บาท)</p>
              <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="กรอกราคาใหม่"
                style={{ width: "100%", background: "none", border: "none", color: ACCENT, fontSize: 28, fontWeight: 700, fontFamily: "inherit", outline: "none" }} />
            </div>

            <div style={{ background: CARD, borderRadius: 14, padding: "0 16px" }}>
              <p style={{ padding: "12px 0 8px", margin: 0, fontSize: 13, color: TEXT2 }}>เหตุผล</p>
              {ADJUST_REASONS.map((r) => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${reason === r ? ACCENT : BORDER}`, background: reason === r ? ACCENT : "transparent", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: TEXT }}>{r}</span>
                  <input type="radio" value={r} checked={reason === r} onChange={() => setReason(r)} style={{ display: "none" }} />
                </label>
              ))}
              {reason === "อื่นๆ" && (
                <textarea value={customReason} onChange={e => setCustomReason(e.target.value)} placeholder="ระบุเหตุผล..." rows={2}
                  style={{ width: "100%", background: "none", border: "none", borderTop: `1px solid ${BORDER}`, color: TEXT, fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none", padding: "10px 0" }} />
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

        {mode === "waiting" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: 14, padding: 20, textAlign: "center" }}>
              <AlertCircle size={32} color={ACCENT} style={{ marginBottom: 10 }} />
              <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: TEXT }}>รอลูกค้ายืนยันราคา</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>ราคาที่เสนอ ฿{fmt(Number(newPrice) || job.device.actualPrice || 0)}</p>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: TEXT2, textAlign: "center" }}>ลูกค้าตอบรับหรือปฏิเสธแล้ว?</p>
            <button onClick={handleAccepted} disabled={busy} style={{
              padding: 16, borderRadius: 14, background: GREEN, border: "none", fontSize: 16,
              fontWeight: 700, color: "#000", cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
            }}>ลูกค้ายอมรับราคา →</button>
            <button onClick={handleRejected} disabled={busy} style={{
              padding: 16, borderRadius: 14, background: "transparent", border: `1px solid ${RED}`,
              fontSize: 16, fontWeight: 600, color: RED, cursor: "pointer", fontFamily: "inherit", opacity: busy ? 0.6 : 1,
            }}>ลูกค้าปฏิเสธ — ยกเลิกงาน</button>
          </div>
        )}

      </div>
    </div>
  );
}
