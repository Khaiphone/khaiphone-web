import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ส่งคำขอสำเร็จ",
  description: "ส่งคำขอขายสำเร็จแล้ว ทีมงานจะติดต่อกลับภายใน 24 ชั่วโมง",
  robots: { index: false, follow: false },
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
