"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { fetchMyProfile } from "@/app/actions/admin-users";
import { fetchFinanceDashboard, fetchFinanceCashFlow, fetchForecast, fetchStockAging, fetchExpenses } from "@/app/actions/finance";
import { fetchEstimateAnalytics } from "@/app/actions/analytics";

// CEO dashboard = เจ้าของเท่านั้น
async function requireOwner() {
  const user = await requireAuth();
  const profile = await fetchMyProfile(user.id);
  if (profile?.role !== "owner") throw new Error("forbidden");
  return user;
}

export type CeoSettings = {
  targetRevenue: number;   // เป้ารายได้/เดือน
  targetProfit: number;    // เป้ากำไร/เดือน
  targetAcquired: number;  // เป้าจำนวนเครื่องรับซื้อ
  targetSold: number;      // เป้าจำนวนเครื่องขาย
  adsBudget: number;       // งบโฆษณา/เดือน
  adSpend: number;         // ยอดใช้จ่ายโฆษณา (fallback ถ้าไม่ได้ผูกหมวดค่าใช้จ่าย)
  adsCategory: string;     // หมวดค่าใช้จ่ายใน Finance ที่ถือเป็นค่าโฆษณา → ดึง adSpend อัตโนมัติ
  safeBuffer: number;      // เงินกันชนที่ต้องเหลือ (ห้ามแตะ)
};

const DEFAULT_SETTINGS: CeoSettings = {
  targetRevenue: 0, targetProfit: 0, targetAcquired: 0, targetSold: 0,
  adsBudget: 0, adSpend: 0, adsCategory: "", safeBuffer: 0,
};

export async function getCeoSettings(): Promise<CeoSettings> {
  await requireOwner();
  const supabase = createServerClient();
  const { data } = await supabase.from("ceo_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    targetRevenue:  data.target_revenue  ?? 0,
    targetProfit:   data.target_profit   ?? 0,
    targetAcquired: data.target_acquired ?? 0,
    targetSold:     data.target_sold     ?? 0,
    adsBudget:      data.ads_budget       ?? 0,
    adSpend:        data.ad_spend          ?? 0,
    adsCategory:    data.ads_category      ?? "",
    safeBuffer:     data.safe_buffer       ?? 0,
  };
}

// หมวดค่าใช้จ่ายทั้งหมด (ให้ CEO เลือกว่าหมวดไหน = ค่าโฆษณา)
export async function fetchExpenseCategories(): Promise<string[]> {
  await requireOwner();
  const supabase = createServerClient();
  const { data } = await supabase.from("expenses").select("category").not("category", "is", null);
  const set = new Set<string>();
  for (const r of (data ?? []) as { category: string | null }[]) if (r.category) set.add(r.category);
  return Array.from(set).sort();
}

