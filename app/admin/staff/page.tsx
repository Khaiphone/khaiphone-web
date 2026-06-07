"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, UserCircle, X, Check, Trash2, ChevronDown, Mail } from "lucide-react";
import {
  fetchAdminUsers, inviteStaff, updateAdminUser, deleteAdminUser, updateAdminPermissions, sendPasswordReset, resetPasswordDirect,
} from "@/app/actions/admin-users";
import { PERMISSION_LABELS } from "@/lib/admin-permissions";
import type { AdminUserRow, AdminRole, Permission } from "@/app/actions/admin-users";
import { useAdminRole } from "@/app/admin/role-context";

const BG = "var(--admin-bg)";
const CARD = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT = "var(--admin-text)";
const TEXT2 = "var(--admin-text2)";
const TEXT3 = "var(--admin-text3)";
const GOLD = "var(--admin-gold)";

const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "เจ้าของ / ผู้จัดการ",
  staff: "พนักงาน",
};
const ROLE_COLOR: Record<AdminRole, { icon: string; bg: string }> = {
  owner: { icon: "var(--admin-gold)", bg: "var(--admin-gold-bg)" },
  staff: { icon: "#3B82F6",           bg: "rgba(59,130,246,0.1)" },
};

export default function StaffPage() {
  const router = useRouter();
  const { userId: myUserId } = useAdminRole();
  const [users, setUsers]     = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ email: "", name: "", role: "staff" as AdminRole });
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string; tempPassword?: string } | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [resetting, setResetting]         = useState<string | null>(null);
  const [resetMsg, setResetMsg]           = useState<Record<string, string>>({});
  const [directReset, setDirectReset]     = useState<{ id: string; tempPassword: string } | null>(null);
  const [expandedPerms, setExpandedPerms] = useState<Set<string>>(new Set());
  const [opError, setOpError] = useState<string | null>(null);

  function showError(msg: string) {
    setOpError(msg);
    setTimeout(() => setOpError(null), 5000);
  }

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
      if (res.tempPassword) {
        setInviteMsg({ ok: true, text: `สร้างบัญชีสำเร็จ (ไม่ได้ส่งอีเมล — email rate limit)`, tempPassword: res.tempPassword });
      } else {
        setInviteMsg({ ok: true, text: `ส่งอีเมลเชิญไปที่ ${form.email} แล้ว` });
      }
      setForm({ email: "", name: "", role: "staff" });
      setShowForm(false);
      await load();
    } else {
      setInviteMsg({ ok: false, text: res.error ?? "เกิดข้อผิดพลาด" });
    }
  }

  async function handleToggleActive(u: AdminUserRow) {
    setUpdating(u.id);
    const res = await updateAdminUser(u.id, { active: !u.active });
    if (res.success) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, active: !u.active } : x));
    else showError("เปลี่ยนสถานะไม่สำเร็จ: " + res.error);
    setUpdating(null);
  }

  async function handleRoleChange(u: AdminUserRow, role: AdminRole) {
    setUpdating(u.id);
    const res = await updateAdminUser(u.id, { role });
    if (res.success) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role } : x));
    else showError("เปลี่ยนตำแหน่งไม่สำเร็จ: " + res.error);
    setUpdating(null);
  }

  async function handlePasswordReset(u: AdminUserRow) {
    setResetting(u.id);
    const res = await sendPasswordReset(u.email);
    setResetting(null);
    if (res.success) {
      setResetMsg(prev => ({ ...prev, [u.id]: `ส่ง reset email ไปที่ ${u.email} แล้ว ✓` }));
      setTimeout(() => setResetMsg(prev => { const n = { ...prev }; delete n[u.id]; return n; }), 5000);
    } else {
      setResetMsg(prev => ({ ...prev, [u.id]: res.error ?? "เกิดข้อผิดพลาด" }));
    }
  }

  async function handleDirectReset(u: AdminUserRow) {
    setResetting(u.id + "-direct");
    const res = await resetPasswordDirect(u.user_id);
    setResetting(null);
    if (res.success) {
      setDirectReset({ id: u.id, tempPassword: res.tempPassword });
    } else {
      setResetMsg(prev => ({ ...prev, [u.id]: res.error ?? "เกิดข้อผิดพลาด" }));
    }
  }

  async function handleDelete(u: AdminUserRow) {
    setDeleting(u.id);
    const res = await deleteAdminUser(u.id, u.user_id);
    if (res.success) setUsers(prev => prev.filter(x => x.id !== u.id));
    else showError("ลบไม่สำเร็จ: " + res.error);
    setDeleting(null);
    setConfirmDelete(null);
  }

  async function handleToggleRider(u: AdminUserRow) {
    setUpdating(u.id);
    const res = await updateAdminUser(u.id, { is_rider: !u.is_rider });
    if (res.success) setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_rider: !u.is_rider } : x));
    else showError("เปลี่ยนสิทธิ์ไรเดอร์ไม่สำเร็จ: " + res.error);
    setUpdating(null);
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

        {opError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#DC2626", fontWeight: 500 }}>{opError}</p>
            <button onClick={() => setOpError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", padding: 0, display: "flex" }}><X size={15} /></button>
          </div>
        )}

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

        {/* Temp password notice (shown after form closes when rate-limited) */}
        {!showForm && inviteMsg?.ok && inviteMsg.tempPassword && (
          <div style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
            <p style={{ color: "#f97316", fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>⚠️ ส่งอีเมลไม่ได้ (rate limit) — บัญชีถูกสร้างแล้ว</p>
            <p style={{ color: TEXT2, fontSize: 12, margin: "0 0 8px" }}>
              แจ้งรหัสผ่านชั่วคราวนี้ให้พนักงานใช้ login ครั้งแรก แล้วเปลี่ยนรหัสผ่านเอง:
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <code style={{ background: "rgba(249,115,22,0.12)", color: "#f97316", padding: "6px 12px", borderRadius: 8, fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", fontFamily: "monospace" }}>
                {inviteMsg.tempPassword}
              </code>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteMsg.tempPassword!); }}
                style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid rgba(249,115,22,0.3)", background: "none", color: "#f97316", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
              >
                คัดลอก
              </button>
            </div>
            <p style={{ color: TEXT3, fontSize: 11, margin: "8px 0 0" }}>URL สำหรับ login: /admin/login</p>
          </div>
        )}

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
                        background: form.role === r ? 'var(--admin-gold-bg)' : BG,
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
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: ROLE_COLOR[u.role].bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <UserCircle size={22} color={ROLE_COLOR[u.role].icon} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => router.push(`/admin/staff/${u.id}`)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: TEXT, fontSize: 14, fontWeight: 600, textDecoration: "underline dotted" }}>{u.name}</button>
                      <span style={{
                        fontSize: 10, padding: "1px 8px", borderRadius: 99, fontWeight: 600,
                        background: ROLE_COLOR[u.role].bg, color: ROLE_COLOR[u.role].icon,
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

                      {/* Reset password via email */}
                      <button
                        onClick={() => handlePasswordReset(u)}
                        disabled={!!resetting}
                        title="ส่ง Reset Password Email"
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 10px", borderRadius: 7,
                          border: `1px solid ${BORDER}`,
                          background: BG, fontSize: 12, color: TEXT2,
                          cursor: resetting === u.id ? "wait" : "pointer",
                          fontFamily: "inherit", opacity: resetting === u.id ? 0.5 : 1,
                        }}
                      >
                        <Mail size={11} /> {resetting === u.id ? "กำลังส่ง..." : "Reset Email"}
                      </button>

                      {/* Direct temp password (no email) */}
                      <button
                        onClick={() => handleDirectReset(u)}
                        disabled={!!resetting}
                        title="สร้าง Temp Password โดยไม่ส่ง email"
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 10px", borderRadius: 7,
                          border: "1px solid rgba(249,115,22,0.35)",
                          background: "rgba(249,115,22,0.08)", fontSize: 12, color: "#f97316",
                          cursor: resetting === u.id + "-direct" ? "wait" : "pointer",
                          fontFamily: "inherit", opacity: resetting === u.id + "-direct" ? 0.5 : 1,
                        }}
                      >
                        <Mail size={11} /> {resetting === u.id + "-direct" ? "กำลังสร้าง..." : "Temp Password"}
                      </button>

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

                      {/* Rider app access toggle (staff only — owners always have access) */}
                      {u.role === "staff" && (
                        <button
                          onClick={() => handleToggleRider(u)}
                          disabled={updating === u.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "5px 10px", borderRadius: 7,
                            border: `1px solid ${u.is_rider ? "rgba(74,222,128,0.4)" : BORDER}`,
                            background: u.is_rider ? "rgba(74,222,128,0.1)" : BG,
                            fontSize: 12, color: u.is_rider ? "#16a34a" : TEXT2,
                            cursor: "pointer", fontFamily: "inherit",
                            opacity: updating === u.id ? 0.5 : 1,
                          }}
                        >
                          {u.is_rider ? <><Check size={11} /> แอพไรเดอร์</> : <>แอพไรเดอร์</>}
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
                              background: 'rgba(239,68,68,0.1)', fontSize: 12, color: "#EF4444",
                              cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            <Trash2 size={11} /> ลบ
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  {resetMsg[u.id] && (
                    <p style={{ color: resetMsg[u.id].includes("✓") ? "#10B981" : "#EF4444", fontSize: 12, margin: "8px 0 0" }}>
                      {resetMsg[u.id]}
                    </p>
                  )}
                  {directReset?.id === u.id && (
                    <div style={{ marginTop: 10, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 10, padding: "10px 14px" }}>
                      <p style={{ color: "#f97316", fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>รหัสผ่านชั่วคราว (แจ้งให้พนักงานด้วยตนเอง)</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <code style={{ background: "rgba(249,115,22,0.12)", color: "#f97316", padding: "5px 12px", borderRadius: 7, fontSize: 15, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em" }}>
                          {directReset.tempPassword}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(directReset.tempPassword)}
                          style={{ padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(249,115,22,0.3)", background: "none", color: "#f97316", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          คัดลอก
                        </button>
                        <button
                          onClick={() => setDirectReset(null)}
                          style={{ padding: "4px 8px", borderRadius: 7, border: `1px solid ${BORDER}`, background: "none", color: TEXT3, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}
                        >
                          ปิด
                        </button>
                      </div>
                      <p style={{ color: TEXT3, fontSize: 11, margin: "6px 0 0" }}>Login ที่ /admin/login · แนะนำให้เปลี่ยนรหัสทันทีหลัง login</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions panel (staff only, expanded) */}
              {u.role === "staff" && expandedPerms.has(u.id) && (
                <div style={{ background: BG, borderTop: `1px solid ${BORDER}`, padding: "12px 16px 14px" }}>
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
                            background: checked ? 'var(--admin-gold-bg)' : CARD,
                            border: checked ? '1px solid rgba(184,134,11,0.3)' : `1px solid ${BORDER}`,
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
