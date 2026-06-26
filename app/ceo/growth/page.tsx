"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid } from "recharts";
import { fetchCeoGrowth, type CeoGrowth } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, Loading, baht, GOLD, GREEN, BLUE, RED } from "../ui";

export default function CeoGrowthPage() {
  const [d, setD] = useState<CeoGrowth | null>(null);
  useEffect(() => { fetchCeoGrowth().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="การเติบโต" /><Loading /></>;

  const onTrack = d.gap === 0;

  return (
    <>
      <PageTitle title="การเติบโต" sub="พยากรณ์รายได้ · แผนไปให้ถึงเป้า" />

      <Grid min={200}>
        <Kpi label="รายได้เฉลี่ย/วัน" value={baht(d.avgDailyRevenue)} accent={GOLD} />
        <Kpi label="คาดการณ์ 30 วัน" value={baht(d.projected30)} color={GREEN} accent={GREEN} />
        <Kpi label="คาดการณ์ 60 วัน" value={baht(d.projected60)} color={GREEN} accent={GREEN} />
        <Kpi label="คาดการณ์ 90 วัน" value={baht(d.projected90)} color={GREEN} accent={GREEN} />
      </Grid>

      {/* แผนไปให้ถึงเป้าเดือนนี้ */}
      <div style={{ height: 16 }} />
      <Card>
        <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#111" }}>แผนไปให้ถึงเป้าเดือนนี้</p>
        {d.targetRevenue === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>ยังไม่ได้ตั้งเป้ารายได้ — ตั้งที่หน้า <strong>ตั้งค่า</strong></p>
        ) : onTrack ? (
          <p style={{ margin: 0, fontSize: 14, color: GREEN, fontWeight: 600 }}>✓ ถึงเป้าแล้ว! ({baht(d.revenueSoFar)} / {baht(d.targetRevenue)})</p>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.9 }}>
            ทำได้ <strong>{baht(d.revenueSoFar)}</strong> จากเป้า <strong>{baht(d.targetRevenue)}</strong> ·
            ยังขาด <strong style={{ color: RED }}>{baht(d.gap)}</strong><br />
            เหลือ <strong>{d.daysLeft} วัน</strong> → ต้องทำเฉลี่ย <strong style={{ color: BLUE }}>{baht(d.requiredPerDay)}/วัน</strong>
            {d.avgDailyRevenue > 0 && <span style={{ color: "#9ca3af" }}> (ตอนนี้เฉลี่ย {baht(d.avgDailyRevenue)}/วัน)</span>}
          </p>
        )}
      </Card>

      {/* Forecast chart */}
      <div style={{ height: 16 }} />
      <Card>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>แนวโน้มรายได้ (จริง + พยากรณ์)</p>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} minTickGap={28} />
              <Tooltip formatter={(v) => baht(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid #e7e7ea", fontSize: 12 }} />
              <Line type="monotone" dataKey="actual" stroke={GOLD} strokeWidth={2} dot={false} name="จริง" />
              <Line type="monotone" dataKey="forecast" stroke={BLUE} strokeWidth={2} strokeDasharray="5 4" dot={false} name="พยากรณ์" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}
