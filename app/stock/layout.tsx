import type { Metadata } from "next";
import StockLayoutClient from "./StockLayoutClient";

export const metadata: Metadata = {
  manifest: "/stock-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KP Stock",
  },
  icons: {
    apple: [{ url: "/stock-apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return <StockLayoutClient>{children}</StockLayoutClient>;
}
