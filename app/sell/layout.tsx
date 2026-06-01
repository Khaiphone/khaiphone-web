import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ประเมินราคา iPhone iPad MacBook",
  description: "ประเมินราคารับซื้อ iPhone iPad MacBook Apple Watch ฟรี รู้ราคาทันที ไม่ผูกมัด จ่ายเงินสดทันที",
  alternates: { canonical: "/sell" },
  openGraph: {
    title: "ประเมินราคา iPhone iPad MacBook | Khaiphone.com",
    description: "ประเมินราคารับซื้อฟรี รู้ราคาทันที ไม่ผูกมัด จ่ายเงินสดทันที",
    url: "/sell",
  },
};

export default function SellLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
