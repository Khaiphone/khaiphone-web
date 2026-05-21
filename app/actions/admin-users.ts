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

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export async function inviteStaff(
  email: string,
  name: string,
  role: AdminRole,
): Promise<{ success: true; tempPassword?: string } | { success: false; error: string }> {
  const supabase = createServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  let userId: string;
  let tempPassword: string | undefined;

  // Try email invite first
  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/admin/set-password`,
  });

  if (authError) {
    const isRateLimit =
      authError.message.toLowerCase().includes("rate limit") ||
      authError.message.toLowerCase().includes("email rate") ||
      authError.status === 429;

    if (isRateLimit) {
      // Fallback: create user directly with a temp password (no email sent)
      tempPassword = generateTempPassword();
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createError) return { success: false, error: createError.message };
      userId = createData.user.id;
    } else {
      return { success: false, error: authError.message };
    }
  } else {
    userId = authData.user.id;
  }

  const { error } = await supabase.from("admin_users").insert({
    user_id: userId,
    email,
    name,
    role,
    active: true,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, tempPassword };
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

export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/admin/set-password`,
  });
  if (error) return { success: false, error: error.message };
  return { success: true };
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
