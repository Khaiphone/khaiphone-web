"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { fetchMyRole, fetchMyProfile } from "@/app/actions/admin-users";
import type { AdminRole } from "@/app/actions/admin-users";
import type { Permission } from "@/lib/admin-permissions";

type RoleCtx = { role: AdminRole | null; permissions: Permission[]; loading: boolean; userId: string; userName: string; userEmail: string };
const RoleContext = createContext<RoleCtx>({ role: null, permissions: [], loading: true, userId: "", userName: "", userEmail: "" });

export function AdminRoleProvider({ children, value }: { children: React.ReactNode; value?: RoleCtx }) {
  const [role, setRole]         = useState<AdminRole | null>(null);
  const [permissions, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userId, setUserId]       = useState("");
  const [userName, setUserName]   = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // controlled mode — parent (AdminLayoutClient) already fetched profile/role/permissions;
    // skip the duplicate getUser() + fetchMyProfile() round-trip
    if (value) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? "");
      const profile = await fetchMyProfile(data.user.id);
      if (profile) {
        setRole(profile.role);
        setPerms(profile.permissions);
        setUserName(profile.name ?? "");
      } else {
        const r = await fetchMyRole(data.user.id);
        setRole(r);
      }
      setLoading(false);
    });
  }, [value]);

  const ctx = value ?? { role, permissions, loading, userId, userName, userEmail };
  return (
    <RoleContext.Provider value={ctx}>
      {children}
    </RoleContext.Provider>
  );
}

export function useAdminRole() { return useContext(RoleContext); }
