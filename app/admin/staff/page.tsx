"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, UserCircle, X, Check, Trash2, ChevronDown } from "lucide-react";
import {
  fetchAdminUsers, inviteStaff, updateAdminUser, deleteAdminUser, updateAdminPermissions,
} from "@/app/actions/admin-users";
import { PERMISSION_LABELS } from "@/lib/admin-permissions";
import { supabase } from "@/lib/supabase";
import type { AdminUserRow, AdminRole, Permission } from "@/app/actions/admin-users";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "เจ้าของ / ผู้จัดการ",
  staff: "พนักงาน",
};
const ROLE_COLOR: Record<AdminRole, string> = { owner: GOLD, staff: "#3B82F6" };

export default function StaffPage() {
  const router = useRouter();
  const [users, setUsers]     = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ email: "", name: "", role: "staff" as AdminRole });
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [myUserId, setMyUserId]           = useState<string | null>(null);
  const [expandedPerms, setExpandedPerms] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));
  }, []);

  async function load() {
    const data = await fetchAdminUsers();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleInvite() {
    if (!form.email.trim() || !form.name.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    const res = await inviteStaff(form.email.trim(), form.name.trim(), form.role);
    setInviting(false);
    if (res.success) {
      setInviteMsg({ ok: true, text: `ส่งอีเมลเชิญไปที่ ${form.email} แล้ว` });
      setForm({ email: "", name: "", role: "staff" });
      setShowForm(false);
      await load();
    } else {
      setInviteMsg({ ok: false, text: res.error ?? "เกิดข้อผิดพลาด" });
    }
  }

  async function handleToggleActive(u: AdminUserRow) {
    setUpdating(u.id);
    await updateAdminUser(u.id, { active: !u.active });
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: !u.active } : x));
    setUpdating(null);
  }

  async function handleRoleChange(u: AdminUserRow, role: AdminRole) {
    setUpdating(u.id);
    await updateAdminUser(u.id, { role });
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
    setUpdating(null);
  }

  async function handleDelete(u: AdminUserRow) {
    setDeleting(u.id);
    await deleteAdminUser(u.id, u.user_id);
    setUsers(prev => prev.filter(x => x.id !== u.id));
    setDeleting(null);
    setConfirmDelete(null);
  }

  async function handlePermissionToggle(u: AdminUserRow, perm: Permission) {
    const current = u.permissions ?? [];
    const next = current.includes(perm)
      ? current.filter(p => p !== perm)
      : [...current, perm];
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, permissions: next } : x));
    await updateAdminPermissions(u.id, next);
  }

  function toggleExpand(id: string) {
    setExpandedPerms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ padding: "52px 16px 32px", maxWidth: 680, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}>
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>จัดการทีม</h1>
              <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>{users.length} บัญชี</p>
            </div>
          </div>
          {!showForm && (
            <button
              onClick={() => { setShowForm(true); setInviteMsg(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", border: "none", borderRadius: 10,
                background: GOLD, color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <Plus size={15} /> เชิญพนักงาน
            </button>
          )}
        </div>

        {/* Invite form */}
        {showForm && (
          <div style={{ background: CARD, border: `1px solid ${GOLD}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0 }}>เชิญพนักงานใหม่</p>
              <button onClick={() => { setShowForm(false); setInviteMsg(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT3, display: "flex" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "ชื่อ-นามสกุล", key: "name", placeholder: "เช่น สมชาย ใจดี", type: "text" },
                { label: "อีเมล",         key: "email", placeholder: "staff@example.com",  type: "email" },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
                  <input
                    type={type}
                    value={form[key as "name" | "email"]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 13, color: TEXT, fontFamily: "inherit", outline: "none" }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>สิทธิ์การใช้งาน</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["staff", "owner"] as AdminRole[]).map(r => (
                    <label
                      key={r}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${form.role === r ? GOLD : BORDER}`,
                        background: form.role === r ? `${GOLD}10` : BG,
                      }}
                    >
                      <input type="radio" checked={form.role === r} onChange={() => setForm(p => ({ ...p, role: r }))} style={{ accentColor: GOLD }} />
                      <span style={{ color: TEXT, fontSize: 13 }}>{ROLE_LABEL[r]}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {inviteMsg && (
              <p style={{ color: inviteMsg.ok ? "#10B981" : "#EF4444", fontSize: 12, margin: "10px 0 0" }}>
                {inviteMsg.text}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => { setShowForm(false); setInviteMsg(null); }}
                style={{ padding: "8px 16px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "none", color: TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting}
                style={{ padding: "8px 20px", border: "none", borderRadius: 8, background: GOLD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: inviting ? 0.6 : 1 }}
              >
                {inviting ? "กำลังส่ง..." : "ส่งอีเมลเชิญ"}
              </button>
            </div>
          </div>
        )}

        {/* User list */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          {loading ? (
            <p style={{ color: TEXT3, textAlign: "center", padding: "32px 0", fontSize: 14 }}>กำลังโหลด...</p>
          ) : users.length === 0 ? (
            <p style={{ color: TEXT3, textAlign: "center", padding: "32px 0", fontSize: 14 }}>ยังไม่มีบัญชีในระบบ</p>
          ) : users.map((u, i) => (
            <div
              key={u.id}
              style={{
                borderBottom: i < users.length - 1 ? `1px solid ${BORDER}` : "none",
                opacity: u.active ? 1 : 0.5,
              }}
            >
              {/* User row */}
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${ROLE_COLOR[u.role]}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <UserCircle size={22} color={ROLE_COLOR[u.role]} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: 0 }}>{u.name}</p>
                      <span style={{
                        fontSize: 10, padding: "1px 8px", borderRadius: 99, fontWeight: 600,
                        background: `${ROLE_COLOR[u.role]}18`, color: ROLE_COLOR[u.role],
                      }}>{ROLE_LABEL[u.role]}</span>
                      {!u.active && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 99, background: "#F3F4F6", color: TEXT3 }}>ปิดใช้งาน</span>}
                    </div>
                    <p style={{ color: TEXT3, fontSize: 12, margin: "3px 0 10px" }}>{u.email}</p>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {/* Role toggle */}
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u, e.target.value as AdminRole)}
                        disabled={updating === u.id || u.user_id === myUserId}
                        style={{
                          padding: "5px 8px", borderRadius: 7, border: `1px solid ${BORDER}`,
                          fontSize: 12, color: TEXT2, background: BG, cursor: "pointer",
                          fontFamily: "inherit", outline: "none",
                        }}
                      >
                        <option value="staff">พนักงาน</option>
                        <option value="owner">เจ้าของ / ผู้จัดการ</option>
                      </select>

                      {/* Active toggle */}
                      {u.user_id !== myUserId && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={updating === u.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "5px 10px", borderRadius: 7, border: `1px solid ${BORDER}`,
                            background: BG, fontSize: 12, color: u.active ? "#EF4444" : "#10B981",
                            cursor: "pointer", fontFamily: "inherit",
                            opacity: updating === u.id ? 0.5 : 1,
                          }}
                        >
                          {u.active ? <><X size={11} /> ปิดใช้งาน</> : <><Check size={11} /> เปิดใช้งาน</>}
                        </button>
                      )}

                      {/* Permissions toggle (staff only) */}
                      {u.role === "staff" && (
                        <button
                          onClick={() => toggleExpand(u.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "5px 10px", borderRadius: 7,
                            border: `1px solid ${expandedPerms.has(u.id) ? GOLD : BORDER}`,
                            background: expandedPerms.has(u.id) ? `${GOLD}10` : BG,
                            fontSize: 12, color: expandedPerms.has(u.id) ? GOLD : TEXT2,
                            cursor: "pointer", fontFamily: "inherit",
                          }}
                        >
                          สิทธิ์การเข้าถึง
                          <ChevronDown size={11} style={{ transform: expandedPerms.has(u.id) ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                        </button>
                      )}

                      {/* Delete */}
                      {u.user_id !== myUserId && (
                        confirmDelete === u.id ? (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: TEXT2 }}>ยืนยันลบ?</span>
                            <button
                              onClick={() => handleDelete(u)}
                              disabled={deleting === u.id}
                              style={{
                                display: "flex", alignItems: "center", gap: 4,
                                padding: "5px 10px", borderRadius: 7, border: "none",
                                background: "#EF4444", color: "#fff", fontSize: 12,
                                cursor: "pointer", fontFamily: "inherit",
                                opacity: deleting === u.id ? 0.6 : 1,
                              }}
                            >
                              {deleting === u.id ? "กำลังลบ..." : "ลบ"}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              style={{ padding: "5px 8px", borderRadius: 7, border: `1px solid ${BORDER}`, background: BG, fontSize: 12, color: TEXT2, cursor: "pointer", fontFamily: "inherit" }}
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "5px 10px", borderRadius: 7,
                              border: "1px solid rgba(239,68,68,0.3)",
                              background: "#FEF2F2", fontSize: 12, color: "#EF4444",
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            <Trash2 size={11} /> ลบ
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Permissions panel (staff only, expanded) */}
              {u.role === "staff" && expandedPerms.has(u.id) && (
                <div style={{ background: "#FAFAFA", borderTop: `1px solid ${BORDER}`, padding: "12px 16px 14px" }}>
                  <p style={{ color: TEXT3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>
                    สิทธิ์เพิ่มเติม
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(Object.keys(PERMISSION_LABELS) as Permission[]).map(perm => {
                      const { label, sub } = PERMISSION_LABELS[perm];
                      const checked = (u.permissions ?? []).includes(perm);
                      return (
                        <label
                          key={perm}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 10,
                            cursor: "pointer", padding: "8px 10px", borderRadius: 10,
                            background: checked ? `${GOLD}08` : CARD,
                            border: `1px solid ${checked ? `${GOLD}30` : BORDER}`,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handlePermissionToggle(u, perm)}
                            style={{ accentColor: GOLD, marginTop: 2, flexShrink: 0 }}
                          />
                          <div>
                            <p style={{ color: TEXT, fontSize: 13, fontWeight: 600, margin: 0 }}>{label}</p>
                            <p style={{ color: TEXT3, fontSize: 11, margin: "2px 0 0" }}>{sub}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
