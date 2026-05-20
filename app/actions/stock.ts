"use server";

import { createServerClient } from "@/lib/supabase-server";

export type StockStatus = "in_stock" | "repairing" | "sold";

export interface StockItem {
  id: string;
  orderNumber: string;
  model: string;
  storage: string;
  color?: string;
  condition: string;
  costPrice: number;
  stockStatus: StockStatus;
  sellPrice?: number;
  sellDate?: string;
  completedAt: string;
  source: "request" | "manual";
}

export async function fetchStockItems(): Promise<StockItem[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("id, order_number, source, device_model, device_storage, device_color, device_condition, actual_price, estimated_price, stock_status, sell_price, sell_date, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false });
  return (data ?? []).map(row => ({
    id:          row.id,
    orderNumber: row.order_number,
    model:       row.device_model,
    storage:     row.device_storage   ?? "",
    color:       row.device_color     ?? undefined,
    condition:   row.device_condition ?? "",
    costPrice:   row.actual_price     ?? row.estimated_price ?? 0,
    stockStatus: (row.stock_status    ?? "in_stock") as StockStatus,
    sellPrice:   row.sell_price       ?? undefined,
    sellDate:    row.sell_date        ?? undefined,
    completedAt: row.created_at,
    source:      row.source === "manual" ? "manual" : "request",
  }));
}

export async function createManualStock(data: {
  model: string;
  storage: string;
  color?: string;
  condition: string;
  costPrice: number;
  notes?: string;
}) {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const orderNumber = `MN-${Date.now().toString(36).toUpperCase()}`;

  const { data: row, error } = await supabase
    .from("requests")
    .insert({
      order_number:      orderNumber,
      status:            "completed",
      source:            "manual",
      device_model:      data.model,
      device_storage:    data.storage  || "",
      device_color:      data.color    || null,
      device_condition:  data.condition || "",
      actual_price:      data.costPrice,
      estimated_price:   data.costPrice,
      stock_status:      "in_stock",
      customer_name:     "",
      customer_phone:    "",
      appt_date:         "",
      appt_time:         "",
      appt_location:     "",
      notes:             data.notes ? [{ text: data.notes, createdAt: now, author: "manual", showToCustomer: false }] : [],
      status_log:        [],
      created_at:        now,
      updated_at:        now,
    })
    .select("id")
    .single();

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, id: row.id };
}

export async function updateStockItem(
  id: string,
  status: StockStatus,
  sellPrice?: number,
  sellDate?: string,
) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({
      stock_status: status,
      sell_price:   status === "sold" ? (sellPrice ?? null) : null,
      sell_date:    status === "sold" ? (sellDate  ?? null) : null,
      updated_at:   new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
