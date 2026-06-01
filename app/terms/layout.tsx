import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "เงื่อนไขการให้บริการ | Khaiphone.com",
  description:
    "เงื่อนไขการให้บริการรับซื้อ Apple มือสองของ Khaiphone.com อ่านก่อนใช้บริการ",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
