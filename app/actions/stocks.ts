"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import type { StockItem, StockStatus, AuditEntry, StockCountSession, StockCountMissingItem } from "@/lib/stock/types";
import { thaiDateStr, thaiMonthStr, thaiDateOffset, startOfThaiDay } from "@/lib/thai-date";

const FIELD_LABELS: Record<string, string> = {
  model: "รุ่น", storage: "ความจุ", color: "สี", grade: "เกรด",
  battery_health: "Battery Health", cycle_count: "Cycle Count",
  icloud_status: "iCloud", carrier_lock: "Carrier Lock", accessories: "อุปกรณ์",
  cost_price: "ราคารับซื้อ", shipping_cost: "ค่าส่ง", other_cost: "ค่าอื่นๆ",
  selling_price: "ราคาขาย", seller_name: "ชื่อผู้ขาย", seller_phone: "เบอร์โทร",
  source_channel: "ช่องทาง",
};

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
    slipUrls: row.slip_urls ?? [],
    documents: row.documents ?? [],
    notes: row.notes ?? [],
    statusLog: row.status_log ?? [],
    auditLog: row.audit_log ?? [],
    soldAt: row.sold_at ?? undefined,
    soldPrice: row.sold_price ?? undefined,
    buyerName: row.buyer_name ?? undefined,
    buyerPhone: row.buyer_phone ?? undefined,
    soldBy: row.sold_by ?? undefined,
    saleType: row.sale_type ?? "ขายปลีก",
    partnerName: row.partner_name ?? undefined,
    deliveryChannel: row.delivery_channel ?? undefined,
    deliveryStatus: row.delivery_status ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    deliveryAddress: row.delivery_address ?? undefined,
    inspectionSnapshot: row.inspection_snapshot ?? undefined,
  };
}

export async function checkImeiExists(imei: string): Promise<{ exists: boolean; stockId?: string; model?: string; status?: string }> {
  await requireAuth();
  if (!imei || imei.length < 10) return { exists: false };
  const supabase = createServerClient();
  const { data } = await supabase.from("stocks").select("id, model, status").eq("imei", imei.trim()).maybeSingle();
  if (!data) return { exists: false };
  return { exists: true, stockId: data.id, model: data.model, status: data.status };
}

export async function fetchStockItems(): Promise<StockItem[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("stocks")
    .select("*")
    .order("received_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapRow);
}

export async function fetchStockItem(id: string): Promise<StockItem | null> {
  await requireAuth();
  const supabase = createServerClient();
  const { data, error } = await supabase.from("stocks").select("*").eq("id", id).single();
  if (error || !data) return null;
  return mapRow(data);
}

export async function createStockItem(input: Omit<StockItem, "notes" | "statusLog" | "photos"> & { photos?: string[] }): Promise<{ success: true; id: string } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const year = new Date().getFullYear();
  const { data: lastRow } = await supabase
    .from("stocks")
    .select("id")
    .like("id", `STK-${year}-%`)
    .order("id", { ascending: false })
    .limit(1);
  const lastSeq = lastRow?.[0]?.id ? parseInt(lastRow[0].id.split("-")[2], 10) : 0;
  const id = `STK-${year}-${String(lastSeq + 1).padStart(5, "0")}`;
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
    audit_log: [{ action: "บันทึกเข้าสต็อก", detail: `รับซื้อจาก ${input.sellerName}`, timestamp: now, by: "admin" }],
    created_at: now, updated_at: now,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, id };
}

