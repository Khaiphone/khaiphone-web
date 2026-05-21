"use server";

import { createServerClient } from "@/lib/supabase-server";
import type { StockItem, StockStatus } from "@/lib/stock/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): StockItem {
  return {
    id: row.id,
    model: row.model,
    storage: row.storage ?? "",
    color: row.color ?? "",
    imei: row.imei ?? "",
    serial: row.serial ?? "",
    grade: row.grade ?? "A",
    batteryHealth: row.battery_health ?? 0,
    cycleCount: row.cycle_count ?? 0,
    icloudStatus: row.icloud_status ?? "",
    carrierLock: row.carrier_lock ?? "",
    accessories: row.accessories ?? "",
    physicalChecks: row.physical_checks ?? [],
    costPrice: row.cost_price ?? 0,
    shippingCost: row.shipping_cost ?? 0,
    otherCost: row.other_cost ?? 0,
    sellingPrice: row.selling_price ?? 0,
    status: row.status as StockStatus,
    sourceChannel: row.source_channel ?? "หน้าร้าน",
    requestRef: row.request_ref ?? undefined,
    sellerName: row.seller_name ?? "",
    sellerPhone: row.seller_phone ?? "",
    receivedAt: row.received_at ?? "",
    inspector: row.inspector ?? "",
    photos: row.photos ?? [],
    documents: row.documents ?? [],
    notes: row.notes ?? [],
    statusLog: row.status_log ?? [],
    soldAt: row.sold_at ?? undefined,
    soldPrice: row.sold_price ?? undefined,
    buyerName: row.buyer_name ?? undefined,
    buyerPhone: row.buyer_phone ?? undefined,
    inspectionSnapshot: row.inspection_snapshot ?? undefined,
  };
}

export async function fetchStockItems(): Promise<StockItem[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("stocks")
    .select("*")
    .order("received_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapRow);
}

export async function fetchStockItem(id: string): Promise<StockItem | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("stocks").select("*").eq("id", id).single();
  if (error || !data) return null;
  return mapRow(data);
}

export async function createStockItem(input: Omit<StockItem, "notes" | "statusLog" | "photos"> & { photos?: string[] }): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const { count } = await supabase.from("stocks").select("*", { count: "exact", head: true });
  const id = `STK-${year}-${String((count ?? 0) + 1).padStart(5, "0")}`;
  const statusLog = [{ status: input.status, timestamp: now, note: "บันทึกเข้าสต็อก", by: "admin" }];

  const { error } = await supabase.from("stocks").insert({
    id, model: input.model, storage: input.storage, color: input.color,
    imei: input.imei, serial: input.serial, grade: input.grade,
    battery_health: input.batteryHealth, cycle_count: input.cycleCount,
    icloud_status: input.icloudStatus, carrier_lock: input.carrierLock,
    accessories: input.accessories, physical_checks: input.physicalChecks ?? [],
    cost_price: input.costPrice, shipping_cost: input.shippingCost, other_cost: input.otherCost,
    selling_price: input.sellingPrice, status: input.status, source_channel: input.sourceChannel,
    request_ref: input.requestRef ?? null, seller_name: input.sellerName, seller_phone: input.sellerPhone,
    received_at: input.receivedAt || now, inspector: input.inspector,
    photos: input.photos ?? [], documents: [], notes: [], status_log: statusLog,
    created_at: now, updated_at: now,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, id };
}

