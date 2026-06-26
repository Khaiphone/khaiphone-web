"use client";

import { useEffect, useState } from "react";
import { fetchMissionControl, type MissionControl } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, InsightBox, Loading, baht, num, GOLD, GREEN, RED, BLUE } from "../ui";

export default function CeoInventoryPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  useEffect(() => { fetchMissionControl().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="สต็อก" /><Loading /></>;

  // Inventory health: ยิ่งค้างนาน/เงินจมมาก = แย่
  const slowRatio = d.stockValue > 0 ? d.slowValue / d.stockValue : 0;
  const health = Math.round(Math.max(0, Math.min(1, (1 - slowRatio) * 0.5 + Math.max(0, 1 - d.avgDaysHeld / 45) * 0.5)) * 100);
  const hColor = health >= 75 ? GREEN : health >= 50 ? GOLD : RED;

  return (
    <>
      <PageTitle title="สต็อก" sub="สุขภาพสต็อก · วันถือครอง · เครื่องค้าง" />
      <InsightBox insights={d.insights.filter(i => i.text.includes("สต็อก") || i.text.includes("ระบาย") || i.text.includes("ค้าง"))} max={3} />

      <Grid min={200}>
        <Kpi label="Inventory Health" value={`${health}`} sub={health >= 75 ? "หมุนดี" : health >= 50 ? "พอใช้" : "ค้างเยอะ"} color={hColor} accent={hColor} />
        <Kpi label="มูลค่าสต็อก (เงินจม)" value={baht(d.stockValue)} sub={`${num(d.stockCount)} เครื่อง`} color={BLUE} accent={BLUE} />
        <Kpi label="วันถือครองเฉลี่ย" value={`${d.avgDaysHeld} วัน`} sub="ยิ่งน้อยยิ่งหมุนเร็ว" accent={GOLD} />
        <Kpi label="ค้าง > 30 วัน" value={`${num(d.slowCount)} เครื่อง`} sub={`เงินจม ${baht(d.slowValue)}`} color={d.slowCount > 0 ? RED : "#111"} accent={RED} />
      </Grid>

      <div style={{ height: 16 }} />
      <Card>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>เครื่องค้างนาน — ควรเร่งระบาย ({num(d.slowCount)})</p>
        {d.slowMovers.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: GREEN }}>✓ ไม่มีเครื่องค้างเกิน 30 วัน — สต็อกหมุนดี</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.slowMovers.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#faf7f2", border: "1px solid #f0e9dd" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111" }}>{m.model} {m.storage}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{m.id}</p>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: RED }}>{m.daysInStock} วัน</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>ทุน {baht(m.totalCost)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
