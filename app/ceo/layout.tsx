import type { Metadata } from "next";
import CeoLayoutClient from "./CeoLayoutClient";

export const metadata: Metadata = {
  title: "KP CEO — Mission Control",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "KP CEO" },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export default function CeoLayout({ children }: { children: React.ReactNode }) {
  return <CeoLayoutClient>{children}</CeoLayoutClient>;
}
