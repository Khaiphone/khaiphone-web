"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { fetchRequests } from "@/app/actions/admin-requests";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types/admin";
import type { AdminRequest } from "@/lib/types/admin";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";

const PAY_STATUSES = new Set(["contracting", "completed"]);

export default function PaymentsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"all" | "completed" | "contracting">("all");

  useEffect(() => {
    fetchRequests().then(data => {
      setRequests(data.filter(r => PAY_STATUSES.has(r.status)));
      setLoading(false);
    });
  }, []);

  const visible = tab === "all" ? requests : requests.filter(r => r.status === tab);
  const totalValue = visible.reduce((s, r) => s + (r.device.actualPrice ?? r.device.estimatedPrice ?? 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ padding: "52px 16px 32px", maxWidth: 680, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}>
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>การชำระเงิน</h1>
            <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>รวม ฿{totalValue.toLocaleString("th-TH")}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {([["all", "ทั้งหมด"], ["completed", "เสร็จสิ้น"], ["contracting", "กำลังทำสัญญา"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: "7px 14px", borderRadius: 99, fontSize: 12, fontWeight: tab === key ? 700 : 400,
                border: `1px solid ${tab === key ? "#B8860B" : BORDER}`,
                background: tab === key ? "#B8860B18" : CARD,
                color: tab === key ? "#B8860B" : TEXT2,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              }}
            >{label}</button>
          ))}
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          {loading ? (
            <p style={{ color: TEXT3, textAlign: "center", padding: "32px 0", fontSize: 14 }}>กำลังโหลด...</p>
          ) : visible.length === 0 ? (
            <p style={{ color: TEXT3, textAlign: "center", padding: "32px 0", fontSize: 14 }}>ไม่มีรายการ</p>
          ) : visible.map((r, i) => {
            const price = r.device.actualPrice ?? r.device.estimatedPrice ?? 0;
            const sc = STATUS_COLORS[r.status];
            return (
              <div
                key={r.id}
                onClick={() => router.push(`/admin/requests/${r.id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px", cursor: "pointer",
                  borderBottom: i < visible.length - 1 ? `1px solid ${BORDER}` : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <p style={{ color: TEXT, fontSize: 13, fontWeight: 600, margin: 0 }}>{r.customer.name}</p>
                    <span style={{
                      fontSize: 10, padding: "1px 7px", borderRadius: 99, fontWeight: 600,
                      background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                    }}>{STATUS_LABELS[r.status]}</span>
                  </div>
                  <p style={{ color: TEXT3, fontSize: 12, margin: 0 }}>
                    {r.device.model} · {r.orderNumber}
                  </p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>
                    ฿{price.toLocaleString("th-TH")}
                  </p>
                  <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>
                    {new Date(r.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
