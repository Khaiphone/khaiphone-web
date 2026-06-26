"use client";

import { useEffect, useState } from "react";
import { fetchCeoOverview, type CeoOverview } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, Progress, Loading, baht, GOLD, GREEN, RED, BLUE } from "../ui";

export default function CeoAdsPage() {
  const [d, setD] = useState<CeoOverview | null>(null);
  useEffect(() => { fetchCeoOverview().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="โฆษณา" /><Loading /></>;

  const { adSpend, adsBudget } = d.settings;
  const roas = adSpend > 0 ? Math.round((d.revenue / adSpend) * 10) / 10 : 0;       // รายได้ต่อ 1 บาทค่าโฆษณา
  const costPerAcquired = d.devicesAcquired > 0 ? Math.round(adSpend / d.devicesAcquired) : 0;
  const overBudget = adsBudget > 0 && adSpend > adsBudget;

  return (
    <>
      <PageTitle title="โฆษณา" sub={`เดือน${d.monthLabel} · ROAS / ต้นทุนต่อเครื่อง · ยอดใช้จ่ายกรอกที่หน้าตั้งค่า`} />

      {adSpend === 0 ? (
        <Card><p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>ยังไม่ได้กรอกยอดใช้จ่ายโฆษณา — ไปที่ <strong>ตั้งค่า</strong> → &ldquo;ยอดใช้จ่ายโฆษณาจริงเดือนนี้&rdquo;</p></Card>
      ) : (
        <>
          <Grid min={220}>
            <Kpi label="ใช้จ่ายโฆษณาเดือนนี้" value={baht(adSpend)} color={RED} accent={RED} sub={adsBudget > 0 ? `งบ ${baht(adsBudget)}` : "ยังไม่ตั้งงบ"} />
            <Kpi label="ROAS" value={`${roas}x`} sub="รายได้ต่อค่าโฆษณา 1 บาท" color={roas >= 3 ? GREEN : roas >= 1 ? GOLD : RED} accent={GOLD} />
            <Kpi label="ต้นทุนโฆษณา/เครื่องรับซื้อ" value={baht(costPerAcquired)} sub={`รับซื้อ ${d.devicesAcquired} เครื่อง`} color={BLUE} accent={BLUE} />
            <Kpi label="สถานะงบ" value={overBudget ? "เกินงบ" : "อยู่ในงบ"} color={overBudget ? RED : GREEN} accent={overBudget ? RED : GREEN} />
          </Grid>
          <div style={{ height: 16 }} />
          <Card>
            <Progress label="งบโฆษณาที่ใช้ไป" value={adSpend} target={adsBudget} fmt={baht} />
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>
              * ROAS คำนวณจากรายได้รวมทั้งเดือนเทียบค่าโฆษณา (เป็นค่าประมาณ — รายได้ส่วนหนึ่งอาจไม่ได้มาจากโฆษณาโดยตรง)
            </p>
          </Card>
        </>
      )}
    </>
  );
}
