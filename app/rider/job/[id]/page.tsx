"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Phone, MapPin, Package, Banknote, ArrowUpDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { fetchRiderJob, riderStartJob, riderArriveJob, riderNoShow } from "@/app/actions/rider";
import { supabase } from "@/lib/supabase";
import type { AdminRequest } from "@/lib/types/admin";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const CARD2  = "#222224";
const BORDER = "#2C2C2E";
const ACCENT = "#4ADE80";
const GREEN  = "#30D158";
const RED    = "#FF453A";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

const STEPS = ["รับงาน", "เดินทาง", "ตรวจเครื่อง", "ราคา/สัญญา", "จบ"];

function stepFromStatus(status: string) {
  if (status === "confirmed" || status === "pickup_scheduled") return 0;
  if (status === "en_route")          return 1;
  if (status === "inspecting")        return 2;
  if (status === "price_negotiation") return 3;
  if (status === "contracting")       return 3;
  if (status === "completed")         return 4;
  return 0;
}

function StepBar({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", background: CARD, borderBottom: `1px solid ${BORDER}` }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: i < current ? GREEN : i === current ? ACCENT : BORDER,
              fontSize: 10, fontWeight: 700, color: i <= current ? "#000" : TEXT2,
              flexShrink: 0,
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 9, color: i === current ? ACCENT : TEXT2, whiteSpace: "nowrap", fontWeight: i === current ? 600 : 400 }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? GREEN : BORDER, margin: "0 4px", marginBottom: 14 }} />
          )}
        </div>
      ))}
    </div>
  );
}

