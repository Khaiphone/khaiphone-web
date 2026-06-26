"use client";

import { useEffect, useState } from "react";
import { fetchMissionControl, fetchLeadAnalytics, type MissionControl, type LeadAnalytics } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, Mini, Section, InsightBox, Loading, baht, num, GOLD, GREEN, RED, BLUE } from "../ui";

export default function CeoMarketingPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  const [la, setLa] = useState<LeadAnalytics | null>(null);
  useEffect(() => {
    fetchMissionControl().then(setD).catch(() => {});
    fetchLeadAnalytics().then(setLa).catch(() => {});
  }, []);
  if (!d || !la) return <><PageTitle title="การตลาด & Leads" /><Loading /></>;

  const lostProfit = la.lostCount * d.avgProfitPerDevice;

  return (
    <>
      <PageTitle title="การตลาด & Leads" sub={`เดือน${d.monthLabel} · Lead เข้าพอไหม · หลุดตรงไหน · เงินหายไปกับอะไร`} />
      <InsightBox insights={d.insights.filter(i => i.text.includes("Ads") || i.text.includes("โฆษณา"))} max={2} />

      {/* ── ROI โฆษณา ── */}
      <Section title="ผลตอบแทนโฆษณา (จากบิลจริงใน Finance)">
        <Grid min={160}>
          <Mini label="ใช้งบโฆษณา" value={baht(d.adSpend)} sub={d.adsBudget ? `เป้า ${baht(d.adsBudget)}` : undefined} color={RED} />
          <Mini label="ROAS" value={d.roas ? `${d.roas}x` : "—"} color={d.roas >= 3 ? GREEN : d.roas >= 1 ? GOLD : RED} />
          <Mini label="ROI" value={d.roi ? `${d.roi}%` : "—"} color={d.roi >= 100 ? GREEN : GOLD} />
          <Mini label="ต้นทุน/Lead (CPA)" value={la.leads > 0 && d.adSpend > 0 ? baht(Math.round(d.adSpend / la.leads)) : "—"} />
        </Grid>
      </Section>

      {/* ── Lead Funnel ── */}
      <Section title="Lead Funnel — หลุดตรงขั้นไหน">
        <Card>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>Lead ทั้งหมด</span>
            <span style={{ fontSize: 24, fontWeight: 800 }}>{num(la.leads)}</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>· มูลค่ารวม (ราคาประเมิน)</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: BLUE }}>{baht(la.leadValue)}</span>
          </div>
          {la.funnel.map((f, i) => {
            const pct = la.leads > 0 ? Math.round((f.count / la.leads) * 100) : 0;
            return (
              <div key={f.label} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                  <span style={{ color: "#374151", fontWeight: 600 }}>{i + 1}. {f.label}</span>
                  <span style={{ color: "#111" }}>
                    <strong>{num(f.count)}</strong>
                    {f.conv != null && <span style={{ color: f.conv >= 50 ? GREEN : f.conv >= 25 ? GOLD : RED, fontWeight: 700 }}> · ผ่าน {f.conv}%</span>}
                  </span>
                </div>
                <div style={{ height: 16, borderRadius: 5, background: "#eef0f2", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${GOLD}, ${i === la.funnel.length - 1 ? GREEN : GOLD})`, borderRadius: 5 }} />
                </div>
              </div>
            );
          })}
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9ca3af" }}>% ผ่าน = สัดส่วนที่ไปต่อจากขั้นก่อนหน้า — ขั้นที่ % ตกฮวบคือจุดที่หลุดมากสุด</p>
        </Card>
      </Section>

      {/* ── Lost Opportunity ── */}
      <Section title="โอกาสที่เสียไป (Lost Opportunity)">
        <Grid min={180}>
          <Mini label="Lead ที่ปิดไม่ได้" value={`${num(la.lostCount)}`} sub={`จาก ${num(la.leads)} leads`} color={RED} />
          <Mini label="มูลค่าดีลที่เสีย" value={baht(la.lostValue)} sub="ราคาประเมินรวม" color={RED} />
          <Mini label="กำไรที่พลาด (ประมาณ)" value={baht(lostProfit)} sub={`≈ ${num(la.lostCount)} × ${baht(d.avgProfitPerDevice)}`} color={RED} />
          <Mini label="Lead → ขายออกจริง" value={`${num(la.soldFromLeads)}`} sub="ปิดจบครบวงจร" color={GREEN} />
        </Grid>
        {la.lostByStatus.length > 0 && (
          <Card style={{ marginTop: 14 }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#111" }}>สาเหตุที่หลุด (ตามสถานะ)</p>
            {la.lostByStatus.map((l, i) => (
              <div key={l.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < la.lostByStatus.length - 1 ? "1px solid #f0f0f2" : "none" }}>
                <span style={{ fontSize: 13.5, color: "#374151" }}>{l.label}</span>
                <span style={{ fontSize: 13, color: "#111" }}><strong>{num(l.count)}</strong> <span style={{ color: "#9ca3af" }}>· {baht(l.value)}</span></span>
              </div>
            ))}
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ca3af" }}>* สาเหตุละเอียด (ราคาไม่ตรง / ติด iCloud / เปลี่ยนใจ / ขายที่อื่น) ต้องเพิ่มช่อง &ldquo;เหตุผลที่ยกเลิก&rdquo; ตอนปิดงาน — บอกผมถ้าอยากให้เพิ่ม</p>
          </Card>
        )}
      </Section>

      {/* ── ตัวเลขเฉลี่ย ── */}
      <Section title="ค่าเฉลี่ย">
        <Grid min={180}>
          <Mini label="ราคาซื้อเฉลี่ย/เครื่อง" value={baht(la.avgPurchasePrice)} />
          <Mini label="เวลาปิดการขายเฉลี่ย" value={la.avgCloseDays > 0 ? `${la.avgCloseDays} วัน` : "—"} sub="lead → ซื้อสำเร็จ" />
          <Mini label="อัตราปิดการขาย" value={`${la.leads > 0 ? Math.round((la.funnel[3]?.count ?? 0) / la.leads * 100) : 0}%`} sub="ซื้อสำเร็จ / leads" color={GREEN} />
        </Grid>
      </Section>

      {/* ── Lead Source ── */}
      <Section title="แหล่งที่มาของ Lead">
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "0 4px 8px", borderBottom: "1px solid #eef0f2", fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
            <span>ช่องทาง</span><span style={{ textAlign: "right" }}>Leads</span><span style={{ textAlign: "right" }}>ปิดได้</span><span style={{ textAlign: "right" }}>%</span>
          </div>
          {la.bySource.map(s => (
            <div key={s.label} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "9px 4px", borderBottom: "1px solid #f6f6f8", fontSize: 13, alignItems: "center" }}>
              <span style={{ color: "#374151", fontWeight: 600 }}>{s.label}</span>
              <span style={{ textAlign: "right" }}>{num(s.count)}</span>
              <span style={{ textAlign: "right", color: GREEN, fontWeight: 600 }}>{num(s.completed)}</span>
              <span style={{ textAlign: "right", color: s.conv >= 50 ? GREEN : GOLD, fontWeight: 700 }}>{s.conv}%</span>
            </div>
          ))}
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ca3af" }}>* แยก Google vs Facebook ละเอียดต้องเก็บ utm ตอนลูกค้ากรอกฟอร์ม — ตอนนี้แยกตามช่องทางหลัก (เว็บ/LINE/FB/โทร)</p>
        </Card>
      </Section>
    </>
  );
}
