"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import type { RequestStatus } from "@/lib/types/admin";

export interface StockRequest {
  id: string;
  orderNumber: string;
  status: RequestStatus;
  source: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  deviceStorage: string;
  deviceColor: string;
  estimatedPrice: number;
  actualPrice: number | null;
  // linked stock entry (if completed and auto-created)
  stockId: string | null;
  stockStatus: string | null;
}

export interface RequestStats {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
}

const PENDING_STATUSES: RequestStatus[] = [
  "new", "pending", "inspecting", "confirmed",
  "pickup_scheduled", "price_negotiation", "contracting",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any, stockMap: Map<string, { id: string; status: string }>): StockRequest {
  const stock = stockMap.get(row.order_number);
  return {
    id:             row.id,
    orderNumber:    row.order_number,
    status:         row.status as RequestStatus,
    source:         row.source ?? "website",
    createdAt:      row.created_at,
    customerName:   row.customer_name ?? "",
    customerPhone:  row.customer_phone ?? "",
    deviceModel:    row.device_model ?? "",
    deviceStorage:  row.device_storage ?? "",
    deviceColor:    row.device_color ?? "",
    estimatedPrice: row.estimated_price ?? 0,
    actualPrice:    row.actual_price ?? null,
    stockId:        stock?.id ?? null,
    stockStatus:    stock?.status ?? null,
  };
}

export async function fetchStockRequests(): Promise<StockRequest[]> {
  await requireAuth();
  const supabase = createServerClient();

  const [requestsRes, stocksRes] = await Promise.all([
    supabase
      .from("requests")
      .select("id, order_number, status, source, created_at, customer_name, customer_phone, device_model, device_storage, device_color, estimated_price, actual_price")
      .neq("source", "manual")
      .order("created_at", { ascending: false }),
    supabase
      .from("stocks")
      .select("id, status, request_ref")
      .not("request_ref", "is", null),
  ]);

  const stockMap = new Map<string, { id: string; status: string }>();
  for (const s of stocksRes.data ?? []) {
    if (s.request_ref) stockMap.set(s.request_ref, { id: s.id, status: s.status });
  }

  return (requestsRes.data ?? []).map(row => mapRow(row, stockMap));
}

export async function createStockFromRequest(
  requestId: string,
): Promise<{ success: true; stockId: string } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();

  const { data: req, error: reqErr } = await supabase
    .from("requests")
    .select("id, order_number, source, device_model, device_storage, device_color, actual_price, estimated_price, customer_name, customer_phone, inspection")
    .eq("id", requestId)
    .single();

  if (reqErr || !req) return { success: false, error: "ไม่พบคำขอ" };

  // Prevent duplicate
  const { count } = await supabase
    .from("stocks")
    .select("*", { count: "exact", head: true })
    .eq("request_ref", req.order_number);
  if ((count ?? 0) > 0) return { success: false, error: "มี stock entry อยู่แล้ว" };

  const sourceMap: Record<string, string> = {
    website: "เว็บไซต์", line: "LINE OA", facebook: "Facebook",
    phone: "โทรศัพท์", manual: "หน้าร้าน",
  };
  const year = new Date().getFullYear();
  const { count: totalCount } = await supabase.from("stocks").select("*", { count: "exact", head: true });
  const stockId = `STK-${year}-${String((totalCount ?? 0) + 1).padStart(5, "0")}`;
  const now = new Date().toISOString();

  // Snapshot from inspection — staff-entered values for cross-checking later
  const insp = req.inspection ?? {};
  const snapshot = {
    imei:    insp.imei    ?? null,
    serial:  insp.serial  ?? null,
    model:   req.device_model   ?? null,
    storage: req.device_storage ?? null,
    color:   req.device_color   ?? null,
    source:  "inspection",
  };

  const { error: insertErr } = await supabase.from("stocks").insert({
    id: stockId,
    model:           req.device_model ?? "",
    storage:         req.device_storage ?? "",
    color:           req.device_color ?? "",
    imei:            insp.imei   ?? "",
    serial:          insp.serial ?? "",
    grade: insp.result === "matched" ? "A" : insp.result === "adjusted" ? "B" : "A",
    battery_health: insp.batteryHealth ?? 0,
    cycle_count: insp.batteryCycles ?? 0,
    icloud_status: "", carrier_lock: "", accessories: "",
    physical_checks: [
      ...(insp.criteria ?? []).map((c: { label: string; pass: boolean; actual?: string }) => ({ label: c.label, condition: c.pass ? "ปกติ" : (c.actual?.trim() || "มีตำหนิ") })),
      ...(insp.functionalTests ?? []).map((t: { label: string; pass: boolean }) => ({ label: t.label, condition: t.pass ? "ปกติ" : "มีปัญหา" })),
    ],
    cost_price:      req.actual_price ?? req.estimated_price ?? 0,
    shipping_cost: 0, other_cost: 0, selling_price: 0,
    status:          "รอตรวจ",
    source_channel:  sourceMap[req.source ?? "website"] ?? "เว็บไซต์",
    request_ref:     req.order_number,
    seller_name:     req.customer_name ?? "",
    seller_phone:    req.customer_phone ?? "",
    received_at:     now, inspector: "",
    photos:          insp.photos ?? [],
    notes: [], status_log: [{ status: "รอตรวจ", timestamp: now, note: `สร้างจาก ${req.order_number}`, by: "admin" }],
    inspection_snapshot: snapshot,
    created_at: now, updated_at: now,
  });

  if (insertErr) return { success: false, error: insertErr.message };
  return { success: true, stockId };
}

export async function fetchStockSummary(): Promise<{ todayRevenue: number; todayProfit: number }> {
  await requireAuth();
  const supabase = createServerClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("stocks")
    .select("sold_price, cost_price, shipping_cost, other_cost, sold_at")
    .eq("status", "ขายแล้ว")
    .gte("sold_at", today.toISOString());

  const rows = data ?? [];
  const todayRevenue = rows.reduce((s, r) => s + (r.sold_price ?? 0), 0);
  const todayProfit  = rows.reduce((s, r) => s + ((r.sold_price ?? 0) - (r.cost_price ?? 0) - (r.shipping_cost ?? 0) - (r.other_cost ?? 0)), 0);
  return { todayRevenue, todayProfit };
}

export async function fetchRequestStats(): Promise<RequestStats> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("status")
    .neq("source", "manual");

  const rows = data ?? [];
  return {
    total:     rows.length,
    pending:   rows.filter(r => PENDING_STATUSES.includes(r.status as RequestStatus)).length,
    completed: rows.filter(r => r.status === "completed").length,
    cancelled: rows.filter(r => r.status === "cancelled" || r.status === "rejected").length,
  };
}
