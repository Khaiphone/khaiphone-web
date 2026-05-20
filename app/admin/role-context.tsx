"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchMyRole, fetchMyProfile } from "@/app/actions/admin-users";
import type { AdminRole } from "@/app/actions/admin-users";
import type { Permission } from "@/lib/admin-permissions";

type RoleCtx = { role: AdminRole | null; permissions: Permission[]; loading: boolean };
const RoleContext = createContext<RoleCtx>({ role: null, permissions: [], loading: true });

export function AdminRoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole]         = useState<AdminRole | null>(null);
  const [permissions, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      const profile = await fetchMyProfile(data.user.id);
      if (profile) {
        setRole(profile.role);
        setPerms(profile.permissions);
      } else {
        const r = await fetchMyRole(data.user.id);
        setRole(r);
      }
      setLoading(false);
    });
  }, []);

  return (
    <RoleContext.Provider value={{ role, permissions, loading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useAdminRole() { return useContext(RoleContext); }
