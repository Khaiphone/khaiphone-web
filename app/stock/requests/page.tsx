"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, ExternalLink, Package, RefreshCw,
  Globe, MessageCircle, Phone, Store,
  ChevronRight, PlusCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchStockRequests, fetchRequestStats, createStockFromRequest } from "@/app/actions/stock-requests";
import { cacheGet, cacheSet } from "@/app/stock/cache";
import type { StockRequest, RequestStats } from "@/app/actions/stock-requests";
import type { RequestStatus } from "@/lib/types/admin";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types/admin";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const SOURCE_ICON: Record<string, React.ReactNode> = {
  website:  <Globe size={12} />,
  line:     <MessageCircle size={12} />,
  facebook: <Globe size={12} />,
  phone:    <Phone size={12} />,
  manual:   <Store size={12} />,
};
const SOURCE_LABEL: Record<string, string> = {
  website: "เว็บไซต์", line: "LINE", facebook: "Facebook", phone: "โทรศัพท์", manual: "หน้าร้าน",
};

const TAB_FILTERS: Array<{ label: string; value: string }> = [
  { label: "ทั้งหมด",        value: "all" },
  { label: "รอดำเนินการ",    value: "active" },
  { label: "คำขอใหม่",       value: "new" },
  { label: "ยืนยันนัด",      value: "confirmed" },
  { label: "รอยืนยันราคา",  value: "price_negotiation" },
  { label: "กำลังทำสัญญา",  value: "contracting" },
  { label: "เสร็จสิ้น",      value: "completed" },
  { label: "ยกเลิก/ปฏิเสธ", value: "closed" },
];

const ACTIVE_STATUSES: RequestStatus[] = [
  "new", "pending", "inspecting", "confirmed", "pickup_scheduled", "price_negotiation", "contracting",
];

