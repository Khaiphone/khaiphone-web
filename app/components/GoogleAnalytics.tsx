"use client";

import Script from "next/script";
import { useEffect } from "react";
import { STORAGE_KEY, CONSENT_SAVED_EVENT } from "./CookieConsent";

export const GA_ID = "G-LN5FGDX3XM";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function updateConsent(analytics: boolean, marketing: boolean) {
  window.gtag?.("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
}

export default function GoogleAnalytics() {
  useEffect(() => {
    // Apply any consent already stored (returning visitor)
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { analytics, marketing } = JSON.parse(raw);
        updateConsent(!!analytics, !!marketing);
      }
    } catch {}

    // Update consent whenever the banner saves a new choice
    function handleConsentSaved(e: Event) {
      const { analytics, marketing } = (
        e as CustomEvent<{ analytics: boolean; marketing: boolean }>
      ).detail;
      updateConsent(analytics, marketing);
    }
    window.addEventListener(CONSENT_SAVED_EVENT, handleConsentSaved);
    return () => window.removeEventListener(CONSENT_SAVED_EVENT, handleConsentSaved);
  }, []);

  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="afterInteractive"
      onReady={() => {
        window.gtag("js", new Date());
        window.gtag("config", GA_ID, { send_page_view: true });
      }}
    />
  );
}
