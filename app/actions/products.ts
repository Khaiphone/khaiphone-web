"use server";

import { createServerClient } from "@/lib/supabase-server";
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
  const supabase = createServerClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .order("category")
    .order("price_good", { ascending: false });

  return data ?? [];
}

export async function fetchActiveProducts(): Promise<ProductRow[]> {
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

export async function createProduct(product: {
  model: string;
  storage: string;
  price_good: number;
  category: string;
}) {
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