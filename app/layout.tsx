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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://khaiphone.com";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "ขายไอโฟน.com",
  alternateName: "KhaiPhone",
  description: "รับซื้อ iPhone, iPad, MacBook, Apple Watch ทุกรุ่น ให้ราคาสูง ประเมินราคาออนไลน์ฟรี จ่ายเงินสดทันที",
  url: SITE_URL,
  telephone: "+66-95-553-5167",
  priceRange: "฿฿",
  currenciesAccepted: "THB",
  paymentAccepted: "Cash, Bank Transfer, PromptPay",
  areaServed: { "@type": "Country", name: "Thailand" },
  serviceType: ["รับซื้อ iPhone", "รับซื้อ iPad", "รับซื้อ MacBook", "รับซื้อ Apple Watch"],
  sameAs: [],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ขายไอโฟน.com — รับซื้อ iPhone, iPad, MacBook ให้ราคาสูง จ่ายเงินสดทันที",
    template: "%s | ขายไอโฟน.com",
  },
  description:
    "ประเมินราคาออนไลน์ฟรี ไม่ผูกมัด ขายง่าย ได้เงินไว รับซื้อ iPhone, iPad, MacBook, Apple Watch, AirPods ทุกรุ่น ให้ราคาสูงกว่าที่อื่น",
  keywords: ["ขายไอโฟน", "รับซื้อ iPhone", "ขาย iPhone", "ประเมินราคา iPhone", "รับซื้อ iPad", "รับซื้อ MacBook", "ขายมือถือ"],
  authors: [{ name: "ขายไอโฟน.com" }],
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Khaiphone",
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "ขายไอโฟน.com",
    title: "ขายไอโฟน.com — รับซื้อ iPhone, iPad, MacBook ให้ราคาสูง",
    description: "ประเมินราคาออนไลน์ฟรี ไม่ผูกมัด รับซื้อ iPhone, iPad, MacBook, Apple Watch ทุกรุ่น จ่ายเงินสดทันที",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "ขายไอโฟน.com" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ขายไอโฟน.com — รับซื้อ iPhone ให้ราคาสูง",
    description: "ประเมินราคาออนไลน์ฟรี ไม่ผูกมัด จ่ายเงินสดทันที",
    images: ["/og-image.jpg"],
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        {children}
        <MobileNav />
        <CookieConsent />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
