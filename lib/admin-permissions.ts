export type Permission =
  | "view_reports"
  | "view_customers"
  | "view_payments"
  | "manage_prices";

export const PERMISSION_LABELS: Record<Permission, { label: string; sub: string }> = {
  view_reports:  { label: "ดูรายงานและสถิติ",    sub: "ยอดรวม, สถานะ, รุ่นยอดนิยม"          },
  view_customers:{ label: "ดูข้อมูลลูกค้า",      sub: "รายชื่อและประวัติลูกค้า"              },
  view_payments: { label: "ดูการชำระเงิน",        sub: "ประวัติการจ่ายเงิน"                   },
  manage_prices: { label: "จัดการราคา / ค่าหัก", sub: "แก้ราคารุ่น, ค่าหักมาตรฐาน"          },
};
