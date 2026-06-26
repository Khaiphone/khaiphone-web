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
