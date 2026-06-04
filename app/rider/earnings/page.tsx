"use client";

import { useEffect, useState } from "react";
import { Package, CheckCircle2, TrendingUp, Clock, BarChart3 } from "lucide-react";
import { Sk } from "@/app/rider/skeleton";
import { fetchRiderEarnings } from "@/app/actions/rider";
import { useRiderTheme } from "@/app/rider/theme";
import { useRiderSession } from "@/app/rider/context";
import { cacheGet, cacheSet } from "@/app/rider/cache";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Data = Awaited<ReturnType<typeof fetchRiderEarnings>>;

export default function PerformancePage() {
  const { BG: _BG, CARD, CARD2, BORDER, ACCENT, GREEN, TEXT, TEXT2, TEXT3 } = useRiderTheme();
  const { userId } = useRiderSession();
  const [data, setData]       = useState<Data | null>(() => cacheGet<Data>(`earnings:${userId}`));
  const [loading, setLoading] = useState(!cacheGet<Data>(`earnings:${userId}`));

  useEffect(() => {
    if (!userId) return;
    fetchRiderEarnings(userId).then(d => {
      setData(d);
      cacheSet(`earnings:${userId}`, d);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <Sk w={120} h={14} style={{ marginBottom: 4 }} />
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
        <Sk w={80} h={12} style={{ marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 12 }}>
          {[0,1,2].map(i => <div key={i} style={{ flex: 1 }}><Sk w="100%" h={48} r={10} /></div>)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <Sk w={60} h={12} style={{ marginBottom: 10 }} /><Sk w="70%" h={28} />
        </div>
        <div style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <Sk w={60} h={12} style={{ marginBottom: 10 }} /><Sk w="70%" h={28} />
        </div>
      </div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
        <Sk w={80} h={12} style={{ marginBottom: 10 }} /><Sk w="50%" h={28} />
      </div>
      {[0,1,2].map(i => (
        <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><Sk w={120} h={13} style={{ marginBottom: 6 }} /><Sk w={80} h={11} /></div>
          <Sk w={60} h={20} r={6} />
        </div>
      ))}
    </div>
  );

  const completedPeriods = [
    { label: "วันนี้",      value: data?.completed.today ?? 0 },
    { label: "สัปดาห์",    value: data?.completed.week  ?? 0 },
    { label: "เดือนนี้",   value: data?.completed.month ?? 0 },
  ];

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>

      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: 0.8 }}>
        ผลงานเดือนนี้
      </p>

      {/* จำนวนงานสำเร็จ */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <CheckCircle2 size={15} color={ACCENT} />
          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT2 }}>จำนวนงานสำเร็จ</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {completedPeriods.map(({ label, value }) => (
            <div key={label} style={{ flex: 1, background: CARD2, borderRadius: 10, padding: "12px 8px", textAlign: "center" }}>
              <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: value > 0 ? ACCENT : TEXT3 }}>{value}</p>
              <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* มูลค่ารวม + อัตราสำเร็จ */}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <TrendingUp size={14} color="#F59E0B" />
            <span style={{ fontSize: 12, fontWeight: 600, color: TEXT2 }}>มูลค่ารวม</span>
          </div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#F59E0B" }}>
            ฿{fmt(data?.totalValue ?? 0)}
          </p>
        </div>
        <div style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <BarChart3 size={14} color={GREEN} />
            <span style={{ fontSize: 12, fontWeight: 600, color: TEXT2 }}>อัตราสำเร็จ</span>
          </div>
          {data?.successRate != null ? (
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: data.successRate >= 80 ? GREEN : "#F59E0B" }}>
              {data.successRate}%
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: TEXT3 }}>ยังไม่มีข้อมูล</p>
          )}
        </div>
      </div>

      {/* เวลาเฉลี่ยต่องาน */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Clock size={14} color="#0A84FF" />
          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT2 }}>เวลาเฉลี่ยต่องาน</span>
        </div>
        {data?.avgDurationMin != null ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#0A84FF" }}>{data.avgDurationMin}</p>
            <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>นาที</p>
            <p style={{ margin: "0 0 0 6px", fontSize: 11, color: TEXT3 }}>(ตั้งแต่ออกเดินทาง)</p>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: TEXT3 }}>ยังไม่มีข้อมูล</p>
        )}
      </div>

      {/* งานล่าสุด */}
      <div style={{ marginTop: 4 }}>
        <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 600, color: TEXT3, textTransform: "uppercase", letterSpacing: 0.8 }}>
          งานล่าสุด
        </p>
        {(data?.recent?.length ?? 0) === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
            <p style={{ margin: 0, color: TEXT2, fontSize: 14 }}>ยังไม่มีงานเดือนนี้</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data?.recent.map((job, i) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const j = job as any;
              const isDone = j.status === "completed";
              return (
                <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: CARD2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Package size={16} color={isDone ? ACCENT : TEXT3} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {j.device_model} {j.device_storage}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{fmtDate(j.created_at)}</p>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, marginLeft: 12, textAlign: "right" }}>
                    {isDone ? (
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: ACCENT }}>
                        ฿{fmt(j.actual_price ?? j.estimated_price ?? 0)}
                      </p>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, color: TEXT3, background: CARD2, borderRadius: 6, padding: "3px 8px" }}>
                        {j.status === "cancelled" ? "ยกเลิก" : j.status === "no_show" ? "ไม่มา" : "ปฏิเสธ"}
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
  );
}
