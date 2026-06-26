"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid } from "recharts";
import { fetchMissionControl, type MissionControl } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, Progress, Loading, ScoreCard, InsightBox, baht, num, GOLD, GREEN, BLUE, RED } from "./ui";

export default function CeoOverviewPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  useEffect(() => { fetchMissionControl().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="ภาพรวมธุรกิจ" /><Loading /></>;

  const delta = (v: number | null) => v == null ? "" : `${v >= 0 ? "▲" : "▼"} ${Math.abs(v)}% เทียบงวดก่อน`;

  return (
    <>
      <PageTitle title="ภาพรวมธุรกิจ" sub={`เดือน${d.monthLabel} · เหลือ ${d.daysLeft} วัน · ข้อมูลรวม Finance / Stock / Requests`} />

      {/* Business Score */}
      <div style={{ marginBottom: 18 }}><ScoreCard score={d.score} level={d.scoreLevel} breakdown={d.scoreBreakdown} /></div>

      {/* Executive Insight — ควรทำอะไรต่อ */}
      <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#374151" }}>📋 วันนี้ควรทำอะไร</p>
      <InsightBox insights={d.insights} />

      <Grid min={220}>
        <Kpi label="รายได้เดือนนี้" value={baht(d.revenue)} sub={delta(d.deltaRevenue)} accent={GOLD} />
        <Kpi label="กำไรขั้นต้น" value={baht(d.grossProfit)} sub={`มาร์จิ้น ${d.margin}%`} color={GREEN} accent={GREEN} />
        <Kpi label="กำไรสุทธิ" value={baht(d.netProfit)} sub={delta(d.deltaProfit)} color={d.netProfit >= 0 ? GREEN : RED} accent={d.netProfit >= 0 ? GREEN : RED} />
        <Kpi label="เงินพร้อมซื้อ" value={baht(d.buyingPower)} sub={`≈ ซื้อได้ ${d.devicesCanBuy} เครื่อง`} color={d.buyingPower > 0 ? BLUE : RED} accent={BLUE} />
      </Grid>

      <div style={{ height: 14 }} />
      <Grid min={180}>
        <Kpi label="เครื่องรับซื้อ" value={`${num(d.acquired)} เครื่อง`} />
        <Kpi label="เครื่องขาย" value={`${num(d.sold)} เครื่อง`} />
        <Kpi label="มูลค่าสต็อก" value={baht(d.stockValue)} sub={`${num(d.stockCount)} เครื่อง`} />
        <Kpi label="ค่าใช้จ่าย" value={baht(d.expenses)} color={RED} />
      </Grid>

      <div style={{ height: 18 }} />
      <Card>
        <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#111" }}>ความคืบหน้าเทียบเป้าเดือนนี้</p>
        <Progress label="รายได้" value={d.revenue} target={d.targetRevenue} fmt={baht} />
        <Progress label="กำไรขั้นต้น" value={d.grossProfit} target={d.targetProfit} fmt={baht} />
        <Progress label="เครื่องรับซื้อ" value={d.acquired} target={d.targetAcquired} />
        <Progress label="เครื่องขาย" value={d.sold} target={d.targetSold} />
      </Card>

      <div style={{ height: 18 }} />
      <Card>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>รายได้ย้อนหลัง</p>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.revenueByMonth}>
              <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.35} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => baht(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid #e7e7ea", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} fill="url(#rev)" name="รายได้" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}
