import type { RequestStatus } from "../../../lib/types/admin";

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; dot: string }> = {
  new:               { label: "คำขอใหม่",         color: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" },
  pending:           { label: "รอตรวจสอบ",         color: "#1E40AF", bg: "#DBEAFE", dot: "#3B82F6" },
  inspecting:        { label: "ติดต่อกลับแล้ว",    color: "#9A3412", bg: "#FFEDD5", dot: "#F97316" },
  confirmed:         { label: "ยืนยันนัดหมาย",     color: "#5B21B6", bg: "#EDE9FE", dot: "#8B5CF6" },
  price_negotiation: { label: "รอยืนยันราคา",       color: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" },
  contracting:       { label: "กำลังทำสัญญา",       color: "#3730A3", bg: "#E0E7FF", dot: "#4F46E5" },
  completed:         { label: "เสร็จสิ้น",           color: "#065F46", bg: "#D1FAE5", dot: "#10B981" },
  cancelled:         { label: "ยกเลิกนัดหมาย",     color: "#991B1B", bg: "#FEE2E2", dot: "#EF4444" },
  no_show:           { label: "ลูกค้าไม่อยู่",     color: "#9A3412", bg: "#FFEDD5", dot: "#F97316" },
  rejected:          { label: "ไม่เข้าเงื่อนไข",   color: "#374151", bg: "#F3F4F6", dot: "#6B7280" },
  pickup_scheduled:  { label: "นัดรับเครื่อง",       color: "#0E7490", bg: "#CFFAFE", dot: "#06B6D4" },
  en_route:          { label: "กำลังเดินทาง",         color: "#854D0E", bg: "#FEF9C3", dot: "#EAB308" },
};

export default function StatusBadge({
  status,
  size = "sm",
}: {
  status: RequestStatus;
  size?: "xs" | "sm" | "md";
}) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "#666", bg: "#F0F0F0", dot: "#999" };
  const fontSize = size === "xs" ? "10px" : size === "sm" ? "11px" : "13px";
  const padding  = size === "xs" ? "2px 7px" : size === "sm" ? "3px 8px" : "5px 12px";
  const dotSize  = size === "xs" ? 5 : size === "sm" ? 6 : 7;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding,
        borderRadius: "999px",
        fontSize,
        fontWeight: 600,
        color: cfg.color,
        background: cfg.bg,
        whiteSpace: "nowrap",
        lineHeight: 1.5,
      }}
    >
      <span style={{ width: dotSize, height: dotSize, borderRadius: "50%", background: cfg.dot, flexShrink: 0, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}
