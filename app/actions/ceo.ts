"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { fetchMyProfile } from "@/app/actions/admin-users";
import { fetchFinanceDashboard, fetchFinanceCashFlow, fetchForecast, fetchStockAging } from "@/app/actions/finance";

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
  adSpend: number;         // ยอดใช้จ่ายโฆษณาจริงเดือนนี้ (กรอกเอง)
  safeBuffer: number;      // เงินกันชนที่ต้องเหลือ (ห้ามแตะ)
};

const DEFAULT_SETTINGS: CeoSettings = {
  targetRevenue: 0, targetProfit: 0, targetAcquired: 0, targetSold: 0,
  adsBudget: 0, adSpend: 0, safeBuffer: 0,
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
    safeBuffer:     data.safe_buffer       ?? 0,
  };
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
    safe_buffer:     s.safeBuffer,
    updated_at:      new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

function thisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { from: iso(from), to: iso(now), label: now.toLocaleDateString("th-TH", { month: "long", year: "numeric" }) };
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

export async function fetchCeoOverview(): Promise<CeoOverview> {
  await requireOwner();
  const { from, to, label } = thisMonthRange();
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
  salesRetail: number; salesWholesale: number; retailPct: number;
  inventoryByStatus: { status: string; count: number }[];
  profitByMonth: { date: string; profit: number }[];
  healthChecklist: { label: string; level: "good" | "warn" | "danger" }[];
  recentActivity: { kind: "buy" | "sell" | "ads"; label: string; amount: number; at: string }[];
  settings: CeoSettings;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export async function fetchMissionControl(): Promise<MissionControl> {
  await requireOwner();
  const { from, to, label } = thisMonthRange();
  const supabase = createServerClient();
  const [d, cf, cfMonth, aging, f, settings, leadsRes, soldMonthRes, recentRes] = await Promise.all([
    fetchFinanceDashboard(from, to),
    fetchFinanceCashFlow("2020-01-01", to),
    fetchFinanceCashFlow(from, to),
    fetchStockAging(),
    fetchForecast(),
    getCeoSettings(),
    supabase.from("requests").select("id", { count: "exact", head: true }).gte("created_at", `${from}T00:00:00`),
    supabase.from("stocks").select("sale_type").eq("status", "ขายแล้ว").gte("sold_at", from),
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
  const adSpend = settings.adSpend, adsBudget = settings.adsBudget;
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
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  const gap = Math.max(0, settings.targetRevenue - revenue);
  const requiredPerDay = Math.round(gap / daysLeft);
  const projectedMonthEnd = Math.round(revenue + f.avgDailyRevenue * (daysLeft - 1));
  const onTrack = settings.targetRevenue > 0 && projectedMonthEnd >= settings.targetRevenue;
  const daysElapsed = Math.max(1, now.getDate());
  const projectedAcquired = Math.round(acquired / daysElapsed * daysInMonth);
  const projectedProfit = Math.round(grossProfit / daysElapsed * daysInMonth);

  // ── Mission Control extras ──
  const cashInMonth = cfMonth.summary.totalIn;
  const cashOutMonth = cfMonth.summary.totalOut;
  const netCashflowMonth = cashInMonth - cashOutMonth;
  const leads = leadsRes.count ?? 0;
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
    leads, roi, salesRetail, salesWholesale, retailPct,
    inventoryByStatus, profitByMonth: d.profitByMonth, healthChecklist, recentActivity,
    settings,
  };
}

// baht helper สำหรับสร้างข้อความ insight (ฝั่ง server)
function baht(n: number) { return "฿" + Math.round(n).toLocaleString("th-TH"); }

// ── เงินทุน ───────────────────────────────────────────────────────────────────
export type CeoCapital = {
  cash: number;          // เงินสดสุทธิ (จากกระแสเงินสด)
  safeBuffer: number;    // เงินกันชนที่ต้องเหลือ
  buyingPower: number;   // เงินพร้อมซื้อ = เงินสด − กันชน
  stockValue: number;    // ทุนจมในสต็อก
};
export async function fetchCeoCapital(): Promise<CeoCapital> {
  await requireOwner();
  const { to } = thisMonthRange();
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
