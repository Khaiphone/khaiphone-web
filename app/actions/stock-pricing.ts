"use server";

import { createServerClient } from "@/lib/supabase-server";

export interface PriceRule {
  id: string;
  model: string;
  grade: string;
  buyPrice: number;
  sellPrice: number;
  updatedAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PriceRule {
  return {
    id: row.id,
    model: row.model,
    grade: row.grade,
    buyPrice: row.buy_price ?? 0,
    sellPrice: row.sell_price ?? 0,
    updatedAt: row.updated_at ?? "",
  };
}

export async function fetchPriceRules(): Promise<PriceRule[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stock_price_rules")
    .select("*")
    .order("model")
    .order("grade");
  return (data ?? []).map(mapRow);
}

export async function upsertPriceRule(
  model: string,
  grade: string,
  buyPrice: number,
  sellPrice: number,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("stock_price_rules")
    .upsert({ model, grade, buy_price: buyPrice, sell_price: sellPrice, updated_at: now }, { onConflict: "model,grade" });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deletePriceRule(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const { error } = await supabase.from("stock_price_rules").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
