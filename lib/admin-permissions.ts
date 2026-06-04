export type Permission =
  | "receive_new_requests"
  | "assign_requests"
  | "view_stock"
  | "view_finance"
  | "view_reports"
  | "view_customers"
  | "view_payments"
  | "manage_prices"
  | "delete_stock";

export const PERMISSION_LABELS: Record<Permission, { label: string; sub: string }> = {
  receive_new_requests: { label: "รับคำขอใหม่",            sub: "รับแจ้งเตือนและเห็นคำขอทุกรายการ ไม่ใช่แค่งานที่ได้รับมอบหมาย" },
  assign_requests:      { label: "มอบหมายงาน",             sub: "สามารถมอบหมายคำขอให้พนักงานคนอื่นได้"                          },
  view_stock:           { label: "เข้าถึง Stock",           sub: "เข้าใช้งาน stock.khaiphone.com ได้"                             },
  view_finance:         { label: "เข้าถึง Finance",         sub: "เข้าใช้งาน finance.khaiphone.com ได้"                           },
  view_reports:         { label: "ดูรายงานและสถิติ",        sub: "ยอดรวม, สถานะ, รุ่นยอดนิยม"                                    },
  view_customers:       { label: "ดูข้อมูลลูกค้า",          sub: "รายชื่อและประวัติลูกค้า"                                        },
  view_payments:        { label: "ดูการชำระเงิน",           sub: "ประวัติการจ่ายเงิน"                                             },
  manage_prices:        { label: "จัดการราคา / ค่าหัก",    sub: "แก้ราคารุ่น, ค่าหักมาตรฐาน"                                    },
  delete_stock:         { label: "ลบสินค้าจาก Stock",      sub: "ลบรายการสต็อคที่กรอกผิดหรือไม่ต้องการ"                         },
};
