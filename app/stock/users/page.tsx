"use client";

import { useEffect, useState } from "react";
import { UserCog, Shield, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import MetricCard from "@/components/stock/MetricCard";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchAdminUsers } from "@/app/actions/admin-users";
import type { AdminUserRow } from "@/app/actions/admin-users";

function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

const ROLE_LABELS: Record<string, string> = { owner: "Owner", staff: "Staff" };
const ROLE_COLORS: Record<string, string> = { owner: "#D4AF37", staff: "#3b82f6" };

export default function UsersPage() {
  const c = useThemeColors();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminUsers().then(d => { setUsers(d); setLoading(false); });
  }, []);

  const owners = users.filter(u => u.role === "owner").length;
  const staff = users.filter(u => u.role === "staff").length;
  const active = users.filter(u => u.active).length;

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Users" subtitle="จัดการผู้ใช้งานระบบ" />

      <div style={{ padding: 24 }}>
        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          <MetricCard icon={Users}   label="ผู้ใช้ทั้งหมด"  value={`${users.length} คน`}   iconColor={c.gold}    sub="รวมทุก role" />
          <MetricCard icon={Shield}  label="Owner"          value={`${owners} คน`}          iconColor="#D4AF37"   sub="สิทธิ์เต็ม" />
          <MetricCard icon={UserCog} label="Staff"          value={`${staff} คน`}           iconColor="#3b82f6"   sub="สิทธิ์จำกัด" />
          <MetricCard icon={Users}   label="Active"         value={`${active} คน`}          iconColor="#22c55e"   sub="บัญชีที่ใช้งานอยู่" />
        </div>

        {/* Table */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: c.text3 }}>กำลังโหลด...</div>
          ) : users.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: c.text3 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
              <p style={{ margin: 0 }}>ยังไม่มีผู้ใช้งาน</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: c.card2 }}>
                  {["ผู้ใช้", "Email", "Role", "สิทธิ์", "สถานะ", "เพิ่มเมื่อ"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ borderBottom: `1px solid ${c.border}` }}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: u.role === "owner" ? `linear-gradient(135deg, ${c.gold}, ${c.goldHov})` : c.card2,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            <span style={{ color: u.role === "owner" ? "#000" : c.text2, fontSize: 14, fontWeight: 700 }}>
                              {(u.name || u.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{u.name || "—"}</p>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: c.text2, fontSize: 13 }}>{u.email}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                          background: `${ROLE_COLORS[u.role] ?? c.info}18`,
                          color: ROLE_COLORS[u.role] ?? c.info,
                          border: `1px solid ${ROLE_COLORS[u.role] ?? c.info}30`,
                        }}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {u.permissions.length === 0 ? (
                          <span style={{ color: c.text3, fontSize: 12 }}>ทั้งหมด</span>
                        ) : (
                          <span style={{ color: c.text2, fontSize: 12 }}>{u.permissions.length} สิทธิ์</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99,
                          background: u.active ? "rgba(34,197,94,0.12)" : "rgba(107,114,128,0.12)",
                          color: u.active ? "#22c55e" : "#6b7280",
                        }}>
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", color: c.text3, fontSize: 12 }}>{fmtDate(u.created_at)}</td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        <p style={{ color: c.text3, fontSize: 12, textAlign: "center", marginTop: 16 }}>
          จัดการผู้ใช้ได้ที่ <a href="/finance/users" style={{ color: c.gold, textDecoration: "none" }}>Finance → Users</a>
        </p>
      </div>
    </div>
  );
}
