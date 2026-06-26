"use client";

import { useEffect, useState } from "react";
import { fetchCeoInventory, type CeoInventory } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, Loading, baht, num, GOLD, RED, BLUE } from "../ui";

export default function CeoInventoryPage() {
  const [d, setD] = useState<CeoInventory | null>(null);
  useEffect(() => { fetchCeoInventory().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="สต็อก" /><Loading /></>;

  return (
    <>
      <PageTitle title="สต็อก" sub="มูลค่าสต็อก · วันถือครอง · เครื่องค้างนาน (slow-moving)" />
      <Grid min={210}>
        <Kpi label="มูลค่าสต็อก (ทุนจม)" value={baht(d.stockValue)} sub={`${num(d.stockCount)} เครื่องในคลัง`} accent={BLUE} />
        <Kpi label="วันถือครองเฉลี่ย" value={`${d.avgDaysHeld} วัน`} sub="ยิ่งน้อยยิ่งหมุนเร็ว" accent={GOLD} />
        <Kpi label="เครื่องค้าง > 30 วัน" value={`${num(d.slowCount)} เครื่อง`} color={d.slowCount > 0 ? RED : "#111"} accent={RED} />
        <Kpi label="ทุนจมในเครื่องค้าง" value={baht(d.slowValue)} color={d.slowValue > 0 ? RED : "#111"} accent={RED} />
      </Grid>

      <div style={{ height: 16 }} />
      <Card>
        <p style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#111" }}>เครื่องค้างนาน — ควรเร่งระบาย ({num(d.slowCount)})</p>
        {d.slowMovers.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#16a34a" }}>✓ ไม่มีเครื่องค้างเกิน 30 วัน — สต็อกหมุนดี</p>
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
