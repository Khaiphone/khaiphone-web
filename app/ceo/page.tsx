"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid } from "recharts";
import { fetchCeoOverview, type CeoOverview } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, Progress, Loading, baht, num, GOLD, GREEN, BLUE, RED } from "./ui";

export default function CeoOverviewPage() {
  const [d, setD] = useState<CeoOverview | null>(null);
  useEffect(() => { fetchCeoOverview().then(setD).catch(() => {}); }, []);

  if (!d) return <><PageTitle title="ภาพรวมธุรกิจ" /><Loading /></>;

  const delta = (v: number | null) => v == null ? "" : `${v >= 0 ? "▲" : "▼"} ${Math.abs(v)}% เทียบงวดก่อน`;

  return (
    <>
      <PageTitle title="ภาพรวมธุรกิจ" sub={`เดือน${d.monthLabel} · ข้อมูลรวมจาก Finance / Stock / Requests`} />

      <Grid min={220}>
        <Kpi label="รายได้เดือนนี้" value={baht(d.revenue)} sub={delta(d.deltaRevenue)} accent={GOLD} />
        <Kpi label="กำไรขั้นต้น" value={baht(d.grossProfit)} sub={`มาร์จิ้น ${d.margin}%`} color={GREEN} accent={GREEN} />
        <Kpi label="กำไรสุทธิ (หักค่าใช้จ่าย)" value={baht(d.netProfit)} sub={delta(d.deltaProfit)} color={d.netProfit >= 0 ? GREEN : RED} accent={d.netProfit >= 0 ? GREEN : RED} />
        <Kpi label="มูลค่าสต็อก (ทุนจม)" value={baht(d.stockValue)} sub={`${num(d.stockCount)} เครื่องในคลัง`} color={BLUE} accent={BLUE} />
      </Grid>

      <div style={{ height: 14 }} />
      <Grid min={180}>
        <Kpi label="เครื่องรับซื้อเดือนนี้" value={`${num(d.devicesAcquired)} เครื่อง`} />
        <Kpi label="เครื่องขายเดือนนี้" value={`${num(d.devicesSold)} เครื่อง`} />
        <Kpi label="ค่าใช้จ่ายเดือนนี้" value={baht(d.expenses)} color={RED} />
      </Grid>

      {/* Target progress */}
      <div style={{ height: 18 }} />
      <Card>
        <p style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#111" }}>ความคืบหน้าเทียบเป้าเดือนนี้</p>
        <Progress label="รายได้" value={d.revenue} target={d.settings.targetRevenue} fmt={baht} />
        <Progress label="กำไรขั้นต้น" value={d.grossProfit} target={d.settings.targetProfit} fmt={baht} />
        <Progress label="เครื่องรับซื้อ" value={d.devicesAcquired} target={d.settings.targetAcquired} />
        <Progress label="เครื่องขาย" value={d.devicesSold} target={d.settings.targetSold} />
        {d.settings.targetRevenue === 0 && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>ยังไม่ได้ตั้งเป้า — ไปที่ <strong>ตั้งค่า</strong> เพื่อกำหนดเป้าหมายเดือน</p>
        )}
      </Card>

      {/* Revenue trend */}
      <div style={{ height: 18 }} />
      <Card>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>รายได้ย้อนหลัง</p>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={d.revenueByMonth}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => baht(Number(v))} labelStyle={{ color: "#111" }} contentStyle={{ borderRadius: 10, border: "1px solid #e7e7ea", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} fill="url(#rev)" name="รายได้" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  );
}
