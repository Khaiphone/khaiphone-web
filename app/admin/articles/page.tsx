"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, FileText, Clock, CheckCircle2 } from "lucide-react";
import { fetchAdminArticles, type AdminArticleListItem } from "@/app/actions/articles";

const BG = "var(--admin-bg)", CARD = "var(--admin-card)", BORDER = "var(--admin-border)";
const GOLD = "var(--admin-gold)", TEXT = "var(--admin-text)", TEXT2 = "var(--admin-text2)", TEXT3 = "var(--admin-text3)";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending_review: { label: "รออนุมัติ", color: "#B45309", bg: "#FFF7ED" },
  published:      { label: "เผยแพร่แล้ว", color: "#15803D", bg: "#F0FDF4" },
  archived:       { label: "เก็บเข้าคลัง", color: "#6B7280", bg: "#F3F4F6" },
};

export default function AdminArticlesPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdminArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAdminArticles().then((d) => { setItems(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const pending = items.filter((a) => a.status === "pending_review");
  const others = items.filter((a) => a.status !== "pending_review");

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ position: "sticky", top: 0, background: CARD, zIndex: 10, borderBottom: `1px solid ${BORDER}`, paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ padding: "12px 16px", maxWidth: 820, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={22} /></button>
          <h1 style={{ color: TEXT, fontSize: 18, fontWeight: 700, margin: 0, flex: 1 }}>บทความ (Content pipeline)</h1>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "14px 16px 60px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Loader2 size={22} color={GOLD} style={{ animation: "spin 0.8s linear infinite" }} /></div>
        ) : (
          <>
            <Section title="รออนุมัติ" icon={<Clock size={15} color="#B45309" />} count={pending.length} empty="ยังไม่มีบทความรออนุมัติ — สั่ง /write-article เพื่อให้ผมเขียน draft ให้">
              {pending.map((a) => <Row key={a.id} a={a} onClick={() => router.push(`/admin/articles/${a.id}`)} />)}
            </Section>
            <Section title="เผยแพร่แล้ว / อื่นๆ" icon={<CheckCircle2 size={15} color="#15803D" />} count={others.length} empty="ยังไม่มีบทความเผยแพร่จาก pipeline">
              {others.map((a) => <Row key={a.id} a={a} onClick={() => router.push(`/admin/articles/${a.id}`)} />)}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, count, empty, children }: { title: string; icon: React.ReactNode; count: number; empty: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "6px 0 10px" }}>
        {icon}<span style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT2, background: BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "1px 8px" }}>{count}</span>
      </div>
      {count === 0 ? <p style={{ fontSize: 12.5, color: TEXT3, padding: "4px 2px", lineHeight: 1.6 }}>{empty}</p> : children}
    </div>
  );
}

function Row({ a, onClick }: { a: AdminArticleListItem; onClick: () => void }) {
  const st = STATUS[a.status] ?? STATUS.pending_review;
  return (
    <button onClick={onClick} style={{ width: "100%", textAlign: "left", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer", display: "flex", gap: 12, alignItems: "center", fontFamily: "inherit" }}>
      <div style={{ width: 44, height: 44, borderRadius: 9, flexShrink: 0, overflow: "hidden", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {a.heroImage
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={a.heroImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <FileText size={18} color={TEXT3} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</p>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 5, color: st.color, background: st.bg }}>{st.label}</span>
          <span style={{ fontSize: 11, color: TEXT3 }}>{a.category} · {a.articleDate}</span>
          {a.status === "pending_review" && !a.heroImage && <span style={{ fontSize: 10.5, color: "#DC2626" }}>· ยังไม่มีรูป</span>}
        </div>
      </div>
    </button>
  );
}