function Row({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <span style={{ fontSize: 13, color: TEXT2, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: gold ? ACCENT : TEXT, fontWeight: gold ? 700 : 400, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function BigBtn({ label, color = ACCENT, textColor = "#000", onClick, loading, outline }: {
  label: string; color?: string; textColor?: string; onClick: () => void; loading?: boolean; outline?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: "100%", padding: "16px", borderRadius: 14, fontSize: 16, fontWeight: 700,
      background: outline ? "transparent" : color,
      border: outline ? `1px solid ${color}` : "none",
      color: outline ? color : textColor,
      cursor: "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1,
      touchAction: "manipulation",
    }}>
      {loading ? "กำลังดำเนินการ..." : label}
    </button>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [job, setJob]     = useState<AdminRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]   = useState(false);
  const [showNoShow, setShowNoShow] = useState(false);

  const reload = useCallback(() => {
    fetchRiderJob(id).then(j => { setJob(j); setLoading(false); });
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime — อัปเดตเมื่อ admin หรือ customer เปลี่ยนสถานะ
  useEffect(() => {
    const broadcastCh = supabase
      .channel("request-updates")
      .on("broadcast", { event: "updated" }, (payload) => {
        if (payload.payload?.id !== id) return;
        reload();
      })
      .subscribe();

    const pgCh = supabase
      .channel(`rider-job-pg-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => { if (payload.new?.id === id) reload(); })
      .subscribe();

    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(broadcastCh);
      supabase.removeChannel(pgCh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, reload]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #2C2C2E", borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!job) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: TEXT2 }}>ไม่พบงานนี้</p>
    </div>
  );

  const step    = stepFromStatus(job.status);
  const isCash  = job.payment.method === "cash";
  const price   = job.device.actualPrice ?? job.device.estimatedPrice;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent("เดอะแพลนท์ วงแหวน-รังสิต อำเภอธัญบุรี ปทุมธานี 12110")}&destination=${encodeURIComponent(job.appointment.location)}`;

  async function handleStart() {
    setBusy(true);
    await riderStartJob(id);
    const updated = await fetchRiderJob(id);
    setJob(updated);
    setBusy(false);
  }

  async function handleArrive() {
    setBusy(true);
    await riderArriveJob(id);
    router.push(`/rider/job/${id}/inspect`);
  }

  async function handleNoShow() {
    setBusy(true);
    await riderNoShow(id);
    router.replace("/rider");
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push("/rider")} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 0, display: "flex" }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>{job.customer.name}</p>
          <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job.orderNumber}</p>
        </div>
        <a href={`tel:${job.customer.phone}`} style={{ background: "rgba(48,209,88,0.12)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
          <Phone size={16} color={GREEN} />
          <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>โทร</span>
        </a>
      </div>

      {/* Step bar */}
      <StepBar current={step} />

      {/* Body */}
      <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>

        {/* Location */}
        <div style={{ background: CARD, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={15} color={ACCENT} />
            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>ที่อยู่ลูกค้า</span>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: TEXT, flex: 1 }}>{job.appointment.location || "ไม่ระบุที่อยู่"}</p>
            {job.appointment.location && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" style={{
                background: ACCENT, borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700,
                color: "#000", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
              }}>นำทาง ↗</a>
            )}
          </div>
          <div style={{ padding: "0 16px 14px", display: "flex", gap: 16 }}>
            <Row label="วันที่" value={job.appointment.date} />
            <Row label="เวลา"  value={job.appointment.time}  />
            {job.distanceKm != null && (
              <Row label="ระยะทาง" value={`${job.distanceKm} กม.`} />
            )}
          </div>
        </div>

        {/* Device */}
        <div style={{ background: CARD, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <Package size={15} color={ACCENT} />
            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>เครื่องที่รับซื้อ</span>
          </div>
          <Row label="รุ่น"       value={`${job.device.model} ${job.device.storage}`} />
          <Row label="ราคาตกลง"  value={`฿${price.toLocaleString("th-TH")}`} gold />
          <Row label="สภาพ"       value={job.device.condition} />
          {(job.extraDevices?.length ?? 0) > 0 && (
            <Row label="เครื่องเสริม" value={`${job.extraDevices?.length ?? 0} เครื่อง`} />
          )}
        </div>

        {/* Payment */}
        <div style={{ background: CARD, borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            {isCash ? <Banknote size={15} color={GREEN} /> : <ArrowUpDown size={15} color="#0A84FF" />}
            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>การชำระเงิน</span>
          </div>
          <Row label="วิธี" value={isCash ? "เงินสด" : "โอนเงิน"} />
          {!isCash && job.payment.bankName     && <Row label="ธนาคาร"    value={job.payment.bankName}      />}
          {!isCash && job.payment.accountName  && <Row label="ชื่อบัญชี" value={job.payment.accountName}   />}
          {!isCash && job.payment.accountNumber && <Row label="เลขบัญชี" value={job.payment.accountNumber} />}
        </div>

        {job.customerNotes && (
          <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "12px 14px" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, color: "#F59E0B", fontWeight: 600 }}>หมายเหตุจากลูกค้า</p>
            <p style={{ margin: 0, fontSize: 13, color: TEXT }}>{job.customerNotes}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: "16px 20px", paddingBottom: "calc(16px + env(safe-area-inset-bottom))", background: BG, borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 10 }}>

        {job.status === "confirmed" || job.status === "pickup_scheduled" ? (
          <>
            <BigBtn label="ออกเดินทาง →" onClick={handleStart} loading={busy} />
            <BigBtn label="ลูกค้าไม่อยู่ / ยกเลิก" color={RED} textColor="#fff" onClick={() => setShowNoShow(true)} outline />
          </>
        ) : job.status === "en_route" ? (
          <>
            <BigBtn label="ถึงที่แล้ว — เริ่มตรวจเครื่อง →" onClick={handleArrive} loading={busy} />
            <BigBtn label="ลูกค้าไม่อยู่ / ยกเลิก" color={RED} textColor="#fff" onClick={() => setShowNoShow(true)} outline />
          </>
        ) : job.status === "inspecting" ? (
          <BigBtn label="ไปหน้าตรวจเครื่อง →" onClick={() => router.push(`/rider/job/${id}/inspect`)} />
        ) : job.status === "price_negotiation" ? (
          <BigBtn label="ดูสถานะราคา →" onClick={() => router.push(`/rider/job/${id}/price`)} />
        ) : job.status === "contracting" ? (
          <BigBtn label="ไปหน้าชำระเงิน →" onClick={() => router.push(`/rider/job/${id}/payment`)} />
        ) : job.status === "completed" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 16 }}>
            <CheckCircle2 size={20} color={GREEN} />
            <span style={{ color: GREEN, fontWeight: 600 }}>งานเสร็จสิ้นแล้ว</span>
          </div>
        ) : null}
      </div>

      {/* No-show confirm modal */}
      {showNoShow && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-end", zIndex: 50 }}
          onClick={() => setShowNoShow(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: CARD, borderRadius: "20px 20px 0 0", padding: "24px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <AlertTriangle size={20} color={RED} />
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>ยืนยันการยกเลิก?</p>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: TEXT2 }}>ระบบจะบันทึกว่าลูกค้าไม่อยู่และแจ้ง admin ทันที</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <BigBtn label="ยืนยัน — ลูกค้าไม่อยู่" color={RED} textColor="#fff" onClick={handleNoShow} loading={busy} />
              <BigBtn label="ยกเลิก" color={BORDER} textColor={TEXT} onClick={() => setShowNoShow(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
