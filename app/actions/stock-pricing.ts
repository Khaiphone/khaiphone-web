"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";

export interface PriceHistory {
  buyPrice: number;
  sellPrice: number;
  date: string;
}

export interface PriceRule {
  id: string;
  model: string;
  grade: string;
  buyPrice: number;
  sellPrice: number;
  updatedAt: string;
  history: PriceHistory[];
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
    history: (row.price_history ?? []) as PriceHistory[],
  };
}

export async function fetchPriceRules(): Promise<PriceRule[]> {
  await requireAuth();
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
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  // Fetch existing to append history
  const { data: existing } = await supabase
    .from("stock_price_rules")
    .select("buy_price, sell_price, price_history")
    .eq("model", model)
    .eq("grade", grade)
    .single();

  let history: PriceHistory[] = existing?.price_history ?? [];
  if (existing && (existing.buy_price !== buyPrice || existing.sell_price !== sellPrice)) {
    history = [...history, { buyPrice: existing.buy_price, sellPrice: existing.sell_price, date: now }].slice(-12);
  }

  const { error } = await supabase
    .from("stock_price_rules")
    .upsert(
      { model, grade, buy_price: buyPrice, sell_price: sellPrice, price_history: history, updated_at: now },
      { onConflict: "model,grade" },
    );
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deletePriceRule(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase.from("stock_price_rules").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function fetchStockModels(): Promise<string[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("stocks")
    .select("model")
    .not("model", "is", null)
    .neq("model", "");
  const unique = [...new Set((data ?? []).map((r: { model: string }) => r.model as string))].sort();
  return unique;
}
