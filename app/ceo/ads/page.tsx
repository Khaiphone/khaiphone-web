"use client";

import { useEffect, useState } from "react";
import { fetchMissionControl, type MissionControl } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, Progress, InsightBox, Loading, baht, GOLD, GREEN, RED, BLUE } from "../ui";

export default function CeoAdsPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  useEffect(() => { fetchMissionControl().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="โฆษณา" /><Loading /></>;

  const overBudget = d.adsBudget > 0 && d.adSpend > d.adsBudget;

  return (
    <>
      <PageTitle title="โฆษณา" sub={`เดือน${d.monthLabel} · ควรเพิ่ม/ลด Ads หรือไม่`} />
      <InsightBox insights={d.insights.filter(i => i.text.includes("Ads") || i.text.includes("โฆษณา"))} max={3} />

      {d.adSpend === 0 ? (
        <Card><p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>ยังไม่ได้กรอกยอดใช้จ่ายโฆษณา — ไปที่ <strong>ตั้งค่า</strong> → &ldquo;ยอดใช้จ่ายโฆษณาจริงเดือนนี้&rdquo; เพื่อให้ระบบคำนวณ ROAS และแนะนำงบ</p></Card>
      ) : (
        <>
          <Grid min={210}>
            <Kpi label="งบที่ใช้เดือนนี้" value={baht(d.adSpend)} color={RED} accent={RED} sub={d.adsBudget > 0 ? `งบตั้งไว้ ${baht(d.adsBudget)}` : "ยังไม่ตั้งงบ"} />
            <Kpi label="ROAS" value={`${d.roas}x`} sub="รายได้ต่อค่าโฆษณา 1 บาท" color={d.roas >= 3 ? GREEN : d.roas >= 1 ? GOLD : RED} accent={GOLD} />
            <Kpi label="ต้นทุนโฆษณา/เครื่อง" value={baht(d.costPerAcquired)} sub={`รับซื้อ ${d.acquired} เครื่อง`} color={BLUE} accent={BLUE} />
            <Kpi label="สถานะงบ" value={overBudget ? "เกินงบ" : "อยู่ในงบ"} color={overBudget ? RED : GREEN} accent={overBudget ? RED : GREEN} />
          </Grid>

          {/* Action: คำแนะนำเรื่องงบ */}
          <div style={{ height: 16 }} />
          <Card style={{ borderLeft: `4px solid ${d.adsCanAdd > 0 ? GREEN : "#9ca3af"}` }}>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#111" }}>คำแนะนำเรื่องงบโฆษณา</p>
            {d.adsCanAdd > 0 && d.expectedExtraProfit > 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.9 }}>
                ROAS ดี + เงินทุนแข็งแรง → <strong style={{ color: GREEN }}>เพิ่มงบได้อีก ~{baht(d.adsCanAdd)}/เดือน</strong><br />
                คาดได้เครื่องเพิ่ม ~<strong>{d.expectedExtraDevices} เครื่อง</strong> · กำไรเพิ่ม ~<strong style={{ color: GREEN }}>{baht(d.expectedExtraProfit)}</strong>
              </p>
            ) : d.roas > 0 && d.roas < 1 ? (
              <p style={{ margin: 0, fontSize: 14, color: RED, lineHeight: 1.8 }}>ROAS ต่ำกว่า 1 — โฆษณายังไม่คุ้ม ควรลด/หยุดงบแล้วปรับแคมเปญก่อนเพิ่ม</p>
            ) : (
              <p style={{ margin: 0, fontSize: 13.5, color: "#6b7280", lineHeight: 1.8 }}>คงงบปัจจุบันไว้ก่อน — เพิ่มงบเมื่อ ROAS ≥ 3 และเงินสดสูงกว่า Safe Buffer</p>
            )}
          </Card>

          <div style={{ height: 14 }} />
          <Card>
            <Progress label="งบโฆษณาที่ใช้ไป" value={d.adSpend} target={d.adsBudget} fmt={baht} />
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>* ROAS เป็นค่าประมาณจากรายได้รวมเทียบค่าโฆษณา (รายได้บางส่วนอาจไม่ได้มาจากโฆษณา)</p>
          </Card>
        </>
      )}
    </>
  );
}
