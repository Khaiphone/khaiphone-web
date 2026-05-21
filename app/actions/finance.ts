"use server";

import { createServerClient } from "@/lib/supabase-server";

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
  stockValue: number;
  soldCount: number;
  purchaseCount: number;
  revenueByMonth: { date: string; revenue: number; cost: number }[];
  profitByMonth: { date: string; profit: number }[];
  topModels: { model: string; profit: number }[];
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

export async function fetchFinanceDashboard(): Promise<FinanceDashboard> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("id, device_model, actual_price, estimated_price, sell_price, sell_date, stock_status, created_at")
    .eq("status", "completed");

  const rows = data ?? [];
  const soldItems = rows.filter((r) => r.stock_status === "sold" && r.sell_price != null && r.sell_date != null);
  const unsoldItems = rows.filter((r) => r.stock_status !== "sold");

  const totalRevenue = soldItems.reduce((s, r) => s + (r.sell_price ?? 0), 0);
  const totalCost = soldItems.reduce((s, r) => s + (r.actual_price ?? r.estimated_price ?? 0), 0);
  const netProfit = totalRevenue - totalCost;
  const stockValue = unsoldItems.reduce((s, r) => s + (r.actual_price ?? r.estimated_price ?? 0), 0);

  const monthMap = new Map<string, { revenue: number; cost: number }>();
  for (const r of soldItems) {
    const key = monthKey(r.sell_date!);
    const prev = monthMap.get(key) ?? { revenue: 0, cost: 0 };
    monthMap.set(key, {
      revenue: prev.revenue + (r.sell_price ?? 0),
      cost: prev.cost + (r.actual_price ?? r.estimated_price ?? 0),
    });
  }
  const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const revenueByMonth = sortedMonths.map(([k, v]) => ({ date: monthLabel(k), revenue: v.revenue, cost: v.cost }));
  const profitByMonth = sortedMonths.map(([k, v]) => ({ date: monthLabel(k), profit: v.revenue - v.cost }));

  const modelProfitMap = new Map<string, number>();
  for (const r of soldItems) {
    const model = r.device_model ?? "Unknown";
    const profit = (r.sell_price ?? 0) - (r.actual_price ?? r.estimated_price ?? 0);
    modelProfitMap.set(model, (modelProfitMap.get(model) ?? 0) + profit);
  }
  const topModels = Array.from(modelProfitMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([model, profit]) => ({ model, profit }));

  return {
    totalRevenue,
    totalCost,
    netProfit,
    stockValue,
    soldCount: soldItems.length,
    purchaseCount: rows.length,
    revenueByMonth,
    profitByMonth,
    topModels,
  };
}

export async function fetchFinanceIncome(): Promise<FinanceIncome[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("id, order_number, device_model, device_storage, actual_price, estimated_price, sell_price, sell_date, customer_name, source")
    .eq("status", "completed")
    .eq("stock_status", "sold")
    .not("sell_price", "is", null)
    .not("sell_date", "is", null)
    .order("sell_date", { ascending: false });

  return (data ?? []).map((row) => {
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
      customerName: row.customer_name ?? "",
      source: row.source ?? "",
    };
  });
}

export async function fetchFinancePurchases(): Promise<FinancePurchase[]> {
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
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("device_model, actual_price, estimated_price, sell_price")
    .eq("status", "completed")
    .eq("stock_status", "sold")
    .not("sell_price", "is", null);

  const rows = data ?? [];
  const modelMap = new Map<string, { costs: number[]; sells: number[] }>();

  for (const row of rows) {
    const model = row.device_model ?? "Unknown";
    const cost = row.actual_price ?? row.estimated_price ?? 0;
    const sell = row.sell_price ?? 0;
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

  const totalRevenue = rows.reduce((s, r) => s + (r.sell_price ?? 0), 0);
  const totalCost = rows.reduce((s, r) => s + (r.actual_price ?? r.estimated_price ?? 0), 0);
  const netProfit = totalRevenue - totalCost;
  const margin = totalRevenue === 0 ? 0 : Math.round((netProfit / totalRevenue) * 1000) / 10;

  return { kpi: { totalRevenue, totalCost, netProfit, margin }, byModel };
}

export async function fetchFinanceCashFlow(): Promise<{
  summary: FinanceCashFlowSummary;
  entries: FinanceCashFlowEntry[];
}> {
  const supabase = createServerClient();

  const [{ data: purchases }, { data: sales }] = await Promise.all([
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
    ...(sales ?? []).map((row) => ({
      id: `sell-${row.id}`,
      datetime: row.sell_date + "T12:00:00",
      description: `ขาย ${row.device_model ?? ""} · ${row.order_number ?? ""}`,
      entryType: "in" as const,
      amount: row.sell_price ?? 0,
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
