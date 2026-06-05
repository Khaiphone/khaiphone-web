"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, MapPin, Clock, TrendingUp, Zap } from "lucide-react";
import { Sk } from "@/app/rider/skeleton";
import { fetchRiderShiftStats } from "@/app/actions/rider-tracking";
import { useRiderTheme } from "@/app/rider/theme";
import { useRiderSession } from "@/app/rider/context";

type Shift = {
  id: string;
  clocked_in_at: string;
  clocked_out_at: string | null;
  jobs_completed: number;
  total_distance_km: number;
  ended_reason: string | null;
};

function shiftDuration(start: string, end?: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function thDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short" });
}
function thTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export default function StatsPage() {
  const { BG: _BG, CARD, BORDER, ACCENT, GREEN, TEXT, TEXT2 } = useRiderTheme();
  const { userId } = useRiderSession();
  const [tab, setTab] = useState<"today" | "week" | "month">("week");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useCallback(() => {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    if (tab === "today") return { from: to, to };
    if (tab === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split("T")[0], to };
    }
    const d = new Date(now); d.setDate(1);
    return { from: d.toISOString().split("T")[0], to };
  }, [tab]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const { from, to } = dateRange();
    fetchRiderShiftStats(userId, from, to).then(data => {
      setShifts(data as Shift[]);
      setLoading(false);
    });
  }, [userId, dateRange]);

  const totalJobs = shifts.reduce((s, sh) => s + (sh.jobs_completed ?? 0), 0);
  const totalDist = shifts.reduce((s, sh) => s + (sh.total_distance_km ?? 0), 0);
  const completedShifts = shifts.filter(s => s.clocked_out_at);
  const avgJobsPerShift = completedShifts.length > 0 ? (totalJobs / completedShifts.length).toFixed(1) : "—";

  const GOLD = "#c9a84c";
  const ORANGE = "#f97316";

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Tab selector */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex" }}>
          {(["today", "week", "month"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "11px 0", border: "none", background: tab === t ? `${ACCENT}15` : "transparent", color: tab === t ? ACCENT : TEXT2, fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontFamily: "inherit", borderBottom: tab === t ? `2px solid ${ACCENT}` : "none" }}>
              {t === "today" ? "วันนี้" : t === "week" ? "7 วัน" : "เดือนนี้"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <KpiCard label="งานสำเร็จ" value={loading ? "…" : String(totalJobs)} unit="งาน" icon={<CheckCircle2 size={20} color={GREEN} />} color={GREEN} CARD={CARD} BORDER={BORDER} TEXT={TEXT} TEXT2={TEXT2} />
        <KpiCard label="ระยะทาง" value={loading ? "…" : totalDist > 0 ? totalDist.toFixed(0) : "—"} unit={totalDist > 0 ? "กม." : ""} icon={<MapPin size={20} color={ACCENT} />} color={ACCENT} CARD={CARD} BORDER={BORDER} TEXT={TEXT} TEXT2={TEXT2} />
        <KpiCard label="จำนวน Shift" value={loading ? "…" : String(completedShifts.length)} unit="ครั้ง" icon={<Clock size={20} color={GOLD} />} color={GOLD} CARD={CARD} BORDER={BORDER} TEXT={TEXT} TEXT2={TEXT2} />
        <KpiCard label="เฉลี่ย/Shift" value={loading ? "…" : String(avgJobsPerShift)} unit="งาน" icon={<TrendingUp size={20} color={ORANGE} />} color={ORANGE} CARD={CARD} BORDER={BORDER} TEXT={TEXT} TEXT2={TEXT2} />
      </div>

      {/* Shift history */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={14} color={TEXT2} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>ประวัติ Shift</p>
        </div>
        {loading ? (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Sk w={80} h={13} />
                  <Sk w={140} h={11} />
                </div>
                <Sk w={40} h={22} r={6} />
              </div>
            ))}
          </div>
        ) : completedShifts.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <Clock size={32} color={BORDER} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 14, color: TEXT2 }}>ยังไม่มีข้อมูล</p>
          </div>
        ) : completedShifts.map((s, i) => (
          <div key={s.id} style={{ padding: "12px 16px", borderBottom: i < completedShifts.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: TEXT }}>{thDate(s.clocked_in_at)}</p>
              <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>
                {thTime(s.clocked_in_at)} – {s.clocked_out_at ? thTime(s.clocked_out_at) : "ยังทำงาน"} · {shiftDuration(s.clocked_in_at, s.clocked_out_at)}
              </p>
              {s.ended_reason === "auto_timeout" && (
                <p style={{ margin: "2px 0 0", fontSize: 11, color: ORANGE }}>⚠ ปิด shift อัตโนมัติ</p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: GREEN }}>{s.jobs_completed} งาน</p>
              {s.total_distance_km > 0 && <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{s.total_distance_km.toFixed(0)} กม.</p>}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

function KpiCard({ label, value, unit, icon, color, CARD, BORDER, TEXT, TEXT2 }: {
  label: string; value: string; unit: string; icon: React.ReactNode; color: string;
  CARD: string; BORDER: string; TEXT: string; TEXT2: string;
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {icon}
        <span style={{ fontSize: 12, color: TEXT2, fontWeight: 600 }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: color, lineHeight: 1 }}>{value}</p>
      {unit && <p style={{ margin: "4px 0 0", fontSize: 12, color: TEXT2 }}>{unit}</p>}
    </div>
  );
}
