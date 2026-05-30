"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";

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
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const month = parseInt(key.split("-")[1]) - 1;
  return THAI_MONTHS[month];
}

type NormSoldItem = { sell_price: number; sell_date: string; cost: number; model: string };

function getPrevPeriod(dateFrom?: string, dateTo?: string): { prevFrom: string; prevTo: string; label: string } {
  if (dateFrom && dateTo) {
    const from = new Date(dateFrom + "T00:00:00");
    const to = new Date(dateTo + "T00:00:00");
    const durationMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    const fmt = (d: Date) => d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    return { prevFrom: prevFrom.toISOString().slice(0, 10), prevTo: prevTo.toISOString().slice(0, 10), label: `${fmt(prevFrom)}–${fmt(prevTo)}` };
  }
  const now = new Date();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const label = firstOfLastMonth.toLocaleDateString("th-TH", { month: "long" });
  return { prevFrom: firstOfLastMonth.toISOString().slice(0, 10), prevTo: lastOfLastMonth.toISOString().slice(0, 10), label };
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return Math.round(((curr - prev) / Math.abs(prev)) * 1000) / 10;
}

function normFromRequest(r: { sell_price: number; sell_date: string; actual_price?: number; estimated_price?: number; device_model?: string }): NormSoldItem {
  return { sell_price: r.sell_price, sell_date: r.sell_date, cost: r.actual_price ?? r.estimated_price ?? 0, model: r.device_model ?? "Unknown" };
}

function normFromStock(s: { sold_price: number; sold_at: string; cost_price?: number; shipping_cost?: number; other_cost?: number; model?: string }): NormSoldItem {
  return { sell_price: s.sold_price, sell_date: s.sold_at.slice(0, 10), cost: (s.cost_price ?? 0) + (s.shipping_cost ?? 0) + (s.other_cost ?? 0), model: s.model ?? "Unknown" };
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
      .select("id, model, cost_price, shipping_cost, other_cost, sold_price, sold_at")
      .eq("status", "ขายแล้ว")
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
  const totalExpenses = approvedExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
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
  const prevExpenses = prevApprovedExp.reduce((s, e) => s + (e.amount ?? 0), 0);
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

export async function fetchFinanceIncome(): Promise<FinanceIncome[]> {
  await requireAuth();
  const supabase = createServerClient();
  const [{ data }, { data: directData }, { data: buyerData }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, order_number, device_model, device_storage, actual_price, estimated_price, sell_price, sell_date, source")
      .eq("status", "completed")
      .eq("stock_status", "sold")
      .not("sell_price", "is", null)
      .not("sell_date", "is", null)
      .order("sell_date", { ascending: false }),
    supabase
      .from("stocks")
      .select("id, model, storage, cost_price, shipping_cost, other_cost, sold_price, sold_at, buyer_name, sale_type")
      .eq("status", "ขายแล้ว")
      .is("request_ref", null)
      .not("sold_price", "is", null)
      .not("sold_at", "is", null),
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
    const cost = (s.cost_price ?? 0) + (s.shipping_cost ?? 0) + (s.other_cost ?? 0);
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

export async function fetchFinancePurchases(): Promise<FinancePurchase[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("id, order_number, device_model, device_storage, actual_price, estimated_price, sell_price, stock_status, customer_name, source, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false });

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
  }));
}

export async function fetchFinanceProfitByModel(): Promise<{
  kpi: { totalRevenue: number; totalCost: number; netProfit: number; margin: number };
  byModel: FinanceProfitByModel[];
}> {
  await requireAuth();
  const supabase = createServerClient();
  const [{ data }, { data: directData }] = await Promise.all([
    supabase
      .from("requests")
      .select("device_model, actual_price, estimated_price, sell_price")
      .eq("status", "completed")
      .eq("stock_status", "sold")
      .not("sell_price", "is", null),
    supabase
      .from("stocks")
      .select("model, cost_price, shipping_cost, other_cost, sold_price")
      .eq("status", "ขายแล้ว")
      .is("request_ref", null)
      .not("sold_price", "is", null),
  ]);

  type Entry = { model: string; cost: number; sell: number };
  const entries: Entry[] = [
    ...(data ?? []).map((r) => ({ model: r.device_model ?? "Unknown", cost: r.actual_price ?? r.estimated_price ?? 0, sell: r.sell_price ?? 0 })),
    ...(directData ?? []).map((s) => ({ model: s.model ?? "Unknown", cost: (s.cost_price ?? 0) + (s.shipping_cost ?? 0) + (s.other_cost ?? 0), sell: s.sold_price ?? 0 })),
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

export async function fetchFinanceCashFlow(): Promise<{
  summary: FinanceCashFlowSummary;
  entries: FinanceCashFlowEntry[];
}> {
  await requireAuth();
  const supabase = createServerClient();

  const [{ data: purchases }, { data: sales }, { data: directBuys }, { data: directSales }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, order_number, device_model, actual_price, estimated_price, customer_name, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: true }),
    supabase
      .from("requests")
      .select("id, order_number, device_model, sell_price, sell_date")
      .eq("status", "completed")
      .eq("stock_status", "sold")
      .not("sell_price", "is", null)
      .not("sell_date", "is", null)
      .order("sell_date", { ascending: true }),
    supabase
      .from("stocks")
      .select("id, model, cost_price, shipping_cost, other_cost, received_at, created_at")
      .is("request_ref", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("stocks")
      .select("id, model, sold_price, sold_at")
      .eq("status", "ขายแล้ว")
      .is("request_ref", null)
      .not("sold_price", "is", null)
      .not("sold_at", "is", null),
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
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleString("th-TH", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
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


export async function fetchFinanceAudit(): Promise<FinanceAuditEntry[]> {
  await requireAuth();
  const supabase = createServerClient();
  const [{ data }, { data: expenseLogs }] = await Promise.all([
    supabase
      .from("requests")
      .select("id, order_number, device_model, status_log, stock_status, sell_date, sell_price, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("finance_audit_logs")
      .select("*")
      .order("datetime", { ascending: false })
      .limit(200),
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
  createdAt: string;
};

export async function fetchExpenses(): Promise<Expense[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });
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
  data: { date: string; product: string; category: string; amount: number; status: ExpenseStatus; notes: string },
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: existing } = await supabase.from("expenses").select("ref_number").eq("id", id).single();
  const { error } = await supabase
    .from("expenses")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  insertAuditLog({
    action: `แก้ไขรายจ่าย: ${data.product}`,
    refNumber: existing?.ref_number ?? id,
    afterVal: `฿${data.amount.toLocaleString("th-TH")} · ${data.status}`,
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
  const { error } = await supabase.from("finance_settings").update({
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
  }).eq("id", 1);
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
