"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { thaiDateStr, thaiMonthStr, thaiDateOffset, startOfThaiDay, endOfThaiDay } from "@/lib/thai-date";

export type FinanceRow = {
  id: string;
  orderNumber: string;
  model: string;
  storage: string;
  costPrice: number;
  sellPrice?: number;
  sellDate?: string;
  stockStatus: "in_stock" | "repairing" | "sold";
  customerName: string;
  source: string;
  createdAt: string;
};

export type FinanceDashboard = {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  trueNetProfit: number;
  totalExpenses: number;
  pendingExpensesCount: number;
  stockValue: number;
  soldCount: number;
  purchaseCount: number;
  revenueByMonth: { date: string; revenue: number; cost: number }[];
  profitByMonth: { date: string; profit: number }[];
  topModels: { model: string; profit: number }[];
  expenseByCategory: { category: string; amount: number }[];
  deltaRevenue: number | null;
  deltaCost: number | null;
  deltaExpenses: number | null;
  deltaProfit: number | null;
  prevPeriodLabel: string;
};

export type FinanceIncome = {
  id: string;
  date: string;
  refNumber: string;
  model: string;
  storage: string;
  sellPrice: number;
  costPrice: number;
  profit: number;
  customerName: string;
  source: string;
};

export type FinancePurchase = {
  id: string;
  date: string;
  refNumber: string;
  model: string;
  storage: string;
  costPrice: number;
  sellPrice?: number;
  customerName: string;
  stockStatus: string;
  source: string;
  paidFromBank: string;
  paidFromOwner: string;
  hasSlip: boolean;
  paymentMethod: string;
};

export type FinanceProfitByModel = {
  model: string;
  count: number;
  costAvg: number;
  sellAvg: number;
  profitAvg: number;
  margin: number;
  totalProfit: number;
};

export type FinanceCashFlowEntry = {
  id: string;
  datetime: string;
  description: string;
  entryType: "in" | "out";
  amountIn?: number;
  amountOut?: number;
  balance: number;
};

export type FinanceCashFlowSummary = {
  totalIn: number;
  totalOut: number;
  closing: number;
};

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function monthKey(iso: string) {
  return thaiDateStr(new Date(iso)).slice(0, 7);
}

function monthLabel(key: string) {
  const month = parseInt(key.split("-")[1]) - 1;
  return THAI_MONTHS[month];
}

type NormSoldItem = { sell_price: number; sell_date: string; cost: number; model: string };

