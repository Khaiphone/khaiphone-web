"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Package } from "lucide-react";
import { Sk } from "@/app/rider/skeleton";
import { supabase } from "@/lib/supabase";
import { fetchRiderHistory, fetchRiderStats } from "@/app/actions/rider";
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

function fmt(n: number) { return n.toLocaleString("th-TH"); }

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export default function HistoryPage() {
  const [jobs, setJobs]   = useState<AdminRequest[]>([]);
  const [stats, setStats] = useState({ completedJobs: 0, cancelledJobs: 0, totalEarnings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const [h, s] = await Promise.all([
        fetchRiderHistory(session.user.id),
        fetchRiderStats(session.user.id),
      ]);
      setJobs(h);
      setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats card skeleton */}
      <div style={{ background: CARD, borderRadius: 16, padding: 20 }}>
        <Sk w={80} h={12} style={{ marginBottom: 16 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Sk w="70%" h={11} />
              <Sk w="50%" h={22} />
            </div>
          ))}
        </div>
      </div>
      {/* History list skeleton */}
      {[0,1,2,3].map(i => (
        <div key={i} style={{ background: CARD, borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <Sk w="60%" h={14} />
            <Sk w="45%" h={11} />
            <Sk w="35%" h={11} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
            <Sk w={70} h={20} r={6} />
            <Sk w={55} h={13} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Monthly stats */}
      <div style={{ background: CARD, borderRadius: 16, padding: 20 }}>
        <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>สถิติเดือนนี้</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { label: "งานสำเร็จ", value: stats.completedJobs, color: GREEN },
            { label: "ยกเลิก",    value: stats.cancelledJobs, color: RED   },
            { label: "รายได้",    value: `฿${fmt(stats.totalEarnings)}`, color: ACCENT, small: true },
          ].map(({ label, value, color, small }) => (
            <div key={label} style={{ background: CARD2, borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: small ? 14 : 24, fontWeight: 800, color }}>{value}</p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: TEXT2 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Job list */}
      <div>
        <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>
          ประวัติงาน (3 เดือน)
        </p>
        {jobs.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 15, color: TEXT2 }}>ยังไม่มีประวัติงาน</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs.map(job => {
              const isCompleted = job.status === "completed";
              const price = job.device.actualPrice ?? job.device.estimatedPrice;
              return (
                <div key={job.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isCompleted
                        ? <CheckCircle2 size={16} color={GREEN} />
                        : <XCircle     size={16} color={RED}   />}
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT }}>{job.customer.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{fmtDate(job.createdAt)}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isCompleted ? ACCENT : TEXT2 }}>
                      {isCompleted ? `฿${fmt(price)}` : "ยกเลิก"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: CARD2, borderRadius: 8, padding: "8px 10px" }}>
                    <Package size={13} color={TEXT2} />
                    <span style={{ fontSize: 13, color: TEXT2 }}>{job.device.model} {job.device.storage}</span>
                    <span style={{ fontSize: 11, color: TEXT2, marginLeft: "auto" }}>{job.orderNumber}</span>
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
