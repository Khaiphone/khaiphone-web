import type { Metadata } from "next";
import AdminLayoutClient from "./AdminLayoutClient";

export const metadata: Metadata = {
  manifest: "/admin-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KP Admin",
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
