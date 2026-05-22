"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import type { PricingGroup } from "@/lib/pricing-defaults";

export type ProductRow = {
  id: string;
  model: string;
  storage: string;
  price_good: number;
  storage_prices: Record<string, number> | null;
  category: string;
  active: boolean;
  deductions: PricingGroup[] | null;
  updated_at: string;
  updated_by: string | null;
};

export async function fetchProducts(): Promise<ProductRow[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("category")
    .order("price_good", { ascending: false });

  return data ?? [];
}

export async function fetchActiveProducts(): Promise<ProductRow[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("price_good", { ascending: false });

  return data ?? [];
}

export async function fetchProductById(id: string): Promise<ProductRow | null> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  return data ?? null;
}

export async function updateProduct(
  id: string,
  updates: { price_good?: number; active?: boolean },
  updatedBy?: string,
) {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updatedBy ? { updated_by: updatedBy } : {}),
    })
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function updateProductStoragePrices(
  id: string,
  storage_prices: Record<string, number> | null,
  updatedBy?: string,
) {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      storage_prices,
      updated_at: new Date().toISOString(),
      ...(updatedBy ? { updated_by: updatedBy } : {}),
    })
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function updateProductDeductions(
  id: string,
  deductions: PricingGroup[] | null,
  updatedBy?: string,
) {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      deductions,
      updated_at: new Date().toISOString(),
      ...(updatedBy ? { updated_by: updatedBy } : {}),
    })
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function bulkUpdateProductPrices(
  ids: string[],
  type: "flat" | "pct",
  value: number,
  updatedBy?: string,
) {
  await requireAuth();
  if (!ids.length) return { success: true as const, updated: 0 };
  const supabase = createServerClient();

  const { data: rows } = await supabase
    .from("products")
    .select("id, price_good")
    .in("id", ids);

  if (!rows?.length) return { success: false as const, error: "ไม่พบรุ่นที่เลือก" };

  const now = new Date().toISOString();
  let failed = 0;
  for (const row of rows) {
    const newPrice = type === "flat"
      ? Math.max(0, row.price_good + value)
      : Math.max(0, Math.round(row.price_good * (1 + value / 100)));
    const { error } = await supabase
      .from("products")
      .update({ price_good: newPrice, updated_at: now, ...(updatedBy ? { updated_by: updatedBy } : {}) })
      .eq("id", row.id);
    if (error) failed++;
  }

  if (failed > 0) return { success: false as const, error: `ปรับ ${failed} รุ่นไม่สำเร็จ` };
  return { success: true as const, updated: rows.length };
}

export async function createProduct(product: {
  model: string;
  storage: string;
  price_good: number;
  category: string;
}) {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("products")
    .insert({
      ...product,
      active: true,
      updated_at: new Date().toISOString(),
    });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}