export async function updateStockStatus(
  id: string, status: StockStatus, note: string, by = "admin",
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const { data: current } = await supabase.from("stocks").select("status_log").eq("id", id).single();
  const newLog = [...(current?.status_log ?? []), { status, timestamp: new Date().toISOString(), note, by }];
  const { error } = await supabase.from("stocks")
    .update({ status, status_log: newLog, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateStockPrice(id: string, sellingPrice: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const { error } = await supabase.from("stocks")
    .update({ selling_price: sellingPrice, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Confirm a cross-checked field value — "inspection" keeps snapshot value, "stock" keeps current stock value
export async function verifyStockField(
  id: string,
  field: "imei" | "serial" | "model" | "storage" | "color",
  chosenSource: "inspection" | "stock",
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  if (chosenSource === "inspection") {
    // Update the stock field to match the inspection snapshot value
    const { data: current } = await supabase.from("stocks").select("inspection_snapshot").eq("id", id).single();
    const snap = current?.inspection_snapshot;
    if (!snap || snap[field] === null) return { success: false, error: "ไม่มีค่าจากการตรวจ" };
    const { error } = await supabase.from("stocks").update({ [field]: snap[field], updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { success: false, error: error.message };
  }
  // if chosenSource === "stock", current value is already correct — just mark verified in snapshot
  const { data: current } = await supabase.from("stocks").select("inspection_snapshot").eq("id", id).single();
  const snap = current?.inspection_snapshot ?? {};
  const updatedSnap = { ...snap, [`${field}_verified`]: true, [`${field}_verified_source`]: chosenSource };
  const { error } = await supabase.from("stocks").update({ inspection_snapshot: updatedSnap, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function markStockSold(
  id: string, soldPrice: number, buyerName: string, buyerPhone: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("stocks").select("status_log").eq("id", id).single();
  const newLog = [...(current?.status_log ?? []), { status: "ขายแล้ว", timestamp: now, note: `ขายให้ ${buyerName}`, by: "admin" }];
  const { error } = await supabase.from("stocks").update({
    status: "ขายแล้ว", sold_at: now, sold_price: soldPrice,
    buyer_name: buyerName, buyer_phone: buyerPhone,
    status_log: newLog, updated_at: now,
  }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export interface RevenuePoint { date: string; revenue: number; cost: number; profit: number; }
export interface CategoryPoint { name: string; count: number; value: number; }

export async function fetchRevenueData(): Promise<RevenuePoint[]> {
  const supabase = createServerClient();
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("stocks")
    .select("sold_at, sold_price, cost_price, shipping_cost, other_cost")
    .eq("status", "ขายแล้ว")
    .gte("sold_at", since.toISOString());

  const map = new Map<string, { revenue: number; cost: number }>();
  // pre-fill all 30 days so chart has no gaps
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    map.set(key, { revenue: 0, cost: 0 });
  }

  for (const row of data ?? []) {
    const d = new Date(row.sold_at);
    const key = `${d.getDate()}/${d.getMonth() + 1}`;
    if (map.has(key)) {
      const cur = map.get(key)!;
      cur.revenue += row.sold_price ?? 0;
      cur.cost += (row.cost_price ?? 0) + (row.shipping_cost ?? 0) + (row.other_cost ?? 0);
    }
  }

  return Array.from(map.entries()).map(([date, { revenue, cost }]) => ({
    date, revenue, cost, profit: revenue - cost,
  }));
}

export async function fetchCategoryData(): Promise<CategoryPoint[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("model, selling_price, status");

  const map = new Map<string, { count: number; value: number }>();
  for (const row of data ?? []) {
    // extract series: "iPhone 15 Pro Max" → "iPhone 15 Series"
    const match = row.model?.match(/iPhone\s+(\d+)/i);
    const series = match ? `iPhone ${match[1]} Series` : (row.model ?? "อื่นๆ");
    if (!map.has(series)) map.set(series, { count: 0, value: 0 });
    const cur = map.get(series)!;
    if (row.status !== "ขายแล้ว" && row.status !== "ส่งคืน" && row.status !== "ตีกลับ/ไม่รับซื้อ") {
      cur.count += 1;
      cur.value += row.selling_price ?? 0;
    }
  }

  return Array.from(map.entries())
    .map(([name, { count, value }]) => ({ name, count, value }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

// ─── Sales page ──────────────────────────────────────────────────────────────

export interface SoldItem {
  id: string;
  model: string;
  storage: string;
  color: string;
  grade: string;
  costPrice: number;
  shippingCost: number;
  otherCost: number;
  soldPrice: number;
  profit: number;
  soldAt: string;
  buyerName: string;
  buyerPhone: string;
  sourceChannel: string;
  requestRef: string | null;
}

export async function fetchSoldItems(): Promise<SoldItem[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("id, model, storage, color, grade, cost_price, shipping_cost, other_cost, sold_price, sold_at, buyer_name, buyer_phone, source_channel, request_ref")
    .eq("status", "ขายแล้ว")
    .order("sold_at", { ascending: false });

  return (data ?? []).map(row => {
    const cost = (row.cost_price ?? 0) + (row.shipping_cost ?? 0) + (row.other_cost ?? 0);
    return {
      id: row.id,
      model: row.model ?? "",
      storage: row.storage ?? "",
      color: row.color ?? "",
      grade: row.grade ?? "",
      costPrice: row.cost_price ?? 0,
      shippingCost: row.shipping_cost ?? 0,
      otherCost: row.other_cost ?? 0,
      soldPrice: row.sold_price ?? 0,
      profit: (row.sold_price ?? 0) - cost,
      soldAt: row.sold_at ?? "",
      buyerName: row.buyer_name ?? "",
      buyerPhone: row.buyer_phone ?? "",
      sourceChannel: row.source_channel ?? "",
      requestRef: row.request_ref ?? null,
    };
  });
}

// ─── Customers page ───────────────────────────────────────────────────────────

export interface StockCustomer {
  name: string;
  phone: string;
  totalItems: number;
  totalPaid: number;
  avgPrice: number;
  lastSeen: string;
  channel: string;
}

export async function fetchStockCustomers(): Promise<StockCustomer[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("seller_name, seller_phone, cost_price, source_channel, received_at")
    .not("seller_phone", "is", null)
    .neq("seller_phone", "");

  const map = new Map<string, { name: string; channel: string; totalPaid: number; count: number; lastSeen: string }>();
  for (const row of data ?? []) {
    const phone = row.seller_phone ?? "";
    if (!phone) continue;
    if (!map.has(phone)) {
      map.set(phone, { name: row.seller_name ?? "", channel: row.source_channel ?? "", totalPaid: 0, count: 0, lastSeen: row.received_at ?? "" });
    }
    const cur = map.get(phone)!;
    cur.totalPaid += row.cost_price ?? 0;
    cur.count += 1;
    if ((row.received_at ?? "") > cur.lastSeen) cur.lastSeen = row.received_at ?? "";
    if (!cur.name && row.seller_name) cur.name = row.seller_name;
  }

  return Array.from(map.entries())
    .map(([phone, { name, channel, totalPaid, count, lastSeen }]) => ({
      name: name || "ไม่ระบุชื่อ",
      phone,
      totalItems: count,
      totalPaid,
      avgPrice: count > 0 ? Math.round(totalPaid / count) : 0,
      lastSeen,
      channel,
    }))
    .sort((a, b) => b.totalItems - a.totalItems);
}

// ─── Reports page ─────────────────────────────────────────────────────────────

export interface MonthlyReport {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

export interface ModelReport {
  model: string;
  count: number;
  totalRevenue: number;
  totalProfit: number;
  avgProfit: number;
}

export interface StockReportData {
  monthly: MonthlyReport[];
  byModel: ModelReport[];
  byGrade: { grade: string; count: number; avgProfit: number }[];
  byChannel: { channel: string; count: number; revenue: number }[];
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
}

export async function fetchStockReportData(): Promise<StockReportData> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("model, grade, source_channel, cost_price, shipping_cost, other_cost, sold_price, sold_at, status");

  const sold = (data ?? []).filter(r => r.status === "ขายแล้ว" && r.sold_at);

  // Monthly (last 12 months)
  const monthMap = new Map<string, MonthlyReport>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
    monthMap.set(key, { month: label, revenue: 0, cost: 0, profit: 0, count: 0 });
  }
  for (const row of sold) {
    const d = new Date(row.sold_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthMap.has(key)) {
      const m = monthMap.get(key)!;
      const cost = (row.cost_price ?? 0) + (row.shipping_cost ?? 0) + (row.other_cost ?? 0);
      m.revenue += row.sold_price ?? 0;
      m.cost += cost;
      m.profit += (row.sold_price ?? 0) - cost;
      m.count += 1;
    }
  }

  // By model
  const modelMap = new Map<string, { count: number; totalRevenue: number; totalProfit: number }>();
  for (const row of sold) {
    const model = row.model ?? "ไม่ระบุ";
    if (!modelMap.has(model)) modelMap.set(model, { count: 0, totalRevenue: 0, totalProfit: 0 });
    const m = modelMap.get(model)!;
    const cost = (row.cost_price ?? 0) + (row.shipping_cost ?? 0) + (row.other_cost ?? 0);
    m.count += 1;
    m.totalRevenue += row.sold_price ?? 0;
    m.totalProfit += (row.sold_price ?? 0) - cost;
  }

  // By grade
  const gradeMap = new Map<string, { count: number; totalProfit: number }>();
  for (const row of sold) {
    const grade = row.grade ?? "A";
    if (!gradeMap.has(grade)) gradeMap.set(grade, { count: 0, totalProfit: 0 });
    const m = gradeMap.get(grade)!;
    const cost = (row.cost_price ?? 0) + (row.shipping_cost ?? 0) + (row.other_cost ?? 0);
    m.count += 1;
    m.totalProfit += (row.sold_price ?? 0) - cost;
  }

  // By channel
  const channelMap = new Map<string, { count: number; revenue: number }>();
  for (const row of sold) {
    const ch = row.source_channel ?? "ไม่ระบุ";
    if (!channelMap.has(ch)) channelMap.set(ch, { count: 0, revenue: 0 });
    const m = channelMap.get(ch)!;
    m.count += 1;
    m.revenue += row.sold_price ?? 0;
  }

  const totalRevenue = sold.reduce((a, r) => a + (r.sold_price ?? 0), 0);
  const totalProfit = sold.reduce((a, r) => {
    const cost = (r.cost_price ?? 0) + (r.shipping_cost ?? 0) + (r.other_cost ?? 0);
    return a + (r.sold_price ?? 0) - cost;
  }, 0);

  return {
    monthly: Array.from(monthMap.values()),
    byModel: Array.from(modelMap.entries())
      .map(([model, { count, totalRevenue: tr, totalProfit: tp }]) => ({ model, count, totalRevenue: tr, totalProfit: tp, avgProfit: count > 0 ? Math.round(tp / count) : 0 }))
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10),
    byGrade: Array.from(gradeMap.entries())
      .map(([grade, { count, totalProfit: tp }]) => ({ grade, count, avgProfit: count > 0 ? Math.round(tp / count) : 0 }))
      .sort((a, b) => b.count - a.count),
    byChannel: Array.from(channelMap.entries())
      .map(([channel, { count, revenue }]) => ({ channel, count, revenue }))
      .sort((a, b) => b.count - a.count),
    totalSold: sold.length,
    totalRevenue,
    totalProfit,
  };
}

export async function updateStockItem(
  id: string,
  updates: {
    model?: string; storage?: string; color?: string; grade?: string;
    batteryHealth?: number; cycleCount?: number; icloudStatus?: string;
    carrierLock?: string; accessories?: string;
    costPrice?: number; shippingCost?: number; otherCost?: number; sellingPrice?: number;
    sellerName?: string; sellerPhone?: string; sourceChannel?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const fieldMap: Record<string, string> = {
    model: "model", storage: "storage", color: "color", grade: "grade",
    batteryHealth: "battery_health", cycleCount: "cycle_count",
    icloudStatus: "icloud_status", carrierLock: "carrier_lock", accessories: "accessories",
    costPrice: "cost_price", shippingCost: "shipping_cost", otherCost: "other_cost",
    sellingPrice: "selling_price", sellerName: "seller_name", sellerPhone: "seller_phone",
    sourceChannel: "source_channel",
  };
  const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [camel, snake] of Object.entries(fieldMap)) {
    const val = updates[camel as keyof typeof updates];
    if (val !== undefined) mapped[snake] = val;
  }
  const { error } = await supabase.from("stocks").update(mapped).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateStockPhotos(id: string, photos: string[]): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const { error } = await supabase.from("stocks").update({ photos, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateStockDocuments(id: string, documents: string[]): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const { error } = await supabase.from("stocks").update({ documents, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteStockItem(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const { error } = await supabase.from("stocks").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
