"use server";

import { createServerClient } from "@/lib/supabase-server";
import type { Permission } from "@/lib/admin-permissions";
export type { Permission } from "@/lib/admin-permissions";

export type AdminRole = "owner" | "staff";

export type AdminUserRow = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: AdminRole;
  active: boolean;
  permissions: Permission[];
  created_at: string;
};

export async function fetchMyProfile(userId: string): Promise<{ name: string; role: AdminRole; email: string; permissions: Permission[] } | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("admin_users")
    .select("name, role, email, permissions")
    .eq("user_id", userId)
    .single();
  if (!data) return null;
  return {
    name: data.name,
    role: data.role as AdminRole,
    email: data.email,
    permissions: (data.permissions ?? []) as Permission[],
  };
}

export async function fetchMyRole(userId: string): Promise<AdminRole> {
  const supabase = createServerClient();

  // If table is empty (first-time / migration) — treat current user as owner
  const { count } = await supabase
    .from("admin_users")
    .select("*", { count: "exact", head: true });
  if (count === 0) return "owner";

  const { data } = await supabase
    .from("admin_users")
    .select("role, active")
    .eq("user_id", userId)
    .single();

  if (!data || !data.active) return "staff";
  return data.role as AdminRole;
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("admin_users")
    .select("*")
    .order("created_at");
  return ((data ?? []) as AdminUserRow[]).map(u => ({ ...u, permissions: u.permissions ?? [] }));
}

export async function updateAdminPermissions(id: string, permissions: Permission[]) {
  const supabase = createServerClient();
  const { error } = await supabase.from("admin_users").update({ permissions }).eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function inviteStaff(email: string, name: string, role: AdminRole) {
  const supabase = createServerClient();

  // Create/invite via Supabase Auth admin
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/admin/set-password`,
  });
  if (authError) return { success: false as const, error: authError.message };

  const { error } = await supabase.from("admin_users").insert({
    user_id: authData.user.id,
    email,
    name,
    role,
    active: true,
  });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function updateAdminUser(
  id: string,
  updates: { name?: string; role?: AdminRole; active?: boolean },
) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("admin_users")
    .update(updates)
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function deleteAdminUser(id: string, userId: string) {
  const supabase = createServerClient();
  // Delete from admin_users first
  const { error: dbError } = await supabase.from("admin_users").delete().eq("id", id);
  if (dbError) return { success: false as const, error: dbError.message };
  // Delete from Supabase Auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  if (authError) return { success: false as const, error: authError.message };
  return { success: true as const };
}
