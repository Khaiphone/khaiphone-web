"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Package } from "lucide-react";
import { Sk } from "@/app/rider/skeleton";
import { fetchRiderEarnings } from "@/app/actions/rider";
import { useRiderTheme } from "@/app/rider/theme";
import { useRiderSession } from "@/app/rider/context";
import { cacheGet, cacheSet } from "@/app/rider/cache";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Earnings = Awaited<ReturnType<typeof fetchRiderEarnings>>;

export default function EarningsPage() {
  const { BG: _BG, CARD, CARD2, BORDER, ACCENT, GREEN, TEXT, TEXT2 } = useRiderTheme();
  const { userId } = useRiderSession();
  const [data, setData]     = useState<Earnings | null>(() => cacheGet<Earnings>(`earnings:${userId}`));
  const [loading, setLoading] = useState(!cacheGet<Earnings>(`earnings:${userId}`));

  useEffect(() => {
    if (!userId) return;
    fetchRiderEarnings(userId).then(e => {
      setData(e);
      cacheSet(`earnings:${userId}`, e);
      setLoading(false);
    });
  }, [userId]);

  if (loading) return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Sk w={60} h={12} />
            <Sk w={100} h={28} />
            <Sk w={80} h={11} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <Sk w={50} h={11} />
            <Sk w={40} h={18} />
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <Sk w={80} h={13} style={{ marginBottom: 14 }} />
        {[0,1,2].map(i => (
          <div key={i} style={{ background: CARD, borderRadius: 14, padding: "14px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
              <Sk w="55%" h={13} />
              <Sk w="40%" h={11} />
            </div>
            <Sk w={70} h={20} r={6} />
          </div>
        ))}
      </div>
    </div>
  );

  const periods = [
    { label: "วันนี้",    data: data?.today,  color: GREEN },
    { label: "สัปดาห์นี้", data: data?.week,   color: ACCENT  },
    { label: "เดือนนี้",  data: data?.month,  color: "#0A84FF" },
  ] as const;

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {periods.map(({ label, data: d, color }) => (
          <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>{label}</p>
              <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800, color }}>฿{fmt(d?.total ?? 0)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                <TrendingUp size={14} color={color} />
                <p style={{ margin: 0, fontSize: 13, color }}>{d?.count ?? 0} งาน</p>
              </div>
              {(d?.count ?? 0) > 0 && (
                <p style={{ margin: "4px 0 0", fontSize: 12, color: TEXT2 }}>
                  เฉลี่ย ฿{fmt(Math.round((d?.total ?? 0) / (d?.count ?? 1)))} / งาน
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>
          งานล่าสุดเดือนนี้
        </p>
        {(data?.recent?.length ?? 0) === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
            <p style={{ margin: 0, color: TEXT2, fontSize: 14 }}>ยังไม่มีงานเดือนนี้</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data?.recent.map((job, i) => (
              <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: CARD2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Package size={16} color={ACCENT} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {(job as any).device_model} {(job as any).device_storage}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{fmtDate((job as any).created_at)}</p>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: ACCENT, flexShrink: 0, marginLeft: 12 }}>
                  ฿{fmt((job as any).actual_price ?? (job as any).estimated_price ?? 0)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
