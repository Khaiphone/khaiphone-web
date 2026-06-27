"use client";

import { useEffect, useState } from "react";
import { fetchMissionControl, type MissionControl } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, InsightBox, Loading, baht, num, GREEN, RED, BLUE, GOLD } from "../ui";
import { useCeoMonth } from "../MonthContext";

export default function CeoCapitalPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  const { month } = useCeoMonth();
  useEffect(() => { setD(null); fetchMissionControl(month).then(setD).catch(() => {}); }, [month]);
  if (!d) return <><PageTitle title="เงินทุน" /><Loading /></>;

  const low = d.buyingPower <= 0;

  return (
    <>
      <PageTitle title="เงินทุน" sub="ซื้อเครื่องได้อีกกี่เครื่อง · เงินกันชนปลอดภัยไหม" />
      <InsightBox insights={d.insights.filter(i => i.text.includes("เงิน") || i.text.includes("ซื้อ") || i.text.includes("Buffer"))} max={3} />

      <Grid min={210}>
        <Kpi label="เงินสดสุทธิ" value={baht(d.cash)} sub="รับ − จ่าย สะสม" accent={GOLD} />
        <Kpi label="เงินพร้อมซื้อ" value={baht(d.buyingPower)} sub="เงินสด − กันชน" color={low ? RED : GREEN} accent={low ? RED : GREEN} />
        <Kpi label="ซื้อได้อีก" value={`${num(d.devicesCanBuy)} เครื่อง`} sub={`ต้นทุนเฉลี่ย ${baht(d.avgCostPerDevice)}/เครื่อง`} color={BLUE} accent={BLUE} />
        <Kpi label="เงินกันชน (ห้ามแตะ)" value={baht(d.safeBuffer)} sub="ตั้งที่หน้าตั้งค่า" color={BLUE} accent={BLUE} />
      </Grid>

      <div style={{ height: 16 }} />
      <Card style={{ borderLeft: `4px solid ${low ? RED : GREEN}` }}>
        <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.9 }}>
          เงินสด <strong>{baht(d.cash)}</strong> · กันชน <strong style={{ color: BLUE }}>{baht(d.safeBuffer)}</strong> →
          เงินพร้อมซื้อ <strong style={{ color: low ? RED : GREEN }}>{baht(d.buyingPower)}</strong>
          {!low && d.devicesCanBuy > 0 && <> ≈ <strong>{d.devicesCanBuy} เครื่อง</strong></>}
        </p>
        {low && <p style={{ margin: "8px 0 0", fontSize: 13, color: RED, fontWeight: 600 }}>⚠ เงินสดต่ำกว่าเงินกันชน — ยังไม่ควรซื้อเพิ่ม รอเงินสดเข้าก่อน</p>}
        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ca3af" }}>ทุนจมในสต็อกตอนนี้ {baht(d.stockValue)} ({num(d.stockCount)} เครื่อง) — ระบายออกเพื่อปลดเงินทุน</p>
        {d.safeBuffer === 0 && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>ยังไม่ได้ตั้งเงินกันชน — ตั้งที่หน้า <strong>ตั้งค่า</strong></p>}
      </Card>
    </>
  );
}
