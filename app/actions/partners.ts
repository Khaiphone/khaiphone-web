"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";

export interface Partner {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  totalItems: number;
  totalRevenue: number;
  lastPurchase: string;
}

export interface PartnerHistoryItem {
  id: string;
  model: string;
  storage: string;
  color: string;
  grade: string;
  soldPrice: number;
  soldAt: string;
  cost: number;
  profit: number;
  deliveryStatus: string;
  imei: string;
  serial: string;
}

export async function fetchPartners(): Promise<Partner[]> {
  await requireAuth();
  const supabase = createServerClient();

  const [{ data: partnersData }, { data: salesData }] = await Promise.all([
    supabase.from("partners").select("*").order("name"),
    supabase.from("stocks").select("partner_name, sold_price, sold_at")
      .eq("sale_type", "ขายส่ง").not("partner_name", "is", null),
  ]);

  const map = new Map<string, { count: number; revenue: number; lastDate: string }>();
  for (const row of salesData ?? []) {
    const name = row.partner_name;
    if (!map.has(name)) map.set(name, { count: 0, revenue: 0, lastDate: "" });
    const cur = map.get(name)!;
    cur.count += 1;
    cur.revenue += row.sold_price ?? 0;
    if ((row.sold_at ?? "") > cur.lastDate) cur.lastDate = row.sold_at ?? "";
  }

  return (partnersData ?? []).map(p => {
    const agg = map.get(p.name) ?? { count: 0, revenue: 0, lastDate: "" };
    return {
      id: p.id,
      name: p.name,
      phone: p.phone ?? "",
      address: p.address ?? "",
      notes: p.notes ?? "",
      createdAt: p.created_at ?? "",
      totalItems: agg.count,
      totalRevenue: agg.revenue,
      lastPurchase: agg.lastDate,
    };
  });
}

export async function fetchPartnerHistory(partnerName: string): Promise<PartnerHistoryItem[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("id, model, storage, color, grade, sold_price, sold_at, cost_price, shipping_cost, other_cost, delivery_status, imei, serial")
    .eq("partner_name", partnerName)
    .eq("sale_type", "ขายส่ง")
    .order("sold_at", { ascending: false });

  return (data ?? []).map(r => {
    const cost = (r.cost_price ?? 0) + (r.shipping_cost ?? 0) + (r.other_cost ?? 0);
    return {
      id: r.id,
      model: r.model ?? "",
      storage: r.storage ?? "",
      color: r.color ?? "",
      grade: r.grade ?? "",
      soldPrice: r.sold_price ?? 0,
      soldAt: r.sold_at ?? "",
      cost,
      profit: (r.sold_price ?? 0) - cost,
      deliveryStatus: r.delivery_status ?? "",
      imei: r.imei ?? "",
      serial: r.serial ?? "",
    };
  });
}

export async function createPartner(data: {
  name: string; phone?: string; address?: string; notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase.from("partners").insert({
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    address: data.address?.trim() || null,
    notes: data.notes?.trim() || null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updatePartner(id: string, data: {
  name?: string; phone?: string; address?: string; notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase.from("partners").update({
    ...(data.name !== undefined && { name: data.name.trim() }),
    phone: data.phone?.trim() || null,
    address: data.address?.trim() || null,
    notes: data.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deletePartner(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
