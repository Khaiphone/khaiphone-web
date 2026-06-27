"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ComposedChart, Bar, Legend } from "recharts";
import { fetchMissionControl, fetchMonthlyTrend, type MissionControl, type MonthlyTrendPoint } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, InsightBox, Loading, baht, num, GOLD, GREEN, BLUE, RED } from "../ui";
import { useCeoMonth } from "../MonthContext";

export default function CeoGrowthPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  const [trend, setTrend] = useState<MonthlyTrendPoint[] | null>(null);
  const { month } = useCeoMonth();
  useEffect(() => { setD(null); fetchMissionControl(month).then(setD).catch(() => {}); }, [month]);
  useEffect(() => { fetchMonthlyTrend(6).then(setTrend).catch(() => {}); }, []);
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

      {/* ── แนวโน้มย้อนหลัง 6 เดือน (เทียบเดือนต่อเดือน) ── */}
      <div style={{ height: 16 }} />
      <Card>
        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#111" }}>แนวโน้มย้อนหลัง 6 เดือน</p>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#9ca3af" }}>รายได้ · กำไรขั้นต้น · จำนวนเครื่อง เทียบเดือนต่อเดือน</p>
        {!trend ? <Loading /> : trend.every(t => t.revenue === 0 && t.acquired === 0 && t.sold === 0) ? (
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>ยังไม่มีข้อมูลย้อนหลังพอจะแสดงแนวโน้ม — กลับมาดูอีกครั้งเมื่อผ่านไปหลายเดือน</p>
        ) : (
          <>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend}>
                  <defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.9} /><stop offset="100%" stopColor={GOLD} stopOpacity={0.55} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => v >= 1000 ? `${Math.round(Number(v) / 1000)}k` : `${v}`} />
                  <Tooltip formatter={(v, n) => [baht(Number(v)), n]} contentStyle={{ borderRadius: 10, border: "1px solid #e7e7ea", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="รายได้" fill="url(#rv)" radius={[6, 6, 0, 0]} maxBarSize={46} />
                  <Line type="monotone" dataKey="profit" name="กำไรขั้นต้น" stroke={GREEN} strokeWidth={2.5} dot={{ r: 3, fill: GREEN }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p style={{ margin: "16px 0 10px", fontSize: 12.5, fontWeight: 700, color: "#374151" }}>จำนวนเครื่อง (ซื้อเข้า / ขายออก)</p>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
                  <Tooltip formatter={(v, n) => [`${num(Number(v))} เครื่อง`, n]} contentStyle={{ borderRadius: 10, border: "1px solid #e7e7ea", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="acquired" name="ซื้อเข้า" fill={BLUE} radius={[5, 5, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="sold" name="ขายออก" fill={GREEN} radius={[5, 5, 0, 0]} maxBarSize={28} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
