import type { Metadata } from "next";
import RiderLayoutClient from "./RiderLayoutClient";

export const metadata: Metadata = {
  manifest: "/rider-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KP Rider",
  },
  icons: {
    apple: [{ url: "/rider-apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return <RiderLayoutClient>{children}</RiderLayoutClient>;
}
