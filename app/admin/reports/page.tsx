"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { fetchRequests } from "@/app/actions/admin-requests";
import { STATUS_LABELS } from "@/lib/types/admin";
import type { AdminRequest, RequestStatus } from "@/lib/types/admin";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

function startOf(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function ReportsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [period, setPeriod]     = useState<7 | 30 | 90>(30);

  useEffect(() => {
    fetchRequests().then(data => { setRequests(data); setLoading(false); });
  }, []);

  const cutoff = startOf(period);
  const inPeriod = requests.filter(r => new Date(r.createdAt) >= cutoff);

  const totalValue = inPeriod
    .filter(r => r.status === "completed")
    .reduce((s, r) => s + (r.device.actualPrice ?? r.device.estimatedPrice ?? 0), 0);

  const byStatus = inPeriod.reduce<Partial<Record<RequestStatus, number>>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const modelCount = inPeriod.reduce<Record<string, number>>((acc, r) => {
    const m = r.device.model;
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});
  const topModels = Object.entries(modelCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const statCards = [
    { label: "คำขอทั้งหมด",  value: inPeriod.length,                                                     color: "#3B82F6" },
    { label: "เสร็จสิ้น",    value: inPeriod.filter(r => r.status === "completed").length,               color: "#10B981" },
    { label: "รอดำเนินการ",  value: inPeriod.filter(r => !["completed","cancelled","rejected"].includes(r.status)).length, color: GOLD },
    { label: "ยกเลิก/ปฏิเสธ", value: inPeriod.filter(r => r.status === "cancelled" || r.status === "rejected").length, color: "#EF4444" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ padding: "52px 16px 32px", maxWidth: 680, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}>
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>รายงาน</h1>
        </div>

        {/* Period tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {([7, 30, 90] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "7px 16px", borderRadius: 99, fontSize: 12, fontWeight: period === p ? 700 : 400,
                border: `1px solid ${period === p ? GOLD : BORDER}`,
                background: period === p ? `${GOLD}18` : CARD,
                color: period === p ? GOLD : TEXT2,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >{p} วัน</button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: TEXT3, textAlign: "center", padding: "32px 0" }}>กำลังโหลด...</p>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {statCards.map(({ label, value, color }) => (
                <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px" }}>
                  <p style={{ color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>{label}</p>
                  <p style={{ color, fontSize: 28, fontWeight: 800, margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Revenue */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px", marginBottom: 16 }}>
              <p style={{ color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>มูลค่ารวม (เสร็จสิ้น)</p>
              <p style={{ color: TEXT, fontSize: 28, fontWeight: 800, margin: 0 }}>฿{totalValue.toLocaleString("th-TH")}</p>
            </div>

            {/* By status */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: "#FAFAFA" }}>
                <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0 }}>คำขอตามสถานะ</p>
              </div>
              {Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([status, count], i, arr) => (
                <div key={status} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <p style={{ color: TEXT2, fontSize: 13, margin: 0 }}>{STATUS_LABELS[status as RequestStatus] ?? status}</p>
                  <span style={{ color: TEXT, fontSize: 13, fontWeight: 700 }}>{count}</span>
                </div>
              ))}
            </div>

            {/* Top models */}
            {topModels.length > 0 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, background: "#FAFAFA" }}>
                  <p style={{ color: TEXT, fontSize: 13, fontWeight: 700, margin: 0 }}>รุ่นยอดนิยม</p>
                </div>
                {topModels.map(([model, count], i) => (
                  <div key={model} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: i < topModels.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <span style={{ color: TEXT3, fontSize: 12, fontWeight: 700, width: 18, textAlign: "center" }}>#{i + 1}</span>
                    <p style={{ color: TEXT, fontSize: 13, margin: 0, flex: 1 }}>{model}</p>
                    <span style={{ color: TEXT2, fontSize: 13, fontWeight: 600 }}>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
