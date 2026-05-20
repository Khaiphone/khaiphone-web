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
    photos: input.photos ?? [], notes: [], status_log: statusLog,
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
