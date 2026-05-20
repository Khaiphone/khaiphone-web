import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import MobileNav from "./components/MobileNav";
import CookieConsent from "./components/CookieConsent";
import GoogleAnalytics, { GA_ID } from "./components/GoogleAnalytics";

const prompt = Prompt({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "thai"],
  variable: "--font-prompt",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ขายไอโฟน.com — รับซื้อ iPhone, iPad, MacBook ให้ราคาสูง จ่ายเงินสดทันที",
  description:
    "ประเมินราคาออนไลน์ฟรี ไม่ผูกมัด ขายง่าย ได้เงินไว รับซื้อ iPhone, iPad, MacBook, Apple Watch, AirPods ทุกรุ่น ให้ราคาสูงกว่าที่อื่น",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={prompt.variable} suppressHydrationWarning={true}>
      <head />
      <body className="min-h-screen bg-white text-gray-900 antialiased" style={{ fontFamily: "var(--font-prompt), sans-serif" }}>
        {/* Consent Mode v2 defaults — must run before gtag.js loads */}
        <Script
          id="ga-consent-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});`,
          }}
        />
        {children}
        <MobileNav />
        <CookieConsent />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
