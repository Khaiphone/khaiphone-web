"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip, CartesianGrid } from "recharts";
import { fetchMissionControl, type MissionControl } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, InsightBox, Loading, baht, GOLD, GREEN, BLUE, RED } from "../ui";

export default function CeoGrowthPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  useEffect(() => { fetchMissionControl().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="การเติบโต" /><Loading /></>;

  const hasTarget = d.targetRevenue > 0;
  const prob = hasTarget ? Math.min(100, Math.round((d.projectedMonthEnd / d.targetRevenue) * 100)) : 0;

  return (
    <>
      <PageTitle title="การเติบโต" sub="พยากรณ์ · โอกาสถึงเป้า · ต้องทำเพิ่มเท่าไร" />
      <InsightBox insights={d.insights.filter(i => i.text.includes("เป้า") || i.text.includes("วัน") || i.text.includes("คาด"))} max={3} />

      <Grid min={200}>
        <Kpi label="รายได้เฉลี่ย/วัน" value={baht(d.avgDailyRevenue)} accent={GOLD} />
        <Kpi label="คาดสิ้นเดือนนี้" value={baht(d.projectedMonthEnd)} sub={`เหลือ ${d.daysLeft} วัน`} color={GREEN} accent={GREEN} />
        {hasTarget && <Kpi label="โอกาสถึงเป้า" value={`${prob}%`} sub={`เป้า ${baht(d.targetRevenue)}`} color={d.onTrack ? GREEN : RED} accent={d.onTrack ? GREEN : RED} />}
        {hasTarget && !d.onTrack && <Kpi label="ต้องทำเพิ่ม/วัน" value={baht(d.requiredPerDay)} sub="เพื่อให้ถึงเป้า" color={BLUE} accent={BLUE} />}
      </Grid>

      <div style={{ height: 16 }} />
      <Card style={{ borderLeft: `4px solid ${!hasTarget ? "#9ca3af" : d.onTrack ? GREEN : RED}` }}>
        <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#111" }}>แผนไปให้ถึงเป้าเดือนนี้</p>
        {!hasTarget ? (
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>ยังไม่ได้ตั้งเป้ารายได้ — ตั้งที่หน้า <strong>ตั้งค่า</strong></p>
        ) : d.onTrack ? (
          <p style={{ margin: 0, fontSize: 14, color: GREEN, fontWeight: 600 }}>✓ มาตามแผน — คาดสิ้นเดือนได้ {baht(d.projectedMonthEnd)} (เป้า {baht(d.targetRevenue)})</p>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.9 }}>
            ทำได้ <strong>{baht(d.revenue)}</strong> · ยังขาด <strong style={{ color: RED }}>{baht(d.gap)}</strong> ·
            เหลือ <strong>{d.daysLeft} วัน</strong> → ต้องทำ <strong style={{ color: BLUE }}>{baht(d.requiredPerDay)}/วัน</strong>
            <span style={{ color: "#9ca3af" }}> (ตอนนี้เฉลี่ย {baht(d.avgDailyRevenue)}/วัน)</span>
          </p>
        )}
      </Card>

      <div style={{ height: 16 }} />
      <Card>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>แนวโน้มรายได้ (จริง + พยากรณ์)</p>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.forecastPoints}>
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
