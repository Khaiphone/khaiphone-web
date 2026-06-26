"use client";

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { fetchMissionControl, type MissionControl } from "@/app/actions/ceo";
import { PageTitle, Card, Grid, Mini, Section, Progress, InsightBox, Loading, baht, num, GOLD, GREEN, BLUE, RED } from "./ui";

const STATUS_COLOR: Record<string, string> = { "พร้อมขาย": GREEN, "กำลังตรวจสอบ": BLUE, "ซ่อม": "#a855f7", "จองแล้ว": GOLD };
function statusColor(s: string, i: number) { return STATUS_COLOR[s] ?? ["#9ca3af", BLUE, "#a855f7", GOLD][i % 4]; }

export default function CeoOverviewPage() {
  const [d, setD] = useState<MissionControl | null>(null);
  useEffect(() => { fetchMissionControl().then(setD).catch(() => {}); }, []);
  if (!d) return <><PageTitle title="ภาพรวมธุรกิจวันนี้" /><Loading /></>;

  const missionPct = d.targetRevenue > 0 ? Math.min(100, Math.round((d.revenue / d.targetRevenue) * 100)) : d.score;
  const topInsight = d.insights[0];
  const hColor = (lv: string) => lv === "good" ? GREEN : lv === "warn" ? GOLD : RED;
  const hIcon = (lv: string) => lv === "good" ? "✓" : lv === "warn" ? "!" : "✕";
  const hLabel = (lv: string) => lv === "good" ? "ดี" : lv === "warn" ? "ปานกลาง" : "เสี่ยง";

  return (
    <>
      <PageTitle title="ภาพรวมธุรกิจวันนี้" sub={`อัปเดตล่าสุด ${new Date().toLocaleDateString("th-TH")} · เหลือ ${d.daysLeft} วัน`} />

      {/* ── MISSION + AI Recommendation ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 18 }} className="md:!grid-cols-[1.4fr_1fr]">
        <Card style={{ background: "linear-gradient(135deg,#16161A,#27272f)", border: "none", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(184,134,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🎯</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>MISSION · {d.monthLabel}</p>
              <p style={{ margin: "2px 0 8px", fontSize: 34, fontWeight: 800, color: missionPct >= 75 ? GREEN : GOLD }}>{missionPct}%</p>
              <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <div style={{ width: `${missionPct}%`, height: "100%", background: missionPct >= 75 ? GREEN : GOLD }} />
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(255,255,255,0.6)" }}>เป้ารายได้ทั้งเดือน {d.targetRevenue > 0 ? `${baht(d.revenue)} / ${baht(d.targetRevenue)}` : "ยังไม่ตั้งเป้า"}</p>
            </div>
          </div>
        </Card>
        <Card style={{ borderTop: `3px solid ${GOLD}` }}>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 700 }}>🤖 คำแนะนำของระบบ</p>
          {topInsight ? (
            <>
              <p style={{ margin: "8px 0 12px", fontSize: 14, fontWeight: 700, color: "#111", lineHeight: 1.5 }}>{topInsight.text}</p>
              <a href="/ceo/growth" style={{ display: "inline-block", background: GOLD, color: "#fff", fontSize: 12.5, fontWeight: 700, padding: "8px 16px", borderRadius: 9, textDecoration: "none" }}>ดูรายละเอียด</a>
            </>
          ) : <p style={{ margin: "8px 0 0", fontSize: 13, color: "#9ca3af" }}>ทุกอย่างอยู่ในเกณฑ์ดี ไม่มีคำแนะนำเร่งด่วน</p>}
        </Card>
      </div>

      {/* ── ภารกิจวันนี้ ── */}
      <Section title="ภารกิจวันนี้">
        <Grid min={160}>
          <Mini label="ซื้อเข้า (เดือนนี้)" value={`${d.acquired}${d.targetAcquired ? ` / ${d.targetAcquired}` : ""}`} sub="เครื่อง" />
          <Mini label="ขายออก (เดือนนี้)" value={`${d.sold}${d.targetSold ? ` / ${d.targetSold}` : ""}`} sub="เครื่อง" />
          <Mini label="Ads เดือนนี้" value={baht(d.adSpend)} sub={d.adsBudget ? `งบ ${baht(d.adsBudget)}` : "ยังไม่ตั้งงบ"} color={RED} />
          <Mini label="เงินพร้อมซื้อ" value={baht(d.buyingPower)} sub={`≈ ${d.devicesCanBuy} เครื่อง`} color={d.buyingPower > 0 ? BLUE : RED} />
          <Mini label="เครื่องค้าง > 30 วัน" value={`${d.slowCount}`} sub="เครื่อง" color={d.slowCount > 0 ? RED : GREEN} />
        </Grid>
      </Section>

      {/* ── 1. GROWTH & SALES ── */}
      <Section no={1} title="GROWTH & SALES" href="/ceo/growth">
        <Card>
          <Grid min={210}>
            <div><Progress label="ซื้อเข้า (เครื่อง)" value={d.acquired} target={d.targetAcquired} /></div>
            <div><Progress label="ขายออก (เครื่อง)" value={d.sold} target={d.targetSold} /></div>
            <div><Progress label="รายได้" value={d.revenue} target={d.targetRevenue} fmt={baht} /></div>
            <div><Progress label="กำไรขั้นต้น" value={d.grossProfit} target={d.targetProfit} fmt={baht} /></div>
          </Grid>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#6b7280" }}>
            คาดการณ์สิ้นเดือน · ซื้อเข้า <strong>{num(d.projectedAcquired)}</strong> เครื่อง · รายได้ <strong>{baht(d.projectedMonthEnd)}</strong> · กำไร <strong>{baht(d.projectedProfit)}</strong>
          </p>
        </Card>
      </Section>

      {/* ── 2. MARKETING ── */}
      <Section no={2} title="MARKETING (ADS)" href="/ceo/ads">
        <Grid min={150}>
          <Mini label="ใช้งบโฆษณา" value={baht(d.adSpend)} sub={d.adsBudget ? `เป้า ${baht(d.adsBudget)}` : undefined} color={RED} />
          <Mini label="Leads (คำขอ)" value={num(d.leads)} />
          <Mini label="ซื้อเข้า" value={`${d.acquired} เครื่อง`} sub={d.deltaRevenue != null ? `เทียบงวดก่อน` : undefined} deltaUp={d.deltaRevenue != null ? d.deltaRevenue >= 0 : null} />
          <Mini label="Cost / เครื่อง (CPA)" value={d.costPerAcquired ? baht(d.costPerAcquired) : "—"} />
          <Mini label="ROAS" value={d.roas ? `${d.roas}x` : "—"} color={d.roas >= 3 ? GREEN : d.roas >= 1 ? GOLD : RED} />
          <Mini label="ROI (กำไร/ค่าโฆษณา)" value={d.roi ? `${d.roi}%` : "—"} color={d.roi >= 100 ? GREEN : GOLD} />
        </Grid>
      </Section>

      {/* ── Leads funnel / Conversion ── */}
      <Section title="LEADS / การปิดการขาย">
        <Card>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>คำขอทั้งหมดเดือนนี้</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>{num(d.leads)}</span>
            <span style={{ fontSize: 13, color: "#6b7280" }}>· ปิดสำเร็จ</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: d.conversionRate >= 50 ? GREEN : GOLD }}>{d.conversionRate}%</span>
          </div>
          {/* stacked bar */}
          {d.leads > 0 && (
            <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
              {d.leadsFunnel.map(f => {
                const c = f.tone === "good" ? GREEN : f.tone === "info" ? BLUE : f.tone === "warn" ? GOLD : RED;
                return <div key={f.label} title={`${f.label} ${f.count}`} style={{ width: `${(f.count / d.leads) * 100}%`, background: c }} />;
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {d.leadsFunnel.map(f => {
              const c = f.tone === "good" ? GREEN : f.tone === "info" ? BLUE : f.tone === "warn" ? GOLD : RED;
              return (
                <span key={f.label} style={{ fontSize: 12.5, color: "#374151", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                  {f.label} <strong>{f.count}</strong>
                </span>
              );
            })}
          </div>
        </Card>
      </Section>

      {/* ── 3. CAPITAL & CASHFLOW ── */}
      <Section no={3} title="CAPITAL & CASHFLOW" href="/ceo/capital">
        <Grid min={170}>
          <Mini label="เงินสดในบัญชี" value={baht(d.cash)} sub="สะสม" />
          <Mini label="เงินพร้อมซื้อ" value={baht(d.buyingPower)} sub={`≈ ${d.devicesCanBuy} เครื่อง`} color={d.buyingPower > 0 ? GREEN : RED} />
          <Mini label="เงินกันชน" value={baht(d.safeBuffer)} color={BLUE} />
          <Mini label="กระแสเงินสดสุทธิ (เดือนนี้)" value={baht(d.netCashflowMonth)} sub={`เข้า ${baht(d.cashInMonth)} · ออก ${baht(d.cashOutMonth)}`} color={d.netCashflowMonth >= 0 ? GREEN : RED} />
        </Grid>
      </Section>

      {/* ── 4. INVENTORY ── */}
      <Section no={4} title="INVENTORY (สต็อก)" href="/ceo/inventory">
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }} className="md:!grid-cols-[1fr_1fr]">
          <Card>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>สต็อกทั้งหมด {num(d.stockCount)} เครื่อง · มูลค่า {baht(d.stockValue)}</p>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.inventoryByStatus} dataKey="count" nameKey="status" innerRadius={42} outerRadius={64} paddingAngle={2}>
                    {d.inventoryByStatus.map((s, i) => <Cell key={s.status} fill={statusColor(s.status, i)} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} เครื่อง`, n]} contentStyle={{ borderRadius: 10, border: "1px solid #e7e7ea", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {d.inventoryByStatus.map((s, i) => (
                <span key={s.status} style={{ fontSize: 11, color: "#374151", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: statusColor(s.status, i) }} /> {s.status} {s.count}
                </span>
              ))}
            </div>
          </Card>
          <Grid min={150}>
            <Mini label="Avg Holding Days" value={`${d.avgDaysHeld} วัน`} sub={d.avgDaysHeld <= 14 ? "หมุนเร็ว" : undefined} color={d.avgDaysHeld <= 14 ? GREEN : d.avgDaysHeld <= 30 ? GOLD : RED} />
            <Mini label="สัดส่วนขายปลีก" value={`${d.retailPct}%`} sub={`ส่ง ${100 - d.retailPct}%`} />
            <Mini label="เครื่องค้าง > 30 วัน" value={`${d.slowCount}`} sub={d.slowValue ? `เงินจม ${baht(d.slowValue)}` : undefined} color={d.slowCount > 0 ? RED : GREEN} />
            <Mini label="มูลค่าสต็อก" value={baht(d.stockValue)} color={BLUE} />
          </Grid>
        </div>
      </Section>

      {/* ── 5. PROFITABILITY ── */}
      <Section no={5} title="PROFITABILITY">
        <Card>
          <Grid min={150}>
            <Mini label="กำไรขั้นต้น" value={baht(d.grossProfit)} sub={`Margin ${d.margin}%`} color={GREEN} />
            <Mini label="กำไรสุทธิ" value={baht(d.netProfit)} color={d.netProfit >= 0 ? GREEN : RED} />
            <Mini label="กำไรเฉลี่ย/เครื่อง" value={baht(d.avgProfitPerDevice)} />
            <Mini label="Net Margin" value={`${d.revenue > 0 ? Math.round(d.netProfit / d.revenue * 1000) / 10 : 0}%`} />
          </Grid>
          <div style={{ height: 12 }} />
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>กำไรสุทธิ (รายเดือน)</p>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.profitByMonth}>
                <defs><linearGradient id="pf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={GOLD} stopOpacity={0.35} /><stop offset="100%" stopColor={GOLD} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f2" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => baht(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid #e7e7ea", fontSize: 12 }} />
                <Area type="monotone" dataKey="profit" stroke={GOLD} strokeWidth={2} fill="url(#pf)" name="กำไร" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      {/* ── 6. BUSINESS HEALTH ── */}
      <Section no={6} title="BUSINESS HEALTH">
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }} className="md:!grid-cols-[260px_1fr]">
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "relative", width: 130, height: 130 }}>
              <svg width="130" height="130" viewBox="0 0 130 130">
                <circle cx="65" cy="65" r="58" fill="none" stroke="#eef0f2" strokeWidth="11" />
                <circle cx="65" cy="65" r="58" fill="none" stroke={d.score >= 75 ? GREEN : d.score >= 50 ? GOLD : RED} strokeWidth="11" strokeLinecap="round"
                  strokeDasharray={`${(d.score / 100) * 2 * Math.PI * 58} ${2 * Math.PI * 58}`} transform="rotate(-90 65 65)" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 38, fontWeight: 800, color: d.score >= 75 ? GREEN : d.score >= 50 ? GOLD : RED }}>{d.score}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>/ 100</span>
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 16, fontWeight: 800, color: d.score >= 75 ? GREEN : d.score >= 50 ? GOLD : RED }}>{d.scoreLevel}</p>
          </Card>
          <Card>
            {d.healthChecklist.map((h, i) => (
              <div key={h.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: i < d.healthChecklist.length - 1 ? "1px solid #f0f0f2" : "none" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, color: "#374151" }}>
                  <span style={{ width: 20, height: 20, borderRadius: "50%", background: `${hColor(h.level)}22`, color: hColor(h.level), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{hIcon(h.level)}</span>
                  {h.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: hColor(h.level) }}>{hLabel(h.level)}</span>
              </div>
            ))}
          </Card>
        </div>
      </Section>

      {/* ── 7 + 8. ACTIVITY + ALERTS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }} className="md:!grid-cols-2">
        <Section no={7} title="RECENT ACTIVITY">
          <Card>
            {d.recentActivity.length === 0 ? <p style={{ margin: 0, fontSize: 13, color: "#9ca3af" }}>ยังไม่มีรายการ</p> :
              d.recentActivity.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: i < d.recentActivity.length - 1 ? "1px solid #f0f0f2" : "none" }}>
                  <span style={{ fontSize: 13, color: "#374151", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span>{a.kind === "sell" ? "🛒" : "📥"}</span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</span>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: a.kind === "sell" ? GREEN : "#111", whiteSpace: "nowrap" }}>{baht(a.amount)}</span>
                </div>
              ))}
          </Card>
        </Section>
        <Section no={8} title="ALERTS">
          <InsightBox insights={d.insights} max={5} />
          {d.insights.length === 0 && <Card><p style={{ margin: 0, fontSize: 13, color: GREEN }}>✓ ไม่มีการแจ้งเตือน — ทุกอย่างปกติ</p></Card>}
        </Section>
      </div>
    </>
  );
}
