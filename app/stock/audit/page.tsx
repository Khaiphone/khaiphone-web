"use client";

import { useEffect, useState, useMemo } from "react";
import { ClipboardList, Search, RefreshCw } from "lucide-react";
import { useThemeColors } from "@/components/stock/ThemeContext";
import StockTopbar from "@/components/stock/Topbar";
import { fetchAllAuditLog, type AuditRow } from "@/app/actions/stocks";

const ACTION_COLORS: Record<string, string> = {
  "บันทึกเข้าสต็อก": "#22c55e",
  "เปลี่ยนสถานะ":    "#3b82f6",
  "เปลี่ยนราคาขาย":  "#f59e0b",
  "แก้ไขข้อมูล":     "#a855f7",
  "อัปโหลดรูปภาพ":   "#0ea5e9",
  "เปิดดูเอกสาร":    "#8b5cf6",
};

const ALL_ACTIONS = Object.keys(ACTION_COLORS);

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const c = useThemeColors();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("ทั้งหมด");

  async function load() {
    setLoading(true);
    const data = await fetchAllAuditLog();
    setRows(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchAction = filterAction === "ทั้งหมด" || r.action === filterAction;
      const q = search.toLowerCase();
      const matchSearch = !q || r.stockId.toLowerCase().includes(q) || r.model.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q) || r.by.toLowerCase().includes(q);
      return matchAction && matchSearch;
    });
  }, [rows, search, filterAction]);

  return (
    <div style={{ minHeight: "100vh", background: c.bg }}>
      <StockTopbar title="Audit Log" subtitle="ประวัติการเปลี่ยนแปลงทุกรายการ" />

      <div style={{ padding: "24px 28px" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหา Stock ID, รุ่น, รายละเอียด..."
              style={{
                width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                background: c.card, border: `1px solid ${c.border}`, borderRadius: 10,
                color: c.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["ทั้งหมด", ...ALL_ACTIONS].map(a => {
              const active = filterAction === a;
              const color = ACTION_COLORS[a] ?? c.gold;
              return (
                <button
                  key={a} onClick={() => setFilterAction(a)}
                  style={{
                    padding: "7px 12px", borderRadius: 8, border: `1px solid ${active ? color : c.border}`,
                    background: active ? `${color}18` : "transparent",
                    color: active ? color : c.text2,
                    fontSize: 12, fontWeight: active ? 700 : 400,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >{a}</button>
              );
            })}
          </div>
          <button
            onClick={load} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.card, color: c.text2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            รีเฟรช
          </button>
        </div>

        {/* Count */}
        <p style={{ color: c.text3, fontSize: 12, margin: "0 0 14px" }}>
          {loading ? "กำลังโหลด..." : `แสดง ${filtered.length.toLocaleString("th-TH")} รายการ จากทั้งหมด ${rows.length.toLocaleString("th-TH")} รายการ`}
        </p>

        {/* Table */}
        <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "160px 140px 140px 1fr 100px", gap: 0, padding: "10px 20px", borderBottom: `1px solid ${c.border}`, background: c.card2 }}>
            {["เวลา", "Stock ID", "Action", "รายละเอียด", "โดย"].map(h => (
              <span key={h} style={{ color: c.text3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: c.text3 }}>
              <RefreshCw size={24} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
              <p style={{ margin: 0 }}>กำลังโหลด...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: c.text3 }}>
              <ClipboardList size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
              <p style={{ margin: 0 }}>ไม่พบรายการ</p>
            </div>
          ) : (
            filtered.map((row, i) => {
              const color = ACTION_COLORS[row.action] ?? "#6b7280";
              return (
                <div
                  key={i}
                  style={{
                    display: "grid", gridTemplateColumns: "160px 140px 140px 1fr 100px",
                    gap: 0, padding: "12px 20px",
                    borderBottom: i < filtered.length - 1 ? `1px solid ${c.border}` : "none",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: c.text3, fontSize: 12 }}>{fmtDate(row.timestamp)}</span>
                  <span style={{ color: c.gold, fontSize: 12, fontFamily: "monospace", fontWeight: 600 }}>{row.stockId}</span>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color,
                      background: `${color}18`, padding: "3px 8px", borderRadius: 6,
                    }}>{row.action}</span>
                    <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>{row.model}</p>
                  </div>
                  <span style={{ color: c.text2, fontSize: 12, paddingRight: 16, lineHeight: 1.5 }}>{row.detail || "—"}</span>
                  <span style={{ color: c.text3, fontSize: 12 }}>{row.by}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
