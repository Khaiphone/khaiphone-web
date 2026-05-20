import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ประเมินราคา iPhone iPad MacBook | ขายไอโฟน.com",
  description:
    "ประเมินราคารับซื้อ iPhone iPad MacBook Apple Watch ฟรี รู้ราคาทันที ไม่ผูกมัด จ่ายเงินสดทันที",
};

export default function SellLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
