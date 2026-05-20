"use client";

import { useRouter } from "next/navigation";
import { Phone, ChevronRight, Calendar } from "lucide-react";
import type { AdminRequest } from "../../../lib/types/admin";
import StatusBadge from "./StatusBadge";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export default function RequestCard({ request }: { request: AdminRequest }) {
  const router = useRouter();

  return (
    <div style={{ background: "#FFFFFF", borderRadius: "14px", marginBottom: "8px", border: "1px solid #E5E5E5", overflow: "hidden" }}>

      {/* Main tappable area */}
      <div
        role="button" tabIndex={0}
        onClick={() => router.push(`/admin/requests/${request.id}`)}
        onKeyDown={e => e.key === "Enter" && router.push(`/admin/requests/${request.id}`)}
        style={{ padding: "11px 14px 10px", cursor: "pointer", touchAction: "manipulation" }}
      >
        {/* Row 1: order number + badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
          <span style={{ color: "#B8860B", fontWeight: 700, fontSize: "12px", letterSpacing: "0.03em" }}>
            {request.orderNumber}
          </span>
          <StatusBadge status={request.status} size="xs" />
        </div>

        {/* Row 2: model — big */}
        <p style={{ color: "#111111", fontWeight: 700, fontSize: "15px", margin: "0 0 3px", lineHeight: 1.3 }}>
          {request.device.model}
          <span style={{ fontWeight: 500, color: "#666", fontSize: "13px" }}> · {request.device.storage}</span>
        </p>

        {/* Row 3: customer name + price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
          <span style={{ color: "#555", fontSize: "12px" }}>{request.customer.name}</span>
          <span style={{ color: "#B8860B", fontWeight: 700, fontSize: "15px" }}>
            ฿{(request.device.actualPrice ?? request.device.estimatedPrice).toLocaleString("th-TH")}
          </span>
        </div>

        {/* Row 4: time + appointment + assignee */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#AAAAAA", fontSize: "11px" }}>{fmtTime(request.createdAt)} น.</span>
          {request.appointment?.date && (
            <>
              <span style={{ color: "#E5E5E5" }}>·</span>
              <span style={{ display: "flex", alignItems: "center", gap: "3px", color: "#6B7280", fontSize: "11px" }}>
                <Calendar size={10} />
                นัด {fmtDate(request.appointment.date)}
              </span>
            </>
          )}
          {request.assignedToName && (
            <>
              <span style={{ color: "#E5E5E5" }}>·</span>
              <span style={{ color: "#6B7280", fontSize: "11px" }}>👤 {request.assignedToName}</span>
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", borderTop: "1px solid #F3F3F3" }}>
        <a
          href={`tel:${request.customer.phone.replace(/-/g, "")}`}
          onClick={e => e.stopPropagation()}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "10px 0", color: "#555", fontSize: "12px", fontWeight: 600, textDecoration: "none", borderRight: "1px solid #F3F3F3", touchAction: "manipulation" }}
        >
          <Phone size={13} /> โทร
        </a>
        <button
          onClick={() => router.push(`/admin/requests/${request.id}`)}
          style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "10px 0", background: "transparent", border: "none", color: "#B8860B", fontSize: "12px", fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit" }}
        >
          ดูรายละเอียด <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
