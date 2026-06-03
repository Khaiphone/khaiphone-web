"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchRiderEarnings } from "@/app/actions/rider";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const CARD2  = "#222224";
const BORDER = "#2C2C2E";
const ACCENT = "#4ADE80";
const GREEN  = "#30D158";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Earnings = Awaited<ReturnType<typeof fetchRiderEarnings>>;

export default function EarningsPage() {
  const [data, setData]     = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const e = await fetchRiderEarnings(session.user.id);
      setData(e);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #2C2C2E", borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const periods = [
    { label: "วันนี้",    data: data?.today,  color: GREEN },
    { label: "สัปดาห์นี้", data: data?.week,   color: ACCENT  },
    { label: "เดือนนี้",  data: data?.month,  color: "#0A84FF" },
  ] as const;

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Period summary cards */}
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

      {/* Recent jobs */}
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