function getPrevPeriod(dateFrom?: string, dateTo?: string): { prevFrom: string; prevTo: string; label: string } {
  if (dateFrom && dateTo) {
    const from = new Date(`${dateFrom}T12:00:00+07:00`);
    const to   = new Date(`${dateTo}T12:00:00+07:00`);
    const durationMs = to.getTime() - from.getTime();
    const prevTo   = new Date(from.getTime() - 86_400_000);
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    const fmt = (d: Date) => d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
    return { prevFrom: thaiDateStr(prevFrom), prevTo: thaiDateStr(prevTo), label: `${fmt(prevFrom)}–${fmt(prevTo)}` };
  }
  const curYM = thaiMonthStr();
  const [cy, cm] = curYM.split("-").map(Number);
  const prevY  = cm === 1 ? cy - 1 : cy;
  const prevM  = cm === 1 ? 12 : cm - 1;
  const prevYM = `${prevY}-${String(prevM).padStart(2, "0")}`;
  const lastDay = new Date(Date.UTC(cy, cm - 1, 0)).getUTCDate();
  const prevFrom2 = `${prevYM}-01`;
  const prevTo2   = `${prevYM}-${String(lastDay).padStart(2, "0")}`;
  const label = new Date(`${prevFrom2}T12:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", month: "long" });
  return { prevFrom: prevFrom2, prevTo: prevTo2, label };
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

function normFromRequest(r: { sell_price: number; sell_date: string; actual_price?: number; estimated_price?: number; device_model?: string }): NormSoldItem {
  return { sell_price: r.sell_price, sell_date: r.sell_date, cost: r.actual_price ?? r.estimated_price ?? 0, model: r.device_model ?? "Unknown" };
}

function normFromStock(s: { sold_price: number; sold_at: string; cost_price?: number; shipping_cost?: number; other_cost?: number; sold_cost_snapshot?: number | null; model?: string }): NormSoldItem {
  const cost = s.sold_cost_snapshot ?? ((s.cost_price ?? 0) + (s.shipping_cost ?? 0) + (s.other_cost ?? 0));
  return { sell_price: s.sold_price, sell_date: s.sold_at.slice(0, 10), cost, model: s.model ?? "Unknown" };
}

export async function fetchFinanceDashboard(dateFrom?: string, dateTo?: string): Promise<FinanceDashboard> {
  await requireAuth();
  const supabase = createServerClient();
  const [{ data }, { data: expenseData }, { data: directSoldStocks }, { data: unsoldStockData }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, device_model, actual_price, estimated_price, sell_price, sell_date, stock_status, created_at")
      .eq("status", "completed"),
    supabase
      .from("expenses")
      .select("amount, category, status, date"),
    supabase
      .from("stocks")
      .select("id, model, cost_price, shipping_cost, other_cost, sold_price, sold_at, sold_cost_snapshot")
      .in("status", ["ขายแล้ว", "รับคืนแล้ว", "ส่งซ่อม"])
      .is("request_ref", null)
      .not("sold_price", "is", null)
      .not("sold_at", "is", null),
    supabase
      .from("stocks")
      .select("cost_price, shipping_cost, other_cost")
      .is("request_ref", null)
      .neq("status", "ขายแล้ว"),
  ]);

  const rows = data ?? [];
  const fromRequests = rows
    .filter((r) => r.stock_status === "sold" && r.sell_price != null && r.sell_date != null)
    .map(normFromRequest);
  const fromStocks = (directSoldStocks ?? []).map(normFromStock);
  const allNorm = [...fromRequests, ...fromStocks];

  const soldItems = allNorm.filter((r) => {
    if (dateFrom && r.sell_date < dateFrom) return false;
    if (dateTo && r.sell_date > dateTo) return false;
    return true;
  });

  const unsoldRequests = rows.filter((r) => r.stock_status !== "sold");
  const stockValueFromRequests = unsoldRequests.reduce((s, r) => s + (r.actual_price ?? r.estimated_price ?? 0), 0);
  const stockValueFromDirect = (unsoldStockData ?? []).reduce((s, r) => s + (r.cost_price ?? 0) + (r.shipping_cost ?? 0) + (r.other_cost ?? 0), 0);

  const totalRevenue = soldItems.reduce((s, r) => s + r.sell_price, 0);
  const totalCost = soldItems.reduce((s, r) => s + r.cost, 0);
  const netProfit = totalRevenue - totalCost;
  const stockValue = stockValueFromRequests + stockValueFromDirect;

  const allExpenses = expenseData ?? [];
  const approvedExpenses = allExpenses.filter((e) => {
    if (e.status !== "approved") return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  });
  // Exclude "ซื้อคืน" — buyback cost is already captured in cost_price, deducting again would double-count
  const totalExpenses = approvedExpenses.filter(e => e.category !== "ซื้อคืน").reduce((s, e) => s + (e.amount ?? 0), 0);
  const pendingExpensesCount = allExpenses.filter((e) => {
    if (e.status !== "pending") return false;
    if (dateFrom && e.date < dateFrom) return false;
    if (dateTo && e.date > dateTo) return false;
    return true;
  }).length;
  const trueNetProfit = netProfit - totalExpenses;

  const categoryMap = new Map<string, number>();
  for (const e of approvedExpenses) {
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + (e.amount ?? 0));
  }
  const expenseByCategory = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const monthMap = new Map<string, { revenue: number; cost: number }>();
  for (const r of soldItems) {
    const key = monthKey(r.sell_date);
    const prev = monthMap.get(key) ?? { revenue: 0, cost: 0 };
    monthMap.set(key, { revenue: prev.revenue + r.sell_price, cost: prev.cost + r.cost });
  }
  const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const revenueByMonth = sortedMonths.map(([k, v]) => ({ date: monthLabel(k), revenue: v.revenue, cost: v.cost }));
  const profitByMonth = sortedMonths.map(([k, v]) => ({ date: monthLabel(k), profit: v.revenue - v.cost }));

  const modelProfitMap = new Map<string, number>();
  for (const r of soldItems) {
    modelProfitMap.set(r.model, (modelProfitMap.get(r.model) ?? 0) + r.sell_price - r.cost);
  }
  const topModels = Array.from(modelProfitMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([model, profit]) => ({ model, profit }));

  const { prevFrom, prevTo, label: prevPeriodLabel } = getPrevPeriod(dateFrom, dateTo);
  const prevSold = allNorm.filter((r) => r.sell_date >= prevFrom && r.sell_date <= prevTo);
  const prevRevenue = prevSold.reduce((s, r) => s + r.sell_price, 0);
  const prevCost = prevSold.reduce((s, r) => s + r.cost, 0);
  const prevApprovedExp = allExpenses.filter((e) => e.status === "approved" && e.date >= prevFrom && e.date <= prevTo);
  const prevExpenses = prevApprovedExp.filter(e => e.category !== "ซื้อคืน").reduce((s, e) => s + (e.amount ?? 0), 0);
  const prevTrueNetProfit = (prevRevenue - prevCost) - prevExpenses;

  return {
    totalRevenue,
    totalCost,
    netProfit,
    trueNetProfit,
    totalExpenses,
    pendingExpensesCount,
    stockValue,
    soldCount: soldItems.length,
    purchaseCount: rows.length + (directSoldStocks?.length ?? 0),
    revenueByMonth,
    profitByMonth,
    topModels,
    expenseByCategory,
    deltaRevenue: pct(totalRevenue, prevRevenue),
    deltaCost: pct(totalCost, prevCost),
    deltaExpenses: pct(totalExpenses, prevExpenses),
    deltaProfit: pct(trueNetProfit, prevTrueNetProfit),
    prevPeriodLabel,
  };
}

export async function fetchFinanceIncome(dateFrom = "", dateTo = ""): Promise<FinanceIncome[]> {
  await requireAuth();
  const supabase = createServerClient();
  const dateFilter = dateFrom && dateTo;
  const [{ data }, { data: directData }, { data: buyerData }] = await Promise.all([
    (() => {
      let q = supabase
        .from("requests")
        .select("id, order_number, device_model, device_storage, actual_price, estimated_price, sell_price, sell_date, source")
        .eq("status", "completed")
        .eq("stock_status", "sold")
        .not("sell_price", "is", null)
        .not("sell_date", "is", null);
      if (dateFilter) q = q.gte("sell_date", dateFrom).lte("sell_date", dateTo);
      return q.order("sell_date", { ascending: false });
    })(),
    (() => {
      let q = supabase
        .from("stocks")
        .select("id, model, storage, cost_price, shipping_cost, other_cost, sold_price, sold_at, buyer_name, sale_type, sold_cost_snapshot")
        .in("status", ["ขายแล้ว", "รับคืนแล้ว", "ส่งซ่อม"])
        .is("request_ref", null)
        .not("sold_price", "is", null)
        .not("sold_at", "is", null);
      if (dateFilter) q = q.gte("sold_at", dateFrom).lte("sold_at", endOfThaiDay(dateTo));
      return q;
    })(),
    supabase
      .from("stocks")
      .select("request_ref, buyer_name")
      .not("request_ref", "is", null)
      .eq("status", "ขายแล้ว"),
  ]);

  const buyerMap = new Map((buyerData ?? []).map((s) => [s.request_ref as string, s.buyer_name as string ?? ""]));

  const fromRequests: FinanceIncome[] = (data ?? []).map((row) => {
    const cost = row.actual_price ?? row.estimated_price ?? 0;
    const sell = row.sell_price ?? 0;
    return {
      id: row.id,
      date: row.sell_date,
      refNumber: row.order_number ?? "",
      model: row.device_model ?? "",
      storage: row.device_storage ?? "",
      sellPrice: sell,
      costPrice: cost,
      profit: sell - cost,
      customerName: buyerMap.get(row.order_number) ?? "",
      source: row.source ?? "",
    };
  });

  const fromStocks: FinanceIncome[] = (directData ?? []).map((s) => {
    const cost = s.sold_cost_snapshot ?? ((s.cost_price ?? 0) + (s.shipping_cost ?? 0) + (s.other_cost ?? 0));
    const sell = s.sold_price ?? 0;
    return {
      id: s.id,
      date: s.sold_at.slice(0, 10),
      refNumber: s.id,
      model: s.model ?? "",
      storage: s.storage ?? "",
      sellPrice: sell,
      costPrice: cost,
      profit: sell - cost,
      customerName: s.buyer_name ?? "",
      source: s.sale_type ?? "",
    };
  });

  return [...fromRequests, ...fromStocks].sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchFinancePurchases(dateFrom = "", dateTo = ""): Promise<FinancePurchase[]> {
  await requireAuth();
  const supabase = createServerClient();
  let q = supabase
    .from("requests")
    .select("id, order_number, device_model, device_storage, actual_price, estimated_price, sell_price, stock_status, customer_name, source, created_at, payment_method, payment_slip_url, paid_from_bank, paid_from_owner")
    .eq("status", "completed");
  if (dateFrom && dateTo) q = q.gte("created_at", dateFrom).lte("created_at", endOfThaiDay(dateTo));
  const { data } = await q.order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.created_at,
    refNumber: row.order_number ?? "",
    model: row.device_model ?? "",
    storage: row.device_storage ?? "",
    costPrice: row.actual_price ?? row.estimated_price ?? 0,
    sellPrice: row.sell_price ?? undefined,
    customerName: row.customer_name ?? "",
    stockStatus: row.stock_status ?? "in_stock",
    source: row.source ?? "",
    paidFromBank: row.paid_from_bank ?? "",
    paidFromOwner: row.paid_from_owner ?? "",
    hasSlip: !!row.payment_slip_url,
    paymentMethod: row.payment_method ?? "",
  }));
}

// อ่านสลิปโอนของรายการซื้อ → ดึง "ธนาคาร + ชื่อผู้โอน" (บัญชีเราที่จ่ายให้ลูกค้า) ด้วย Claude vision
export async function extractSlipAccount(requestId: string): Promise<
  | { success: true; bank: string; owner: string; amount: number | null; cost: number; amountMatches: boolean; confidence: string }
  | { success: false; error: string }
> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: req } = await supabase
    .from("requests")
    .select("payment_slip_url, actual_price, estimated_price")
    .eq("id", requestId)
    .single();
  if (!req) return { success: false, error: "ไม่พบรายการ" };
  if (!req.payment_slip_url) return { success: false, error: "รายการนี้ไม่มีสลิป (อาจจ่ายเงินสด) — กรุณากรอกบัญชีเอง" };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { success: false, error: "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY" };

  let b64: string;
  let mediaType: string;
  try {
    const resp = await fetch(req.payment_slip_url);
    if (!resp.ok) return { success: false, error: `โหลดรูปสลิปไม่สำเร็จ (${resp.status})` };
    mediaType = resp.headers.get("content-type") || "image/jpeg";
    b64 = Buffer.from(await resp.arrayBuffer()).toString("base64");
  } catch {
    return { success: false, error: "โหลดรูปสลิปไม่สำเร็จ" };
  }

  const prompt =
    'นี่คือสลิปโอนเงินของร้านรับซื้อมือถือ ที่ร้านโอนจ่ายเงินให้ลูกค้า. ดึงข้อมูลฝั่ง "ผู้โอน/จ่ายออก" (ไม่ใช่ผู้รับ). ' +
    'ตอบเป็น JSON เท่านั้น ไม่ต้องมีคำอธิบาย: ' +
    '{"sender_bank":"ชื่อธนาคารผู้โอนแบบเต็มภาษาไทย","sender_name":"ชื่อบัญชีผู้โอนตามที่เห็น","amount":"จำนวนเงินเป็นตัวเลขล้วน","recipient_name":"ชื่อผู้รับ","confidence":"high|medium|low"}. ' +
    'ถ้าฟิลด์ไหนอ่านไม่ได้ให้ใส่ค่าว่าง.';

  let parsed: { sender_bank?: string; sender_name?: string; amount?: string; confidence?: string };
  try {
    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-8",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: b64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
    const j = await ai.json();
    if (j.error) return { success: false, error: `AI: ${j.error.message ?? "error"}` };
    const text: string = j.content?.[0]?.text ?? "";
    const m = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : text);
  } catch {
    return { success: false, error: "อ่านสลิปไม่สำเร็จ — ลองใหม่หรือกรอกเอง" };
  }

  const bank = String(parsed.sender_bank ?? "").trim();
  const owner = String(parsed.sender_name ?? "").trim();
  const slipAmount = parseFloat(String(parsed.amount ?? "").replace(/[^0-9.]/g, "")) || null;
  const cost = req.actual_price ?? req.estimated_price ?? 0;
  const amountMatches = slipAmount != null ? Math.abs(slipAmount - cost) < 1 : false;

  await supabase
    .from("requests")
    .update({ paid_from_bank: bank, paid_from_owner: owner, updated_at: new Date().toISOString() })
    .eq("id", requestId);

  return { success: true, bank, owner, amount: slipAmount, cost, amountMatches, confidence: String(parsed.confidence ?? "") };
}

// กรอก/แก้บัญชีที่จ่ายเอง (เผื่อเงินสด หรือแก้ทับที่ AI อ่าน)
export async function updatePurchaseAccount(
  requestId: string,
  bank: string,
  owner: string,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({ paid_from_bank: bank.trim(), paid_from_owner: owner.trim(), updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchFinanceProfitByModel(dateFrom = "", dateTo = ""): Promise<{
  kpi: { totalRevenue: number; totalCost: number; netProfit: number; margin: number };
  byModel: FinanceProfitByModel[];
}> {
  await requireAuth();
  const supabase = createServerClient();
  const dateFilter = dateFrom && dateTo;
  const [{ data }, { data: directData }] = await Promise.all([
    (() => {
      let q = supabase
        .from("requests")
        .select("device_model, actual_price, estimated_price, sell_price")
        .eq("status", "completed")
        .eq("stock_status", "sold")
        .not("sell_price", "is", null);
      if (dateFilter) q = q.gte("sell_date", dateFrom).lte("sell_date", dateTo);
      return q;
    })(),
    (() => {
      let q = supabase
        .from("stocks")
        .select("model, cost_price, shipping_cost, other_cost, sold_price, sold_cost_snapshot")
        .in("status", ["ขายแล้ว", "รับคืนแล้ว", "ส่งซ่อม"])
        .is("request_ref", null)
        .not("sold_price", "is", null);
      if (dateFilter) q = q.gte("sold_at", dateFrom).lte("sold_at", endOfThaiDay(dateTo));
      return q;
    })(),
  ]);

  type Entry = { model: string; cost: number; sell: number };
  const entries: Entry[] = [
    ...(data ?? []).map((r) => ({ model: r.device_model ?? "Unknown", cost: r.actual_price ?? r.estimated_price ?? 0, sell: r.sell_price ?? 0 })),
    ...(directData ?? []).map((s) => ({ model: s.model ?? "Unknown", cost: s.sold_cost_snapshot ?? ((s.cost_price ?? 0) + (s.shipping_cost ?? 0) + (s.other_cost ?? 0)), sell: s.sold_price ?? 0 })),
  ];

  const modelMap = new Map<string, { costs: number[]; sells: number[] }>();
  for (const { model, cost, sell } of entries) {
    if (!modelMap.has(model)) modelMap.set(model, { costs: [], sells: [] });
    const entry = modelMap.get(model)!;
    entry.costs.push(cost);
    entry.sells.push(sell);
  }

  const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((s, v) => s + v, 0) / arr.length;

  const byModel: FinanceProfitByModel[] = Array.from(modelMap.entries())
    .map(([model, { costs, sells }]) => {
      const costAvg = Math.round(avg(costs));
      const sellAvg = Math.round(avg(sells));
      const profitAvg = sellAvg - costAvg;
      const totalProfit = sells.reduce((s, v, i) => s + v - costs[i], 0);
      const margin = sellAvg === 0 ? 0 : Math.round((profitAvg / sellAvg) * 1000) / 10;
      return { model, count: costs.length, costAvg, sellAvg, profitAvg, margin, totalProfit };
    })
    .sort((a, b) => b.totalProfit - a.totalProfit);

  const totalRevenue = entries.reduce((s, r) => s + r.sell, 0);
  const totalCost = entries.reduce((s, r) => s + r.cost, 0);
  const netProfit = totalRevenue - totalCost;
  const margin = totalRevenue === 0 ? 0 : Math.round((netProfit / totalRevenue) * 1000) / 10;

  return { kpi: { totalRevenue, totalCost, netProfit, margin }, byModel };
}

export async function fetchFinanceCashFlow(dateFrom = "", dateTo = ""): Promise<{
  summary: FinanceCashFlowSummary;
  entries: FinanceCashFlowEntry[];
}> {
  await requireAuth();
  const supabase = createServerClient();
  const dateFilter = dateFrom && dateTo;

  const [{ data: purchases }, { data: sales }, { data: directBuys }, { data: directSales }] = await Promise.all([
    (() => {
      let q = supabase
        .from("requests")
        .select("id, order_number, device_model, actual_price, estimated_price, customer_name, created_at")
        .eq("status", "completed");
      if (dateFilter) q = q.gte("created_at", dateFrom).lte("created_at", endOfThaiDay(dateTo));
      return q.order("created_at", { ascending: true });
    })(),
    (() => {
      let q = supabase
        .from("requests")
        .select("id, order_number, device_model, sell_price, sell_date")
        .eq("status", "completed")
        .eq("stock_status", "sold")
        .not("sell_price", "is", null)
        .not("sell_date", "is", null);
      if (dateFilter) q = q.gte("sell_date", dateFrom).lte("sell_date", dateTo);
      return q.order("sell_date", { ascending: true });
    })(),
    (() => {
      let q = supabase
        .from("stocks")
        .select("id, model, cost_price, shipping_cost, other_cost, received_at, created_at")
        .is("request_ref", null);
      if (dateFilter) q = q.gte("created_at", dateFrom).lte("created_at", endOfThaiDay(dateTo));
      return q.order("created_at", { ascending: true });
    })(),
    (() => {
      let q = supabase
        .from("stocks")
        .select("id, model, sold_price, sold_at")
        .in("status", ["ขายแล้ว", "รับคืนแล้ว", "ส่งซ่อม"])
        .is("request_ref", null)
        .not("sold_price", "is", null)
        .not("sold_at", "is", null);
      if (dateFilter) q = q.gte("sold_at", dateFrom).lte("sold_at", endOfThaiDay(dateTo));
      return q;
    })(),
  ]);

  type Raw = { datetime: string; description: string; entryType: "in" | "out"; amount: number; id: string };
  const raw: Raw[] = [
    ...(purchases ?? []).map((row) => ({
      id: `buy-${row.id}`,
      datetime: row.created_at,
      description: `รับซื้อ ${row.device_model ?? ""} · ${row.order_number ?? ""}`,
      entryType: "out" as const,
      amount: row.actual_price ?? row.estimated_price ?? 0,
    })),
    ...(directBuys ?? []).map((row) => ({
      id: `buy-direct-${row.id}`,
      datetime: row.created_at ?? row.received_at,
      description: `รับซื้อ ${row.model ?? ""}`,
      entryType: "out" as const,
      amount: (row.cost_price ?? 0) + (row.shipping_cost ?? 0) + (row.other_cost ?? 0),
    })),
    ...(sales ?? []).map((row) => ({
      id: `sell-${row.id}`,
      datetime: row.sell_date + "T12:00:00",
      description: `ขาย ${row.device_model ?? ""} · ${row.order_number ?? ""}`,
      entryType: "in" as const,
      amount: row.sell_price ?? 0,
    })),
    ...(directSales ?? []).map((row) => ({
      id: `sell-direct-${row.id}`,
      datetime: row.sold_at + "T12:00:00",
      description: `ขาย ${row.model ?? ""}`,
      entryType: "in" as const,
      amount: row.sold_price ?? 0,
    })),
  ].sort((a, b) => a.datetime.localeCompare(b.datetime));

  let balance = 0;
  const entriesAsc: FinanceCashFlowEntry[] = raw.map((e) => {
    if (e.entryType === "in") {
      balance += e.amount;
      return { id: e.id, datetime: fmtCF(e.datetime), description: e.description, entryType: "in", amountIn: e.amount, balance };
    } else {
      balance -= e.amount;
      return { id: e.id, datetime: fmtCF(e.datetime), description: e.description, entryType: "out", amountOut: e.amount, balance };
    }
  });

  const totalIn = raw.filter((e) => e.entryType === "in").reduce((s, e) => s + e.amount, 0);
  const totalOut = raw.filter((e) => e.entryType === "out").reduce((s, e) => s + e.amount, 0);

  return {
    summary: { totalIn, totalOut, closing: balance },
    entries: [...entriesAsc].reverse(),
  };
}

function fmtCF(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export type FinanceAuditEntry = {
  id: string;
  datetime: string;
  user: string;
  action: string;
  refNumber: string;
  before?: string;
  after?: string;
  category: "finance" | "stock" | "system";
};


export async function fetchFinanceAudit(dateFrom = "", dateTo = ""): Promise<FinanceAuditEntry[]> {
  await requireAuth();
  const supabase = createServerClient();
  const dateFilter = dateFrom && dateTo;
  const [{ data }, { data: expenseLogs }] = await Promise.all([
    (() => {
      let q = supabase
        .from("requests")
        .select("id, order_number, device_model, status_log, stock_status, sell_date, sell_price, created_at")
        .order("created_at", { ascending: false });
      if (dateFilter) q = q.gte("created_at", dateFrom).lte("created_at", endOfThaiDay(dateTo));
      return q.limit(200);
    })(),
    (() => {
      let q = supabase
        .from("finance_audit_logs")
        .select("*")
        .order("datetime", { ascending: false });
      if (dateFilter) q = q.gte("datetime", dateFrom).lte("datetime", endOfThaiDay(dateTo));
      return q.limit(200);
    })(),
  ]);

  const entries: FinanceAuditEntry[] = [];

  for (const row of data ?? []) {
    if (row.stock_status === "sold" && row.sell_date) {
      entries.push({
        id: `sold-${row.id}`,
        datetime: row.sell_date + "T12:00:00",
        user: "แอดมิน",
        action: `บันทึกการขาย ${row.device_model ?? ""}`,
        refNumber: row.order_number ?? "",
        before: "in_stock",
        after: `sold · ฿${(row.sell_price ?? 0).toLocaleString("th-TH")}`,
        category: "finance",
      });
    }
  }

  for (const log of expenseLogs ?? []) {
    entries.push({
      id: log.id,
      datetime: log.datetime,
      user: log.actor ?? "แอดมิน",
      action: log.action,
      refNumber: log.ref_number ?? "",
      before: log.before_val ?? undefined,
      after: log.after_val ?? undefined,
      category: (log.category as "finance" | "stock" | "system") ?? "finance",
    });
  }

  entries.sort((a, b) => b.datetime.localeCompare(a.datetime));
  return entries;
}

// ─── Expenses (Supabase) ──────────────────────────────────────────────────────

async function insertAuditLog(data: {
  action: string;
  refNumber?: string;
  beforeVal?: string;
  afterVal?: string;
  category?: string;
}) {
  try {
    await requireAuth();
  const supabase = createServerClient();
    await supabase.from("finance_audit_logs").insert({
      action: data.action,
      ref_number: data.refNumber ?? "",
      before_val: data.beforeVal ?? null,
      after_val: data.afterVal ?? null,
      category: data.category ?? "finance",
    });
  } catch { /* audit failure must not block main operation */ }
}

export type ExpenseStatus = "pending" | "approved" | "rejected";

export type Expense = {
  id: string;
  date: string;
  refNumber: string;
  product: string;
  category: string;
  amount: number;
  status: ExpenseStatus;
  notes: string;
  paymentAccount: string;
  accountOwner: string;
  createdAt: string;
};

export async function fetchExpenses(dateFrom = "", dateTo = ""): Promise<Expense[]> {
  await requireAuth();
  const supabase = createServerClient();
  let q = supabase.from("expenses").select("*");
  if (dateFrom && dateTo) q = q.gte("date", dateFrom).lte("date", dateTo);
  const { data, error } = await q.order("date", { ascending: false });
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    date: r.date,
    refNumber: r.ref_number,
    product: r.product,
    category: r.category,
    amount: r.amount,
    status: r.status as ExpenseStatus,
    notes: r.notes ?? "",
    paymentAccount: r.payment_account ?? "",
    accountOwner: r.account_owner ?? "",
    createdAt: r.created_at,
  }));
}

export async function createExpense(data: {
  date: string;
  refNumber: string;
  product: string;
  category: string;
  amount: number;
  status: ExpenseStatus;
  notes: string;
  paymentAccount?: string;
  accountOwner?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: row, error } = await supabase
    .from("expenses")
    .insert({
      date: data.date,
      ref_number: data.refNumber,
      product: data.product,
      category: data.category,
      amount: data.amount,
      status: data.status,
      notes: data.notes,
      payment_account: data.paymentAccount ?? "",
      account_owner: data.accountOwner ?? "",
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { success: false, error: error.message };
  insertAuditLog({
    action: `เพิ่มรายจ่าย: ${data.product}`,
    refNumber: data.refNumber,
    afterVal: `฿${data.amount.toLocaleString("th-TH")} · ${data.category} · ${data.status}`,
  }).catch(() => {});
  return { success: true, id: row.id };
}

export async function updateExpense(
  id: string,
  data: { date: string; product: string; category: string; amount: number; status: ExpenseStatus; notes: string; paymentAccount?: string; accountOwner?: string },
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: existing } = await supabase.from("expenses").select("ref_number").eq("id", id).single();
  const { paymentAccount, accountOwner, ...rest } = data;
  const { error } = await supabase
    .from("expenses")
    .update({ ...rest, payment_account: paymentAccount ?? "", account_owner: accountOwner ?? "", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  insertAuditLog({
    action: `แก้ไขรายจ่าย: ${data.product}`,
    refNumber: existing?.ref_number ?? id,
    afterVal: `฿${data.amount.toLocaleString("th-TH")} · ${data.status}`,
  }).catch(() => {});
  return { success: true };
}

export async function deletePurchaseRecord(id: string): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { data: profile } = await supabase.from("admin_users").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "owner") return { success: false, error: "เฉพาะเจ้าของเท่านั้นที่ลบได้" };
  const { data: existing } = await supabase.from("requests").select("order_number, device_model").eq("id", id).single();
  const { error } = await supabase.from("requests").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  insertAuditLog({
    action: `ลบรายการซื้อ: ${existing?.device_model ?? ""}`,
    refNumber: existing?.order_number ?? id,
  }).catch(() => {});
  return { success: true };
}

export async function deleteExpense(id: string): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: existing } = await supabase.from("expenses").select("ref_number, product").eq("id", id).single();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  insertAuditLog({
    action: `ลบรายจ่าย: ${existing?.product ?? ""}`,
    refNumber: existing?.ref_number ?? id,
  }).catch(() => {});
  return { success: true };
}

// ─── Finance Settings (Supabase) ─────────────────────────────────────────────

export type FinanceSettings = {
  businessName: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  vatEnabled: boolean;
  vatRate: string;
  withholdingTax: string;
  fiscalYear: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  notifyNewRequest: boolean;
  notifyLowStock: boolean;
  notifyLargeProfit: boolean;
};

const DEFAULT_SETTINGS: FinanceSettings = {
  businessName: "KHAIPHONE",
  taxId: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  vatEnabled: false,
  vatRate: "7",
  withholdingTax: "3",
  fiscalYear: "มกราคม",
  bankName: "",
  accountName: "",
  accountNumber: "",
  notifyNewRequest: true,
  notifyLowStock: true,
  notifyLargeProfit: false,
};

export async function fetchFinanceSettings(): Promise<FinanceSettings> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase.from("finance_settings").select("*").eq("id", 1).single();
  if (!data) return DEFAULT_SETTINGS;
  return {
    businessName:      data.business_name      ?? DEFAULT_SETTINGS.businessName,
    taxId:             data.tax_id             ?? DEFAULT_SETTINGS.taxId,
    address:           data.address            ?? DEFAULT_SETTINGS.address,
    phone:             data.phone              ?? DEFAULT_SETTINGS.phone,
    email:             data.email              ?? DEFAULT_SETTINGS.email,
    website:           data.website            ?? DEFAULT_SETTINGS.website,
    vatEnabled:        data.vat_enabled        ?? DEFAULT_SETTINGS.vatEnabled,
    vatRate:           data.vat_rate           ?? DEFAULT_SETTINGS.vatRate,
    withholdingTax:    data.withholding_tax    ?? DEFAULT_SETTINGS.withholdingTax,
    fiscalYear:        data.fiscal_year        ?? DEFAULT_SETTINGS.fiscalYear,
    bankName:          data.bank_name          ?? DEFAULT_SETTINGS.bankName,
    accountName:       data.account_name       ?? DEFAULT_SETTINGS.accountName,
    accountNumber:     data.account_number     ?? DEFAULT_SETTINGS.accountNumber,
    notifyNewRequest:  data.notify_new_request ?? DEFAULT_SETTINGS.notifyNewRequest,
    notifyLowStock:    data.notify_low_stock   ?? DEFAULT_SETTINGS.notifyLowStock,
    notifyLargeProfit: data.notify_large_profit ?? DEFAULT_SETTINGS.notifyLargeProfit,
  };
}

export async function saveFinanceSettings(
  s: FinanceSettings,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase.from("finance_settings").upsert({
    id:                  1,
    business_name:       s.businessName,
    tax_id:              s.taxId,
    address:             s.address,
    phone:               s.phone,
    email:               s.email,
    website:             s.website,
    vat_enabled:         s.vatEnabled,
    vat_rate:            s.vatRate,
    withholding_tax:     s.withholdingTax,
    fiscal_year:         s.fiscalYear,
    bank_name:           s.bankName,
    account_name:        s.accountName,
    account_number:      s.accountNumber,
    notify_new_request:  s.notifyNewRequest,
    notify_low_stock:    s.notifyLowStock,
    notify_large_profit: s.notifyLargeProfit,
    updated_at:          new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) return { success: false, error: error.message };
  insertAuditLog({
    action: "บันทึกการตั้งค่าการเงิน",
    afterVal: `VAT ${s.vatEnabled ? `${s.vatRate}%` : "ปิด"} · ภาษีหัก ณ ที่จ่าย ${s.withholdingTax}% · ธนาคาร ${s.bankName || "—"}`,
    category: "system",
  }).catch(() => {});
  return { success: true };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type FinanceNotification = {
  id: string;
  label: string;
  sub: string;
  href: string;
};

export async function fetchFinanceNotifications(): Promise<FinanceNotification[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("expenses")
    .select("id, ref_number, product, amount, date")
    .eq("status", "pending")
    .order("date", { ascending: false })
    .limit(8);
  return (data ?? []).map((e) => ({
    id: e.id,
    label: `รออนุมัติ: ${e.product}`,
    sub: `${e.ref_number} · ฿${(e.amount ?? 0).toLocaleString("th-TH")}`,
    href: "/finance/expenses",
  }));
}

// ─── Search ───────────────────────────────────────────────────────────────────

export type FinanceSearchResult = {
  id: string;
  type: "income" | "expense";
  label: string;
  sub: string;
  href: string;
};

export async function searchFinance(query: string): Promise<FinanceSearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  await requireAuth();
  const supabase = createServerClient();
  const q = query.trim();
  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, order_number, device_model, sell_price, sell_date")
      .eq("status", "completed")
      .eq("stock_status", "sold")
      .or(`order_number.ilike.%${q}%,device_model.ilike.%${q}%`)
      .limit(5),
    supabase
      .from("expenses")
      .select("id, ref_number, product, amount, date")
      .or(`ref_number.ilike.%${q}%,product.ilike.%${q}%`)
      .limit(5),
  ]);
  return [
    ...(incomes ?? []).map((r) => ({
      id: r.id,
      type: "income" as const,
      label: r.device_model ?? "",
      sub: `${r.order_number ?? ""} · ฿${(r.sell_price ?? 0).toLocaleString("th-TH")}`,
      href: "/finance/income",
    })),
    ...(expenses ?? []).map((e) => ({
      id: e.id,
      type: "expense" as const,
      label: e.product,
      sub: `${e.ref_number} · ฿${(e.amount ?? 0).toLocaleString("th-TH")}`,
      href: "/finance/expenses",
    })),
  ];
}

// ─── Stock Aging ──────────────────────────────────────────────────────────────

export type StockAgingItem = {
  id: string;
  model: string;
  storage: string;
  grade: string;
  status: string;
  daysInStock: number;
  totalCost: number;
  receivedAt: string;
};

export async function fetchStockAging(): Promise<StockAgingItem[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("id, model, storage, grade, status, received_at, cost_price, shipping_cost, other_cost")
    .not("status", "in", '("ขายแล้ว","ส่งคืน","ตีกลับ/ไม่รับซื้อ")')
    .order("received_at", { ascending: true });

  const today = new Date();
  return (data ?? []).map((r) => {
    const received = new Date(r.received_at ?? today.toISOString());
    const daysInStock = Math.floor((today.getTime() - received.getTime()) / 86400000);
    return {
      id: r.id,
      model: r.model ?? "",
      storage: r.storage ?? "",
      grade: r.grade ?? "",
      status: r.status ?? "",
      daysInStock,
      totalCost: (r.cost_price ?? 0) + (r.shipping_cost ?? 0) + (r.other_cost ?? 0),
      receivedAt: r.received_at ?? "",
    };
  });
}

// ─── Staff Performance ────────────────────────────────────────────────────────

export type StaffPerf = {
  name: string;
  count: number;
  revenue: number;
  profit: number;
  avgProfit: number;
};

export async function fetchStaffPerformance(dateFrom?: string, dateTo?: string): Promise<StaffPerf[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("sold_by, sold_price, cost_price, shipping_cost, other_cost, sold_at, sold_cost_snapshot")
    .in("status", ["ขายแล้ว", "รับคืนแล้ว", "ส่งซ่อม"])
    .not("sold_price", "is", null)
    .not("sold_at", "is", null);

  const rows = (data ?? []).filter((r) => {
    if (!r.sold_at) return false;
    const day = r.sold_at.slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });

  const map = new Map<string, { revenue: number; profit: number; count: number }>();
  for (const r of rows) {
    const name = r.sold_by ?? "ไม่ระบุ";
    const revenue = r.sold_price ?? 0;
    const cost = r.sold_cost_snapshot ?? ((r.cost_price ?? 0) + (r.shipping_cost ?? 0) + (r.other_cost ?? 0));
    const profit = revenue - cost;
    const prev = map.get(name) ?? { revenue: 0, profit: 0, count: 0 };
    map.set(name, { revenue: prev.revenue + revenue, profit: prev.profit + profit, count: prev.count + 1 });
  }

  return Array.from(map.entries())
    .map(([name, { revenue, profit, count }]) => ({ name, count, revenue, profit, avgProfit: count > 0 ? Math.round(profit / count) : 0 }))
    .sort((a, b) => b.profit - a.profit);
}

// ─── Devices sold by one staff (or unspecified) — for the staff drill-down ───
export type StaffSoldItem = {
  id: string;
  model: string;
  storage: string;
  soldPrice: number;
  profit: number;
  soldAt: string;
  buyerName: string;
  saleType: string;
};

export async function fetchStaffSoldItems(
  sellerName: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<StaffSoldItem[]> {
  await requireAuth();
  const supabase = createServerClient();
  let q = supabase
    .from("stocks")
    .select("id, model, storage, sold_price, cost_price, shipping_cost, other_cost, sold_cost_snapshot, sold_at, buyer_name, sale_type, sold_by")
    .in("status", ["ขายแล้ว", "รับคืนแล้ว", "ส่งซ่อม"])
    .not("sold_price", "is", null)
    .not("sold_at", "is", null);

  // "ไม่ระบุ" = sales with no recorded seller (sold_by is null)
  if (sellerName === "ไม่ระบุ") q = q.is("sold_by", null);
  else q = q.eq("sold_by", sellerName);

  const { data } = await q;
  return (data ?? [])
    .filter((r) => {
      if (!r.sold_at) return false;
      const day = r.sold_at.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    })
    .map((r) => {
      const revenue = r.sold_price ?? 0;
      const cost = r.sold_cost_snapshot ?? ((r.cost_price ?? 0) + (r.shipping_cost ?? 0) + (r.other_cost ?? 0));
      return {
        id: r.id,
        model: r.model ?? "",
        storage: r.storage ?? "",
        soldPrice: revenue,
        profit: revenue - cost,
        soldAt: thaiDateStr(new Date(r.sold_at)), // วันที่ขายตามเวลาไทย (YYYY-MM-DD)
        buyerName: r.buyer_name ?? "",
        saleType: r.sale_type ?? "",
      };
    })
    .sort((a, b) => b.soldAt.localeCompare(a.soldAt));
}

// ─── Tax Summary ──────────────────────────────────────────────────────────────

export type TaxMonthRow = {
  month: string;
  revenue: number;
  vat: number;
  withholdingTax: number;
};

export type TaxSummary = {
  vatRate: number;
  whtRate: number;
  rows: TaxMonthRow[];
  totalRevenue: number;
  totalVat: number;
  totalWht: number;
};

export async function fetchTaxSummary(dateFrom?: string, dateTo?: string): Promise<TaxSummary> {
  await requireAuth();
  const supabase = createServerClient();
  const [{ data: soldStocks }, { data: settings }] = await Promise.all([
    supabase.from("stocks").select("sold_price, sold_at").in("status", ["ขายแล้ว", "รับคืนแล้ว", "ส่งซ่อม"]).not("sold_price", "is", null).not("sold_at", "is", null),
    supabase.from("finance_settings").select("vat_enabled, vat_rate, withholding_tax").eq("id", 1).single(),
  ]);

  const vatEnabled = settings?.vat_enabled ?? false;
  const vatRate = vatEnabled ? parseFloat(settings?.vat_rate ?? "7") : 0;
  const whtRate = parseFloat(settings?.withholding_tax ?? "3");

  const filtered = (soldStocks ?? []).filter((r) => {
    if (!r.sold_at) return false;
    const day = r.sold_at.slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });

  const monthMap = new Map<string, number>();
  for (const r of filtered) {
    const key = r.sold_at.slice(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + (r.sold_price ?? 0));
  }

  const THAI_MONTHS_FULL = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const rows: TaxMonthRow[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, revenue]) => {
      const [, m] = key.split("-");
      return {
        month: THAI_MONTHS_FULL[parseInt(m) - 1],
        revenue,
        vat: Math.round(revenue * vatRate / 100),
        withholdingTax: Math.round(revenue * whtRate / 100),
      };
    });

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  return {
    vatRate, whtRate, rows,
    totalRevenue,
    totalVat: rows.reduce((s, r) => s + r.vat, 0),
    totalWht: rows.reduce((s, r) => s + r.withholdingTax, 0),
  };
}

// ─── Break-even ───────────────────────────────────────────────────────────────

export type BreakevenItem = {
  model: string;
  count: number;
  avgCost: number;
  avgSellPrice: number;
  breakevenPrice: number;
  margin: number;
  belowBreakeven: boolean;
};

export type BreakevenResult = {
  items: BreakevenItem[];
  overheadPerUnit: number;
  totalExpenses: number;
  unitsSold: number;
  months: 1 | 3;
};

export async function fetchBreakeven(months: 1 | 3 = 3): Promise<BreakevenResult> {
  await requireAuth();
  const supabase = createServerClient();

  const [cy2, cm2] = thaiMonthStr().split("-").map(Number);
  let sinceM = cm2 - (months - 1); let sinceY = cy2;
  while (sinceM <= 0) { sinceM += 12; sinceY--; }
  const sinceStr = `${sinceY}-${String(sinceM).padStart(2, "0")}-01`;

  const [{ data: stockData }, { data: expenseData }, { data: soldData }] = await Promise.all([
    supabase.from("stocks").select("model, cost_price, shipping_cost, other_cost, selling_price, sold_price, status"),
    supabase.from("expenses").select("amount, category").gte("date", sinceStr),
    supabase.from("stocks").select("id").in("status", ["ขายแล้ว", "รับคืนแล้ว", "ส่งซ่อม"]).not("sold_at", "is", null).gte("sold_at", startOfThaiDay(sinceStr)),
  ]);

  const totalExpenses = (expenseData ?? []).filter(r => r.category !== "ซื้อคืน").reduce((s, r) => s + (r.amount ?? 0), 0);
  const unitsSold = (soldData ?? []).length;
  const overheadPerUnit = unitsSold > 0 ? Math.round(totalExpenses / unitsSold) : 0;

  const modelMap = new Map<string, { costs: number[]; sells: number[] }>();
  for (const r of stockData ?? []) {
    const model = r.model ?? "Unknown";
    const cost = (r.cost_price ?? 0) + (r.shipping_cost ?? 0) + (r.other_cost ?? 0);
    const sell = r.status === "ขายแล้ว" ? (r.sold_price ?? r.selling_price ?? 0) : (r.selling_price ?? 0);
    if (!modelMap.has(model)) modelMap.set(model, { costs: [], sells: [] });
    const e = modelMap.get(model)!;
    e.costs.push(cost);
    if (sell > 0) e.sells.push(sell);
  }

  const avg = (arr: number[]) => arr.length === 0 ? 0 : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);

  const items = Array.from(modelMap.entries()).map(([model, { costs, sells }]) => {
    const avgCost = avg(costs);
    const avgSellPrice = avg(sells);
    const breakevenPrice = avgCost + overheadPerUnit;
    const margin = avgSellPrice > 0 ? Math.round(((avgSellPrice - breakevenPrice) / avgSellPrice) * 1000) / 10 : 0;
    return {
      model,
      count: costs.length,
      avgCost,
      avgSellPrice,
      breakevenPrice,
      margin,
      belowBreakeven: avgSellPrice > 0 && avgSellPrice < breakevenPrice,
    };
  }).sort((a, b) => b.count - a.count);

  return { items, overheadPerUnit, totalExpenses, unitsSold, months };
}

export async function fetchOverheadPerUnit(months: 1 | 3 = 3): Promise<number> {
  await requireAuth();
  const supabase = createServerClient();
  const [cy3, cm3] = thaiMonthStr().split("-").map(Number);
  let sinceM2 = cm3 - (months - 1); let sinceY2 = cy3;
  while (sinceM2 <= 0) { sinceM2 += 12; sinceY2--; }
  const sinceStr2 = `${sinceY2}-${String(sinceM2).padStart(2, "0")}-01`;
  const [{ data: expenseData }, { data: soldData }] = await Promise.all([
    supabase.from("expenses").select("amount, category").gte("date", sinceStr2),
    supabase.from("stocks").select("id").in("status", ["ขายแล้ว", "รับคืนแล้ว", "ส่งซ่อม"]).not("sold_at", "is", null).gte("sold_at", startOfThaiDay(sinceStr2)),
  ]);
  const totalExpenses = (expenseData ?? []).filter(r => r.category !== "ซื้อคืน").reduce((s, r) => s + (r.amount ?? 0), 0);
  const unitsSold = (soldData ?? []).length;
  return unitsSold > 0 ? Math.round(totalExpenses / unitsSold) : 0;
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export type ForecastPoint = { date: string; actual?: number; forecast?: number };

export type ForecastData = {
  points: ForecastPoint[];
  avgDailyRevenue: number;
  projected30: number;
  projected60: number;
  projected90: number;
};

export async function fetchForecast(): Promise<ForecastData> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("sold_at, sold_price")
    .eq("status", "ขายแล้ว")
    .not("sold_at", "is", null)
    .order("sold_at", { ascending: true });

  const dayMap = new Map<string, number>();
  for (const r of data ?? []) {
    const day = r.sold_at.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + (r.sold_price ?? 0));
  }

  const todayStr = thaiDateStr();
  const thirtyDaysAgo = thaiDateOffset(todayStr, -30);

  const recentDays = Array.from(dayMap.entries())
    .filter(([d]) => d >= thirtyDaysAgo && d <= todayStr);
  const avgDailyRevenue = recentDays.length > 0
    ? Math.round(recentDays.reduce((s, [, v]) => s + v, 0) / 30)
    : 0;

  const points: ForecastPoint[] = [];
  for (const [date, actual] of Array.from(dayMap.entries()).slice(-30)) {
    points.push({ date, actual });
  }
  for (let i = 1; i <= 30; i++) {
    const d = thaiDateOffset(todayStr, i);
    points.push({ date: d, forecast: avgDailyRevenue });
  }

  return {
    points,
    avgDailyRevenue,
    projected30: avgDailyRevenue * 30,
    projected60: avgDailyRevenue * 60,
    projected90: avgDailyRevenue * 90,
  };
}

// ─── Document generation ──────────────────────────────────────────────────────

export type SaleDocument = {
  refNumber: string;
  date: string;
  model: string;
  storage: string;
  color: string;
  grade: string;
  imei: string;
  serial: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  whtRate: number;
  whtAmount: number;
  buyerName: string;
  buyerPhone: string;
  soldBy: string;
  saleType: string;
  businessName: string;
  taxId: string;
  address: string;
  businessPhone: string;
};

export type PurchaseDocument = {
  refNumber: string;
  date: string;
  model: string;
  storage: string;
  color: string;
  grade: string;
  imei: string;
  serial: string;
  amount: number;
  sellerName: string;
  sellerPhone: string;
  businessName: string;
  taxId: string;
  address: string;
  businessPhone: string;
};

export async function fetchSaleDocument(id: string): Promise<SaleDocument | null> {
  await requireAuth();
  const supabase = createServerClient();

  const { data: settings } = await supabase
    .from("finance_settings")
    .select("business_name, tax_id, address, phone, vat_enabled, vat_rate, withholding_tax")
    .eq("id", 1)
    .single();

  const vatEnabled = settings?.vat_enabled ?? false;
  const vatRate = vatEnabled ? parseFloat(settings?.vat_rate ?? "0") : 0;
  const whtRate = parseFloat(settings?.withholding_tax ?? "0");

  // Try stocks table first (direct stock sale — id is stock id like STK-... or KP-...)
  let { data: stock } = await supabase
    .from("stocks")
    .select("id, model, storage, color, grade, imei, serial, sold_price, sold_at, buyer_name, buyer_phone, sold_by, sale_type, request_ref")
    .eq("id", id)
    .maybeSingle();

  let refNumber = "";

  if (stock) {
    refNumber = stock.request_ref ?? stock.id;
  } else {
    // id is a requests table UUID — look up the request then find linked stock
    const { data: req } = await supabase
      .from("requests")
      .select("order_number, device_model, device_storage, sell_price, sell_date, source, actual_price, estimated_price")
      .eq("id", id)
      .maybeSingle();
    if (!req) return null;

    refNumber = req.order_number ?? id;

    // Find linked stock for extra details
    const { data: linkedStock } = await supabase
      .from("stocks")
      .select("id, color, grade, imei, serial, buyer_name, buyer_phone, sold_by, sale_type")
      .eq("request_ref", req.order_number)
      .maybeSingle();

    const amount = req.sell_price ?? 0;
    const vatAmount = Math.round(amount * vatRate / 100);
    const whtAmount = Math.round(amount * whtRate / 100);
    return {
      refNumber,
      date: (req.sell_date ?? "").slice(0, 10),
      model: req.device_model ?? "",
      storage: req.device_storage ?? "",
      color: linkedStock?.color ?? "",
      grade: linkedStock?.grade ?? "",
      imei: linkedStock?.imei ?? "",
      serial: linkedStock?.serial ?? "",
      amount,
      vatRate,
      vatAmount,
      whtRate,
      whtAmount,
      buyerName: linkedStock?.buyer_name ?? "",
      buyerPhone: linkedStock?.buyer_phone ?? "",
      soldBy: linkedStock?.sold_by ?? "",
      saleType: linkedStock?.sale_type ?? req.source ?? "ขายปลีก",
      businessName: settings?.business_name ?? "KHAIPHONE",
      taxId: settings?.tax_id ?? "",
      address: settings?.address ?? "",
      businessPhone: settings?.phone ?? "",
    };
  }

  const amount = stock.sold_price ?? 0;
  const vatAmount = Math.round(amount * vatRate / 100);
  const whtAmount = Math.round(amount * whtRate / 100);
  return {
    refNumber,
    date: (stock.sold_at ?? "").slice(0, 10),
    model: stock.model ?? "",
    storage: stock.storage ?? "",
    color: stock.color ?? "",
    grade: stock.grade ?? "",
    imei: stock.imei ?? "",
    serial: stock.serial ?? "",
    amount,
    vatRate,
    vatAmount,
    whtRate,
    whtAmount,
    buyerName: stock.buyer_name ?? "",
    buyerPhone: stock.buyer_phone ?? "",
    soldBy: stock.sold_by ?? "",
    saleType: stock.sale_type ?? "ขายปลีก",
    businessName: settings?.business_name ?? "KHAIPHONE",
    taxId: settings?.tax_id ?? "",
    address: settings?.address ?? "",
    businessPhone: settings?.phone ?? "",
  };
}

export async function fetchPurchaseDocument(id: string): Promise<PurchaseDocument | null> {
  await requireAuth();
  const supabase = createServerClient();
  const [{ data: req }, { data: settings }] = await Promise.all([
    supabase
      .from("requests")
      .select("order_number, device_model, device_storage, actual_price, estimated_price, customer_name, customer_phone, created_at")
      .eq("id", id)
      .single(),
    supabase.from("finance_settings").select("business_name, tax_id, address, phone").eq("id", 1).single(),
  ]);
  if (!req) return null;

  // Try to get IMEI, color, grade from linked stock
  const { data: stock } = await supabase
    .from("stocks")
    .select("imei, serial, color, grade")
    .eq("request_ref", req.order_number)
    .maybeSingle();

  return {
    refNumber: req.order_number ?? "",
    date: (req.created_at ?? "").slice(0, 10),
    model: req.device_model ?? "",
    storage: req.device_storage ?? "",
    color: stock?.color ?? "",
    grade: stock?.grade ?? "",
    imei: stock?.imei ?? "",
    serial: stock?.serial ?? "",
    amount: req.actual_price ?? req.estimated_price ?? 0,
    sellerName: req.customer_name ?? "",
    sellerPhone: req.customer_phone ?? "",
    businessName: settings?.business_name ?? "KHAIPHONE",
    taxId: settings?.tax_id ?? "",
    address: settings?.address ?? "",
    businessPhone: settings?.phone ?? "",
  };
}
