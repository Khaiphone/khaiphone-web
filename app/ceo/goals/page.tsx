"use client";

import { useEffect, useState } from "react";
import { fetchCeoOverview, type CeoOverview } from "@/app/actions/ceo";
import { PageTitle, Card, Progress, Loading, baht } from "../ui";

export default function CeoGoalsPage() {
  const [d, setD] = useState<CeoOverview | null>(null);
  useEffect(() => { fetchCeoOverview().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="เป้าหมายเดือน" /><Loading /></>;

  const s = d.settings;
  const noTarget = !s.targetRevenue && !s.targetProfit && !s.targetAcquired && !s.targetSold;

  return (
    <>
      <PageTitle title="เป้าหมายเดือน" sub={`เดือน${d.monthLabel} · ตั้งเป้าได้ที่หน้า "ตั้งค่า"`} />
      {noTarget ? (
        <Card><p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>ยังไม่ได้ตั้งเป้าหมาย — ไปที่ <strong>ตั้งค่า</strong> เพื่อกำหนดเป้ารายได้ กำไร และจำนวนเครื่อง</p></Card>
      ) : (
        <Card>
          <Progress label="รายได้" value={d.revenue} target={s.targetRevenue} fmt={baht} />
          <Progress label="กำไรขั้นต้น" value={d.grossProfit} target={s.targetProfit} fmt={baht} />
          <Progress label="เครื่องรับซื้อ" value={d.devicesAcquired} target={s.targetAcquired} />
          <Progress label="เครื่องขาย" value={d.devicesSold} target={s.targetSold} />
          <div style={{ borderTop: "1px solid #eef0f2", margin: "8px 0 16px" }} />
          <Progress label="งบโฆษณาที่ใช้" value={s.adSpend} target={s.adsBudget} fmt={baht} />
        </Card>
      )}
    </>
  );
}
