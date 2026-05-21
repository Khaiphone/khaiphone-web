"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { useThemeColors } from "@/components/stock/ThemeContext";
import StockTopbar from "@/components/stock/Topbar";
import { fetchHealthReport, type HealthReport } from "@/app/actions/health";

function fmtDate(s: string) {
  return new Date(s).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StatusIcon({ status }: { status: "ok" | "warn" | "error" }) {
  if (status === "ok")    return <CheckCircle2 size={18} color="#22c55e" />;
  if (status === "warn")  return <AlertTriangle size={18} color="#f59e0b" />;
  return <XCircle size={18} color="#ef4444" />;
}

const STATUS_COLOR = { ok: "#22c55e", warn: "#f59e0b", error: "#ef4444" };
const STATUS_LABEL = { ok: "ปกติ", warn: "เตือน", error: "ขัดข้อง" };

export default function HealthPage() {
  const c = useThemeColors();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetchHealthReport();
    setReport(r);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const overall = report?.overallStatus ?? "ok";
  const overallColor = STATUS_COLOR[overall];

  return (
    <div style={{ minHeight: "100vh", background: c.bg }}>
      <StockTopbar title="Health Dashboard" subtitle="ตรวจสอบสถานะระบบ" />

      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Overall status banner */}
        <div style={{
          background: `${overallColor}12`,
          border: `1px solid ${overallColor}40`,
          borderRadius: 16, padding: "20px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Activity size={24} color={overallColor} />
            <div>
              <p style={{ color: c.text, fontSize: 16, fontWeight: 700, margin: 0 }}>
                สถานะระบบโดยรวม: <span style={{ color: overallColor }}>{STATUS_LABEL[overall]}</span>
              </p>
              {report && (
                <p style={{ color: c.text3, fontSize: 12, margin: "2px 0 0" }}>
                  เช็คล่าสุด {fmtDate(report.checkedAt)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={load} disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 10,
              border: `1px solid ${c.border}`, background: c.card,
              color: c.text2, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            รีเฟรช
          </button>
        </div>

        {/* Stats row */}
        {report && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { label: "คำขอวันนี้",     value: report.stats.todayRequests,  color: c.gold },
              { label: "ประเมินวันนี้",   value: report.stats.todayEstimates, color: "#3b82f6" },
              { label: "คำขอเปิดอยู่",   value: report.stats.openRequests,   color: "#f59e0b" },
              { label: "สต็อกทั้งหมด",   value: report.stats.totalStock,     color: "#22c55e" },
            ].map(s => (
              <div key={s.label} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: "16px 20px" }}>
                <p style={{ color: c.text3, fontSize: 12, margin: "0 0 6px" }}>{s.label}</p>
                <p style={{ color: s.color, fontSize: 28, fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                  {s.value.toLocaleString("th-TH")}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Service checks */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>รายการตรวจสอบ</p>
          </div>

          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: c.text3 }}>
              <RefreshCw size={24} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
              <p style={{ margin: 0 }}>กำลังตรวจสอบ...</p>
            </div>
          ) : (
            report?.checks.map((check, i) => {
              const color = STATUS_COLOR[check.status];
              return (
                <div
                  key={check.name}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px",
                    borderBottom: i < (report.checks.length - 1) ? `1px solid ${c.border}` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <StatusIcon status={check.status} />
                    <div>
                      <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{check.name}</p>
                      <p style={{ color: c.text3, fontSize: 12, margin: "2px 0 0" }}>{check.message}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {check.latencyMs !== undefined && (
                      <span style={{ color: c.text3, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
                        {check.latencyMs} ms
                      </span>
                    )}
                    <span style={{
                      fontSize: 11, fontWeight: 700, color,
                      background: `${color}18`, padding: "3px 10px", borderRadius: 6,
                    }}>
                      {STATUS_LABEL[check.status]}
                    </span>
                  </div>
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
