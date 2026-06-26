"use client";

import { useEffect, useState } from "react";
import { fetchCeoCapital, type CeoCapital } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, Loading, baht, GREEN, RED, BLUE, GOLD } from "../ui";

export default function CeoCapitalPage() {
  const [d, setD] = useState<CeoCapital | null>(null);
  useEffect(() => { fetchCeoCapital().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="เงินทุน" /><Loading /></>;

  const low = d.buyingPower <= 0;

  return (
    <>
      <PageTitle title="เงินทุน" sub="เงินสด · เงินพร้อมซื้อ · เงินกันชน · ทุนจมในสต็อก" />
      <Grid min={220}>
        <Kpi label="เงินสดสุทธิ" value={baht(d.cash)} sub="จากกระแสเงินสด (รับ − จ่าย สะสม)" accent={GOLD} />
        <Kpi label="เงินพร้อมซื้อ" value={baht(d.buyingPower)} sub="เงินสด − เงินกันชน" color={low ? RED : GREEN} accent={low ? RED : GREEN} />
        <Kpi label="เงินกันชน (ห้ามแตะ)" value={baht(d.safeBuffer)} sub="ตั้งที่หน้าตั้งค่า" color={BLUE} accent={BLUE} />
        <Kpi label="ทุนจมในสต็อก" value={baht(d.stockValue)} sub="มูลค่าต้นทุนเครื่องที่ยังไม่ขาย" accent={GOLD} />
      </Grid>

      <div style={{ height: 16 }} />
      <Card>
        <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.8 }}>
          เงินสดทั้งหมด <strong>{baht(d.cash)}</strong> · กันไว้เป็นกันชน <strong style={{ color: BLUE }}>{baht(d.safeBuffer)}</strong> ·
          เหลือ<strong style={{ color: low ? RED : GREEN }}> เงินพร้อมซื้อของ {baht(d.buyingPower)}</strong>
        </p>
        {low && <p style={{ margin: "8px 0 0", fontSize: 13, color: RED, fontWeight: 600 }}>⚠ เงินพร้อมซื้อหมด — เงินสดต่ำกว่าเงินกันชนที่ตั้งไว้</p>}
        {d.safeBuffer === 0 && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#9ca3af" }}>ยังไม่ได้ตั้งเงินกันชน — ตั้งที่หน้า <strong>ตั้งค่า</strong> เพื่อคุมไม่ให้ใช้เงินจนเกินตัว</p>}
      </Card>
    </>
  );
}