export async function updateStockStatus(
  id: string, status: StockStatus, note: string, by = "admin",
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("stocks").select("status, status_log, audit_log").eq("id", id).single();
  const newStatusLog = [...(current?.status_log ?? []), { status, timestamp: now, note, by }];
  const detail = current?.status ? `${current.status} → ${status}${note ? ` (${note})` : ""}` : status;
  const newAuditLog: AuditEntry[] = [...(current?.audit_log ?? []), { action: "เปลี่ยนสถานะ", detail, timestamp: now, by }];
  const { error } = await supabase.from("stocks")
    .update({ status, status_log: newStatusLog, audit_log: newAuditLog, updated_at: now }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateStockPrice(id: string, sellingPrice: number): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("stocks").select("selling_price, audit_log").eq("id", id).single();
  const oldPrice = current?.selling_price ?? 0;
  const newAuditLog: AuditEntry[] = [...(current?.audit_log ?? []), {
    action: "เปลี่ยนราคาขาย",
    detail: `฿${oldPrice.toLocaleString("th-TH")} → ฿${sellingPrice.toLocaleString("th-TH")}`,
    timestamp: now, by: "admin",
  }];
  const { error } = await supabase.from("stocks")
    .update({ selling_price: sellingPrice, audit_log: newAuditLog, updated_at: now }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// Confirm a cross-checked field value — "inspection" keeps snapshot value, "stock" keeps current stock value
export async function verifyStockField(
  id: string,
  field: "imei" | "serial" | "model" | "storage" | "color",
  chosenSource: "inspection" | "stock",
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
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
  soldAt?: string, soldBy?: string, saleType?: string, partnerName?: string,
  deliveryChannel?: string, slipUrls?: string[], trackingNumber?: string, deliveryAddress?: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const soldAtTs = soldAt ?? now.slice(0, 10);
  const { data: current } = await supabase.from("stocks").select("status_log, request_ref, cost_price, shipping_cost, other_cost").eq("id", id).single();
  const note = saleType === "ขายส่ง" && partnerName ? `ขายส่งให้ ${partnerName}` : `ขายให้ ${buyerName}`;
  const newLog = [...(current?.status_log ?? []), { status: "ขายแล้ว", timestamp: now, note, by: soldBy ?? "admin" }];
  // deliveryChannel being set means user chose "จัดส่งแล้ว" — always mark as delivered
  const autoDeliveryStatus = deliveryChannel ? "จัดส่งแล้ว" : "รอจัดส่ง";
  const { error } = await supabase.from("stocks").update({
    status: "ขายแล้ว", sold_at: soldAtTs, sold_price: soldPrice,
    // snapshot COGS at time of sale — used for historical P&L accuracy after any future cost changes
    sold_cost_snapshot: (current?.cost_price ?? 0) + (current?.shipping_cost ?? 0) + (current?.other_cost ?? 0),
    buyer_name: buyerName, buyer_phone: buyerPhone,
    sold_by: soldBy ?? null, sale_type: saleType ?? "ขายปลีก", partner_name: partnerName ?? null,
    delivery_channel: deliveryChannel ?? null,
    delivery_status: autoDeliveryStatus,
    delivery_address: deliveryAddress?.trim() || undefined,
    tracking_number: trackingNumber?.trim() || undefined,
    slip_urls: slipUrls && slipUrls.length > 0 ? slipUrls : undefined,
    status_log: newLog, updated_at: now,
  }).eq("id", id);
  if (error) return { success: false, error: error.message };

  // Sync sale data back to requests table so finance dashboard picks it up
  if (current?.request_ref) {
    await supabase.from("requests").update({
      sell_price: soldPrice,
      sell_date: soldAtTs.slice(0, 10),
      stock_status: "sold",
    }).eq("order_number", current.request_ref);
  }

  return { success: true };
}

export async function confirmDelivery(
  id: string, trackingNumber?: string, deliveryChannel?: string, deliveryAddress?: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("stocks").select("status_log, audit_log").eq("id", id).single();
  const channelLabel = deliveryChannel === "ส่งพัสดุ" ? "ส่งพัสดุ" : deliveryChannel === "ส่งถึงที่" ? "ส่งถึงที่" : "หน้าร้าน";
  const note = trackingNumber ? `จัดส่งแล้ว (${trackingNumber})` : deliveryAddress ? `จัดส่งแล้ว · ${deliveryAddress}` : `จัดส่งแล้ว · ${channelLabel}`;
  const newStatusLog = [...(current?.status_log ?? []), { status: "ขายแล้ว", timestamp: now, note, by: "admin" }];
  const newAuditLog: AuditEntry[] = [...(current?.audit_log ?? []), {
    action: "ยืนยันจัดส่ง",
    detail: [channelLabel, deliveryAddress, trackingNumber ? `tracking: ${trackingNumber}` : ""].filter(Boolean).join(" · "),
    timestamp: now, by: "admin",
  }];
  const update: Record<string, unknown> = {
    delivery_status: "จัดส่งแล้ว", status_log: newStatusLog, audit_log: newAuditLog, updated_at: now,
  };
  if (trackingNumber) update.tracking_number = trackingNumber;
  if (deliveryChannel) update.delivery_channel = deliveryChannel;
  if (deliveryAddress) update.delivery_address = deliveryAddress;
  const { error } = await supabase.from("stocks").update(update).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchStockStaff(): Promise<string[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase.from("admin_users").select("name").order("name");
  return (data ?? []).map((r: { name: string }) => r.name).filter(Boolean);
}

export async function fetchWholesalePartners(): Promise<{ name: string; phone: string }[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase.from("partners").select("name, phone").order("name");
  return (data ?? []).filter((r: { name: string }) => r.name).map((r: { name: string; phone?: string }) => ({ name: r.name, phone: r.phone ?? "" }));
}

export async function confirmStockRecheck(
  id: string,
  data: {
    imei: string;
    serial: string;
    grade: string;
    batteryHealth: number;
    cycleCount: number;
    inspector: string;
    note?: string;
    recheckCriteria?: { label: string; stockActual: string; pass: boolean }[];
    recheckFunctionalTests?: { label: string; pass: boolean }[];
  },
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: current } = await supabase
    .from("stocks")
    .select("status_log, audit_log, notes, inspection_snapshot")
    .eq("id", id)
    .single();

  const newStatusLog = [
    ...(current?.status_log ?? []),
    { status: "พร้อมขาย", timestamp: now, note: `ผ่านการรีเช็คโดย ${data.inspector}`, by: data.inspector },
  ];
  const newAuditLog: AuditEntry[] = [
    ...(current?.audit_log ?? []),
    {
      action: "รีเช็คสินค้า",
      detail: `เกรด ${data.grade} · Battery ${data.batteryHealth}% · Cycles ${data.cycleCount}${data.note ? ` · ${data.note}` : ""}`,
      timestamp: now,
      by: data.inspector,
    },
  ];
  const newNotes = data.note
    ? [...(current?.notes ?? []), { text: `[รีเช็ค] ${data.note}`, createdAt: now, by: data.inspector }]
    : current?.notes ?? [];

  // Rebuild physical_checks from stock team recheck (don't touch original criteria)
  const newPhysicalChecks = [
    ...(data.recheckCriteria ?? []).map(c => ({ label: c.label, condition: c.pass ? "ปกติ" : (c.stockActual?.trim() || "มีตำหนิ") })),
    ...(data.recheckFunctionalTests ?? []).map(t => ({ label: t.label, condition: t.pass ? "ปกติ" : "มีปัญหา" })),
  ];

  // Keep original criteria/functionalTests untouched; store recheck results separately
  const updatedSnapshot = {
    ...(current?.inspection_snapshot ?? {}),
    recheckCriteria:        data.recheckCriteria        ?? [],
    recheckFunctionalTests: data.recheckFunctionalTests ?? [],
    recheckBy:              data.inspector,
    recheckAt:              now,
  };

  const { error } = await supabase.from("stocks").update({
    imei:                data.imei,
    serial:              data.serial,
    grade:               data.grade,
    battery_health:      data.batteryHealth,
    cycle_count:         data.cycleCount,
    inspector:           data.inspector,
    physical_checks:     newPhysicalChecks.length > 0 ? newPhysicalChecks : undefined,
    inspection_snapshot: updatedSnapshot,
    status:              "พร้อมขาย",
    status_log:          newStatusLog,
    audit_log:           newAuditLog,
    notes:               newNotes,
    updated_at:          now,
  }).eq("id", id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export interface RevenuePoint { date: string; revenue: number; cost: number; profit: number; }
export interface CategoryPoint { name: string; count: number; value: number; }

export async function fetchRevenueData(): Promise<RevenuePoint[]> {
  await requireAuth();
  const supabase = createServerClient();
  const todayRevStr = thaiDateStr();
  const sinceRevStr = thaiDateOffset(todayRevStr, -29);

  const { data } = await supabase
    .from("stocks")
    .select("sold_at, sold_price, cost_price, shipping_cost, other_cost")
    .eq("status", "ขายแล้ว")
    .gte("sold_at", startOfThaiDay(sinceRevStr));

  const map = new Map<string, { revenue: number; cost: number }>();
  // pre-fill all 30 days so chart has no gaps
  for (let i = 0; i < 30; i++) {
    const ds = thaiDateOffset(sinceRevStr, i);
    const [, m, day] = ds.split("-");
    const key = `${parseInt(day)}/${parseInt(m)}`;
    map.set(key, { revenue: 0, cost: 0 });
  }

  for (const row of data ?? []) {
    const ds = thaiDateStr(new Date(row.sold_at));
    const [, m, day] = ds.split("-");
    const key = `${parseInt(day)}/${parseInt(m)}`;
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
  await requireAuth();
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
  await requireAuth();
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
  await requireAuth();
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
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("model, grade, source_channel, cost_price, shipping_cost, other_cost, sold_price, sold_at, status");

  const sold = (data ?? []).filter(r => r.status === "ขายแล้ว" && r.sold_at);

  // Monthly (last 12 months)
  const monthMap = new Map<string, MonthlyReport>();
  const [curY, curM] = thaiMonthStr().split("-").map(Number);
  for (let i = 11; i >= 0; i--) {
    let m = curM - i; let y = curY;
    while (m <= 0) { m += 12; y--; }
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const label = new Date(`${key}-01T12:00:00+07:00`).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", month: "short", year: "2-digit" });
    monthMap.set(key, { month: label, revenue: 0, cost: 0, profit: 0, count: 0 });
  }
  for (const row of sold) {
    const key = thaiDateStr(new Date(row.sold_at)).slice(0, 7);
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
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const fieldMap: Record<string, string> = {
    model: "model", storage: "storage", color: "color", grade: "grade",
    batteryHealth: "battery_health", cycleCount: "cycle_count",
    icloudStatus: "icloud_status", carrierLock: "carrier_lock", accessories: "accessories",
    costPrice: "cost_price", shippingCost: "shipping_cost", otherCost: "other_cost",
    sellingPrice: "selling_price", sellerName: "seller_name", sellerPhone: "seller_phone",
    sourceChannel: "source_channel",
  };

  // Fetch current values to diff
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await supabase.from("stocks").select("*").eq("id", id).single() as { data: any };

  const mapped: Record<string, unknown> = { updated_at: now };
  const changes: string[] = [];
  for (const [camel, snake] of Object.entries(fieldMap)) {
    const val = updates[camel as keyof typeof updates];
    if (val === undefined) continue;
    mapped[snake] = val;
    const oldVal = current?.[snake];
    if (oldVal !== undefined && String(oldVal) !== String(val)) {
      changes.push(`${FIELD_LABELS[snake] ?? snake}: ${oldVal} → ${val}`);
    }
  }

  if (changes.length > 0) {
    const newAuditLog: AuditEntry[] = [...(current?.audit_log ?? []), {
      action: "แก้ไขข้อมูล", detail: changes.join(", "), timestamp: now, by: "admin",
    }];
    mapped["audit_log"] = newAuditLog;
  }

  const { error } = await supabase.from("stocks").update(mapped).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateStockPhotos(id: string, photos: string[]): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("stocks").select("photos, audit_log").eq("id", id).single();
  const oldCount = (current?.photos ?? []).length;
  const newAuditLog: AuditEntry[] = [...(current?.audit_log ?? []), {
    action: "อัปโหลดรูปภาพ",
    detail: `${oldCount} → ${photos.length} รูป`,
    timestamp: now, by: "admin",
  }];
  const { error } = await supabase.from("stocks").update({ photos, audit_log: newAuditLog, updated_at: now }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function logDocumentView(id: string, docLabel: string): Promise<void> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await supabase.from("stocks").select("audit_log").eq("id", id).single() as { data: any };
  const newAuditLog: AuditEntry[] = [...(current?.audit_log ?? []), {
    action: "เปิดดูเอกสาร", detail: docLabel, timestamp: now, by: "admin",
  }];
  await supabase.from("stocks").update({ audit_log: newAuditLog, updated_at: now }).eq("id", id);
}

export async function updateStockDocuments(id: string, documents: string[]): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase.from("stocks").update({ documents, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function addStockSlips(id: string, newUrls: string[]): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: current } = await supabase.from("stocks").select("slip_urls, audit_log").eq("id", id).single();
  const existing: string[] = current?.slip_urls ?? [];
  const merged = [...existing, ...newUrls];
  const now = new Date().toISOString();
  const newAuditLog: AuditEntry[] = [...(current?.audit_log ?? []), { timestamp: now, action: "เพิ่มสลิปการขาย", detail: `${newUrls.length} รูป`, by: "admin" }];
  const { error } = await supabase.from("stocks").update({ slip_urls: merged, audit_log: newAuditLog, updated_at: now }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteStockItem(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { data: profile } = await supabase.from("admin_users").select("role, permissions").eq("user_id", user.id).single();
  const isOwner = profile?.role === "owner";
  const canDelete = (profile?.permissions as string[] | null)?.includes("delete_stock") ?? false;
  if (!isOwner && !canDelete) return { success: false, error: "ไม่มีสิทธิ์ลบสินค้า" };
  const { error } = await supabase.from("stocks").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export interface AuditRow {
  stockId: string;
  model: string;
  action: string;
  detail: string;
  timestamp: string;
  by: string;
}

export async function fetchAllAuditLog(): Promise<AuditRow[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("id, model, audit_log, status_log");

  const rows: AuditRow[] = [];
  for (const item of data ?? []) {
    // audit_log entries (new system)
    for (const entry of (item.audit_log ?? [])) {
      rows.push({
        stockId: item.id,
        model: item.model,
        action: entry.action,
        detail: entry.detail,
        timestamp: entry.timestamp,
        by: entry.by,
      });
    }
    // status_log entries — include only if not already covered by audit_log
    const auditTimestamps = new Set((item.audit_log ?? []).map((e: AuditEntry) => e.timestamp));
    for (const log of (item.status_log ?? [])) {
      if (auditTimestamps.has(log.timestamp)) continue;
      rows.push({
        stockId: item.id,
        model: item.model,
        action: "เปลี่ยนสถานะ",
        detail: log.note ? `${log.status} (${log.note})` : log.status,
        timestamp: log.timestamp,
        by: log.by,
      });
    }
  }
  rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return rows;
}

export async function fetchRequestDocuments(requestRef: string): Promise<{ contractUrl?: string; receiptUrl?: string } | null> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("contract_url, receipt_url")
    .eq("order_number", requestRef)
    .single();
  if (!data) return null;
  return { contractUrl: data.contract_url ?? undefined, receiptUrl: data.receipt_url ?? undefined };
}

export async function getStockDocumentSignedUrl(
  requestRef: string,
  docType: "contract" | "receipt",
): Promise<string | null> {
  const user = await requireAuth();
  const supabase = createServerClient();

  const { data: profile } = await supabase
    .from("admin_users")
    .select("role, permissions")
    .eq("user_id", user.id)
    .single();

  const isOwner    = profile?.role === "owner";
  const hasStock   = (profile?.permissions as string[] | null)?.includes("view_stock") ?? false;
  if (!isOwner && !hasStock) return null;

  const { data: req } = await supabase
    .from("requests")
    .select("contract_url, receipt_url")
    .eq("order_number", requestRef)
    .single();
  if (!req) return null;

  const storagePath = docType === "contract" ? req.contract_url : req.receipt_url;
  if (!storagePath) return null;

  const { data, error } = await supabase.storage
    .from("inspection-photos")
    .createSignedUrl(storagePath, 60);
  if (error) { console.error("getStockDocumentSignedUrl:", error); return null; }
  return data.signedUrl;
}

export async function saveStockCountSession(input: {
  startedAt: string;
  completedAt: string;
  totalItems: number;
  foundCount: number;
  missingItems: StockCountMissingItem[];
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase.from("stock_count_sessions").insert({
    counted_by: user.email ?? user.id,
    started_at: input.startedAt,
    completed_at: input.completedAt,
    total_items: input.totalItems,
    found_count: input.foundCount,
    missing_count: input.missingItems.length,
    missing_items: input.missingItems,
  });
  if (error) { console.error("saveStockCountSession:", error); return { success: false, error: error.message }; }
  return { success: true };
}

export async function fetchStockCountSessions(limit = 10): Promise<StockCountSession[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stock_count_sessions")
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map(r => ({
    id: r.id,
    countedBy: r.counted_by,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    totalItems: r.total_items,
    foundCount: r.found_count,
    missingCount: r.missing_count,
    missingItems: r.missing_items ?? [],
  }));
}

// ── Buyback / Repair flow ──────────────────────────────────────────────────────

export async function buybackStock(
  id: string,
  buybackPrice: number,
  reason: string,
  by = "admin",
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("stocks").select("status, status_log, audit_log, model, storage").eq("id", id).single();
  if (!current) return { success: false, error: "ไม่พบสินค้า" };
  const newStatus: StockStatus = "รับคืนแล้ว";
  const detail = `ซื้อคืนในราคา ฿${buybackPrice.toLocaleString("th-TH")}${reason ? ` เหตุผล: ${reason}` : ""}`;
  const newStatusLog = [...(current.status_log ?? []), { status: newStatus, timestamp: now, note: detail, by }];
  const newAuditLog: AuditEntry[] = [...(current.audit_log ?? []), { action: "ซื้อคืน", detail, timestamp: now, by }];

  // Update cost_price to buyback price — this is now the new cost basis for any future re-sale
  // Keep sold_price/sold_at as historical facts so Finance can show Month A's revenue correctly
  // Clear delivery/buyer fields (no longer relevant) but preserve financial history
  const { error } = await supabase.from("stocks").update({
    status: newStatus,
    cost_price: buybackPrice,
    shipping_cost: 0,
    other_cost: 0,
    buyer_name: null,
    buyer_phone: null,
    sold_by: null,
    sale_type: null,
    partner_name: null,
    delivery_status: null,
    delivery_channel: null,
    tracking_number: null,
    status_log: newStatusLog,
    audit_log: newAuditLog,
    updated_at: now,
  }).eq("id", id);
  if (error) return { success: false, error: error.message };

  // Record buyback as Finance expense so cashflow shows the outflow
  const product = `ซื้อคืน ${current.model} ${current.storage} (${id})`;
  await supabase.from("expenses").insert({
    date: now.slice(0, 10),
    ref_number: `BUY-${id}`,
    product,
    category: "ซื้อคืน",
    amount: buybackPrice,
    status: "approved",
    notes: reason || `ซื้อคืน ${id}`,
    updated_at: now,
  });

  return { success: true };
}

export async function sendToRepair(
  id: string,
  shopName: string,
  estimatedCost: number,
  issue: string,
  by = "admin",
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("stocks").select("status, status_log, audit_log").eq("id", id).single();
  if (!current) return { success: false, error: "ไม่พบสินค้า" };
  const newStatus: StockStatus = "ส่งซ่อม";
  const detail = `ส่งซ่อมที่ ${shopName}${estimatedCost > 0 ? ` ค่าซ่อมประมาณ ฿${estimatedCost.toLocaleString("th-TH")}` : ""}${issue ? ` — ${issue}` : ""}`;
  const newStatusLog = [...(current.status_log ?? []), { status: newStatus, timestamp: now, note: detail, by }];
  const newAuditLog: AuditEntry[] = [...(current.audit_log ?? []), { action: "ส่งซ่อม", detail, timestamp: now, by }];
  const { error } = await supabase.from("stocks")
    .update({ status: newStatus, status_log: newStatusLog, audit_log: newAuditLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function receiveFromRepair(
  id: string,
  actualCost: number,
  newGrade: string | null,
  newSellingPrice: number | null,
  notes: string,
  receiptUrls: string[] = [],
  by = "admin",
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { data: current } = await supabase.from("stocks").select("status, status_log, audit_log, grade, selling_price, documents").eq("id", id).single();
  if (!current) return { success: false, error: "ไม่พบสินค้า" };
  const newStatus: StockStatus = "พร้อมขาย";
  const detail = `ซ่อมเสร็จ ค่าซ่อมจริง ฿${actualCost.toLocaleString("th-TH")}${newGrade ? ` เกรดใหม่ ${newGrade}` : ""}${newSellingPrice ? ` ราคาขายใหม่ ฿${newSellingPrice.toLocaleString("th-TH")}` : ""}${notes ? ` — ${notes}` : ""}${receiptUrls.length > 0 ? ` (แนบใบเสร็จ ${receiptUrls.length} ใบ)` : ""}`;
  const newStatusLog = [...(current.status_log ?? []), { status: newStatus, timestamp: now, note: detail, by }];
  const newAuditLog: AuditEntry[] = [...(current.audit_log ?? []), { action: "รับคืนจากซ่อม", detail, timestamp: now, by }];
  const newDocuments = [...(current.documents ?? []), ...receiptUrls];
  const updates: Record<string, unknown> = {
    status: newStatus,
    status_log: newStatusLog,
    audit_log: newAuditLog,
    documents: newDocuments,
    updated_at: now,
  };
  if (newGrade) updates.grade = newGrade;
  if (newSellingPrice && newSellingPrice > 0) updates.selling_price = newSellingPrice;
  const { error } = await supabase.from("stocks").update(updates).eq("id", id);
  if (error) return { success: false, error: error.message };

  // Auto-create expense record when repair cost > 0
  if (actualCost > 0) {
    const { data: stockRow } = await supabase.from("stocks").select("model, storage").eq("id", id).single();
    const product = stockRow ? `ค่าซ่อม ${stockRow.model} ${stockRow.storage} (${id})` : `ค่าซ่อม (${id})`;
    await supabase.from("expenses").insert({
      date: now.slice(0, 10),
      ref_number: `REP-${id}`,
      product,
      category: "ซ่อมบำรุง",
      amount: actualCost,
      status: "approved",
      notes: notes || `ค่าซ่อม ${id}`,
      updated_at: now,
    });
  }

  return { success: true };
}