export default function StockRequestsPage() {
  const c = useThemeColors();
  const router = useRouter();
  const [requests, setRequests] = useState<StockRequest[]>(() => cacheGet<StockRequest[]>("stock:requests") ?? []);
  const [stats, setStats] = useState<RequestStats>(() => cacheGet<RequestStats>("stock:requestStats") ?? { total: 0, pending: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(() => cacheGet<StockRequest[]>("stock:requests") === null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const [reqs, st] = await Promise.all([fetchStockRequests(), fetchRequestStats()]);
    setRequests(reqs);
    setStats(st);
    cacheSet("stock:requests", reqs);
    cacheSet("stock:requestStats", st);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: listen for INSERT/UPDATE on requests table
  useEffect(() => {
    const channel = supabase
      .channel("stock-requests-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "requests" }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "stocks" },   () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function handleCreateStock(req: StockRequest) {
    setCreating(req.id);
    const result = await createStockFromRequest(req.id);
    if (result.success) {
      await load();
      router.push(`/stock/inventory/${result.stockId}`);
    } else {
      alert(result.error);
    }
    setCreating(null);
  }

  const filtered = useMemo(() => {
    let list = requests;
    if (tab === "active")      list = list.filter(r => ACTIVE_STATUSES.includes(r.status));
    else if (tab === "closed") list = list.filter(r => r.status === "cancelled" || r.status === "rejected");
    else if (tab !== "all")    list = list.filter(r => r.status === tab);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        r.orderNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(q) ||
        r.deviceModel.toLowerCase().includes(q),
      );
    }
    return list;
  }, [requests, tab, search]);

  const tabCount = (value: string) => {
    if (value === "all")    return requests.length;
    if (value === "active") return requests.filter(r => ACTIVE_STATUSES.includes(r.status)).length;
    if (value === "closed") return requests.filter(r => r.status === "cancelled" || r.status === "rejected").length;
    return requests.filter(r => r.status === value).length;
  };

  const inputSt: React.CSSProperties = {
    background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10,
    color: c.text, fontSize: 13, padding: "8px 12px 8px 36px",
    fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box",
  };

  if (loading) return (
    <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: c.text3 }}>
      กำลังโหลด...
    </div>
  );

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="คำขอรับซื้อ" subtitle={`ทั้งหมด ${stats.total} คำขอ`}>
        <button
          onClick={() => load(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `1px solid ${c.border}`, borderRadius: 10, background: "none", color: c.text2, fontSize: 13, cursor: "pointer" }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          รีเฟรช
        </button>
      </StockTopbar>

      <div style={{ paddingTop: 24, overflowX: "hidden" }} className="px-3 md:px-6">
        {/* Stats */}
        <div style={{ display: "grid", gap: 12, marginBottom: 24 }} className="grid-cols-2 md:grid-cols-4">
          {[
            { label: "คำขอทั้งหมด",   value: stats.total,     color: c.gold,    bg: c.goldBg },
            { label: "รอดำเนินการ",    value: stats.pending,   color: "#f97316", bg: "rgba(249,115,22,0.1)" },
            { label: "เสร็จสิ้น",      value: stats.completed, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
            { label: "ยกเลิก/ปฏิเสธ", value: stats.cancelled, color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "16px 20px" }}>
              <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>{label}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color }}>{value}</span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: bg, color, fontWeight: 600 }}>คำขอ</span>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาเลขคำขอ, ชื่อลูกค้า, รุ่นเครื่อง..."
            style={inputSt}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, marginBottom: 16, scrollbarWidth: "none" } as React.CSSProperties}>
          {TAB_FILTERS.map(({ label, value }) => {
            const active = tab === value;
            const count = tabCount(value);
            return (
              <button
                key={value}
                onClick={() => setTab(value)}
                style={{
                  flexShrink: 0, padding: "6px 14px", borderRadius: 999,
                  fontFamily: "inherit", fontSize: 13, fontWeight: active ? 700 : 400,
                  border: active ? `1px solid rgba(212,175,55,0.4)` : `1px solid ${c.border}`,
                  background: active ? c.goldBg : c.card,
                  color: active ? c.gold : c.text2, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >
                {label} {count > 0 && <span style={{ opacity: 0.7 }}>{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "60px 0", textAlign: "center", color: c.text3 }}>
              <Package size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: 0 }}>ไม่พบคำขอที่ตรงกัน</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["เลขคำขอ", "ลูกค้า", "เครื่อง", "ราคา", "ช่องทาง", "สถานะ", "วันที่", "สต็อก"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "12px 16px", color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((req, i) => (
                      <RequestRow
                        key={req.id}
                        req={req}
                        index={i}
                        c={c}
                        creating={creating === req.id}
                        onViewAdmin={() => router.push(`/admin/requests/${req.id}`)}
                        onViewStock={() => req.stockId && router.push(`/stock/inventory/${req.stockId}`)}
                        onCreateStock={() => handleCreateStock(req)}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ color: c.text3, fontSize: 12, textAlign: "center", marginTop: 16 }}>
          แสดง {filtered.length} จาก {requests.length} คำขอ · อัปเดต realtime
        </p>
      </div>
    </div>
  );
}

function RequestRow({
  req, index, c, creating, onViewAdmin, onViewStock, onCreateStock,
}: {
  req: StockRequest;
  index: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: any;
  creating: boolean;
  onViewAdmin: () => void;
  onViewStock: () => void;
  onCreateStock: () => void;
}) {
  const statusColor = STATUS_COLORS[req.status] ?? { bg: "transparent", text: c.text3, border: "transparent" };
  const [hovered, setHovered] = useState(false);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ borderBottom: `1px solid ${c.border}`, background: hovered ? c.card2 : "transparent", transition: "background 150ms" }}
    >
      {/* Order number */}
      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
        <button onClick={onViewAdmin} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: c.gold, fontSize: 12, fontFamily: "monospace", fontWeight: 700 }}>{req.orderNumber}</span>
          <ExternalLink size={11} color={c.text3} />
        </button>
        <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>
          {req.orderNumber.startsWith("KH-") ? "เว็บ" : "แอดมิน"}
        </p>
      </td>

      {/* Customer */}
      <td style={{ padding: "14px 16px" }}>
        <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{req.customerName || "—"}</p>
        <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>{req.customerPhone}</p>
      </td>

      {/* Device */}
      <td style={{ padding: "14px 16px" }}>
        <p style={{ color: c.text, fontSize: 13, fontWeight: 500, margin: 0 }}>{req.deviceModel}</p>
        <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>
          {[req.deviceStorage, req.deviceColor].filter(Boolean).join(" · ")}
        </p>
      </td>

      {/* Price */}
      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
        {req.actualPrice ? (
          <>
            <p style={{ color: c.gold, fontSize: 13, fontWeight: 700, margin: 0 }}>฿{fmt(req.actualPrice)}</p>
            <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0", textDecoration: "line-through" }}>฿{fmt(req.estimatedPrice)}</p>
          </>
        ) : (
          <p style={{ color: c.text2, fontSize: 13, margin: 0 }}>฿{fmt(req.estimatedPrice)}</p>
        )}
      </td>

      {/* Source */}
      <td style={{ padding: "14px 16px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: c.text2, background: c.card2, padding: "3px 8px", borderRadius: 6 }}>
          {SOURCE_ICON[req.source] ?? <Globe size={12} />}
          {SOURCE_LABEL[req.source] ?? req.source}
        </span>
      </td>

      {/* Status */}
      <td style={{ padding: "14px 16px" }}>
        <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}`, whiteSpace: "nowrap" }}>
          {STATUS_LABELS[req.status] ?? req.status}
        </span>
      </td>

      {/* Date */}
      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
        <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>{fmtDate(req.createdAt)}</p>
      </td>

      {/* Stock */}
      <td style={{ padding: "14px 16px" }}>
        {req.stockId ? (
          <button
            onClick={onViewStock}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: `1px solid rgba(34,197,94,0.3)`, background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            <Package size={12} />
            {req.stockId}
            <ChevronRight size={11} />
          </button>
        ) : req.status === "completed" ? (
          <button
            onClick={onCreateStock}
            disabled={creating}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8, border: `1px solid rgba(249,115,22,0.3)`, background: "rgba(249,115,22,0.08)", color: "#f97316", fontSize: 11, fontWeight: 600, cursor: creating ? "wait" : "pointer", opacity: creating ? 0.6 : 1 }}
          >
            <PlusCircle size={12} />
            {creating ? "กำลังสร้าง..." : "สร้างสต็อก"}
          </button>
        ) : (
          <span style={{ color: c.text3, fontSize: 12 }}>—</span>
        )}
      </td>
    </motion.tr>
  );
}
