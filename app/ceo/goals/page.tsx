"use client";

import { useEffect, useState } from "react";
import { fetchMissionControl, type MissionControl } from "@/app/actions/ceo";
import { PageTitle, Card, Progress, InsightBox, Loading, baht, GOLD, RED } from "../ui";

export default function CeoGoalsPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  useEffect(() => { fetchMissionControl().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="เป้าหมายเดือน" /><Loading /></>;

  const noTarget = !d.targetRevenue && !d.targetProfit && !d.targetAcquired && !d.targetSold;

  return (
    <>
      <PageTitle title="เป้าหมายเดือน" sub={`เดือน${d.monthLabel} · เหลือ ${d.daysLeft} วัน`} />
      <InsightBox insights={d.insights} max={3} />

      {noTarget ? (
        <Card><p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>ยังไม่ได้ตั้งเป้าหมาย — ไปที่ <strong>ตั้งค่า</strong> เพื่อกำหนดเป้ารายได้ กำไร และจำนวนเครื่อง</p></Card>
      ) : (
        <>
          {d.targetRevenue > 0 && d.gap > 0 && (
            <Card style={{ marginBottom: 14, borderLeft: `4px solid ${RED}` }}>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.8 }}>
                ยังขาดอีก <strong style={{ color: RED }}>{baht(d.gap)}</strong> ถึงเป้ารายได้ ·
                เหลือ <strong>{d.daysLeft} วัน</strong> → ต้องทำเฉลี่ย <strong style={{ color: GOLD }}>{baht(d.requiredPerDay)}/วัน</strong>
              </p>
            </Card>
          )}
          <Card>
            <Progress label="รายได้" value={d.revenue} target={d.targetRevenue} fmt={baht} />
            <Progress label="กำไรขั้นต้น" value={d.grossProfit} target={d.targetProfit} fmt={baht} />
            <Progress label="เครื่องรับซื้อ" value={d.acquired} target={d.targetAcquired} />
            <Progress label="เครื่องขาย" value={d.sold} target={d.targetSold} />
            <div style={{ borderTop: "1px solid #eef0f2", margin: "8px 0 16px" }} />
            <Progress label="งบโฆษณาที่ใช้" value={d.adSpend} target={d.adsBudget} fmt={baht} />
          </Card>
        </>
      )}
    </>
  );
}
