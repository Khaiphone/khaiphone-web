import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ติดตามคำขอ",
  description: "ติดตามสถานะคำขอขาย iPhone iPad MacBook ของคุณ กรอกเลขคำขอและเบอร์โทรเพื่อดูสถานะล่าสุด",
  alternates: { canonical: "/track" },
  robots: { index: false, follow: false },
  openGraph: { title: "ติดตามคำขอ | Khaiphone.com", description: "ติดตามสถานะคำขอขายของคุณ", url: "/track" },
};

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
