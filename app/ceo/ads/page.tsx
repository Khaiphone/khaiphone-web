"use client";

import { useEffect, useState } from "react";
import { fetchMissionControl, fetchLeadAnalytics, fetchEstimateSummary, type MissionControl, type LeadAnalytics, type EstimateSummary } from "@/app/actions/ceo";
import { PageTitle, Card, Kpi, Grid, Mini, Section, InsightBox, Loading, baht, num, GOLD, GREEN, RED, BLUE } from "../ui";

function fullAnalyticsUrl() {
  if (typeof window === "undefined") return "#";
  const { protocol, host } = window.location;
  return `${protocol}//stock.${host.replace(/^ceo\./, "")}/stock/analytics`;
}

export default function CeoMarketingPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  const [la, setLa] = useState<LeadAnalytics | null>(null);
  const [es, setEs] = useState<EstimateSummary | null>(null);
  const [showAllModels, setShowAllModels] = useState(false);
  useEffect(() => {
    fetchMissionControl().then(setD).catch(() => {});
    fetchLeadAnalytics().then(setLa).catch(() => {});
    fetchEstimateSummary(30).then(setEs).catch(() => {});
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

      {/* ── Estimate funnel (หน้าเว็บ) + อัตราสำเร็จรายรุ่น ── */}
      {es && es.estimates > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#374151", letterSpacing: 0.4 }}>คนเข้าเว็บประเมินราคา (30 วัน)</p>
            <a href={fullAnalyticsUrl()} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: GOLD, fontWeight: 600, textDecoration: "none", border: `1px solid ${GOLD}55`, borderRadius: 8, padding: "3px 10px" }}>ดูตัวเต็ม →</a>
          </div>
          <Grid min={160}>
            <Mini label="เข้าประเมิน" value={num(es.estimates)} sub="คนเปิดเครื่องคิดราคา" color={BLUE} />
            <Mini label="เห็นราคา" value={num(es.priceSeen)} />
            <Mini label="ส่งคำขอ" value={num(es.submits)} color={GREEN} />
            <Mini label="%สำเร็จ" value={`${es.conversionRate}%`} sub={`จุดตก: ${es.topDropStep}`} color={es.conversionRate >= 5 ? GREEN : GOLD} />
          </Grid>
          {/* อัตราสำเร็จรายรุ่น */}
          <Card style={{ marginTop: 14 }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: "#111" }}>อัตราสำเร็จรายรุ่น — รุ่นไหนคนประเมินเยอะแต่ส่งน้อย = ราคาอาจไม่ดึงดูด</p>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "0 4px 8px", borderBottom: "1px solid #eef0f2", fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>
              <span>รุ่น</span><span style={{ textAlign: "right" }}>เข้าประเมิน</span><span style={{ textAlign: "right" }}>ส่งคำขอ</span><span style={{ textAlign: "right" }}>%สำเร็จ</span>
            </div>
            {(showAllModels ? es.byModel : es.byModel.slice(0, 10)).map(m => (
              <div key={m.model} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "9px 4px", borderBottom: "1px solid #f6f6f8", fontSize: 13, alignItems: "center" }}>
                <span style={{ color: "#374151", fontWeight: 600 }}>{m.model}</span>
                <span style={{ textAlign: "right" }}>{num(m.estimates)}</span>
                <span style={{ textAlign: "right", color: GREEN, fontWeight: 600 }}>{num(m.submits)}</span>
                <span style={{ textAlign: "right", color: m.conv >= 5 ? GREEN : m.conv >= 2 ? GOLD : RED, fontWeight: 700 }}>{m.conv}%</span>
              </div>
            ))}
            {es.byModel.length > 10 && (
              <button onClick={() => setShowAllModels(v => !v)} style={{ width: "100%", marginTop: 10, padding: "8px", borderRadius: 9, border: `1px solid ${GOLD}55`, background: "transparent", color: GOLD, fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                {showAllModels ? "▲ ย่อ (โชว์ 10 อันดับแรก)" : `▼ ดูทั้งหมด (${es.byModel.length} รุ่น)`}
              </button>
            )}
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#9ca3af" }}>* รุ่นที่ &ldquo;เข้าประเมินเยอะ&rdquo; แต่ &ldquo;%สำเร็จต่ำ (แดง)&rdquo; = น่าทบทวนราคารับซื้อรุ่นนั้น</p>
          </Card>
        </div>
      )}

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
