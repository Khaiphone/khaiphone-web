"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { fetchRecentActivity } from "@/app/actions/admin-requests";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";
const GOLD   = "var(--admin-gold)";

type ActivityLog = Awaited<ReturnType<typeof fetchRecentActivity>>[number];

const ACTION_COLOR: Record<string, string> = {
  "สร้างคำขอ":    "#10B981",
  "ลบคำขอ":       "#EF4444",
  "เปลี่ยนสถานะ": GOLD,
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export default function ActivityPage() {
  const router = useRouter();
  const [logs,    setLogs]    = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 30;

  useEffect(() => {
    fetchRecentActivity(200).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, []);

  const paginated  = logs.slice(0, page * PAGE_SIZE);
  const hasMore    = paginated.length < logs.length;

  // Group by date
  const grouped: { date: string; items: ActivityLog[] }[] = [];
  for (const log of paginated) {
    const date = fmtDate(log.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) { last.items.push(log); }
    else { grouped.push({ date, items: [log] }); }
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: CARD, zIndex: 10, padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ color: TEXT, fontSize: "17px", fontWeight: 700, margin: 0, flex: 1 }}>กิจกรรมทั้งหมด</h1>
        {!loading && <span style={{ color: TEXT3, fontSize: "13px" }}>{logs.length} รายการ</span>}
      </div>

      <div style={{ padding: "16px" }}>
        {loading ? (
          <p style={{ color: TEXT3, textAlign: "center", padding: "40px 0" }}>กำลังโหลด...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: TEXT3, textAlign: "center", padding: "40px 0" }}>ยังไม่มีกิจกรรม</p>
        ) : (
          <>
            {grouped.map(({ date, items }) => (
              <div key={date} style={{ marginBottom: 20 }}>
                <p style={{ color: TEXT3, fontSize: "12px", fontWeight: 600, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{date}</p>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                  {items.map((log, i) => {
                    const color = ACTION_COLOR[log.action] ?? GOLD;
                    return (
                      <div key={log.id} style={{ padding: "12px 16px", borderBottom: i < items.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 6, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ color: TEXT, fontSize: "13px", fontWeight: 600 }}>{log.action}</span>
                            <span style={{ color: TEXT3, fontSize: "11px", whiteSpace: "nowrap" }}>{fmtTime(log.created_at)}</span>
                          </div>
                          <div style={{ marginTop: 2 }}>
                            {log.order_number && <span style={{ color, fontSize: "12px", fontWeight: 700 }}>{log.order_number} </span>}
                            {log.detail && <span style={{ color: TEXT2, fontSize: "12px" }}>{log.detail}</span>}
                          </div>
                          <p style={{ color: TEXT3, fontSize: "11px", margin: "2px 0 0" }}>โดย {log.performed_by_name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => setPage(p => p + 1)}
                style={{ width: "100%", padding: "14px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, color: GOLD, fontSize: "14px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                โหลดเพิ่มเติม ({logs.length - paginated.length} รายการ)
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
