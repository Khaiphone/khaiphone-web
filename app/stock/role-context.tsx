"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchMyProfile } from "@/app/actions/admin-users";
import type { AdminRole } from "@/app/actions/admin-users";
import type { Permission } from "@/lib/admin-permissions";

type StockRoleCtx = { role: AdminRole | null; permissions: Permission[]; canViewFinance: boolean };
const StockRoleContext = createContext<StockRoleCtx>({ role: null, permissions: [], canViewFinance: false });

export function StockRoleProvider({ children, value }: { children: React.ReactNode; value?: StockRoleCtx }) {
  const [role, setRole]       = useState<AdminRole | null>(null);
  const [permissions, setPerms] = useState<Permission[]>([]);

  useEffect(() => {
    // controlled — StockLayoutClient ดึง profile มาแล้ว ส่งผ่าน value; ข้าม fetch ซ้ำ
    if (value) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const profile = await fetchMyProfile(session.user.id);
      if (profile) {
        setRole(profile.role);
        setPerms(profile.permissions);
      }
    });
  }, [value]);

  const ctx = value ?? { role, permissions, canViewFinance: role === "owner" || permissions.includes("view_finance") };
  return (
    <StockRoleContext.Provider value={ctx}>
      {children}
    </StockRoleContext.Provider>
  );
}

export function useStockRole() { return useContext(StockRoleContext); }