export async function saveCeoSettings(s: CeoSettings): Promise<{ success: boolean; error?: string }> {
  await requireOwner();
  const supabase = createServerClient();
  const { error } = await supabase.from("ceo_settings").upsert({
    id: 1,
    target_revenue:  s.targetRevenue,
    target_profit:   s.targetProfit,
    target_acquired: s.targetAcquired,
    target_sold:     s.targetSold,
    ads_budget:      s.adsBudget,
    ad_spend:        s.adSpend,
    ads_category:    s.adsCategory,
    safe_buffer:     s.safeBuffer,
    updated_at:      new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ขอบเขตของ "เดือน" หนึ่ง — รับ month = "YYYY-MM" (ไม่ใส่ = เดือนปัจจุบัน)
// เดือนปัจจุบัน: to = วันนี้, มีวันเหลือ/พยากรณ์; เดือนที่ผ่านมา: to = สิ้นเดือน, ปิดจบแล้ว (ไม่พยากรณ์)
function monthRange(month?: string) {
  const now = new Date();
  let y: number, m: number; // m = 1..12
  if (month && /^\d{4}-\d{2}$/.test(month)) { const p = month.split("-").map(Number); y = p[0]; m = p[1]; }
  else { y = now.getFullYear(); m = now.getMonth() + 1; }
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromD = new Date(y, m - 1, 1);
  const monthEndD = new Date(y, m, 0);
  const nextFromD = new Date(y, m, 1);
  const isCurrent = y === now.getFullYear() && m - 1 === now.getMonth();
  const toD = isCurrent ? now : monthEndD;
  const daysInMonth = monthEndD.getDate();
  const daysElapsed = isCurrent ? now.getDate() : daysInMonth;
  const daysLeft = isCurrent ? Math.max(1, daysInMonth - now.getDate() + 1) : 0;
  return {
    from: iso(fromD), to: iso(toD), nextFrom: iso(nextFromD),
    label: fromD.toLocaleDateString("th-TH", { month: "long", year: "numeric" }),
    monthKey: `${y}-${pad(m)}`,
    isCurrent, daysInMonth, daysElapsed, daysLeft,
  };
}

export type CeoOverview = {
  monthLabel: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  margin: number;          // %
  devicesAcquired: number;
  devicesSold: number;
  stockCount: number;
  stockValue: number;
  deltaRevenue: number | null;
  deltaProfit: number | null;
  revenueByMonth: { date: string; revenue: number; cost: number }[];
  profitByMonth: { date: string; profit: number }[];
  settings: CeoSettings;
};

export async function fetchCeoOverview(month?: string): Promise<CeoOverview> {
  await requireOwner();
  const { from, to, label } = monthRange(month);
  const [d, settings] = await Promise.all([
    fetchFinanceDashboard(from, to),
    getCeoSettings(),
  ]);
  const grossProfit = d.totalRevenue - d.totalCost;
  return {
    monthLabel: label,
    revenue: d.totalRevenue,
    cost: d.totalCost,
    grossProfit,
    expenses: d.totalExpenses,
    netProfit: d.trueNetProfit,
    margin: d.totalRevenue > 0 ? Math.round((grossProfit / d.totalRevenue) * 1000) / 10 : 0,
    devicesAcquired: d.purchaseCount,
    devicesSold: d.soldCount,
    stockCount: d.stockCount,
    stockValue: d.stockValue,
    deltaRevenue: d.deltaRevenue,
    deltaProfit: d.deltaProfit,
    revenueByMonth: d.revenueByMonth,
    profitByMonth: d.profitByMonth,
    settings,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION CONTROL — decision engine: รวมข้อมูล → คะแนนสุขภาพ + คำแนะนำ (ควรทำอะไรต่อ)
// ════════════════════════════════════════════════════════════════════════════
export type Insight = { level: "good" | "warn" | "danger" | "info"; text: string };

export type MissionControl = {
  monthLabel: string;
  daysLeft: number;
  // health score
  score: number;                  // 0-100
  scoreLevel: "ดี" | "ปานกลาง" | "เสี่ยง";
  scoreBreakdown: { label: string; pct: number }[];
  insights: Insight[];            // คำแนะนำเรียงตามความสำคัญ
  // money
  revenue: number; grossProfit: number; netProfit: number; expenses: number; margin: number;
  deltaRevenue: number | null; deltaProfit: number | null;
  acquired: number; sold: number; stockCount: number; stockValue: number;
  avgCostPerDevice: number; avgProfitPerDevice: number;
  revenueByMonth: { date: string; revenue: number; cost: number }[];
  // capital
  cash: number; safeBuffer: number; buyingPower: number; devicesCanBuy: number;
  // ads
  adSpend: number; adsBudget: number; roas: number; costPerAcquired: number;
  adsCanAdd: number; expectedExtraDevices: number; expectedExtraProfit: number;
  // inventory
  avgDaysHeld: number; slowCount: number; slowValue: number;
  slowMovers: { id: string; model: string; storage: string; daysInStock: number; totalCost: number }[];
  // growth / goals
  targetRevenue: number; targetProfit: number; targetAcquired: number; targetSold: number;
  gap: number; requiredPerDay: number; avgDailyRevenue: number; projectedMonthEnd: number; onTrack: boolean;
  projectedAcquired: number; projectedProfit: number;
  forecastPoints: { date: string; actual?: number; forecast?: number }[];
  // ── Mission Control (dense overview) ──
  cashInMonth: number; cashOutMonth: number; netCashflowMonth: number;
  leads: number; roi: number;                       // roi = กำไรขั้นต้น/ค่าโฆษณา %
  conversionRate: number;                           // % คำขอที่ปิดสำเร็จ
  leadsFunnel: { label: string; count: number; tone: "good" | "info" | "warn" | "danger" }[];
  salesRetail: number; salesWholesale: number; retailPct: number;
  inventoryByStatus: { status: string; count: number }[];
  profitByMonth: { date: string; profit: number }[];
  healthChecklist: { label: string; level: "good" | "warn" | "danger" }[];
  recentActivity: { kind: "buy" | "sell" | "ads"; label: string; amount: number; at: string }[];
  settings: CeoSettings;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export async function fetchMissionControl(month?: string): Promise<MissionControl> {
  await requireOwner();
  const { from, to, nextFrom, label, isCurrent, daysInMonth, daysElapsed, daysLeft } = monthRange(month);
  const supabase = createServerClient();
  const [d, cf, cfMonth, aging, f, settings, expensesMonth, leadsRes, soldMonthRes, recentRes] = await Promise.all([
    fetchFinanceDashboard(from, to),
    fetchFinanceCashFlow("2020-01-01", to),
    fetchFinanceCashFlow(from, to),
    fetchStockAging(),
    fetchForecast(),
    getCeoSettings(),
    fetchExpenses(from, to),
    supabase.from("requests").select("status").gte("created_at", `${from}T00:00:00`).lt("created_at", `${nextFrom}T00:00:00`),
    supabase.from("stocks").select("sale_type").eq("status", "ขายแล้ว").gte("sold_at", from).lt("sold_at", nextFrom),
    supabase.from("stocks").select("model, storage, sold_price, cost_price, status, sold_at, received_at").order("updated_at", { ascending: false }).limit(6),
  ]);

  // ── money ──
  const revenue = d.totalRevenue;
  const grossProfit = revenue - d.totalCost;
  const margin = revenue > 0 ? Math.round((grossProfit / revenue) * 1000) / 10 : 0;
  const sold = d.soldCount, acquired = d.purchaseCount;
  const avgCostPerDevice = d.stockCount > 0 ? Math.round(d.stockValue / d.stockCount) : (acquired > 0 ? Math.round(d.totalCost / Math.max(1, sold)) : 0);
  const avgProfitPerDevice = sold > 0 ? Math.round(grossProfit / sold) : 0;

  // ── capital ──
  const cash = cf.summary.closing;
  const safeBuffer = settings.safeBuffer;
  const buyingPower = Math.max(0, cash - safeBuffer);
  const devicesCanBuy = avgCostPerDevice > 0 ? Math.floor(buyingPower / avgCostPerDevice) : 0;
  const belowBuffer = safeBuffer > 0 && cash < safeBuffer;

  // ── ads ──
  // ดึงค่าโฆษณาอัตโนมัติจากค่าใช้จ่าย Finance (หมวดที่เลือก) — ไม่ต้องกรอกซ้ำ
  const adsCat = settings.adsCategory.trim();
  const adKeyword = /โฆษณา|ads|การตลาด|marketing|facebook|google/i;
  const adSpendAuto = expensesMonth
    .filter(e => e.status !== "rejected" && (adsCat ? e.category === adsCat : adKeyword.test(e.category)))
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const adSpend = adSpendAuto > 0 ? adSpendAuto : settings.adSpend;
  const adsBudget = settings.adsBudget;
  const roas = adSpend > 0 ? Math.round((revenue / adSpend) * 10) / 10 : 0;
  const costPerAcquired = acquired > 0 && adSpend > 0 ? Math.round(adSpend / acquired) : 0;
  // แนะนำเพิ่มงบ Ads เมื่อ ROAS ดี + เงินทุนแข็งแรง (เพิ่ม ~30% ของงบปัจจุบัน)
  const adsHealthy = roas >= 3 && !belowBuffer && avgProfitPerDevice > 0;
  const adsCanAdd = adsHealthy ? Math.round((adsBudget || adSpend) * 0.3) : 0;
  const expectedExtraDevices = adsCanAdd > 0 && costPerAcquired > 0 ? Math.floor(adsCanAdd / costPerAcquired) : 0;
  const expectedExtraProfit = expectedExtraDevices * avgProfitPerDevice - adsCanAdd;

  // ── inventory ──
  const inStock = aging.filter(a => a.status !== "ขายแล้ว");
  const avgDaysHeld = inStock.length ? Math.round(inStock.reduce((s, a) => s + a.daysInStock, 0) / inStock.length) : 0;
  const slow = inStock.filter(a => a.daysInStock > 30).sort((a, b) => b.daysInStock - a.daysInStock);
  const slowValue = slow.reduce((s, a) => s + a.totalCost, 0);

  // ── growth / goals ──
  // เดือนปัจจุบัน = พยากรณ์ทั้งเดือน · เดือนที่ผ่านมา = ใช้ตัวเลขจริง (จบเดือนแล้ว)
  const gap = Math.max(0, settings.targetRevenue - revenue);
  const requiredPerDay = isCurrent ? Math.round(gap / Math.max(1, daysLeft)) : 0;
  const projectedMonthEnd = isCurrent ? Math.round(revenue + f.avgDailyRevenue * (daysLeft - 1)) : revenue;
  const onTrack = settings.targetRevenue > 0 && projectedMonthEnd >= settings.targetRevenue;
  const projectedAcquired = isCurrent ? Math.round(acquired / Math.max(1, daysElapsed) * daysInMonth) : acquired;
  const projectedProfit = isCurrent ? Math.round(grossProfit / Math.max(1, daysElapsed) * daysInMonth) : grossProfit;

  // ── Mission Control extras ──
  const cashInMonth = cfMonth.summary.totalIn;
  const cashOutMonth = cfMonth.summary.totalOut;
  const netCashflowMonth = cashInMonth - cashOutMonth;
  // Leads funnel — นับทุกคำขอเดือนนี้ แยกตามผลลัพธ์ (วิเคราะห์อัตราปิดการขาย)
  const leadRows = (leadsRes.data ?? []) as { status: string | null }[];
  const leads = leadRows.length;
  const cnt = (st: string) => leadRows.filter(r => r.status === st).length;
  const lf_completed = cnt("completed");
  const lf_cancelled = cnt("cancelled");
  const lf_unreachable = cnt("unreachable");
  const lf_rejected = cnt("rejected");
  const lf_noShow = cnt("no_show");
  const lf_outOfArea = cnt("out_of_area");
  const lf_inProgress = leads - lf_completed - lf_cancelled - lf_unreachable - lf_rejected - lf_noShow - lf_outOfArea;
  const conversionRate = leads > 0 ? Math.round((lf_completed / leads) * 100) : 0;
  const leadsFunnel = [
    { label: "สำเร็จ", count: lf_completed, tone: "good" as const },
    { label: "กำลังดำเนินการ", count: lf_inProgress, tone: "info" as const },
    { label: "ยกเลิก", count: lf_cancelled, tone: "warn" as const },
    { label: "ติดต่อไม่ได้", count: lf_unreachable, tone: "warn" as const },
    { label: "ไม่เข้าเงื่อนไข", count: lf_rejected, tone: "danger" as const },
    { label: "ไม่มาตามนัด", count: lf_noShow, tone: "warn" as const },
    { label: "นอกพื้นที่", count: lf_outOfArea, tone: "danger" as const },
  ].filter(x => x.count > 0);
  const roi = adSpend > 0 ? Math.round((grossProfit / adSpend) * 100) : 0;
  const soldRows = (soldMonthRes.data ?? []) as { sale_type: string | null }[];
  const salesWholesale = soldRows.filter(r => r.sale_type === "ขายส่ง").length;
  const salesRetail = soldRows.length - salesWholesale;
  const retailPct = soldRows.length > 0 ? Math.round((salesRetail / soldRows.length) * 100) : 0;
  const statusMap = new Map<string, number>();
  for (const a of inStock) statusMap.set(a.status, (statusMap.get(a.status) ?? 0) + 1);
  const inventoryByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));
  const recentActivity = ((recentRes.data ?? []) as { model: string | null; storage: string | null; sold_price: number | null; cost_price: number | null; status: string | null; sold_at: string | null; received_at: string | null }[])
    .map(r => {
      const sold = r.status === "ขายแล้ว";
      return {
        kind: (sold ? "sell" : "buy") as "buy" | "sell" | "ads",
        label: `${sold ? "ขาย" : "รับซื้อ"} ${r.model ?? ""} ${r.storage ?? ""}`.trim(),
        amount: sold ? (r.sold_price ?? 0) : (r.cost_price ?? 0),
        at: (sold ? r.sold_at : r.received_at) ?? "",
      };
    });

  // ── BUSINESS SCORE (0-100) ──
  const capScore = belowBuffer ? 0.15 : (safeBuffer > 0 ? clamp01((cash - safeBuffer) / (safeBuffer * 2) + 0.5) : (cash > 0 ? 0.7 : 0.2));
  const marginScore = clamp01(margin / 25);
  const profitScore = d.trueNetProfit > 0 ? 1 : 0.25;
  const slowRatio = d.stockValue > 0 ? slowValue / d.stockValue : 0;
  const stockScore = clamp01((1 - slowRatio) * 0.5 + clamp01(1 - avgDaysHeld / 45) * 0.5);
  const goalScore = settings.targetRevenue > 0 ? clamp01(projectedMonthEnd / settings.targetRevenue) : 0.55;
  const adsScore = adSpend > 0 ? clamp01(roas / 4) : 0.6;
  const W = { cap: 0.30, margin: 0.15, profit: 0.10, stock: 0.20, goal: 0.15, ads: 0.10 };
  const score = Math.round(100 * (capScore * W.cap + marginScore * W.margin + profitScore * W.profit + stockScore * W.stock + goalScore * W.goal + adsScore * W.ads));
  const scoreLevel = score >= 75 ? "ดี" : score >= 50 ? "ปานกลาง" : "เสี่ยง";
  const scoreBreakdown = [
    { label: "เงินทุน", pct: Math.round(capScore * 100) },
    { label: "กำไร", pct: Math.round(profitScore * 100) },
    { label: "มาร์จิ้น", pct: Math.round(marginScore * 100) },
    { label: "สต็อก", pct: Math.round(stockScore * 100) },
    { label: "เป้าหมาย", pct: Math.round(goalScore * 100) },
    { label: "โฆษณา", pct: Math.round(adsScore * 100) },
  ];

  const lvl = (p: number): "good" | "warn" | "danger" => p >= 75 ? "good" : p >= 50 ? "warn" : "danger";
  const healthChecklist: { label: string; level: "good" | "warn" | "danger" }[] = [
    { label: "เงินพร้อมซื้อ", level: belowBuffer ? "danger" : lvl(Math.round(capScore * 100)) },
    { label: "สต็อกหมุนเร็ว", level: lvl(Math.round(stockScore * 100)) },
    { label: "ROI โฆษณา", level: adSpend > 0 ? lvl(Math.round(adsScore * 100)) : "warn" },
    { label: "อายุสต็อก", level: avgDaysHeld <= 14 ? "good" : avgDaysHeld <= 30 ? "warn" : "danger" },
    { label: "กำไรต่อเครื่อง", level: lvl(Math.round(marginScore * 100)) },
    { label: "สภาพคล่อง", level: netCashflowMonth >= 0 ? "good" : "warn" },
  ];

  // ── INSIGHTS (เรียงตามความสำคัญ) ──
  const insights: Insight[] = [];
  if (belowBuffer)
    insights.push({ level: "danger", text: `เงินสด ${baht(cash)} ต่ำกว่า Safe Buffer ${baht(safeBuffer)} — หยุดซื้อเครื่อง/หยุดเพิ่ม Ads จนกว่าจะมีเงินสดเข้า` });
  if (slow.length > 0 && slowValue > d.stockValue * 0.3)
    insights.push({ level: "warn", text: `เร่งระบายสต็อกค้าง ${slow.length} เครื่อง เงินจม ${baht(slowValue)} (ค้างเกิน 30 วัน)` });
  if (settings.targetRevenue > 0 && !onTrack)
    insights.push({ level: "warn", text: `ตามเป้าไม่ทัน — เหลือ ${daysLeft} วัน ต้องทำเฉลี่ย ${baht(requiredPerDay)}/วัน${avgProfitPerDevice > 0 ? ` (≈ ขาย ${Math.ceil(requiredPerDay / Math.max(1, avgProfitPerDevice * (revenue && sold ? revenue / grossProfit : 1)))} เครื่อง/วัน)` : ""}` });
  if (settings.targetRevenue > 0 && onTrack)
    insights.push({ level: "good", text: `มาแรง — คาดสิ้นเดือนได้ ${baht(projectedMonthEnd)} (เป้า ${baht(settings.targetRevenue)})` });
  if (adSpend > 0 && roas < 1)
    insights.push({ level: "danger", text: `โฆษณาไม่คุ้ม (ROAS ${roas}x) — ลด/หยุดงบ Ads แล้วทบทวนแคมเปญ` });
  if (adsHealthy && adsCanAdd > 0 && expectedExtraProfit > 0)
    insights.push({ level: "good", text: `ผลตอบแทน Ads ดี (ROAS ${roas}x) — เพิ่มงบได้อีก ~${baht(adsCanAdd)}/เดือน คาดได้เครื่องเพิ่ม ~${expectedExtraDevices} เครื่อง กำไรเพิ่ม ~${baht(expectedExtraProfit)}` });
  if (adSpend === 0)
    insights.push({ level: "info", text: `ยังไม่ลงโฆษณา — ลองงบเล็กๆ แล้ววัด ROAS (กรอกยอดที่หน้าตั้งค่า)` });
  if (!belowBuffer && buyingPower > 0 && devicesCanBuy > 0)
    insights.push({ level: "info", text: `เงินพร้อมซื้อ ${baht(buyingPower)} ≈ ซื้อได้อีก ${devicesCanBuy} เครื่อง (ต้นทุนเฉลี่ย ${baht(avgCostPerDevice)}/เครื่อง)` });
  if (settings.targetRevenue === 0 && settings.targetProfit === 0)
    insights.push({ level: "info", text: `ยังไม่ได้ตั้งเป้าเดือนนี้ — ตั้งที่หน้า "ตั้งค่า" เพื่อให้ระบบแนะนำได้แม่นขึ้น` });

  return {
    monthLabel: label, daysLeft,
    score, scoreLevel, scoreBreakdown, insights,
    revenue, grossProfit, netProfit: d.trueNetProfit, expenses: d.totalExpenses, margin,
    deltaRevenue: d.deltaRevenue, deltaProfit: d.deltaProfit,
    acquired, sold, stockCount: d.stockCount, stockValue: d.stockValue,
    avgCostPerDevice, avgProfitPerDevice, revenueByMonth: d.revenueByMonth,
    cash, safeBuffer, buyingPower, devicesCanBuy,
    adSpend, adsBudget, roas, costPerAcquired, adsCanAdd, expectedExtraDevices, expectedExtraProfit,
    avgDaysHeld, slowCount: slow.length, slowValue,
    slowMovers: slow.slice(0, 20).map(a => ({ id: a.id, model: a.model, storage: a.storage, daysInStock: a.daysInStock, totalCost: a.totalCost })),
    targetRevenue: settings.targetRevenue, targetProfit: settings.targetProfit, targetAcquired: settings.targetAcquired, targetSold: settings.targetSold,
    gap, requiredPerDay, avgDailyRevenue: f.avgDailyRevenue, projectedMonthEnd, onTrack,
    projectedAcquired, projectedProfit,
    forecastPoints: f.points,
    cashInMonth, cashOutMonth, netCashflowMonth,
    leads, roi, conversionRate, leadsFunnel, salesRetail, salesWholesale, retailPct,
    inventoryByStatus, profitByMonth: d.profitByMonth, healthChecklist, recentActivity,
    settings,
  };
}

// baht helper สำหรับสร้างข้อความ insight (ฝั่ง server)
function baht(n: number) { return "฿" + Math.round(n).toLocaleString("th-TH"); }

// ════════════════════════════════════════════════════════════════════════════
// MONTHLY TREND — รายได้/กำไร/จำนวนเครื่อง เทียบเดือนต่อเดือน (กราฟการเติบโต)
// ════════════════════════════════════════════════════════════════════════════
export type MonthlyTrendPoint = { month: string; label: string; revenue: number; profit: number; acquired: number; sold: number };

export async function fetchMonthlyTrend(months = 6): Promise<MonthlyTrendPoint[]> {
  await requireOwner();
  const now = new Date();
  const ranges = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ranges.push(monthRange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`));
  }
  // ใช้ fetchFinanceDashboard ต่อเดือน เพื่อให้ตัวเลขตรงกับหน้า Finance เป๊ะ
  const results = await Promise.all(ranges.map(r => fetchFinanceDashboard(r.from, r.to)));
  return ranges.map((r, i) => {
    const f = results[i];
    const d = new Date(Number(r.monthKey.slice(0, 4)), Number(r.monthKey.slice(5, 7)) - 1, 1);
    return {
      month: r.monthKey,
      label: d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" }),
      revenue: f.totalRevenue,
      profit: f.totalRevenue - f.totalCost,
      acquired: f.purchaseCount,
      sold: f.soldCount,
    };
  });
}

// รายชื่อเดือนที่มีข้อมูล (ใหม่→เก่า) สำหรับ dropdown เลือกเดือน
export async function fetchAvailableMonths(): Promise<{ value: string; label: string }[]> {
  await requireOwner();
  const supabase = createServerClient();
  const { data } = await supabase.from("requests").select("created_at").order("created_at", { ascending: true }).limit(1);
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  const earliest = (data?.[0] as { created_at: string | null } | undefined)?.created_at;
  if (earliest) { const e = new Date(earliest); start = new Date(e.getFullYear(), e.getMonth(), 1); }
  const out: { value: string; label: string }[] = [];
  let d = new Date(now.getFullYear(), now.getMonth(), 1);
  while (d >= start && out.length < 12) {
    out.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("th-TH", { month: "long", year: "numeric" }),
    });
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// LEAD ANALYTICS — funnel, มูลค่า, แหล่งที่มา, โอกาสที่เสีย (เดือนนี้)
// ════════════════════════════════════════════════════════════════════════════
const STATUS_RANK: Record<string, number> = {
  new: 0, pending: 0, contacted: 1, confirmed: 2, pickup_scheduled: 2, en_route: 2,
  inspecting: 3, price_negotiation: 3, contracting: 4, awaiting_transfer: 4, completed: 5,
};
const LOST_STATUS: Record<string, string> = {
  cancelled: "ยกเลิกนัดหมาย", unreachable: "ติดต่อไม่ได้", rejected: "ไม่เข้าเงื่อนไข",
  no_show: "ลูกค้าไม่อยู่", out_of_area: "นอกพื้นที่",
};
const SOURCE_LABEL: Record<string, string> = {
  website: "เว็บไซต์", line: "LINE OA", facebook: "Facebook", phone: "โทรศัพท์", manual: "หน้าร้าน",
};

export type LeadAnalytics = {
  leads: number;
  leadValue: number;
  funnel: { label: string; count: number; conv: number | null }[];
  lostByStatus: { label: string; count: number; value: number }[];
  lostCount: number; lostValue: number;
  completedCount: number;
  mergedCount: number;
  inProgressCount: number;
  inProgressByStatus: { status: string; label: string; count: number }[]; // เคสที่ยังไม่จบ ยังไม่หลุด
  avgPurchasePrice: number;
  avgCloseDays: number;
  soldFromLeads: number;
  bySource: { label: string; count: number; completed: number; conv: number }[];
  statusBreakdown: { status: string; label: string; count: number }[]; // ทุกสถานะในช่วงนี้ (ดูว่าเคสไปอยู่ถังไหน)
};

const ALL_STATUS_LABEL: Record<string, string> = {
  new: "คำขอใหม่", pending: "รอตรวจสอบ", contacted: "ติดต่อกลับแล้ว", confirmed: "ยืนยันนัดหมาย",
  pickup_scheduled: "ไรเดอร์รับงาน", en_route: "กำลังเดินทาง", inspecting: "กำลังตรวจ",
  price_negotiation: "รอยืนยันราคา", contracting: "ทำสัญญา", awaiting_transfer: "รอโอนเงิน",
  completed: "เสร็จสิ้น", cancelled: "ยกเลิกนัดหมาย", no_show: "ลูกค้าไม่อยู่", rejected: "ไม่เข้าเงื่อนไข",
  unreachable: "ติดต่อไม่ได้", out_of_area: "นอกพื้นที่", merged: "รวมรายการ",
};

export async function fetchLeadAnalytics(days = 30, range?: { from: string; to: string }): Promise<LeadAnalytics> {
  await requireOwner();
  const bkkFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
  let from: string, toExclusive: string | null = null;
  if (range?.from && range?.to) {
    from = range.from;
    // to แบบรวมวันสุดท้าย → ตัดที่เที่ยงคืนของวันถัดไป
    toExclusive = bkkFmt.format(new Date(new Date(range.to + "T00:00:00+07:00").getTime() + 86400000));
  } else {
    const bkkToday = bkkFmt.format(new Date());
    from = bkkFmt.format(new Date(new Date(bkkToday + "T00:00:00+07:00").getTime() - (days - 1) * 86400000));
  }
  const supabase = createServerClient();
  let q = supabase
    .from("requests")
    .select("status, status_log, estimated_price, actual_price, source, created_at, order_number")
    .gte("created_at", `${from}T00:00:00+07:00`);
  if (toExclusive) q = q.lt("created_at", `${toExclusive}T00:00:00+07:00`);
  const { data } = await q;
  type Row = { status: string | null; status_log: { status: string; timestamp: string }[] | null; estimated_price: number | null; actual_price: number | null; source: string | null; created_at: string | null; order_number: string | null };
  const rows = (data ?? []) as Row[];
  const leads = rows.length;
  const leadValue = rows.reduce((s, r) => s + (r.estimated_price ?? 0), 0);

  // furthest stage ของแต่ละ lead
  const furthest = (r: Row) => {
    let m = STATUS_RANK[r.status ?? ""] ?? 0;
    for (const e of r.status_log ?? []) m = Math.max(m, STATUS_RANK[e.status] ?? 0);
    return m;
  };
  const reached = (rank: number) => rows.filter(r => furthest(r) >= rank).length;
  // sold linkage
  const completedOrders = rows.filter(r => r.status === "completed").map(r => r.order_number).filter(Boolean) as string[];
  let soldFromLeads = 0;
  if (completedOrders.length) {
    const { data: st } = await supabase.from("stocks").select("request_ref, status").in("request_ref", completedOrders);
    const soldRefs = new Set(((st ?? []) as { request_ref: string | null; status: string | null }[]).filter(s => s.status === "ขายแล้ว").map(s => s.request_ref));
    soldFromLeads = completedOrders.filter(o => soldRefs.has(o)).length;
  }

  const stages = [
    { label: "Lead (รับคำขอ)", count: leads },
    { label: "นัดหมาย", count: reached(2) },
    { label: "ตรวจ/เสนอราคา", count: reached(3) },
    { label: "ซื้อสำเร็จ", count: reached(5) },
    { label: "ขายออก", count: soldFromLeads },
  ];
  const funnel = stages.map((s, i) => ({ label: s.label, count: s.count, conv: i === 0 ? null : (stages[i - 1].count > 0 ? Math.round((s.count / stages[i - 1].count) * 100) : 0) }));

  // lost
  const lostRows = rows.filter(r => r.status && LOST_STATUS[r.status]);
  const lostMap = new Map<string, { count: number; value: number }>();
  for (const r of lostRows) {
    const k = LOST_STATUS[r.status!];
    const cur = lostMap.get(k) ?? { count: 0, value: 0 };
    cur.count++; cur.value += r.estimated_price ?? 0;
    lostMap.set(k, cur);
  }
  const lostByStatus = Array.from(lostMap.entries()).map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count);
  const lostCount = lostRows.length;
  const lostValue = lostRows.reduce((s, r) => s + (r.estimated_price ?? 0), 0);

  // avg purchase price + close time (completed)
  const completed = rows.filter(r => r.status === "completed");
  const avgPurchasePrice = completed.length ? Math.round(completed.reduce((s, r) => s + (r.actual_price ?? r.estimated_price ?? 0), 0) / completed.length) : 0;
  const closeDays: number[] = [];
  for (const r of completed) {
    const done = (r.status_log ?? []).find(e => e.status === "completed");
    if (done && r.created_at) {
      const dd = (new Date(done.timestamp).getTime() - new Date(r.created_at).getTime()) / 86400000;
      if (dd >= 0 && dd < 365) closeDays.push(dd);
    }
  }
  const avgCloseDays = closeDays.length ? Math.round((closeDays.reduce((s, d) => s + d, 0) / closeDays.length) * 10) / 10 : 0;

  // by source
  const srcMap = new Map<string, { count: number; completed: number }>();
  for (const r of rows) {
    const k = SOURCE_LABEL[r.source ?? ""] ?? (r.source || "ไม่ระบุ");
    const cur = srcMap.get(k) ?? { count: 0, completed: 0 };
    cur.count++; if (r.status === "completed") cur.completed++;
    srcMap.set(k, cur);
  }
  const bySource = Array.from(srcMap.entries()).map(([label, v]) => ({ label, count: v.count, completed: v.completed, conv: v.count > 0 ? Math.round((v.completed / v.count) * 100) : 0 })).sort((a, b) => b.count - a.count);

  // สถานะทั้งหมดในช่วงนี้ (วินิจฉัย: เคสไปอยู่ถังไหน)
  const statusMap = new Map<string, number>();
  for (const r of rows) { const k = r.status ?? "(ไม่มีสถานะ)"; statusMap.set(k, (statusMap.get(k) ?? 0) + 1); }
  const statusBreakdown = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, label: ALL_STATUS_LABEL[status] ?? status, count }))
    .sort((a, b) => b.count - a.count);

  // กระทบยอด: leads = สำเร็จ + หลุด + รวมรายการ + กำลังดำเนินการ
  const completedCount = completed.length;
  const mergedCount = rows.filter(r => r.status === "merged").length;
  const inProgressCount = leads - completedCount - lostCount - mergedCount;
  const inProgressByStatus = statusBreakdown
    .filter(s => s.status !== "completed" && s.status !== "merged" && !LOST_STATUS[s.status])
    .map(s => ({ status: s.status, label: s.label, count: s.count }));

  return { leads, leadValue, funnel, lostByStatus, lostCount, lostValue, completedCount, mergedCount, inProgressCount, inProgressByStatus, avgPurchasePrice, avgCloseDays, soldFromLeads, bySource, statusBreakdown };
}

// ── สรุป Estimate funnel (หน้าเว็บ) + อัตราสำเร็จรายรุ่น ──────────────────────
export type EstimateSummary = {
  days: number;
  estimates: number;       // คนเข้าประเมิน
  priceSeen: number;       // เห็นราคา
  submits: number;         // ส่งคำขอ
  conversionRate: number;  // %สำเร็จรวม
  topDropStep: string;     // จุดที่คนออกมากสุด
  byModel: { model: string; estimates: number; submits: number; conv: number }[]; // อัตราสำเร็จรายรุ่น
};
const ESTIMATE_STEP_NAMES = ["เริ่มต้น", "Model", "ประกัน", "ตัวเครื่อง", "หน้าจอ", "การแสดงภาพ", "แบตเตอรี่", "อุปกรณ์เสริม", "iCloud", "เห็นราคา", "นัดหมายสำเร็จ"];

type EstAgg = { funnel?: number[]; modelFunnels?: { model: string; counts: number[] }[] };
// ผลต่างของ 2 ช่วง (since→now) − (afterTo→now) = ช่วง [from, to] พอดี (ไม่ต้องแก้ RPC)
function subtractAgg(a: EstAgg, b: EstAgg): EstAgg {
  const funnel = (a.funnel ?? []).map((v, i) => (v ?? 0) - (b.funnel?.[i] ?? 0));
  const bMap = new Map<string, number[]>((b.modelFunnels ?? []).map(m => [m.model, m.counts]));
  const modelFunnels = (a.modelFunnels ?? [])
    .map(m => { const bc = bMap.get(m.model) ?? []; return { model: m.model, counts: m.counts.map((v, i) => (v ?? 0) - (bc[i] ?? 0)) }; })
    .filter(m => (m.counts[0] ?? 0) > 0);
  return { funnel, modelFunnels };
}

export async function fetchEstimateSummary(days = 30, range?: { from: string; to: string }): Promise<EstimateSummary> {
  await requireOwner();
  const supabase = createServerClient();
  const bkkToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

  let since: string, untilExclusive: string | null = null;
  if (range?.from && range?.to) {
    since = new Date(range.from + "T00:00:00+07:00").toISOString();
    untilExclusive = new Date(new Date(range.to + "T00:00:00+07:00").getTime() + 86400000).toISOString();
    days = Math.max(1, Math.round((new Date(range.to + "T00:00:00+07:00").getTime() - new Date(range.from + "T00:00:00+07:00").getTime()) / 86400000) + 1);
  } else {
    since = new Date(new Date(bkkToday + "T00:00:00+07:00").getTime() - (days - 1) * 86400000).toISOString();
  }

  // เรียก RPC ตรง → ได้ modelFunnels ทุกรุ่น (ไม่ตัด top 10)
  const { data: aggSince } = await supabase.rpc("estimate_analytics", { p_since: since });
  let agg = aggSince as EstAgg | null;
  if (agg && untilExclusive) {
    const { data: aggAfter } = await supabase.rpc("estimate_analytics", { p_since: untilExclusive });
    agg = subtractAgg(agg, (aggAfter as EstAgg | null) ?? {});
  }
  if (agg) {
    const funnel = (agg.funnel ?? []) as number[];
    const mf = (agg.modelFunnels ?? []) as { model: string; counts: number[] }[];
    const byModel = mf
      .map(m => { const e = m.counts[0] ?? 0, s = m.counts[10] ?? 0; return { model: m.model, estimates: e, submits: s, conv: e > 0 ? Math.round((s / e) * 100) : 0 }; })
      .sort((x, y) => y.estimates - x.estimates);
    let topDrop = "ไม่มีข้อมูล", maxDrop = 0;
    for (let i = 1; i < funnel.length; i++) { const drop = (funnel[i - 1] ?? 0) - (funnel[i] ?? 0); if (drop > maxDrop) { maxDrop = drop; topDrop = ESTIMATE_STEP_NAMES[i]; } }
    const est = funnel[0] ?? 0, sub = funnel[10] ?? 0;
    return { days, estimates: est, priceSeen: funnel[9] ?? 0, submits: sub, conversionRate: est > 0 ? Math.round((sub / est) * 100) : 0, topDropStep: topDrop, byModel };
  }

  // fallback (ยังไม่ได้รัน migration RPC) — ใช้ top 10 จาก fetchEstimateAnalytics
  const a = await fetchEstimateAnalytics(days);
  const byModel = a.modelFunnels
    .map(m => { const e = m.funnel[0]?.count ?? 0, s = m.funnel[10]?.count ?? 0; return { model: m.model, estimates: e, submits: s, conv: e > 0 ? Math.round((s / e) * 100) : 0 }; })
    .sort((x, y) => y.estimates - x.estimates);
  return { days, estimates: a.totalStarts, priceSeen: a.funnel[9]?.count ?? 0, submits: a.funnel[10]?.count ?? 0, conversionRate: a.completionRate, topDropStep: a.topDropStep, byModel };
}

// ── ผลตอบแทนโฆษณาตามช่วงเวลา (งบ/ROAS/ROI ผูกกับช่วงที่เลือก ไม่ใช่เดือนปัจจุบัน) ──
export type AdsPerformance = { adSpend: number; adsBudget: number; revenue: number; grossProfit: number; roas: number; roi: number };

export async function fetchAdsPerformance(days = 30, range?: { from: string; to: string }): Promise<AdsPerformance> {
  await requireOwner();
  const bkkFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
  let from: string, to: string;
  if (range?.from && range?.to) {
    from = range.from; to = range.to;
  } else {
    to = bkkFmt.format(new Date());
    from = bkkFmt.format(new Date(new Date(to + "T00:00:00+07:00").getTime() - (days - 1) * 86400000));
  }
  const [fin, expenses, settings] = await Promise.all([
    fetchFinanceDashboard(from, to),
    fetchExpenses(from, to),
    getCeoSettings(),
  ]);
  // งบโฆษณา = ค่าใช้จ่ายหมวดโฆษณาในช่วงนี้ (เหมือนตรรกะใน Mission Control)
  const adsCat = settings.adsCategory.trim();
  const adKeyword = /โฆษณา|ads|การตลาด|marketing|facebook|google/i;
  const adSpendAuto = expenses
    .filter(e => e.status !== "rejected" && (adsCat ? e.category === adsCat : adKeyword.test(e.category)))
    .reduce((s, e) => s + (e.amount ?? 0), 0);
  const adSpend = adSpendAuto > 0 ? adSpendAuto : (range ? 0 : settings.adSpend);
  const revenue = fin.totalRevenue;
  const grossProfit = fin.totalRevenue - fin.totalCost;
  const roas = adSpend > 0 ? Math.round((revenue / adSpend) * 10) / 10 : 0;
  const roi = adSpend > 0 ? Math.round((grossProfit / adSpend) * 100) : 0;
  return { adSpend, adsBudget: settings.adsBudget, revenue, grossProfit, roas, roi };
}

// ── เงินทุน ───────────────────────────────────────────────────────────────────
export type CeoCapital = {
  cash: number;          // เงินสดสุทธิ (จากกระแสเงินสด)
  safeBuffer: number;    // เงินกันชนที่ต้องเหลือ
  buyingPower: number;   // เงินพร้อมซื้อ = เงินสด − กันชน
  stockValue: number;    // ทุนจมในสต็อก
};
export async function fetchCeoCapital(): Promise<CeoCapital> {
  await requireOwner();
  const { to } = monthRange();
  const [cf, d, settings] = await Promise.all([
    fetchFinanceCashFlow("2020-01-01", to),
    fetchFinanceDashboard(),
    getCeoSettings(),
  ]);
  const cash = cf.summary.closing;
  return {
    cash,
    safeBuffer: settings.safeBuffer,
    buyingPower: Math.max(0, cash - settings.safeBuffer),
    stockValue: d.stockValue,
  };
}

// ── สต็อก / Holding days ──────────────────────────────────────────────────────
export type CeoInventory = {
  stockValue: number;
  stockCount: number;
  avgDaysHeld: number;
  slowMovers: { id: string; model: string; storage: string; daysInStock: number; totalCost: number }[];
  slowCount: number;     // จำนวนเครื่องค้าง > 30 วัน
  slowValue: number;     // ทุนจมในเครื่องค้าง > 30 วัน
};
export async function fetchCeoInventory(): Promise<CeoInventory> {
  await requireOwner();
  const [aging, d] = await Promise.all([fetchStockAging(), fetchFinanceDashboard()]);
  const inStock = aging.filter(a => a.status !== "ขายแล้ว");
  const avgDaysHeld = inStock.length ? Math.round(inStock.reduce((s, a) => s + a.daysInStock, 0) / inStock.length) : 0;
  const slow = inStock.filter(a => a.daysInStock > 30).sort((a, b) => b.daysInStock - a.daysInStock);
  return {
    stockValue: d.stockValue,
    stockCount: d.stockCount,
    avgDaysHeld,
    slowMovers: slow.slice(0, 20).map(a => ({ id: a.id, model: a.model, storage: a.storage, daysInStock: a.daysInStock, totalCost: a.totalCost })),
    slowCount: slow.length,
    slowValue: slow.reduce((s, a) => s + a.totalCost, 0),
  };
}

// ── การเติบโต / Forecast ──────────────────────────────────────────────────────
export type CeoGrowth = {
  avgDailyRevenue: number;
  projected30: number;
  projected60: number;
  projected90: number;
  points: { date: string; actual?: number; forecast?: number }[];
  // เทียบเป้าเดือนนี้
  targetRevenue: number;
  revenueSoFar: number;
  gap: number;            // ที่ยังขาดถึงเป้า
  daysLeft: number;
  requiredPerDay: number; // ต้องทำต่อวันเพื่อถึงเป้า
};
export async function fetchCeoGrowth(): Promise<CeoGrowth> {
  await requireOwner();
  const [f, overview] = await Promise.all([fetchForecast(), fetchCeoOverview()]);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  const gap = Math.max(0, overview.settings.targetRevenue - overview.revenue);
  return {
    avgDailyRevenue: f.avgDailyRevenue,
    projected30: f.projected30,
    projected60: f.projected60,
    projected90: f.projected90,
    points: f.points,
    targetRevenue: overview.settings.targetRevenue,
    revenueSoFar: overview.revenue,
    gap,
    daysLeft,
    requiredPerDay: Math.round(gap / daysLeft),
  };
}
