"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { DEFAULT_PRICING_CONFIG } from "@/lib/pricing-defaults";
import type { PricingConfig } from "@/lib/pricing-defaults";

export type { PricingOption, PricingGroup, PricingConfig } from "@/lib/pricing-defaults";

export async function fetchPublicPricingConfig(): Promise<PricingConfig> {
  return _fetchPricingConfig();
}

export async function fetchPricingConfig(): Promise<PricingConfig> {
  await requireAuth();
  return _fetchPricingConfig();
}

async function _fetchPricingConfig(): Promise<PricingConfig> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("pricing_config")
    .select("config")
    .eq("id", 1)
    .single();
  const db = (data?.config ?? {}) as Partial<PricingConfig>;

  // Always use labels from DEFAULT_PRICING_CONFIG (single source of truth for text).
  // Only pull deduction values from DB so admin edits are preserved.
  const groups = DEFAULT_PRICING_CONFIG.groups.map((defaultGroup, gi) => {
    const dbGroup = db.groups?.[gi];
    return {
      ...defaultGroup,
      options: defaultGroup.options.map((defaultOpt, oi) => ({
        ...defaultOpt,
        ded: dbGroup?.options?.[oi]?.ded ?? defaultOpt.ded,
      })),
    };
  });

  return {
    storageMultiplier: db.storageMultiplier ?? DEFAULT_PRICING_CONFIG.storageMultiplier,
    floorPct: db.floorPct ?? DEFAULT_PRICING_CONFIG.floorPct,
    groups,
  };
}

export async function savePricingConfig(config: PricingConfig) {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("pricing_config")
    .upsert({ id: 1, config, updated_at: new Date().toISOString() });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
