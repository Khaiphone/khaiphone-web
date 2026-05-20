import Link from "next/link";
import { Eye, MessageCircle } from "lucide-react";
import type { AdminRequest } from "../../../lib/types/admin";
import StatusBadge from "./StatusBadge";

interface RequestsTableProps {
  requests: AdminRequest[];
  onRowClick?: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(price: number): string {
  return "฿" + price.toLocaleString("th-TH");
}

export default function RequestsTable({ requests, onRowClick }: RequestsTableProps) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #F3F4F6" }}>
            {[
              "หมายเลขคำขอ",
              "ลูกค้า",
              "รุ่นเครื่อง",
              "ราคาประเมิน",
              "สถานะ",
              "วันที่สร้าง",
              "จัดการ",
            ].map((col) => (
              <th
                key={col}
                style={{
                  padding: "10px 12px",
                  textAlign: "left",
                  color: "#9CA3AF",
                  fontSize: "12px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr
              key={req.id}
              onClick={() => onRowClick?.(req.id)}
              style={{
                borderBottom: "1px solid #F9FAFB",
                cursor: onRowClick ? "pointer" : "default",
                transition: "background-color 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#F9FAFB";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent";
              }}
            >
              <td style={{ padding: "12px 12px" }}>
                <span style={{ color: "#B8860B", fontSize: "13px", fontWeight: 600 }}>
                  {req.orderNumber}
                </span>
              </td>
              <td style={{ padding: "12px 12px" }}>
                <div>
                  <p style={{ color: "#111111", fontSize: "13px", fontWeight: 500, margin: 0 }}>
                    {req.customer.name}
                  </p>
                  <p style={{ color: "#9CA3AF", fontSize: "12px", margin: 0 }}>
                    {req.customer.phone}
                  </p>
                </div>
              </td>
              <td style={{ padding: "12px 12px" }}>
                <div>
                  <p style={{ color: "#111111", fontSize: "13px", margin: 0 }}>
                    {req.device.model}
                  </p>
                  <p style={{ color: "#9CA3AF", fontSize: "12px", margin: 0 }}>
                    {req.device.storage}
                  </p>
                </div>
              </td>
              <td style={{ padding: "12px 12px" }}>
                <span style={{ color: "#22C55E", fontSize: "13px", fontWeight: 600 }}>
                  {formatPrice(req.device.estimatedPrice)}
                </span>
              </td>
              <td style={{ padding: "12px 12px" }}>
                <StatusBadge status={req.status} />
              </td>
              <td style={{ padding: "12px 12px" }}>
                <span style={{ color: "#9CA3AF", fontSize: "12px" }}>
                  {formatDate(req.createdAt)}
                </span>
              </td>
              <td style={{ padding: "12px 12px" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <Link
                    href={`/admin/requests/${req.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      color: "#3B82F6",
                    }}
                    title="ดูรายละเอียด"
                  >
                    <Eye size={14} />
                  </Link>
                  <Link
                    href={`/admin/requests/${req.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(34,197,94,0.1)",
                      border: "1px solid rgba(34,197,94,0.2)",
                      color: "#22C55E",
                    }}
                    title="แชท"
                  >
                    <MessageCircle size={14} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: "14px",
          }}
        >
          ไม่พบข้อมูล
        </div>
      )}
    </div>
  );
}
