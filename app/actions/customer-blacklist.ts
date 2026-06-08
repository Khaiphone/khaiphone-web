"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";

export interface CustomerHistory {
  noShowCount: number;
  totalRequests: number;
  blacklist: {
    id: string;
    reason: string;
    notes: string | null;
    blacklistedBy: string;
    blacklistedAt: string;
  } | null;
}

export async function getCustomerHistory(phone: string): Promise<CustomerHistory> {
  await requireAuth();
  const supabase = createServerClient();
  const normalized = phone.replace(/\D/g, "");

  const [{ data: requests }, { data: blacklistEntry }] = await Promise.all([
    supabase
      .from("requests")
      .select("status")
      .ilike("customer_phone", `%${normalized}%`),
    supabase
      .from("customer_blacklist")
      .select("id, reason, notes, blacklisted_by, blacklisted_at")
      .eq("phone", normalized)
      .eq("is_active", true)
      .order("blacklisted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const rows = requests ?? [];
  return {
    noShowCount:   rows.filter(r => r.status === "no_show").length,
    totalRequests: rows.length,
    blacklist: blacklistEntry ? {
      id:             blacklistEntry.id,
      reason:         blacklistEntry.reason,
      notes:          blacklistEntry.notes ?? null,
      blacklistedBy:  blacklistEntry.blacklisted_by,
      blacklistedAt:  blacklistEntry.blacklisted_at,
    } : null,
  };
}

export async function addToBlacklist(
  phone: string,
  name: string,
  reason: string,
  notes: string,
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const normalized = phone.replace(/\D/g, "");

  // Deactivate any existing entry first (upsert pattern)
  await supabase
    .from("customer_blacklist")
    .update({ is_active: false })
    .eq("phone", normalized)
    .eq("is_active", true);

  const { data, error } = await supabase
    .from("customer_blacklist")
    .insert({
      phone:           normalized,
      name:            name.trim(),
      reason:          reason.trim(),
      notes:           notes.trim() || null,
      blacklisted_by:  user.email ?? user.id,
      is_active:       true,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, id: data.id };
}

export async function removeFromBlacklist(
  id: string,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("customer_blacklist")
    .update({ is_active: false })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
