"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Trash2, X, CheckCircle2, ChevronRight, Settings2 } from "lucide-react";
import { fetchAllRidersList, adminInviteRider, adminRemoveRider } from "@/app/actions/rider-tracking";
import { fetchRankConfigs } from "@/app/actions/rider-stats";
import type { RankConfig, RiderTier } from "@/app/actions/rider-stats";
import { computeMonthlyTier } from "@/lib/rider-kpi";

const DARK = "#1a1a2e";
const GOLD = "#c9a84c";
const BORDER = "#e5e7eb";
const TEXT = "#1a1a1a";
const TEXT2 = "#6b7280";
const GREEN = "#16a34a";
const RED = "#dc2626";
const BLUE = "#2563eb";

const TIER_EMOJI: Record<string, string> = { bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎" };
const TIER_COLOR: Record<string, string> = { bronze: "#cd7f32", silver: "#9ca3af", gold: "#c9a84c", diamond: "#60a5fa" };

type Rider = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
  monthly_jobs?: number;
  rank_tier_override?: string | null;
};

export default function ManageRidersPage() {
  const router = useRouter();
  const [riders, setRiders]       = useState<Rider[]>([]);
  const [rankConfigs, setRankConfigs] = useState<RankConfig[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Rider | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    const [data, configs] = await Promise.all([fetchAllRidersList(), fetchRankConfigs()]);
    setRiders(data as Rider[]);
    setRankConfigs(configs);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    setInviting(true);
    setInviteResult(null);
    const res = await adminInviteRider(inviteEmail.trim(), inviteName.trim());
    if (res.success) {
      setInviteResult({ ok: true, msg: `ส่งคำเชิญไปที่ ${inviteEmail} แล้ว` });
      setInviteEmail("");
      setInviteName("");
      load();
    } else {
      setInviteResult({ ok: false, msg: res.error });
    }
    setInviting(false);
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    await adminRemoveRider(removeTarget.user_id);
    setRemoveTarget(null);
    setRemoving(false);
    load();
  }

  const ROLE_LABEL: Record<string, string> = { owner: "เจ้าของ", staff: "พนักงาน" };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: DARK, padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, color: GOLD, fontSize: 18, fontWeight: 800 }}>จัดการไรเดอร์</h1>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.5)" }}>{riders.length} คนในระบบ</p>
        </div>
        <button
          onClick={() => router.push("/admin/riders/ranks")}
          style={{ background: "rgba(255,255,255,.1)", border: "none", color: "rgba(255,255,255,.7)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, fontFamily: "inherit" }}
        >
          <Settings2 size={13} /> ตั้งค่าระดับ
        </button>
        <button
          onClick={() => { setShowInvite(true); setInviteResult(null); }}
          style={{ background: GOLD, border: "none", color: DARK, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
        >
          <UserPlus size={14} /> เพิ่มไรเดอร์
        </button>
      </div>

      <div style={{ padding: 20, maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: TEXT2 }}>กำลังโหลด...</div>
        ) : riders.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: TEXT2, background: "#fff", borderRadius: 14, border: `1px solid ${BORDER}` }}>
            ยังไม่มีสมาชิกในระบบ
          </div>
        ) : riders.map(r => (
          <div
            key={r.user_id}
            onClick={() => router.push(`/admin/riders/${r.user_id}`)}
            style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "box-shadow .15s" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.10)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
          >
            {/* Avatar */}
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#f3f4f6", border: `2px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
              👤
            </div>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{r.name}</span>
                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: r.role === "owner" ? `${GOLD}20` : `${BLUE}15`, color: r.role === "owner" ? "#92700c" : BLUE, fontWeight: 600 }}>
                  {ROLE_LABEL[r.role] ?? r.role}
                </span>
                {(() => {
                  const tier = computeMonthlyTier(r.monthly_jobs ?? 0, rankConfigs, r.rank_tier_override as RiderTier | null);
                  const isOverride = !!r.rank_tier_override;
                  return (
                    <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: `${TIER_COLOR[tier]}18`, color: TIER_COLOR[tier], fontWeight: 700 }}>
                      {TIER_EMOJI[tier]} {isOverride ? "★" : ""}
                    </span>
                  );
                })()}
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT2 }}>
                {r.email ?? "—"}
              </p>
            </div>
            {/* Remove button (don't allow removing owner) */}
            {r.role !== "owner" ? (
              <button
                onClick={e => { e.stopPropagation(); setRemoveTarget(r); }}
                style={{ background: "rgba(220,38,38,0.08)", border: `1px solid rgba(220,38,38,0.2)`, color: RED, borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, flexShrink: 0 }}
              >
                <Trash2 size={13} /> นำออก
              </button>
            ) : (
              <ChevronRight size={16} color={TEXT2} style={{ flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowInvite(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: 28, width: "100%", maxWidth: 400 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: TEXT }}>เพิ่มไรเดอร์ใหม่</p>
              <button onClick={() => setShowInvite(false)} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, padding: 0 }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>ชื่อ-นามสกุล</label>
                <input
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: TEXT2, display: "block", marginBottom: 6 }}>อีเมล</label>
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="rider@email.com"
                  type="email"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              {inviteResult && (
                <div style={{ padding: "10px 12px", borderRadius: 10, background: inviteResult.ok ? `${GREEN}12` : `${RED}10`, border: `1px solid ${inviteResult.ok ? GREEN : RED}30`, display: "flex", alignItems: "center", gap: 8 }}>
                  {inviteResult.ok ? <CheckCircle2 size={14} color={GREEN} /> : <X size={14} color={RED} />}
                  <span style={{ fontSize: 13, color: inviteResult.ok ? GREEN : RED }}>{inviteResult.msg}</span>
                </div>
              )}

              <p style={{ margin: 0, fontSize: 12, color: TEXT2, lineHeight: 1.5 }}>
                ระบบจะส่งอีเมลเชิญให้ไรเดอร์ตั้งรหัสผ่านและเข้าใช้แอพ
              </p>

              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim() || !inviteName.trim()}
                style={{ padding: "12px 0", borderRadius: 12, border: "none", background: DARK, color: GOLD, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (inviting || !inviteEmail.trim() || !inviteName.trim()) ? 0.5 : 1 }}
              >
                {inviting ? "กำลังส่ง..." : "ส่งคำเชิญ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm */}
      {removeTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setRemoveTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 }}>
            <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: TEXT }}>นำ {removeTarget.name} ออกจากระบบ?</p>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: TEXT2, lineHeight: 1.6 }}>
              ระบบจะ clock-out shift ที่เปิดอยู่ และลบบัญชีออกจาก admin panel ทันที
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setRemoveTarget(null)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", fontSize: 14, color: TEXT2, cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
              <button onClick={handleRemove} disabled={removing} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: RED, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: removing ? 0.6 : 1 }}>
                {removing ? "กำลังลบ..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
