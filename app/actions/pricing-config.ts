"use server";

import { createServerClient } from "@/lib/supabase-server";
import { DEFAULT_PRICING_CONFIG } from "@/lib/pricing-defaults";
import type { PricingConfig } from "@/lib/pricing-defaults";

export type { PricingOption, PricingGroup, PricingConfig } from "@/lib/pricing-defaults";

export async function fetchPricingConfig(): Promise<PricingConfig> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("pricing_config")
    .select("config")
    .eq("id", 1)
    .single();
  const db = (data?.config ?? {}) as Partial<PricingConfig>;
  return {
    storageMultiplier: db.storageMultiplier ?? DEFAULT_PRICING_CONFIG.storageMultiplier,
    groups:            db.groups            ?? DEFAULT_PRICING_CONFIG.groups,
  };
}

export async function savePricingConfig(config: PricingConfig) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("pricing_config")
    .upsert({ id: 1, config, updated_at: new Date().toISOString() });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
