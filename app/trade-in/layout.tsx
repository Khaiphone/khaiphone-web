import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ราคารับซื้อ iPhone iPad MacBook | ขายไอโฟน.com",
  description:
    "ตารางราคารับซื้อ iPhone iPad MacBook Apple Watch ทุกรุ่น อัปเดตทุกวัน ให้ราคาสูงสุด",
};

export default function TradeInLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
