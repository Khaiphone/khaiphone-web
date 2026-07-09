"use client";

import { Fragment, useState, useRef, useEffect, Suspense } from "react";
import Image from "next/image";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Check, Lock, ChevronRight, User, Truck, Calendar, Banknote, ShieldCheck, MapPin, Building2, Clock, Phone, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../components/Header";
import { submitRequest, submitFunctionalIssueRequest } from "@/app/actions/submit-request";
import { fetchRiderSlotAvailability } from "@/app/actions/booking-slots";
import { trackEstimateEvent, fetchRecentPriceCheckCount } from "@/app/actions/analytics";
import { fetchPublicActiveProducts } from "@/app/actions/products";
import { fetchPublicPricingConfig } from "@/app/actions/pricing-config";
import { getModelTypeOpts, DEFAULT_PRICING_CONFIG } from "@/lib/pricing-defaults";
import type { PricingOption } from "@/lib/pricing-defaults";
import { calcPrice, calcPriceRange, formatPrice } from "@/lib/pricing";
import { classifyZone, extractProvince, PROVINCE_GROUPS, ROUND_ETA_LABEL } from "@/lib/zones";

const BUNDLE_KEY = "khaiphone_extra_devices";
const BUNDLE_RETURN_KEY = "khaiphone_bundle_return";
type ExtraDevice = { model: string; storage: string; estimatedPrice: number; details: Array<{ title: string; value: string }> };

// ─── Icon helpers ─────────────────────────────────────────────────────────────

type IconProps = { className?: string; style?: React.CSSProperties };

function IconApple({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-103.4C46.5 727.1 0 604.9 0 494.5 0 320.2 105.5 224 209.4 224c65.4 0 120 43.1 161.8 43.1 39.8 0 101.6-46.7 174.2-46.7zm-134.6-114.1c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

function IconLine({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.629 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(model: string) {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getProductImage(model: string): string | null {
  // iPhone
  if (model.includes("iPhone") && model.includes("Air")) return `/iPhone-air.webp`;
  const iphoneM = model.match(/iPhone (\d+)/);
  if (iphoneM) {
    const gen = parseInt(iphoneM[1]);
    if (gen < 11 || gen > 17) return null;
    if (model.includes("Pro")) return `/iPhone-${gen}-pro-max.webp`;
    if (model.endsWith("e")) return `/iPhone-${gen}e.webp`;
    return `/iPhone-${gen}.webp`;
  }
  // iPad Pro — match by chip/year, regardless of screen size
  if (model.includes("iPad Pro")) {
    if (model.includes("2020")) return `/ipad-pro-2020.webp`;
    const chipM = model.match(/\bM(\d)\b/);
    if (chipM) return `/ipad-pro-m${chipM[1]}.webp`;
  }
  // iPad Air — match by generation number (Air 5/6/7/8)
  if (model.includes("iPad Air")) {
    const airM = model.match(/iPad Air (\d+)/);
    if (airM) return `/ipad-air-${airM[1]}.webp`;
  }
  // iPad mini
  if (model.includes("iPad mini")) {
    const miniM = model.match(/iPad mini (\d+)/);
    if (miniM) return `/ipad-mini-${miniM[1]}.webp`;
  }
  // iPad Gen
  const genM = model.match(/iPad Gen (\d+)/);
  if (genM) return `/ipad-gen-${genM[1]}.webp`;
  // Mac
  if (model.startsWith("MacBook") || model.startsWith("Mac mini") || model.startsWith("iMac")) {
    if (model.includes("MacBook Neo")) return `/macbook-neo.webp`;
    const chipM = model.match(/\bM(\d)\b/);
    const chip = chipM ? chipM[1] : null;
    if (model.includes("MacBook Air")) return chip ? `/macbook-air-m${chip}.webp` : null;
    if (model.includes("MacBook Pro")) return chip ? `/macbook-pro-m${chip}.webp` : null;
    if (model.includes("Mac mini"))   return chip ? `/mac-mini-m${chip}.webp`    : null;
    if (model.includes("iMac"))       return chip ? `/imac-m${chip}.webp`        : null;
  }
  // Apple Watch
  if (model.includes("Apple Watch")) {
    const seriesM = model.match(/Series (\d+)/);
    if (seriesM) return `/apple-watch-series-${seriesM[1]}.webp`;
    const seM = model.match(/SE \(Gen (\d+)\)/);
    if (seM) return `/apple-watch-se-${seM[1]}.webp`;
    if (model.includes("Ultra 3")) return `/apple-watch-ultra-3.webp`;
    if (model.includes("Ultra 2")) return `/apple-watch-ultra-2.webp`;
    if (model.includes("Ultra"))   return `/apple-watch-ultra-1.webp`;
  }
  return null;
}

// ─── Product data ─────────────────────────────────────────────────────────────



interface Product { model: string; storage: string; priceGood: number }

const ALL_PRODUCTS: Product[] = [
  { model: "iPhone 17 Pro Max", storage: "256GB / 512GB / 1TB",           priceGood: 38000 },
  { model: "iPhone 17 Pro",     storage: "256GB / 512GB / 1TB",           priceGood: 32000 },
  { model: "iPhone 17 Air",     storage: "256GB / 512GB / 1TB",           priceGood: 28000 },
  { model: "iPhone 17",         storage: "256GB / 512GB",                 priceGood: 26000 },
  { model: "iPhone 17e",        storage: "128GB / 256GB",                 priceGood: 18000 },
  { model: "iPhone 16 Pro Max", storage: "256GB / 512GB / 1TB",           priceGood: 30000 },
  { model: "iPhone 16 Pro",     storage: "128GB / 256GB / 512GB / 1TB",   priceGood: 25000 },
  { model: "iPhone 16 Plus",    storage: "128GB / 256GB / 512GB",         priceGood: 22000 },
  { model: "iPhone 16",         storage: "128GB / 256GB / 512GB",         priceGood: 20000 },
  { model: "iPhone 15 Pro Max", storage: "256GB / 512GB / 1TB",           priceGood: 24000 },
  { model: "iPhone 15 Pro",     storage: "128GB / 256GB / 512GB / 1TB",   priceGood: 19000 },
  { model: "iPhone 15 Plus",    storage: "128GB / 256GB / 512GB",         priceGood: 16500 },
  { model: "iPhone 15",         storage: "128GB / 256GB / 512GB",         priceGood: 15000 },
  { model: "iPhone 14 Pro Max", storage: "128GB / 256GB / 512GB / 1TB",   priceGood: 18000 },
  { model: "iPhone 14 Pro",     storage: "128GB / 256GB / 512GB / 1TB",   priceGood: 14000 },
  { model: "iPhone 14 Plus",    storage: "128GB / 256GB / 512GB",         priceGood: 12000 },
  { model: "iPhone 14",         storage: "128GB / 256GB / 512GB",         priceGood: 11000 },
  { model: "iPhone 13 Pro Max", storage: "128GB / 256GB / 512GB / 1TB",   priceGood: 13500 },
  { model: "iPhone 13 Pro",     storage: "128GB / 256GB / 512GB / 1TB",   priceGood: 10500 },
  { model: "iPhone 13",         storage: "128GB / 256GB / 512GB",         priceGood: 8500  },
  { model: "iPhone 13 mini",    storage: "128GB / 256GB / 512GB",         priceGood: 7000  },
  { model: "iPhone 12 Pro Max", storage: "128GB / 256GB / 512GB",         priceGood: 9000  },
  { model: "iPhone 12 Pro",     storage: "128GB / 256GB / 512GB",         priceGood: 7500  },
  { model: "iPhone 12",         storage: "64GB / 128GB / 256GB",          priceGood: 6000  },
  { model: "iPhone 12 mini",    storage: "64GB / 128GB / 256GB",          priceGood: 5000  },
  { model: "iPhone 11 Pro Max", storage: "64GB / 256GB / 512GB",          priceGood: 7000  },
  { model: "iPhone 11 Pro",     storage: "64GB / 256GB / 512GB",          priceGood: 5800  },
  { model: "iPhone 11",         storage: "64GB / 128GB / 256GB",          priceGood: 4800  },
  // iPad Gen
  { model: 'iPad Gen 9 (Wi-Fi)',                  storage: "64GB / 256GB",               priceGood: 2500  },
  { model: 'iPad Gen 9 (Wi-Fi + Cellular)',       storage: "64GB / 256GB",               priceGood: 4500  },
  { model: 'iPad Gen 10 (Wi-Fi)',                 storage: "64GB / 256GB",               priceGood: 5500  },
  { model: 'iPad Gen 10 (Wi-Fi + Cellular)',      storage: "64GB / 256GB",               priceGood: 7500  },
  { model: 'iPad Gen 11 A16 (Wi-Fi)',             storage: "128GB / 256GB",              priceGood: 7500  },
  { model: 'iPad Gen 11 A16 (Wi-Fi + Cellular)',  storage: "128GB / 256GB",              priceGood: 9500  },
  // iPad mini
  { model: 'iPad mini 6 (Wi-Fi)',                 storage: "64GB / 256GB",               priceGood: 5000  },
  { model: 'iPad mini 6 (Wi-Fi + Cellular)',      storage: "64GB / 256GB",               priceGood: 7000  },
  { model: 'iPad mini 7 (Wi-Fi)',                 storage: "128GB / 256GB",              priceGood: 8500  },
  { model: 'iPad mini 7 (Wi-Fi + Cellular)',      storage: "128GB / 256GB",              priceGood: 10500 },
  // iPad Air
  { model: 'iPad Air 5 (Wi-Fi)',                  storage: "64GB / 256GB",               priceGood: 6000  },
  { model: 'iPad Air 5 (Wi-Fi + Cellular)',       storage: "64GB / 256GB",               priceGood: 8000  },
  { model: 'iPad Air 6 11" (Wi-Fi)',              storage: "128GB / 256GB",              priceGood: 9500  },
  { model: 'iPad Air 6 11" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              priceGood: 11500 },
  { model: 'iPad Air 6 13" (Wi-Fi)',              storage: "128GB / 256GB",              priceGood: 11500 },
  { model: 'iPad Air 6 13" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              priceGood: 13500 },
  { model: 'iPad Air 7 11" (Wi-Fi)',              storage: "128GB / 256GB",              priceGood: 11500 },
  { model: 'iPad Air 7 11" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              priceGood: 13500 },
  { model: 'iPad Air 7 13" (Wi-Fi)',              storage: "128GB / 256GB",              priceGood: 13500 },
  { model: 'iPad Air 7 13" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              priceGood: 15500 },
  { model: 'iPad Air 8 11" (Wi-Fi)',              storage: "128GB / 256GB",              priceGood: 15000 },
  { model: 'iPad Air 8 11" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              priceGood: 17000 },
  { model: 'iPad Air 8 13" (Wi-Fi)',              storage: "128GB / 256GB",              priceGood: 17500 },
  { model: 'iPad Air 8 13" (Wi-Fi + Cellular)',   storage: "128GB / 256GB",              priceGood: 19500 },
  // iPad Pro 11"
  { model: 'iPad Pro 11" (2020) (Wi-Fi)',         storage: "128GB / 256GB / 512GB",      priceGood: 8000  },
  { model: 'iPad Pro 11" (2020) (Wi-Fi + Cellular)', storage: "128GB / 256GB / 512GB",  priceGood: 10000 },
  { model: 'iPad Pro 11" M1 (Wi-Fi)',             storage: "128GB / 256GB / 512GB",      priceGood: 10000 },
  { model: 'iPad Pro 11" M1 (Wi-Fi + Cellular)',  storage: "128GB / 256GB / 512GB",      priceGood: 12000 },
  { model: 'iPad Pro 11" M2 (Wi-Fi)',             storage: "128GB / 256GB / 512GB",      priceGood: 13000 },
  { model: 'iPad Pro 11" M2 (Wi-Fi + Cellular)',  storage: "128GB / 256GB / 512GB",      priceGood: 15000 },
  { model: 'iPad Pro 11" M4 (Wi-Fi)',             storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 20000 },
  { model: 'iPad Pro 11" M4 (Wi-Fi + Cellular)',  storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 22000 },
  { model: 'iPad Pro 11" M5 (Wi-Fi)',             storage: "256GB / 512GB",              priceGood: 23500 },
  { model: 'iPad Pro 11" M5 (Wi-Fi + Cellular)',  storage: "256GB / 512GB",              priceGood: 25500 },
  // iPad Pro 12.9" / 13"
  { model: 'iPad Pro 12.9" (2020) (Wi-Fi)',       storage: "128GB / 256GB / 512GB",      priceGood: 9000  },
  { model: 'iPad Pro 12.9" (2020) (Wi-Fi + Cellular)', storage: "128GB / 256GB / 512GB", priceGood: 11000 },
  { model: 'iPad Pro 12.9" M1 (Wi-Fi)',           storage: "128GB / 256GB / 512GB",      priceGood: 11500 },
  { model: 'iPad Pro 12.9" M1 (Wi-Fi + Cellular)', storage: "128GB / 256GB / 512GB",    priceGood: 13500 },
  { model: 'iPad Pro 12.9" M2 (Wi-Fi)',           storage: "128GB / 256GB / 512GB",      priceGood: 14500 },
  { model: 'iPad Pro 12.9" M2 (Wi-Fi + Cellular)', storage: "128GB / 256GB / 512GB",    priceGood: 16500 },
  { model: 'iPad Pro 13" M4 (Wi-Fi)',             storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 22500 },
  { model: 'iPad Pro 13" M4 (Wi-Fi + Cellular)',  storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 24500 },
  { model: 'iPad Pro 13" M5 (Wi-Fi)',             storage: "256GB / 512GB",              priceGood: 25500 },
  { model: 'iPad Pro 13" M5 (Wi-Fi + Cellular)',  storage: "256GB / 512GB",              priceGood: 27500 },
  // MacBook Air 13"
  { model: 'MacBook Air 13" M1 8GB',   storage: "256GB / 512GB",             priceGood: 18000 },
  { model: 'MacBook Air 13" M1 16GB',  storage: "256GB / 512GB",             priceGood: 22000 },
  { model: 'MacBook Air 13" M2 8GB',   storage: "256GB / 512GB",             priceGood: 22000 },
  { model: 'MacBook Air 13" M2 16GB',  storage: "256GB / 512GB / 1TB",       priceGood: 28000 },
  { model: 'MacBook Air 13" M2 24GB',  storage: "512GB / 1TB / 2TB",         priceGood: 35000 },
  { model: 'MacBook Air 13" M3 8GB',   storage: "256GB / 512GB",             priceGood: 28000 },
  { model: 'MacBook Air 13" M3 16GB',  storage: "256GB / 512GB / 1TB",       priceGood: 35000 },
  { model: 'MacBook Air 13" M3 24GB',  storage: "512GB / 1TB / 2TB",         priceGood: 42000 },
  { model: 'MacBook Air 13" M4 16GB',  storage: "256GB / 512GB / 1TB",       priceGood: 42000 },
  { model: 'MacBook Air 13" M4 24GB',  storage: "512GB / 1TB / 2TB",         priceGood: 50000 },
  { model: 'MacBook Air 13" M4 32GB',  storage: "512GB / 1TB / 2TB",         priceGood: 60000 },
  { model: 'MacBook Air 13" M5 16GB',  storage: "256GB / 512GB / 1TB",       priceGood: 48000 },
  { model: 'MacBook Air 13" M5 24GB',  storage: "512GB / 1TB / 2TB",         priceGood: 58000 },
  { model: 'MacBook Air 13" M5 32GB',  storage: "512GB / 1TB / 2TB",         priceGood: 68000 },
  // MacBook Air 15"
  { model: 'MacBook Air 15" M2 8GB',   storage: "256GB / 512GB",             priceGood: 28000 },
  { model: 'MacBook Air 15" M2 16GB',  storage: "256GB / 512GB / 1TB",       priceGood: 35000 },
  { model: 'MacBook Air 15" M2 24GB',  storage: "512GB / 1TB / 2TB",         priceGood: 42000 },
  { model: 'MacBook Air 15" M3 8GB',   storage: "256GB / 512GB",             priceGood: 33000 },
  { model: 'MacBook Air 15" M3 16GB',  storage: "256GB / 512GB / 1TB",       priceGood: 42000 },
  { model: 'MacBook Air 15" M3 24GB',  storage: "512GB / 1TB / 2TB",         priceGood: 50000 },
  { model: 'MacBook Air 15" M4 16GB',  storage: "256GB / 512GB / 1TB",       priceGood: 50000 },
  { model: 'MacBook Air 15" M4 24GB',  storage: "512GB / 1TB / 2TB",         priceGood: 60000 },
  { model: 'MacBook Air 15" M4 32GB',  storage: "512GB / 1TB / 2TB",         priceGood: 70000 },
  { model: 'MacBook Air 15" M5 16GB',  storage: "256GB / 512GB / 1TB",       priceGood: 58000 },
  { model: 'MacBook Air 15" M5 24GB',  storage: "512GB / 1TB / 2TB",         priceGood: 68000 },
  { model: 'MacBook Air 15" M5 32GB',  storage: "512GB / 1TB / 2TB",         priceGood: 80000 },
  // MacBook Neo 13"
  { model: 'MacBook Neo 13" (A18 Pro) 8GB',           storage: "256GB / 512GB", priceGood: 38000 },
  { model: 'MacBook Neo 13" (A18 Pro, Touch ID) 8GB', storage: "256GB / 512GB", priceGood: 40000 },
  // MacBook Pro 13"
  { model: 'MacBook Pro 13" M1 8GB',   storage: "256GB / 512GB / 1TB / 2TB", priceGood: 22000 },
  { model: 'MacBook Pro 13" M1 16GB',  storage: "256GB / 512GB / 1TB / 2TB", priceGood: 28000 },
  { model: 'MacBook Pro 13" M2 8GB',   storage: "256GB / 512GB / 1TB / 2TB", priceGood: 26000 },
  { model: 'MacBook Pro 13" M2 16GB',  storage: "256GB / 512GB / 1TB / 2TB", priceGood: 33000 },
  { model: 'MacBook Pro 13" M2 24GB',  storage: "512GB / 1TB / 2TB",         priceGood: 42000 },
  // MacBook Pro 14"
  { model: 'MacBook Pro 14" M1 Pro 16GB',  storage: "512GB / 1TB / 2TB",  priceGood: 48000  },
  { model: 'MacBook Pro 14" M1 Pro 32GB',  storage: "512GB / 1TB / 2TB",  priceGood: 58000  },
  { model: 'MacBook Pro 14" M1 Max 16GB',  storage: "1TB / 2TB",          priceGood: 58000  },
  { model: 'MacBook Pro 14" M1 Max 32GB',  storage: "1TB / 2TB",          priceGood: 70000  },
  { model: 'MacBook Pro 14" M1 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 85000  },
  { model: 'MacBook Pro 14" M2 Pro 16GB',  storage: "512GB / 1TB / 2TB",  priceGood: 55000  },
  { model: 'MacBook Pro 14" M2 Pro 32GB',  storage: "512GB / 1TB / 2TB",  priceGood: 68000  },
  { model: 'MacBook Pro 14" M2 Max 32GB',  storage: "1TB / 2TB",          priceGood: 75000  },
  { model: 'MacBook Pro 14" M2 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 92000  },
  { model: 'MacBook Pro 14" M2 Max 96GB',  storage: "1TB / 2TB / 4TB",    priceGood: 112000 },
  { model: 'MacBook Pro 14" M3 8GB',       storage: "512GB / 1TB",         priceGood: 42000  },
  { model: 'MacBook Pro 14" M3 16GB',      storage: "512GB / 1TB",         priceGood: 52000  },
  { model: 'MacBook Pro 14" M3 24GB',      storage: "512GB / 1TB",         priceGood: 62000  },
  { model: 'MacBook Pro 14" M3 Pro 18GB',  storage: "512GB / 1TB / 2TB",  priceGood: 65000  },
  { model: 'MacBook Pro 14" M3 Pro 36GB',  storage: "512GB / 1TB / 2TB",  priceGood: 80000  },
  { model: 'MacBook Pro 14" M3 Max 36GB',  storage: "1TB / 2TB",          priceGood: 90000  },
  { model: 'MacBook Pro 14" M3 Max 48GB',  storage: "1TB / 2TB",          priceGood: 108000 },
  { model: 'MacBook Pro 14" M3 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 125000 },
  { model: 'MacBook Pro 14" M3 Max 96GB',  storage: "1TB / 2TB / 4TB",    priceGood: 148000 },
  { model: 'MacBook Pro 14" M3 Max 128GB', storage: "2TB / 4TB",           priceGood: 172000 },
  { model: 'MacBook Pro 14" M4 16GB',      storage: "512GB / 1TB",         priceGood: 55000  },
  { model: 'MacBook Pro 14" M4 24GB',      storage: "512GB / 1TB",         priceGood: 65000  },
  { model: 'MacBook Pro 14" M4 32GB',      storage: "512GB / 1TB",         priceGood: 78000  },
  { model: 'MacBook Pro 14" M4 Pro 24GB',  storage: "512GB / 1TB / 2TB",  priceGood: 78000  },
  { model: 'MacBook Pro 14" M4 Pro 48GB',  storage: "512GB / 1TB / 2TB",  priceGood: 95000  },
  { model: 'MacBook Pro 14" M4 Max 36GB',  storage: "1TB / 2TB",          priceGood: 108000 },
  { model: 'MacBook Pro 14" M4 Max 48GB',  storage: "1TB / 2TB",          priceGood: 128000 },
  { model: 'MacBook Pro 14" M4 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 148000 },
  { model: 'MacBook Pro 14" M4 Max 96GB',  storage: "1TB / 2TB / 4TB",    priceGood: 175000 },
  { model: 'MacBook Pro 14" M4 Max 128GB', storage: "2TB / 4TB",           priceGood: 200000 },
  { model: 'MacBook Pro 14" M5 16GB',      storage: "512GB / 1TB",         priceGood: 62000  },
  { model: 'MacBook Pro 14" M5 24GB',      storage: "512GB / 1TB",         priceGood: 75000  },
  { model: 'MacBook Pro 14" M5 Pro 24GB',  storage: "512GB / 1TB / 2TB",  priceGood: 90000  },
  { model: 'MacBook Pro 14" M5 Pro 48GB',  storage: "512GB / 1TB / 2TB",  priceGood: 110000 },
  { model: 'MacBook Pro 14" M5 Max 36GB',  storage: "1TB / 2TB",          priceGood: 125000 },
  { model: 'MacBook Pro 14" M5 Max 48GB',  storage: "1TB / 2TB",          priceGood: 148000 },
  { model: 'MacBook Pro 14" M5 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 170000 },
  { model: 'MacBook Pro 14" M5 Max 96GB',  storage: "1TB / 2TB / 4TB",    priceGood: 200000 },
  { model: 'MacBook Pro 14" M5 Max 128GB', storage: "2TB / 4TB",           priceGood: 230000 },
  // MacBook Pro 16"
  { model: 'MacBook Pro 16" M1 Pro 16GB',  storage: "512GB / 1TB / 2TB",  priceGood: 58000  },
  { model: 'MacBook Pro 16" M1 Pro 32GB',  storage: "512GB / 1TB / 2TB",  priceGood: 72000  },
  { model: 'MacBook Pro 16" M1 Max 16GB',  storage: "1TB / 2TB",          priceGood: 72000  },
  { model: 'MacBook Pro 16" M1 Max 32GB',  storage: "1TB / 2TB",          priceGood: 88000  },
  { model: 'MacBook Pro 16" M1 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 108000 },
  { model: 'MacBook Pro 16" M2 Pro 16GB',  storage: "512GB / 1TB / 2TB",  priceGood: 68000  },
  { model: 'MacBook Pro 16" M2 Pro 32GB',  storage: "512GB / 1TB / 2TB",  priceGood: 82000  },
  { model: 'MacBook Pro 16" M2 Max 32GB',  storage: "1TB / 2TB",          priceGood: 95000  },
  { model: 'MacBook Pro 16" M2 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 115000 },
  { model: 'MacBook Pro 16" M2 Max 96GB',  storage: "1TB / 2TB / 4TB",    priceGood: 138000 },
  { model: 'MacBook Pro 16" M3 Pro 18GB',  storage: "512GB / 1TB / 2TB",  priceGood: 88000  },
  { model: 'MacBook Pro 16" M3 Pro 36GB',  storage: "512GB / 1TB / 2TB",  priceGood: 108000 },
  { model: 'MacBook Pro 16" M3 Max 36GB',  storage: "1TB / 2TB",          priceGood: 118000 },
  { model: 'MacBook Pro 16" M3 Max 48GB',  storage: "1TB / 2TB",          priceGood: 138000 },
  { model: 'MacBook Pro 16" M3 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 158000 },
  { model: 'MacBook Pro 16" M3 Max 96GB',  storage: "1TB / 2TB / 4TB",    priceGood: 188000 },
  { model: 'MacBook Pro 16" M3 Max 128GB', storage: "2TB / 4TB",           priceGood: 218000 },
  { model: 'MacBook Pro 16" M4 Pro 24GB',  storage: "512GB / 1TB / 2TB",  priceGood: 108000 },
  { model: 'MacBook Pro 16" M4 Pro 48GB',  storage: "512GB / 1TB / 2TB",  priceGood: 130000 },
  { model: 'MacBook Pro 16" M4 Max 36GB',  storage: "1TB / 2TB",          priceGood: 148000 },
  { model: 'MacBook Pro 16" M4 Max 48GB',  storage: "1TB / 2TB",          priceGood: 170000 },
  { model: 'MacBook Pro 16" M4 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 195000 },
  { model: 'MacBook Pro 16" M4 Max 96GB',  storage: "1TB / 2TB / 4TB",    priceGood: 228000 },
  { model: 'MacBook Pro 16" M4 Max 128GB', storage: "2TB / 4TB",           priceGood: 260000 },
  { model: 'MacBook Pro 16" M5 Pro 24GB',  storage: "512GB / 1TB / 2TB",  priceGood: 120000 },
  { model: 'MacBook Pro 16" M5 Pro 48GB',  storage: "512GB / 1TB / 2TB",  priceGood: 145000 },
  { model: 'MacBook Pro 16" M5 Max 36GB',  storage: "1TB / 2TB",          priceGood: 168000 },
  { model: 'MacBook Pro 16" M5 Max 48GB',  storage: "1TB / 2TB",          priceGood: 195000 },
  { model: 'MacBook Pro 16" M5 Max 64GB',  storage: "1TB / 2TB / 4TB",    priceGood: 225000 },
  { model: 'MacBook Pro 16" M5 Max 96GB',  storage: "1TB / 2TB / 4TB",    priceGood: 265000 },
  { model: 'MacBook Pro 16" M5 Max 128GB', storage: "2TB / 4TB",           priceGood: 298000 },
  // Mac mini
  { model: "Mac mini M1 8GB",      storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 12000 },
  { model: "Mac mini M1 16GB",     storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 16000 },
  { model: "Mac mini M2 8GB",      storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 15000 },
  { model: "Mac mini M2 16GB",     storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 20000 },
  { model: "Mac mini M2 24GB",     storage: "512GB / 1TB / 2TB",           priceGood: 26000 },
  { model: "Mac mini M2 Pro 16GB", storage: "512GB / 1TB / 2TB / 4TB",    priceGood: 30000 },
  { model: "Mac mini M2 Pro 32GB", storage: "512GB / 1TB / 2TB / 4TB",    priceGood: 40000 },
  { model: "Mac mini M4 16GB",     storage: "256GB / 512GB / 1TB / 2TB",  priceGood: 22000 },
  { model: "Mac mini M4 32GB",     storage: "512GB / 1TB / 2TB",           priceGood: 30000 },
  { model: "Mac mini M4 Pro 24GB", storage: "512GB / 1TB / 2TB / 4TB",    priceGood: 40000 },
  { model: "Mac mini M4 Pro 48GB", storage: "512GB / 1TB / 2TB / 4TB",    priceGood: 55000 },
  // iMac 24"
  { model: 'iMac 24" M1 (7-core GPU) 8GB',   storage: "256GB / 512GB / 1TB", priceGood: 22000 },
  { model: 'iMac 24" M1 (7-core GPU) 16GB',  storage: "256GB / 512GB / 1TB", priceGood: 28000 },
  { model: 'iMac 24" M1 (8-core GPU) 8GB',   storage: "256GB / 512GB / 1TB", priceGood: 25000 },
  { model: 'iMac 24" M1 (8-core GPU) 16GB',  storage: "256GB / 512GB / 1TB", priceGood: 32000 },
  { model: 'iMac 24" M3 (8-core GPU) 8GB',   storage: "256GB / 512GB / 1TB", priceGood: 32000 },
  { model: 'iMac 24" M3 (8-core GPU) 16GB',  storage: "256GB / 512GB / 1TB", priceGood: 40000 },
  { model: 'iMac 24" M3 (8-core GPU) 24GB',  storage: "512GB / 1TB / 2TB",   priceGood: 50000 },
  { model: 'iMac 24" M3 (10-core GPU) 8GB',  storage: "256GB / 512GB / 1TB", priceGood: 36000 },
  { model: 'iMac 24" M3 (10-core GPU) 16GB', storage: "256GB / 512GB / 1TB", priceGood: 46000 },
  { model: 'iMac 24" M3 (10-core GPU) 24GB', storage: "512GB / 1TB / 2TB",   priceGood: 56000 },
  { model: 'iMac 24" M4 (8-core GPU) 16GB',  storage: "256GB / 512GB / 1TB", priceGood: 45000 },
  { model: 'iMac 24" M4 (8-core GPU) 24GB',  storage: "512GB / 1TB / 2TB",   priceGood: 55000 },
  { model: 'iMac 24" M4 (8-core GPU) 32GB',  storage: "512GB / 1TB / 2TB",   priceGood: 65000 },
  { model: 'iMac 24" M4 (10-core GPU) 16GB', storage: "256GB / 512GB / 1TB", priceGood: 52000 },
  { model: 'iMac 24" M4 (10-core GPU) 24GB', storage: "512GB / 1TB / 2TB",   priceGood: 62000 },
  { model: 'iMac 24" M4 (10-core GPU) 32GB', storage: "512GB / 1TB / 2TB",   priceGood: 75000 },
  // Apple Watch Series 6
  { model: "Apple Watch Series 6 40mm (GPS)",          storage: "—", priceGood: 1000  },
  { model: "Apple Watch Series 6 44mm (GPS)",          storage: "—", priceGood: 1500  },
  { model: "Apple Watch Series 6 40mm (GPS+Cellular)", storage: "—", priceGood: 1500  },
  { model: "Apple Watch Series 6 44mm (GPS+Cellular)", storage: "—", priceGood: 2000  },
  // Apple Watch Series 7
  { model: "Apple Watch Series 7 41mm (GPS)",          storage: "—", priceGood: 2000  },
  { model: "Apple Watch Series 7 45mm (GPS)",          storage: "—", priceGood: 2500  },
  { model: "Apple Watch Series 7 41mm (GPS+Cellular)", storage: "—", priceGood: 2500  },
  { model: "Apple Watch Series 7 45mm (GPS+Cellular)", storage: "—", priceGood: 3000  },
  // Apple Watch Series 8
  { model: "Apple Watch Series 8 41mm (GPS)",          storage: "—", priceGood: 2500  },
  { model: "Apple Watch Series 8 45mm (GPS)",          storage: "—", priceGood: 3000  },
  { model: "Apple Watch Series 8 41mm (GPS+Cellular)", storage: "—", priceGood: 3000  },
  { model: "Apple Watch Series 8 45mm (GPS+Cellular)", storage: "—", priceGood: 3500  },
  // Apple Watch Series 9
  { model: "Apple Watch Series 9 41mm (GPS)",          storage: "—", priceGood: 3000  },
  { model: "Apple Watch Series 9 45mm (GPS)",          storage: "—", priceGood: 3500  },
  { model: "Apple Watch Series 9 41mm (GPS+Cellular)", storage: "—", priceGood: 3500  },
  { model: "Apple Watch Series 9 45mm (GPS+Cellular)", storage: "—", priceGood: 4000  },
  // Apple Watch Series 10
  { model: "Apple Watch Series 10 42mm (GPS)",          storage: "—", priceGood: 4000  },
  { model: "Apple Watch Series 10 46mm (GPS)",          storage: "—", priceGood: 4500  },
  { model: "Apple Watch Series 10 42mm (GPS+Cellular)", storage: "—", priceGood: 4500  },
  { model: "Apple Watch Series 10 46mm (GPS+Cellular)", storage: "—", priceGood: 5000  },
  // Apple Watch Series 11
  { model: "Apple Watch Series 11 42mm (GPS)",          storage: "—", priceGood: 5500  },
  { model: "Apple Watch Series 11 46mm (GPS)",          storage: "—", priceGood: 6500  },
  { model: "Apple Watch Series 11 42mm (GPS+Cellular)", storage: "—", priceGood: 6500  },
  { model: "Apple Watch Series 11 46mm (GPS+Cellular)", storage: "—", priceGood: 7500  },
  // Apple Watch SE
  { model: "Apple Watch SE (Gen 1) 40mm (GPS)",          storage: "—", priceGood: 1000  },
  { model: "Apple Watch SE (Gen 1) 44mm (GPS)",          storage: "—", priceGood: 1500  },
  { model: "Apple Watch SE (Gen 1) 40mm (GPS+Cellular)", storage: "—", priceGood: 1500  },
  { model: "Apple Watch SE (Gen 1) 44mm (GPS+Cellular)", storage: "—", priceGood: 2000  },
  { model: "Apple Watch SE (Gen 2) 40mm (GPS)",          storage: "—", priceGood: 2000  },
  { model: "Apple Watch SE (Gen 2) 44mm (GPS)",          storage: "—", priceGood: 2500  },
  { model: "Apple Watch SE (Gen 2) 40mm (GPS+Cellular)", storage: "—", priceGood: 2500  },
  { model: "Apple Watch SE (Gen 2) 44mm (GPS+Cellular)", storage: "—", priceGood: 3000  },
  { model: "Apple Watch SE (Gen 3) 40mm (GPS)",          storage: "—", priceGood: 3000  },
  { model: "Apple Watch SE (Gen 3) 44mm (GPS)",          storage: "—", priceGood: 3500  },
  { model: "Apple Watch SE (Gen 3) 40mm (GPS+Cellular)", storage: "—", priceGood: 4000  },
  { model: "Apple Watch SE (Gen 3) 44mm (GPS+Cellular)", storage: "—", priceGood: 4500  },
  // Apple Watch Ultra
  { model: "Apple Watch Ultra",   storage: "—", priceGood: 7000  },
  { model: "Apple Watch Ultra 2", storage: "—", priceGood: 11000 },
  { model: "Apple Watch Ultra 3", storage: "—", priceGood: 20000 },
];

// ─── Step options ─────────────────────────────────────────────────────────────

interface Opt { label: string; sub?: string; ded: number }

// Single source of truth — derived from DEFAULT_PRICING_CONFIG so summary labels always match wizard options
const [
  _MODEL_TYPE_GROUP, WARRANTY_OPTS, BODY_OPTS, SCREEN_OPTS,
  DISPLAY_OPTS, BATTERY_OPTS, ACCESSORY_OPTS, ICLOUD_OPTS,
] = DEFAULT_PRICING_CONFIG.groups.map(g => g.options) as Opt[][];

const THAI_BANKS = [
  { code: "BBL",   short: "กรุงเทพ",            color: "#1E3A8A", logo: "/banks/bbl.webp"   },
  { code: "KBANK", short: "กสิกรไทย",           color: "#166534", logo: "/banks/kbank.webp" },
  { code: "SCB",   short: "ไทยพาณิชย์",        color: "#6D28D9", logo: "/banks/scb.webp"   },
  { code: "KTB",   short: "กรุงไทย",            color: "#1D4ED8", logo: "/banks/ktb.webp"   },
  { code: "BAY",   short: "กรุงศรี",            color: "#B45309", logo: "/banks/bay.webp"   },
  { code: "GSB",   short: "ออมสิน",             color: "#991B1B", logo: "/banks/gsb.webp"   },
  { code: "TTB",   short: "ทีทีบี",             color: "#0F766E", logo: "/banks/ttb.webp"   },
  { code: "KKP",   short: "เกียรตินาคิน",       color: "#78350F", logo: "/banks/kkp.webp"   },
  { code: "LH",    short: "แลนด์แอนด์เฮ้าส์",  color: "#9A3412", logo: "/banks/lh.webp"    },
] as const;

const BRANCHES = [
  {
    id: "centralladprao",
    name: "สาขารังสิต",
    address: "เดอะแพลนท์ วงแหวน-รังสิต ปทุมธานี",
    img: "/branch-centralladprao.webp",
    mapsUrl: "https://www.google.com/maps?q=14.0128858,100.7201145",
  },
];
function getAvailableTimeSlots(selectedDate: string): string[] {
  const now = new Date();
  const dd = (n: number) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${dd(now.getMonth() + 1)}-${dd(now.getDate())}`;
  const slots: string[] = [];
  for (let h = 9; h <= 23; h++) {
    slots.push(`${dd(h)}:00`);
    slots.push(`${dd(h)}:30`);
  }
  // อนาคต (พรุ่งนี้+) โชว์แค่ 09:00–23:30 — กันความสับสนว่า "ตี 1" คือคืนไหน
  if (selectedDate !== today) return slots;
  // วันนี้เท่านั้น: ต่อช่วงดึกถึงตี 2 (คืนนี้)
  for (let h = 0; h <= 2; h++) {
    slots.push(`${dd(h)}:00`);
    if (h < 2) slots.push(`${dd(h)}:30`);
  }
  const minMinutes = now.getHours() * 60 + now.getMinutes() + 60;
  return slots.filter(s => {
    const [h, m] = s.split(":").map(Number);
    // ช่วง 00:00–02:00 = ต่อเนื่องจากคืนนี้ → นับ +24 ชม. จะได้ไม่ถูกกรองว่า "ผ่านแล้ว" ตอนกลางคืน
    const eff = h <= 2 ? (h + 24) * 60 + m : h * 60 + m;
    return eff >= minMinutes;
  });
}

const STEP_TITLES = [
  "ความจุ (Storage)",
  "Model ของเครื่อง",
  "ประกัน",
  "สภาพตัวเครื่อง",
  "สภาพหน้าจอ",
  "การแสดงภาพหน้าจอ",
  "สุขภาพแบตเตอรี่",
  "อุปกรณ์เสริม",
  "iCloud / Activation Lock",
  "การทำงานของฟังก์ชัน",
];

const FUNCTIONAL_ISSUES = [
  "ปุ่ม Power / Side ไม่ทำงาน",
  "ปุ่ม Volume ค้าง / เสีย",
  "ลำโพงเสียงแตก / ไม่มีเสียง",
  "ไมโครโฟนมีปัญหา",
  "Face ID / Touch ID ไม่ทำงาน",
  "กล้องมีปัญหา (ภาพมัว / ค้าง)",
  "พอร์ตชาร์จหลวม / ชาร์จไม่เข้า",
  "WiFi หรือ Bluetooth มีปัญหา",
  "เครื่องร้อนผิดปกติ / รีสตาร์ทเองบ่อย",
];

const FUNCTIONAL_OPTS: Opt[] = [
  { label: "ปกติทุกฟังก์ชัน", sub: "ทุกปุ่ม ลำโพง กล้อง และฟังก์ชันอื่นๆ ทำงานปกติ", ded: 0 },
  { label: "มีปัญหาการใช้งาน", sub: "บางฟังก์ชันไม่ทำงาน หรือมีความผิดปกติ", ded: 0 },
];

const STEP_OPTS: (Opt[] | null)[] = [
  null,
  _MODEL_TYPE_GROUP,
  WARRANTY_OPTS,
  BODY_OPTS,
  SCREEN_OPTS,
  DISPLAY_OPTS,
  BATTERY_OPTS,
  ACCESSORY_OPTS,
  ICLOUD_OPTS,
  FUNCTIONAL_OPTS,
];

const TOTAL_STEPS = 10;
const TOTAL_MAIN_STEPS = 9;
const ICLOUD_STEP = 8;
const FUNCTIONAL_STEP = 9;

// ─── Price calc ───────────────────────────────────────────────────────────────

function shortenModelLabel(label: string) {
  return label.replace(/ รุ่น[\s\d,]+/g, "");
}

function buildSummaryRows(picks: (number | null)[], storages: string[], modelTypeOpts: Opt[]) {
  return [
    { title: "ความจุ",     value: picks[0] !== null ? (storages[picks[0]] ?? null) : null },
    { title: "Model",      value: picks[1] !== null ? (shortenModelLabel(modelTypeOpts[picks[1]]?.label ?? "")) || null : null },
    { title: "ประกัน",     value: picks[2] !== null ? (WARRANTY_OPTS[picks[2]]?.label ?? null) : null },
    { title: "ตัวเครื่อง", value: picks[3] !== null ? (BODY_OPTS[picks[3]]?.label ?? null) : null },
    { title: "หน้าจอ",     value: picks[4] !== null ? (SCREEN_OPTS[picks[4]]?.label ?? null) : null },
    { title: "ภาพหน้าจอ",  value: picks[5] !== null ? (DISPLAY_OPTS[picks[5]]?.label ?? null) : null },
    { title: "แบตเตอรี่",  value: picks[6] !== null ? (BATTERY_OPTS[picks[6]]?.label ?? null) : null },
    { title: "อุปกรณ์",    value: picks[7] !== null ? (ACCESSORY_OPTS[picks[7]]?.label ?? null) : null },
    { title: "iCloud",     value: picks[8] !== null ? (ICLOUD_OPTS[picks[8]]?.label ?? null) : null },
    { title: "ฟังก์ชัน",   value: picks[9] !== null ? (FUNCTIONAL_OPTS[picks[9]]?.label ?? null) : null },
  ].filter((r): r is { title: string; value: string } => r.value !== null);
}

// ─── Focus Header (mobile only) ───────────────────────────────────────────────

function FocusHeader({ backHref }: { backHref: string }) {
  const router = useRouter();
  const [showExit, setShowExit] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-40 bg-white" style={{ borderBottom: "1px solid #E5E7EB" }}>
        <div className="flex items-center px-4 h-14 gap-3">
          <a
            href={backHref}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ border: "1px solid #E5E7EB" }}
          >
            <ChevronLeft size={18} className="text-black" />
          </a>
          <button
            type="button"
            onClick={() => setShowExit(true)}
            className="flex-1 flex items-center justify-start gap-1 bg-transparent border-none"
            style={{ cursor: "pointer" }}
          >
            <Image src="/logo-icon.webp" alt="Khaiphone.com" width={32} height={32} className="flex-shrink-0 rounded-lg" style={{ width: 32, height: 32 }} />
            <div className="flex flex-col text-left">
              <p className="font-bold text-sm text-black leading-tight">Khaiphone.com</p>
              <p className="text-xs leading-tight" style={{ color: "#6B7280" }}>รับซื้อ Apple มือสอง</p>
            </div>
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Lock size={11} style={{ color: "#16A34A" }} />
            <span className="text-xs font-medium" style={{ color: "#16A34A" }}>บันทึกอัตโนมัติ</span>
          </div>
        </div>
      </header>

      {/* Exit popup */}
      {showExit && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4 md:hidden"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowExit(false)}
        >
          <div
            className="w-full bg-white"
            style={{ maxWidth: 360, borderRadius: 16, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: "#B8860B" }}>
              <Lock size={24} color="#fff" />
            </div>
            <h3 className="text-lg font-bold text-black text-center mb-2">คุณต้องการออกจากการประเมินไหม?</h3>
            <p className="text-sm text-center mb-6" style={{ color: "#6B7280" }}>
              ข้อมูลของคุณถูกบันทึกไว้แล้ว กลับมาทำต่อได้ทุกเมื่อ
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setShowExit(false)}
                className="flex items-center justify-center w-full font-semibold text-white text-sm"
                style={{ background: "#B8860B", borderRadius: 999, height: 52, cursor: "pointer" }}
              >
                ประเมินต่อ
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex items-center justify-center w-full font-semibold text-sm"
                style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 999, height: 52, color: "#374151", cursor: "pointer" }}
              >
                ออกจากการประเมิน
              </button>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <Lock size={11} style={{ color: "#D1D5DB" }} />
              <span className="text-xs" style={{ color: "#6B7280" }}>ข้อมูลของคุณจะถูกบันทึกไว้อย่างปลอดภัย</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Progress Bar Premium ─────────────────────────────────────────────────────

const STEP_LABELS = ["ความจุ", "Model", "ประกัน", "ตัวเครื่อง", "หน้าจอ", "แบต", "อุปกรณ์", "iCloud", "ฟังก์ชัน"];

function ProgressBarPremium({ step }: { step: number }) {
  const raw = step <= 5 ? Math.min(step, 4) : step - 1;
  const count = Math.min(raw, TOTAL_MAIN_STEPS);
  return (
    <div className="bg-white px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
      <div className="max-w-lg mx-auto">
        <div className="flex items-start">
          {Array.from({ length: TOTAL_MAIN_STEPS }, (_, i) => {
            const isDone    = i < count;
            const isCurrent = i === count && count < TOTAL_MAIN_STEPS;
            return (
              <Fragment key={i}>
                {i > 0 && (
                  <div
                    className="flex-1 h-0.5 mt-3.5 flex-shrink"
                    style={{ background: i <= count ? "#B8860B" : "#E5E7EB", minWidth: 2 }}
                  />
                )}
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: 28 }}>
                  <div
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
                    style={{
                      fontSize: 11, fontWeight: 700,
                      background:  isDone ? "#B8860B" : "#fff",
                      borderColor: isDone || isCurrent ? "#B8860B" : "#D1D5DB",
                      color:       isDone ? "#fff" : isCurrent ? "#B8860B" : "#6B7280",
                    }}
                  >
                    {isDone ? <Check size={11} strokeWidth={3} color="#fff" /> : i + 1}
                  </div>
                  <p
                    className="text-center mt-1 leading-tight"
                    style={{ fontSize: 8, width: 36, marginLeft: -4, color: isDone || isCurrent ? "#B8860B" : "#6B7280" }}
                  >
                    {STEP_LABELS[i]}
                  </p>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Progress Bar Form (4-step) ───────────────────────────────────────────────

const FORM_STEP_LABELS = ["รุ่นและสภาพ", "ประเมินราคา", "ข้อมูลการขาย", "ยืนยันและนัดหมาย"];

function ProgressBarForm() {
  return (
    <div className="bg-white px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
      <div className="max-w-6xl mx-auto px-0 md:px-4">
        <div className="flex items-start" style={{ maxWidth: 480, margin: "0 auto" }}>
          {FORM_STEP_LABELS.map((label, i) => {
            const isDone    = i < 2;
            const isCurrent = i === 2;
            const isActive  = isDone || isCurrent;
            return (
              <Fragment key={i}>
                {i > 0 && (
                  <div
                    className="flex-1 h-0.5 mt-3.5 mx-1"
                    style={{
                      background: i <= 2 ? "#B8860B" : "#E5E7EB",
                      transition: "background 320ms cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                )}
                <div className="flex flex-col items-center flex-shrink-0" style={{ width: 52 }}>
                  <div
                    className="w-7 h-7 rounded-full border-2 flex items-center justify-center"
                    style={{
                      fontSize: 11, fontWeight: 700,
                      background:  isDone ? "#B8860B" : "#fff",
                      borderColor: isActive ? "#B8860B" : "#D1D5DB",
                      color:       isDone ? "#fff" : isCurrent ? "#B8860B" : "#6B7280",
                      transition:  "all 220ms cubic-bezier(0.4,0,0.2,1)",
                      boxShadow:   isCurrent ? "0 0 0 3px rgba(184,134,11,0.18)" : "none",
                      transform:   isCurrent ? "scale(1.13)" : "scale(1)",
                    }}
                  >
                    {isDone ? <Check size={11} strokeWidth={3} color="#fff" /> : i + 1}
                  </div>
                  <p
                    className="text-center mt-1 leading-tight"
                    style={{
                      fontSize: 9,
                      color:      isActive ? "#B8860B" : "#6B7280",
                      fontWeight: isCurrent ? 700 : isActive ? 600 : 400,
                      transition: "color 220ms ease, font-weight 220ms ease",
                    }}
                  >
                    {label}
                  </p>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Context Bar ───────────────────────────────────────────────────────

function BottomContextBar({ product }: { product: Product }) {
  const img = getProductImage(product.model);
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white"
      style={{ borderTop: "1px solid #E5E7EB" }}
    >
      <div className="max-w-6xl mx-auto flex items-center px-4 gap-3" style={{ height: 56 }}>
        <div
          className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: "#F5F5F7" }}
        >
          {img
            ? <Image src={img} alt={product.model} fill className="object-contain p-1" sizes="32px" />
            : <IconApple className="w-5 h-5" style={{ color: "#999" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs leading-tight" style={{ color: "#6B7280" }}>กำลังประเมิน</p>
          <p className="text-sm font-bold text-black truncate leading-tight">{product.model}</p>
        </div>
        <a
          href="/sell"
          className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ color: "#B8860B", border: "1px solid #B8860B" }}
        >
          เปลี่ยนรุ่น
        </a>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function SellModelPageContent() {
  const params       = useParams<{ model: string }>();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [products, setProducts] = useState<Product[]>(ALL_PRODUCTS);
  const [groupOptions, setGroupOptions] = useState<PricingOption[][]>(
    DEFAULT_PRICING_CONFIG.groups.map(g => g.options),
  );
  const [storageMultiplier, setStorageMultiplier] = useState(0.12);
  const [floorPct, setFloorPct] = useState(0.60);
  const [storagePrices, setStoragePrices] = useState<Record<string, number> | null>(null);
  const [hasCustomDed, setHasCustomDed]   = useState(false);
  const [pricesLoaded, setPricesLoaded]   = useState(false);

  useEffect(() => {
    const modelSlug = params.model;
    Promise.all([fetchPublicActiveProducts(), fetchPublicPricingConfig()]).then(([dbProducts, cfg]) => {
      if (dbProducts.length > 0) {
        setProducts(
          ALL_PRODUCTS.map(p => {
            const db = dbProducts.find(d => d.model === p.model);
            return db ? { ...p, priceGood: db.price_good } : p;
          })
        );
      }
      setStorageMultiplier(cfg.storageMultiplier);
      setFloorPct(cfg.floorPct);
      const match = dbProducts.find(d => toSlug(d.model) === modelSlug);
      setStoragePrices(match?.storage_prices ?? null);
      if (match?.floor_pct != null) setFloorPct(match.floor_pct);
      const customDed = !!(match?.deductions && match.deductions.length > 0);
      setHasCustomDed(customDed);
      if (customDed) {
        setGroupOptions(DEFAULT_PRICING_CONFIG.groups.map((defaultGroup, gi) => {
          const customGroup = match!.deductions![gi];
          return defaultGroup.options.map((defaultOpt, oi) => ({
            ...defaultOpt,
            ded: customGroup?.options?.[oi]?.ded ?? defaultOpt.ded,
          }));
        }));
      } else {
        setGroupOptions(cfg.groups.map(g => g.options));
      }
      setPricesLoaded(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const product  = products.find(p => toSlug(p.model) === params.model) ?? null;
  const storages = product ? product.storage.split(" / ") : [];

  const [step, setStep] = useState(() =>
    Math.min(parseInt(searchParams.get("step") ?? "0"), TOTAL_STEPS)
  );
  const [picks, setPicks] = useState<(number | null)[]>(() =>
    Array.from({ length: TOTAL_STEPS }, (_, i) => {
      const v = searchParams.get(`s${i}`);
      return v !== null ? parseInt(v) : null;
    })
  );

  const isWizardDone = step >= TOTAL_STEPS;
  const isWizard     = !isWizardDone;
  const isResultPhase = isWizardDone && searchParams.get("r") === "1";
  const isFormPhase   = isWizardDone && !isResultPhase;

  // Local pick tracks { step, pick } so stale values from a previous step never bleed into the new step
  const [localPickState, setLocalPickState] = useState<{ step: number; pick: number } | null>(
    picks[step] !== null ? { step, pick: picks[step]! } : null,
  );
  const localPick = localPickState?.step === step ? localPickState.pick : (picks[step] ?? null);

  const nameRef  = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const scrollYRef = useRef(0);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const riderAddressInputRef = useRef<HTMLInputElement>(null);
  const riderSectionRef  = useRef<HTMLDivElement>(null);
  const mapDivRef        = useRef<HTMLDivElement | null>(null);
  const mapsLoadedRef    = useRef(false);
  const mapInitRef       = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef        = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef   = useRef<any>(null);
  const modalSearchRef   = useRef<HTMLInputElement>(null);
  const bankSectionRef   = useRef<HTMLDivElement>(null);
  const termsSectionRef  = useRef<HTMLDivElement>(null);
  const appointSectionRef = useRef<HTMLDivElement>(null);

  const WIZARD_KEY = `khaiphone_wizard_${params.model}`;

  // Hide global MobileNav — this is a focus-mode page with its own bottom bar
  useEffect(() => {
    const nav = document.querySelector("nav.fixed.bottom-0") as HTMLElement | null;
    if (nav) nav.style.display = "none";
    return () => { if (nav) nav.style.display = ""; };
  }, []);

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => { setIsHydrated(true); }, []);

  const trackedStepsRef = useRef(new Set<number>());
  const sessionIdRef = useRef<string>("");
  useEffect(() => {
    try {
      let sid = sessionStorage.getItem("kp_estimate_sid");
      if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem("kp_estimate_sid", sid); }
      sessionIdRef.current = sid;
    } catch { sessionIdRef.current = Math.random().toString(36).slice(2); }
  }, []);

  // Track funnel steps
  useEffect(() => {
    if (!sessionIdRef.current || !product) return;
    const sid = sessionIdRef.current;
    if (step === 0 && !trackedStepsRef.current.has(-1)) {
      trackedStepsRef.current.add(-1);
      trackEstimateEvent({ sessionId: sid, event: "start", model: product.model });
    } else if (step > 0 && step < TOTAL_STEPS && !trackedStepsRef.current.has(step)) {
      trackedStepsRef.current.add(step);
      trackEstimateEvent({ sessionId: sid, event: "step_reached", model: product.model, stepIndex: step, stepName: STEP_TITLES[step] });
    } else if (step >= TOTAL_STEPS && pricesLoaded && !trackedStepsRef.current.has(TOTAL_STEPS)) {
      trackedStepsRef.current.add(TOTAL_STEPS);
      const selectedStorage = picks[0] !== null ? storages[picks[0]] : undefined;
      const estPrice = calcPrice(product, picks, effectiveGroupOptions, storageMultiplier, storagePrices, floorPct);
      trackEstimateEvent({ sessionId: sid, event: "price_seen", model: product.model, storage: selectedStorage, price: estPrice });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, product?.model, pricesLoaded]);

  // Restore wizard progress on fresh URL
  useEffect(() => {
    if (!isHydrated) return;
    const isFresh = step === 0 && picks.every(p => p === null) && !searchParams.has("r");
    if (!isFresh) return;
    try {
      const raw = localStorage.getItem(WIZARD_KEY);
      if (!raw) return;
      const { step: savedStep, picks: savedPicks } = JSON.parse(raw) as { step: number; picks: (number | null)[] };
      if (savedStep === 0 && savedPicks.every((p: number | null) => p === null)) return;
      const p = new URLSearchParams();
      p.set("step", String(savedStep));
      savedPicks.forEach((sel: number | null, i: number) => {
        if (sel !== null) p.set(`s${i}`, String(sel));
      });
      setStep(savedStep);
      setPicks(savedPicks);
      window.history.replaceState(null, "", `/sell/${params.model}?${p.toString()}`);
    } catch {}
  }, [isHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  function saveWizard(newStep: number, newPicks: (number | null)[]) {
    if (newStep === 0 && newPicks.every(p => p === null)) return;
    try {
      localStorage.setItem(WIZARD_KEY, JSON.stringify({ step: newStep, picks: newPicks, savedAt: Date.now() }));
    } catch {}
  }

  function syncUrl(newStep: number, newPicks: (number | null)[], extra?: Record<string, string>) {
    const p = new URLSearchParams();
    p.set("step", String(newStep));
    newPicks.forEach((pick, i) => { if (pick !== null) p.set(`s${i}`, String(pick)); });
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    window.history.replaceState(null, "", `/sell/${params.model}?${p.toString()}`);
  }

  function goNext(pick: number | null = localPick) {
    const newPicks = [...picks];
    if (pick !== null) newPicks[step] = pick;
    const newStep = step + 1;
    setPicks(newPicks);
    setStep(newStep);
    saveWizard(newStep, newPicks);
    syncUrl(newStep, newPicks);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }

  function goBack() {
    if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
    const newStep = Math.max(0, step - 1);
    setStep(newStep);
    syncUrl(newStep, picks);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }

  function goBackToWizard() {
    if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
    const newStep = TOTAL_STEPS - 1;
    setStep(newStep);
    syncUrl(newStep, picks);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }

  function goToWizardStart() {
    if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }
    setStep(0);
    syncUrl(0, picks);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }

  function handleSelect(fn: () => void) {
    scrollYRef.current = window.scrollY;
    fn();
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        window.scrollTo({ top: scrollYRef.current, behavior: "instant" as ScrollBehavior })
      )
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void handleSelect; // used by form phase if needed

  const urlName = searchParams.get("f-name");
  const [formData, setFormData] = useState<{ name: string; phone: string; email: string }>(
    urlName
      ? { name: urlName, phone: searchParams.get("f-phone") ?? "", email: searchParams.get("f-email") ?? "" }
      : { name: "", phone: "", email: "" }
  );
  useEffect(() => {
    if (urlName) return;
    try {
      const saved = sessionStorage.getItem("kp_seller");
      if (saved) setFormData(JSON.parse(saved));
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [errors, setErrors] = useState({ name: false, phone: false, terms: false, riderAddress: false, province: false, bankName: false, bankAccount: false, bankAccountName: false });
  const [submitting, setSubmitting] = useState(false);
  const [sellMethod, setSellMethod] = useState<"branch" | "rider" | "parcel">("rider");
  const [payMethod, setPayMethod] = useState<"cash" | "transfer">("cash");
  const [appointDate, setAppointDate] = useState(() => {
    const d = new Date();
    const dd = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
  });
  const [appointTime, setAppointTime] = useState(() => {
    const now = new Date();
    const dd = (n: number) => String(n).padStart(2, "0");
    const today = `${now.getFullYear()}-${dd(now.getMonth() + 1)}-${dd(now.getDate())}`;
    const slots = getAvailableTimeSlots(today);
    return slots[0] ?? "14:00";
  });
  const [notes, setNotes] = useState("");
  // social proof — จำนวนคนเห็นราคา 30 วัน (เลขจริง)
  const [priceCheckCount, setPriceCheckCount] = useState<number | null>(null);
  // คิวรับถึงที่ที่ถูกจองแล้วของวันที่เลือก (เพื่อปิดช่วงเวลาที่เต็ม)
  const [slotAvail, setSlotAvail] = useState<{ capacity: number; counts: Record<string, number>; blockedTimes: string[]; blockedWholeDay: boolean } | null>(null);
  const [riderAddress, setRiderAddress] = useState("");
  const [province, setProvince] = useState("");
  const [pinAddress, setPinAddress] = useState("");
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationModal, setLocationModal] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [extraDevices, setExtraDevices] = useState<ExtraDevice[]>([]);
  const [bundleReturn, setBundleReturn] = useState<string | null>(null);
  const [sidebarDeviceTab, setSidebarDeviceTab] = useState(0);
  const [functionalIssues, setFunctionalIssues] = useState<string[]>([]);
  const [functionalOther, setFunctionalOther] = useState("");
  const [issueContact, setIssueContact] = useState({ name: "", phone: "" });
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [issueSubmitDone, setIssueSubmitDone] = useState(false);

  // ดึงจำนวนคนเห็นราคา 30 วัน (social proof) — โหลดครั้งเดียวเมื่อเข้าหน้าฟอร์ม
  useEffect(() => {
    if (!isFormPhase || priceCheckCount !== null) return;
    fetchRecentPriceCheckCount().then(setPriceCheckCount).catch(() => {});
  }, [isFormPhase, priceCheckCount]);

  // ดึงคิว "รับถึงที่" ที่จองแล้วของวันที่เลือก เพื่อปิดช่วงเวลาที่เต็ม
  useEffect(() => {
    if (!isFormPhase || sellMethod !== "rider") { setSlotAvail(null); return; }
    let active = true;
    fetchRiderSlotAvailability(appointDate).then(r => { if (active) setSlotAvail(r); }).catch(() => {});
    return () => { active = false; };
  }, [appointDate, sellMethod, isFormPhase]);

  // Sync appointment time — auto-select ช่วงเวลาแรกที่ยังไม่เต็ม/ไม่ถูกปิด เมื่อวันที่/คิวเปลี่ยน
  useEffect(() => {
    if (!isFormPhase) return;
    const slots = getAvailableTimeSlots(appointDate);
    const isFull = (t: string) => {
      if (sellMethod !== "rider" || !slotAvail) return false;
      if (slotAvail.blockedWholeDay) return true;
      if (slotAvail.blockedTimes.includes(t)) return true;
      return (slotAvail.counts[t] ?? 0) >= slotAvail.capacity;
    };
    const open = slots.filter(t => !isFull(t));
    if (open.length > 0 && (!slots.includes(appointTime) || isFull(appointTime))) setAppointTime(open[0]);
  }, [appointDate, slotAvail, sellMethod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load bundle state from localStorage — re-run when bundle_ts URL param changes (set on return from bundle flow)
  const bundleTs = searchParams.get("bundle_ts");
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BUNDLE_KEY);
      setExtraDevices(stored ? JSON.parse(stored) as ExtraDevice[] : []);
      const ret = localStorage.getItem(BUNDLE_RETURN_KEY);
      setBundleReturn(ret);
    } catch {}
  }, [bundleTs]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchCurrentLocation() {
    if (!navigator.geolocation) { setRiderAddress("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง"); return; }
    setLocationLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      const { latitude, longitude } = pos.coords;
      let address = "";

      // Try Google Maps Geocoding API (set NEXT_PUBLIC_GOOGLE_MAPS_KEY in .env.local)
      const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
      if (googleKey) {
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&language=th&key=${googleKey}`);
          const data = await res.json() as { status: string; results: Array<{ formatted_address: string }> };
          if (data.status === "OK" && data.results.length > 0) {
            address = data.results[0].formatted_address;
          }
        } catch {}
      }

      // Fallback: Nominatim (OpenStreetMap)
      if (!address) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=th`);
          const data = await res.json() as { display_name?: string };
          address = data.display_name ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        } catch {
          address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        }
      }

      setPinAddress(address);
      setLocationModal({ lat: latitude, lng: longitude, address });
    } catch {
      setRiderAddress("ไม่สามารถดึงตำแหน่งได้อัตโนมัติ กรุณากรอกที่อยู่เอง");
    } finally {
      setLocationLoading(false);
    }
  }

  // Load Google Maps JS API + attach Places Autocomplete when rider section is visible
  useEffect(() => {
    if (sellMethod !== "rider") return;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) return;

    function initAutocomplete() {
      const input = riderAddressInputRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      if (!input || !g?.maps?.places) return;
      const ac = new g.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "th" },
        fields: ["formatted_address", "geometry", "name"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const loc = place?.geometry?.location;
        if (!loc) return;
        const address: string = place.formatted_address ?? place.name ?? input.value;
        setRiderAddress(address);
        setErrors(er => ({ ...er, riderAddress: false }));
        setPinAddress(address);
        setLocationModal({ lat: loc.lat(), lng: loc.lng(), address });
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.maps?.places) { initAutocomplete(); return; }
    if (mapsLoadedRef.current) return;
    mapsLoadedRef.current = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&language=th&region=TH`;
    script.async = true;
    script.onload = initAutocomplete;
    document.head.appendChild(script);
  }, [sellMethod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init interactive map + draggable marker when location modal opens
  useEffect(() => {
    if (!locationModal) { mapInitRef.current = false; markerRef.current = null; mapInstanceRef.current = null; return; }
    if (mapInitRef.current) return;
    const t = setTimeout(() => {
      const container = mapDivRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).google;
      if (!container || !g?.maps) return;
      mapInitRef.current = true;
      const { lat, lng } = locationModal;
      setPinCoords({ lat, lng });
      const map = new g.maps.Map(container, {
        center: { lat, lng }, zoom: 16,
        mapTypeControl: false, streetViewControl: false,
        fullscreenControl: false, gestureHandling: "greedy",
      });
      mapInstanceRef.current = map;
      const marker = new g.maps.Marker({
        position: { lat, lng }, map, draggable: true,
        title: "ลากเพื่อปรับตำแหน่ง",
      });
      markerRef.current = marker;
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (!pos) return;
        setPinCoords({ lat: pos.lat(), lng: pos.lng() });
        new g.maps.Geocoder().geocode({ location: pos }, (results: Array<{formatted_address: string}>, status: string) => {
          const addr = status === "OK" && results?.[0]
            ? results[0].formatted_address
            : `${pos.lat().toFixed(5)}, ${pos.lng().toFixed(5)}`;
          setPinAddress(addr);
        });
      });

      // Places Autocomplete on modal search input
      const searchEl = modalSearchRef.current;
      if (searchEl && g.maps.places) {
        const ac = new g.maps.places.Autocomplete(searchEl, {
          fields: ["geometry", "formatted_address", "name"],
          componentRestrictions: { country: "th" },
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          const newLat = loc.lat();
          const newLng = loc.lng();
          const addr: string = place.formatted_address ?? place.name ?? searchEl.value;
          map.setCenter({ lat: newLat, lng: newLng });
          map.setZoom(17);
          marker.setPosition({ lat: newLat, lng: newLng });
          setPinCoords({ lat: newLat, lng: newLng });
          setPinAddress(addr);
          searchEl.value = "";
        });
      }
    }, 80);
    return () => clearTimeout(t);
  }, [locationModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // หมุด = ความจริง → reverse-geocode พิกัดเป็น "จังหวัด" แล้วปรับ dropdown อัตโนมัติ (กันเลือกผิด)
  useEffect(() => {
    if (!pinCoords) return;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${pinCoords.lat},${pinCoords.lng}&language=th&key=${key}`);
        const data = await res.json() as { results?: Array<{ address_components?: Array<{ long_name: string; short_name?: string; types: string[] }> }> };
        const prov = extractProvince(data.results?.[0]?.address_components);
        if (active && prov) { setProvince(prov); setErrors(er => ({ ...er, province: false })); }
      } catch {}
    })();
    return () => { active = false; };
  }, [pinCoords]);

  function handleAddToBundle(finalPicks?: (number | null)[]) {
    if (!product) return;
    const fp = finalPicks ?? picks;
    const finalRows = buildSummaryRows(fp, storages, effectiveGroupOptions[0]);
    const device: ExtraDevice = {
      model: product.model,
      storage: fp[0] !== null ? storages[fp[0]] : "",
      estimatedPrice: price,
      details: finalRows,
    };
    try {
      const existing: ExtraDevice[] = JSON.parse(localStorage.getItem(BUNDLE_KEY) ?? "[]");
      localStorage.setItem(BUNDLE_KEY, JSON.stringify([...existing, device]));
      localStorage.removeItem(BUNDLE_RETURN_KEY);
    } catch {}
    // Add bundle_ts to return URL so the form page re-reads localStorage on arrival
    try {
      const retUrl = new URL(bundleReturn!, window.location.origin);
      retUrl.searchParams.set("bundle_ts", Date.now().toString());
      router.push(retUrl.pathname + retUrl.search);
    } catch {
      router.push(bundleReturn!);
    }
  }

  function handleRemoveExtra(idx: number) {
    const updated = extraDevices.filter((_, i) => i !== idx);
    setExtraDevices(updated);
    try { localStorage.setItem(BUNDLE_KEY, JSON.stringify(updated)); } catch {}
  }

  function handleRemoveMain() {
    if (extraDevices.length === 0) return;
    const [newMain, ...remaining] = extraDevices;
    try {
      localStorage.setItem(BUNDLE_KEY, JSON.stringify(remaining));
      if (remaining.length === 0) localStorage.removeItem(BUNDLE_RETURN_KEY);
    } catch {}
    window.location.href = `/sell/${toSlug(newMain.model)}`;
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const name  = (nameRef.current?.value  ?? "").trim();
    const phone = (phoneRef.current?.value ?? "").trim();
    const email = (emailRef.current?.value ?? "").trim();
    const newErrors = {
      name:            !name,
      phone:           !phone,
      terms:           !acceptTerms,
      riderAddress:    sellMethod === "rider" && zoneInfo.zone !== "far" && !riderAddress.trim(),
      province:        sellMethod === "rider" && !province,
      bankName:        payMethod === "transfer" && !bankName,
      bankAccount:     payMethod === "transfer" && !bankAccount.trim(),
      bankAccountName: payMethod === "transfer" && !bankAccountName.trim(),
    };
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      const firstEl: HTMLElement | null =
        newErrors.name            ? nameRef.current :
        newErrors.phone           ? phoneRef.current :
        (newErrors.province || newErrors.riderAddress) ? riderSectionRef.current :
        (newErrors.bankName || newErrors.bankAccount || newErrors.bankAccountName) ? bankSectionRef.current :
        newErrors.terms           ? termsSectionRef.current : null;
      firstEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // Validate appointment time is still at least 1 hour in the future —
    // only for channels that actually schedule one (parcel has no appointment).
    // โซนไกล + Rider → ต้องเปลี่ยนเป็นส่งพัสดุก่อน
    if (sellMethod === "rider" && province && zoneInfo.zone === "far") {
      riderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      alert("พื้นที่ของคุณอยู่นอกเขตรับถึงที่ กรุณาเลือกช่องทาง “ส่งเครื่องทางพัสดุ”");
      return;
    }
    if (sellMethod !== "parcel") {
      const validSlots = getAvailableTimeSlots(appointDate);
      if (validSlots.length === 0 || !validSlots.includes(appointTime)) {
        const corrected = validSlots[0];
        if (corrected) setAppointTime(corrected);
        appointSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        alert("เวลานัดหมายที่เลือกผ่านไปแล้ว กรุณาเลือกเวลาใหม่");
        return;
      }
    }
    setSubmitting(true);
    const sellerData = { name, phone, email };
    setFormData(sellerData);
    try { sessionStorage.setItem("kp_seller", JSON.stringify(sellerData)); } catch {}

    const year = new Date().getFullYear();
    const orderNumber = `KH-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
    const location =
      sellMethod === "branch" ? BRANCHES[0].name
      : sellMethod === "rider" ? riderAddress
      : "จัดส่งพัสดุมาที่บริษัท";
    const bankShort = THAI_BANKS.find(b => b.code === bankName)?.short ?? bankName;
    const submission = {
      orderNumber,
      model: product!.model,
      storage: picks[0] !== null ? storages[picks[0]] : "",
      condition: picks[3] !== null ? BODY_OPTS[picks[3]]?.sub ?? "" : "",
      selections: {
        storage:     picks[0] !== null ? storages[picks[0]] : "",
        modelType:   picks[1] !== null ? effectiveGroupOptions[0][picks[1]]?.label ?? "" : "",
        warranty:    picks[2] !== null ? WARRANTY_OPTS[picks[2]]?.label ?? "" : "",
        body:        picks[3] !== null ? BODY_OPTS[picks[3]]?.label ?? "" : "",
        screen:      picks[4] !== null ? SCREEN_OPTS[picks[4]]?.label ?? "" : "",
        display:     picks[5] !== null ? DISPLAY_OPTS[picks[5]]?.label ?? "" : "",
        battery:     picks[6] !== null ? BATTERY_OPTS[picks[6]]?.label ?? "" : "",
        accessories: picks[7] !== null ? ACCESSORY_OPTS[picks[7]]?.label ?? "" : "",
        icloud:      picks[8] !== null ? ICLOUD_OPTS[picks[8]]?.label ?? "" : "",
        functional:  picks[9] !== null ? FUNCTIONAL_OPTS[picks[9]]?.label ?? "" : "",
      },
      estimatedPrice: price,
      priceMin,
      priceMax,
      customer: sellerData,
      appointment: {
        method: sellMethod,
        date:   effectiveAppointDate,
        time:   appointTime,
        location,
        ...(pinCoords ? { lat: pinCoords.lat, lng: pinCoords.lng } : {}),
        ...(sellMethod === "rider" ? {
          province,
          zone: zoneInfo.zone,
          ...(zoneInfo.fee > 0 ? { serviceFee: zoneInfo.fee } : {}),
        } : {}),
      },
      payment: {
        method:        payMethod,
        bankName:      payMethod === "transfer" ? bankShort : undefined,
        accountNumber: payMethod === "transfer" ? bankAccount : undefined,
        accountName:   payMethod === "transfer" ? bankAccountName : undefined,
      },
      notes: notes || undefined,
      extraDevices: extraDevices.length > 0 ? extraDevices : undefined,
    };

    // Submit to Supabase — navigate optimistically on transient errors so the user isn't kept waiting
    const successUrl = `/sell/success?order=${encodeURIComponent(submission.orderNumber)}&phone=${encodeURIComponent(submission.customer.phone)}`;
    let submitted = false;
    try {
      const result = await submitRequest(submission);
      if (result.success) {
        submitted = true;
      } else {
        // Real validation/business error — show immediately, do not navigate
        const isTransient = result.error?.toLowerCase().includes("schema") || result.error?.toLowerCase().includes("cache");
        if (!isTransient) {
          setSubmitting(false);
          alert(result.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
          return;
        }
        // Transient DB error — navigate anyway, success page will retry
      }
    } catch {
      // Network/timeout error — navigate anyway, success page will retry
    }

    if (submitted) trackEstimateEvent({ sessionId: sessionIdRef.current, event: "submit", model: product!.model });
    try { localStorage.setItem("khaiphone_submission", JSON.stringify({ ...submission, submittedAt: new Date().toISOString() })); } catch {}
    try { localStorage.removeItem(WIZARD_KEY); } catch {}
    try { localStorage.removeItem(BUNDLE_KEY); localStorage.removeItem(BUNDLE_RETURN_KEY); } catch {}
    router.replace(successUrl);
  }

  const effectiveGroupOptions: PricingOption[][] = product
    ? [getModelTypeOpts(product.model, groupOptions[0]) ?? groupOptions[0], ...groupOptions.slice(1)]
    : groupOptions;

  const price = (product && pricesLoaded) ? calcPrice(product, picks, effectiveGroupOptions, storageMultiplier, storagePrices, floorPct) : 0;
  const { min: priceMin, max: priceMax } = calcPriceRange(price);
  const summaryRows = product ? buildSummaryRows(picks, storages, effectiveGroupOptions[0]) : [];
  const totalBundlePrice = price + extraDevices.reduce((sum, d) => sum + d.estimatedPrice, 0);
  // ราคานี้ล็อก 7 วัน (แสดงวันที่แบบไทย)
  const priceLockDate = new Date(Date.now() + 7 * 86400000).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  // ตี 0–2 ที่เลือกจาก "วันนี้" = เช้ามืดของวันถัดไปตามปฏิทิน → เลื่อนวันจริงที่จะเก็บ/นับคิว/แสดง
  const ddp = (n: number) => String(n).padStart(2, "0");
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${ddp(d.getMonth() + 1)}-${ddp(d.getDate())}`; })();
  const isLateNight = (t: string) => Number((t || "").split(":")[0]) <= 2;
  const nextDayStr = (iso: string) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${ddp(d.getMonth() + 1)}-${ddp(d.getDate())}`; };
  const effectiveAppointDate = (isLateNight(appointTime) && appointDate === todayStr) ? nextDayStr(appointDate) : appointDate;
  const isRolledLateNight = effectiveAppointDate !== appointDate;
  // โซนรับถึงที่ (จำแนกจากจังหวัด) — คุมค่าบริการ/flow ของช่องทาง Rider
  const zoneInfo = classifyZone(province);

  // URL helpers
  function urlWith(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set(key, value);
    return `/sell/${params.model}?${p.toString()}`;
  }
  function nextUrl(pick: number | null = localPick) {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("r");
    p.set("step", String(step + 1));
    if (pick !== null) p.set(`s${step}`, String(pick));
    return `/sell/${params.model}?${p.toString()}`;
  }
  function backUrl() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("r");
    p.set("step", String(Math.max(0, step - 1)));
    return `/sell/${params.model}?${p.toString()}`;
  }
  function backToWizardUrl() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("r");
    p.set("step", String(TOTAL_STEPS - 1));
    return `/sell/${params.model}?${p.toString()}`;
  }

  const headerBackHref = isResultPhase
    ? "/sell"
    : isFormPhase
    ? backToWizardUrl()
    : step === 0
    ? "/sell"
    : backUrl();

  const stepOpts: PricingOption[] = isWizard && step === 0
    ? storages.map(s => ({ label: s, ded: 0 }))
    : step === FUNCTIONAL_STEP
    ? FUNCTIONAL_OPTS
    : (effectiveGroupOptions[step - 1] ?? []);

  return (
    <div className={`min-h-screen bg-gray-50 ${isFormPhase ? "pb-24 md:pb-10" : "pb-14"}`}>
      {/* Desktop: full site header */}
      <div className="hidden md:block">
        <Header />
      </div>
      {/* Mobile: compact focus header */}
      <FocusHeader backHref={headerBackHref} />

      {/* Progress Bar */}
      {isWizard && <ProgressBarPremium step={step} />}
      {isFormPhase && <ProgressBarForm />}

      <div className={`mx-auto px-4 py-5 ${isFormPhase ? "max-w-6xl" : "max-w-lg"}`}>

        {/* Product not found */}
        {!product && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center mt-4">
            <IconApple className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-black mb-1">ไม่พบรุ่นที่ต้องการ</p>
            <p className="text-sm text-gray-500 mb-6">กรุณาเลือกรุ่นจากรายการรับซื้อ</p>
            <a href="/sell" className="inline-block bg-black text-white font-semibold px-6 py-3 rounded-full text-sm">
              เลือกรุ่น →
            </a>
          </div>
        )}

        {product && (
          <>
            {/* ── Wizard ──────────────────────────────────────────────── */}
            {isWizard && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5" style={{ overflow: "hidden" }}>
                {/* เนื้อหาแต่ละขั้นสลับแบบสมูท (fade + slide) แทนการกระโดด */}
                <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                <h2 className="text-lg font-bold text-black mb-4">{STEP_TITLES[step]}</h2>

                <div className="flex flex-col gap-3">
                  {stepOpts.map((opt, i) => {
                    const selected = localPick === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setLocalPickState({ step, pick: i });
                          const newPicks = [...picks];
                          newPicks[step] = i;
                          saveWizard(step, newPicks);
                          // iCloud locked, functional issue path, or bundle last step — don't auto-advance
                          const isICloudLocked    = step === ICLOUD_STEP    && i === 1;
                          const isFunctionalIssue = step === FUNCTIONAL_STEP && i === 1;
                          const isBundleLastStep  = step === TOTAL_STEPS - 1 && !!bundleReturn;
                          if (!isICloudLocked && !isFunctionalIssue && !isBundleLastStep) {
                            if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
                            autoAdvanceTimerRef.current = setTimeout(() => { goNext(i); }, 400);
                          }
                        }}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 w-full text-left"
                        style={{
                          borderColor:  selected ? "#B8860B" : "#E5E7EB",
                          background:   selected ? "rgba(184,134,11,0.08)" : "#fff",
                          cursor:       "pointer",
                          transition:   "all 150ms ease",
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: selected ? "#B8860B" : "#D1D5DB",
                            background:  selected ? "#B8860B" : "transparent",
                          }}
                        >
                          {selected && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-black leading-snug">{opt.label}</p>
                          {opt.sub && <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{opt.sub}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                </motion.div>
                </AnimatePresence>

                {/* Next / back / iCloud-locked / functional-issues */}
                <div className="mt-5">
                  {step === ICLOUD_STEP && localPick === 1 ? (
                    <>
                      {step > 0 && (
                        <button
                          type="button"
                          onClick={goBack}
                          className="flex items-center justify-center gap-1 w-full py-3 rounded-full font-semibold text-sm mb-3"
                          style={{ background: "#fff", border: "1px solid #E5E7EB", color: "#6B7280" }}
                        >
                          <ChevronLeft size={15} /> ย้อนกลับ
                        </button>
                      )}
                      <div className="rounded-2xl border-2 p-5 text-center" style={{ borderColor: "#FCA5A5", background: "rgba(239,68,68,0.05)" }}>
                        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                        </div>
                        <p className="font-bold text-black mb-1">ไม่สามารถรับซื้อได้</p>
                        <p className="text-xs leading-relaxed mb-4" style={{ color: "#6B7280" }}>
                          เครื่องที่ติด iCloud / Activation Lock ทางร้านไม่สามารถรับซื้อได้<br />
                          กรุณาออก iCloud ก่อน แล้วค่อยนำมาขายใหม่
                        </p>
                        <a
                          href="https://line.me/ti/p/~@khaiphone"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-bold text-white text-sm mb-2"
                          style={{ background: "#06C755" }}
                        >
                          <IconLine className="w-4 h-4" />สอบถามทีมงาน LINE @khaiphone
                        </a>
                        <a
                          href={`/sell/${params.model}`}
                          className="block w-full py-2.5 rounded-full border font-semibold text-sm text-center"
                          style={{ borderColor: "#D1D5DB", color: "#6B7280" }}
                        >
                          ประเมินใหม่
                        </a>
                      </div>
                    </>
                  ) : step === FUNCTIONAL_STEP && localPick === 1 ? (
                    <>
                      {step > 0 && (
                        <button
                          type="button"
                          onClick={goBack}
                          className="flex items-center justify-center gap-1 w-full py-3 rounded-full font-semibold text-sm mb-3"
                          style={{ background: "#fff", border: "1px solid #E5E7EB", color: "#6B7280" }}
                        >
                          <ChevronLeft size={15} /> ย้อนกลับ
                        </button>
                      )}
                      {issueSubmitDone ? (
                        <div className="rounded-2xl border-2 p-5 text-center" style={{ borderColor: "#86EFAC", background: "rgba(34,197,94,0.05)" }}>
                          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                            <Check size={22} color="#16A34A" strokeWidth={2.5} />
                          </div>
                          <p className="font-bold text-black mb-1">ส่งข้อมูลเรียบร้อยแล้ว</p>
                          <p className="text-xs leading-relaxed mb-4" style={{ color: "#6B7280" }}>
                            ทีมงานได้รับข้อมูลแล้ว จะติดต่อกลับภายใน 24 ชั่วโมง<br />
                            เพื่อนัดประเมินพิเศษและแจ้งราคารับซื้อ
                          </p>
                          <a
                            href="https://line.me/R/ti/p/@khaiphone"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-bold text-white text-sm mb-2"
                            style={{ background: "#06C755" }}
                          >
                            <IconLine className="w-4 h-4" />ติดตามผ่าน LINE @khaiphone
                          </a>
                          <a
                            href={`/sell/${params.model}`}
                            className="block w-full py-2.5 rounded-full border font-semibold text-sm text-center"
                            style={{ borderColor: "#D1D5DB", color: "#6B7280" }}
                          >
                            ประเมินใหม่
                          </a>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-gray-200 p-4" style={{ background: "#FAFAFA" }}>
                          <p className="font-semibold text-sm text-black mb-1">กรุณาเลือกปัญหาที่พบ</p>
                          <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
                            ทีมงานจะติดต่อกลับเพื่อนัดตรวจประเมินพิเศษ ไม่โชว์ราคาทันที
                          </p>
                          <div className="flex flex-col gap-2 mb-3">
                            {FUNCTIONAL_ISSUES.map(issue => {
                              const checked = functionalIssues.includes(issue);
                              return (
                                <label key={issue} className="flex items-center gap-2.5 cursor-pointer">
                                  <div
                                    className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                                    style={{
                                      borderColor: checked ? "#B8860B" : "#D1D5DB",
                                      background:  checked ? "#B8860B" : "#fff",
                                    }}
                                    onClick={() => setFunctionalIssues(prev =>
                                      prev.includes(issue) ? prev.filter(x => x !== issue) : [...prev, issue]
                                    )}
                                  >
                                    {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                                  </div>
                                  <span
                                    className="text-sm"
                                    style={{ color: "#374151" }}
                                    onClick={() => setFunctionalIssues(prev =>
                                      prev.includes(issue) ? prev.filter(x => x !== issue) : [...prev, issue]
                                    )}
                                  >
                                    {issue}
                                  </span>
                                </label>
                              );
                            })}
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <div
                                className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{
                                  borderColor: functionalOther.trim() ? "#B8860B" : "#D1D5DB",
                                  background:  functionalOther.trim() ? "#B8860B" : "#fff",
                                }}
                              >
                                {functionalOther.trim() && <Check size={11} color="#fff" strokeWidth={3} />}
                              </div>
                              <div className="flex-1">
                                <span className="text-sm" style={{ color: "#374151" }}>อื่นๆ</span>
                                <input
                                  type="text"
                                  placeholder="ระบุปัญหาเพิ่มเติม..."
                                  value={functionalOther}
                                  onChange={e => setFunctionalOther(e.target.value)}
                                  className="mt-1 w-full text-sm px-3 py-1.5 rounded-lg border outline-none"
                                  style={{ borderColor: "#E5E7EB", color: "#111" }}
                                  maxLength={200}
                                />
                              </div>
                            </label>
                          </div>

                          <div className="border-t border-gray-100 pt-3 mb-3">
                            <p className="text-xs font-semibold text-black mb-2">ข้อมูลติดต่อ (เพื่อให้ทีมงานโทรกลับ)</p>
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                placeholder="ชื่อ-นามสกุล"
                                value={issueContact.name}
                                onChange={e => setIssueContact(c => ({ ...c, name: e.target.value }))}
                                className="w-full text-sm px-3 py-2.5 rounded-xl border outline-none"
                                style={{ borderColor: "#E5E7EB", color: "#111" }}
                                maxLength={100}
                              />
                              <input
                                type="tel"
                                placeholder="เบอร์โทรศัพท์"
                                value={issueContact.phone}
                                onChange={e => setIssueContact(c => ({ ...c, phone: e.target.value }))}
                                className="w-full text-sm px-3 py-2.5 rounded-xl border outline-none"
                                style={{ borderColor: "#E5E7EB", color: "#111" }}
                                maxLength={20}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={issueSubmitting || (functionalIssues.length === 0 && !functionalOther.trim()) || !issueContact.name.trim() || !issueContact.phone.trim()}
                            onClick={async () => {
                              setIssueSubmitting(true);
                              const orderNumber = `ISS${Date.now()}`;
                              const storage = product ? product.storage.split(" / ")[picks[0] ?? 0] ?? product.storage : "";
                              const result = await submitFunctionalIssueRequest({
                                orderNumber,
                                model:        product?.model ?? params.model,
                                storage,
                                issues:       functionalIssues,
                                otherIssue:   functionalOther,
                                contactName:  issueContact.name.trim(),
                                contactPhone: issueContact.phone.trim(),
                              });
                              setIssueSubmitting(false);
                              if (result.success) setIssueSubmitDone(true);
                            }}
                            className="flex items-center justify-center w-full py-3.5 rounded-full font-bold text-sm text-white"
                            style={{
                              background: issueSubmitting || (functionalIssues.length === 0 && !functionalOther.trim()) || !issueContact.name.trim() || !issueContact.phone.trim()
                                ? "#D1D5DB" : "#B8860B",
                              cursor: issueSubmitting || (functionalIssues.length === 0 && !functionalOther.trim()) || !issueContact.name.trim() || !issueContact.phone.trim()
                                ? "not-allowed" : "pointer",
                            }}
                          >
                            {issueSubmitting ? "กำลังส่ง..." : "ส่งข้อมูลให้ทีมงาน"}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex gap-3">
                      {step > 0 && (
                        <button
                          type="button"
                          onClick={goBack}
                          className="flex-1 flex items-center justify-center gap-1 py-3.5 rounded-full font-semibold text-sm"
                          style={{ background: "#fff", border: "1px solid #E5E7EB", color: "#6B7280" }}
                        >
                          <ChevronLeft size={15} /> ย้อนกลับ
                        </button>
                      )}
                      {step === TOTAL_STEPS - 1 && bundleReturn && localPick !== null && (
                        <button
                          type="button"
                          onClick={() => { const np = [...picks]; np[step] = localPick; saveWizard(step + 1, np); handleAddToBundle(np); }}
                          className="flex items-center justify-center gap-2 py-3.5 rounded-full font-bold text-sm text-white"
                          style={{ background: "#111111", flex: "2 1 0" }}
                        >
                          <Plus size={15} /> เพิ่มสินค้านี้เข้ารายการขาย
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Form phase ──────────────────────────────────────────── */}
            {isFormPhase && (
              <div className="flex flex-col md:flex-row gap-6 items-start">

                {/* ─── Left column ─────────────────────────────────────── */}
                <div className="w-full md:flex-1 min-w-0 flex flex-col gap-4">

                  {/* Header: สรุปราคาประเมิน */}
                  <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-black">สรุปราคาประเมิน</h2>
                        <p className="text-sm mt-1" style={{ color: "#6B7280" }}>กรุณากรอกข้อมูลสำหรับการขายและนัดหมาย</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs mb-0.5" style={{ color: "#6B7280" }}>
                          {extraDevices.length > 0 ? `ราคารวม ${extraDevices.length + 1} เครื่อง` : "ราคาประเมินของคุณ"}
                        </p>
                        {pricesLoaded
                          ? <p className="text-2xl font-bold leading-tight" style={{ color: "#B8860B" }}>฿{totalBundlePrice.toLocaleString("th-TH")}</p>
                          : <p className="text-sm font-medium mt-0.5" style={{ color: "#B8860B" }}>กำลังคำนวณราคา…</p>}
                      </div>
                    </div>

                    {/* แถบการันตี — ลดความลังเลหลังเห็นราคา */}
                    <div className="mt-4 pt-4 flex flex-wrap gap-x-4 gap-y-2" style={{ borderTop: "1px solid #F3F4F6" }}>
                      {["การันตีราคาตามสภาพที่แจ้ง", "ไม่กดราคาหน้างาน", "ฟรี ไม่มีข้อผูกมัด"].map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#059669" }}>
                          <Check size={14} strokeWidth={3} style={{ color: "#059669" }} />
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Price lock — ล็อกราคา 7 วัน (ข้อเท็จจริงตลาด ไม่เร่ง) */}
                    <div className="mt-3 rounded-xl px-3.5 py-2.5" style={{ background: "rgba(184,134,11,0.07)", border: "1px solid rgba(184,134,11,0.25)" }}>
                      <p className="text-xs font-bold flex items-center gap-1.5" style={{ color: "#B8860B" }}>
                        🔒 ราคานี้ล็อกไว้ให้ถึง {priceLockDate}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#8a6a13" }}>
                        หลังจากนั้นประเมินใหม่ตามราคาตลาด ซึ่งปรับเฉลี่ยทุกสัปดาห์
                      </p>
                    </div>
                  </div>

                  {/* ความน่าเชื่อถือ + ขั้นตอนหลังจอง — ตอบคำถามที่ลูกค้าถามบ่อย (เจ้าหน้าที่เราเอง? จ่ายเมื่อไหร่?) */}
                  <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid #E5E7EB" }}>
                    <div className="flex items-start gap-2.5 pb-3 mb-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <ShieldCheck size={18} style={{ color: "#059669", flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs font-semibold leading-relaxed" style={{ color: "#111" }}>
                        เจ้าหน้าที่ของเราเอง · ตรวจเครื่องแล้ว<span style={{ color: "#059669" }}>จ่ายเงินสดครบหน้างาน</span> — ไม่เอาเครื่องไปก่อน
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      {[
                        { icon: Calendar, t: "นัดหมาย" },
                        { icon: Truck,    t: "ไรเดอร์รับถึงบ้าน" },
                        { icon: Banknote, t: "ตรวจ + รับเงินสด" },
                      ].map((s, i, arr) => (
                        <Fragment key={s.t}>
                          <div className="flex flex-col items-center gap-1 flex-1 text-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(184,134,11,0.1)" }}>
                              <s.icon size={15} style={{ color: "#B8860B" }} />
                            </div>
                            <span className="text-[11px] font-medium leading-tight" style={{ color: "#374151" }}>{s.t}</span>
                          </div>
                          {i < arr.length - 1 && <ChevronRight size={14} style={{ color: "#D1D5DB", flexShrink: 0 }} />}
                        </Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Device card — mobile only; tabs when multiple devices */}
                  <div className="md:hidden bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                    <h3 className="font-bold text-black mb-4">ข้อมูลเครื่องที่ประเมิน</h3>

                    {/* Tabs — only when extra devices exist */}
                    {extraDevices.length > 0 && (
                      <div className="flex gap-1 rounded-xl p-1 mb-4" style={{ background: "#F3F4F6" }}>
                        {[product.model, ...extraDevices.map(d => d.model)].map((label, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSidebarDeviceTab(i)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all truncate"
                            style={{
                              background: sidebarDeviceTab === i ? "#fff" : "transparent",
                              color: sidebarDeviceTab === i ? "#111" : "#6B7280",
                              boxShadow: sidebarDeviceTab === i ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                              border: "none", cursor: "pointer",
                            }}
                          >
                            เครื่องที่ {i + 1}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Main device (tab 0) */}
                    {sidebarDeviceTab === 0 ? (
                      <>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="relative flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{ width: 72, height: 72, background: "#F5F5F7" }}>
                            {getProductImage(product.model)
                              ? <Image src={getProductImage(product.model)!} alt={product.model} fill className="object-contain p-1.5" sizes="72px" />
                              : <IconApple className="w-10 h-10 opacity-20" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-black text-base leading-snug">{product.model}</p>
                            <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
                              {picks[0] !== null ? storages[picks[0]] : ""}
                              {picks[3] !== null ? ` • ${BODY_OPTS[picks[3]]?.sub ?? ""}` : ""}
                            </p>
                          </div>
                        </div>
                        {extraDevices.length > 0 ? (
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={goBackToWizard}
                              className="flex-1 py-2.5 rounded-full font-semibold text-sm"
                              style={{ border: "1px solid #B8860B", color: "#B8860B", background: "none", cursor: "pointer" }}
                            >
                              แก้ไขข้อมูลเครื่อง
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveMain}
                              className="py-2.5 px-4 rounded-full font-semibold text-sm"
                              style={{ border: "1px solid #FECACA", color: "#EF4444", background: "none", cursor: "pointer" }}
                            >
                              ลบ
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={goBackToWizard}
                            className="flex items-center justify-center w-full py-2.5 rounded-full font-semibold text-sm mb-2"
                            style={{ border: "1px solid #B8860B", color: "#B8860B" }}
                          >
                            แก้ไขข้อมูลเครื่อง
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={goToWizardStart}
                          className="flex items-center justify-center w-full py-2 rounded-full text-sm mb-4"
                          style={{ background: "none", border: "none", color: "#6B7280", cursor: "pointer" }}
                        >
                          ประเมินใหม่ตั้งแต่ต้น (ค้างค่าเดิม)
                        </button>
                        <div className="flex flex-col" style={{ borderTop: "1px solid #F9FAFB" }}>
                          {summaryRows.map(({ title, value }) => (
                            <div key={title} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #F9FAFB" }}>
                              <span className="text-sm" style={{ color: "#6B7280" }}>{title}</span>
                              <span className="text-sm font-medium text-black text-right">{value}</span>
                            </div>
                          ))}
                        </div>
                        {pricesLoaded && (
                          <div className="flex items-center justify-between pt-3">
                            <span className="text-sm font-semibold" style={{ color: "#6B7280" }}>ราคาประเมิน</span>
                            <span className="text-sm font-bold" style={{ color: "#B8860B" }}>฿{price.toLocaleString("th-TH")}</span>
                          </div>
                        )}
                      </>
                    ) : (() => {
                      const d = extraDevices[sidebarDeviceTab - 1];
                      if (!d) return null;
                      const extraIdx = sidebarDeviceTab - 1;
                      return (
                        <>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="relative flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center" style={{ width: 72, height: 72, background: "#F5F5F7" }}>
                              {getProductImage(d.model)
                                ? <Image src={getProductImage(d.model)!} alt={d.model} fill className="object-contain p-1.5" sizes="72px" />
                                : <IconApple className="w-10 h-10 opacity-20" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-black text-base leading-snug">{d.model}</p>
                              <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>{d.storage || "—"}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mb-4">
                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  const stored: ExtraDevice[] = JSON.parse(localStorage.getItem(BUNDLE_KEY) ?? "[]");
                                  const updated = stored.filter((_, j) => j !== extraIdx);
                                  localStorage.setItem(BUNDLE_KEY, JSON.stringify(updated));
                                  localStorage.setItem(BUNDLE_RETURN_KEY, window.location.href);
                                  localStorage.removeItem(`khaiphone_wizard_${toSlug(d.model)}`);
                                } catch {}
                                window.location.href = `/sell/${toSlug(d.model)}`;
                              }}
                              className="flex-1 py-2.5 rounded-full font-semibold text-sm"
                              style={{ border: "1px solid #B8860B", color: "#B8860B", background: "none", cursor: "pointer" }}
                            >
                              แก้ไขข้อมูลเครื่อง
                            </button>
                            <button
                              type="button"
                              onClick={() => { handleRemoveExtra(extraIdx); setSidebarDeviceTab(0); }}
                              className="py-2.5 px-4 rounded-full font-semibold text-sm"
                              style={{ border: "1px solid #E5E7EB", color: "#6B7280", background: "none", cursor: "pointer" }}
                            >
                              ลบ
                            </button>
                          </div>
                          {d.details && d.details.length > 0 && (
                            <div className="flex flex-col" style={{ borderTop: "1px solid #F9FAFB" }}>
                              {d.details.map(({ title, value }) => (
                                <div key={title} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid #F9FAFB" }}>
                                  <span className="text-sm" style={{ color: "#6B7280" }}>{title}</span>
                                  <span className="text-sm font-medium text-black text-right">{value}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-3">
                            <span className="text-sm font-semibold" style={{ color: "#6B7280" }}>ราคาประเมิน</span>
                            <span className="text-sm font-bold" style={{ color: "#6B7280" }}>฿{d.estimatedPrice.toLocaleString("th-TH")}</span>
                          </div>
                        </>
                      );
                    })()}

                    {/* Total row */}
                    {extraDevices.length > 0 && (
                      <div className="flex items-center justify-between pt-3 mt-1" style={{ borderTop: "1px dashed #E5E7EB" }}>
                        <p className="text-xs font-semibold" style={{ color: "#6B7280" }}>รวมทั้งหมด ({extraDevices.length + 1} เครื่อง)</p>
                        {pricesLoaded
                          ? <p className="text-sm font-bold" style={{ color: "#B8860B" }}>฿{totalBundlePrice.toLocaleString("th-TH")}</p>
                          : <p className="text-xs font-medium" style={{ color: "#B8860B" }}>คำนวณอยู่…</p>}
                      </div>
                    )}

                    {/* Add more devices */}
                    <a
                      href="/sell"
                      onClick={() => {
                        try { localStorage.setItem(BUNDLE_RETURN_KEY, window.location.href); } catch {}
                      }}
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold mt-3"
                      style={{ border: "1.5px dashed #D1D5DB", color: "#6B7280", textDecoration: "none" }}
                    >
                      <Plus size={14} /> ประเมินสินค้าเพิ่ม
                    </a>
                  </div>

                  {/* Form */}
                  <form id="sell-form" onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                    <input type="hidden" name="step" value={String(TOTAL_STEPS)} />
                    <input type="hidden" name="r" value="1" />
                    {Array.from({ length: TOTAL_STEPS }, (_, i) =>
                      picks[i] !== null
                        ? <input key={i} type="hidden" name={`s${i}`} value={String(picks[i])} />
                        : null
                    )}

                    {/* ข้อมูลผู้ขาย */}
                    <div id="section-seller" className="bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                          <User size={14} style={{ color: "#B8860B" }} />
                        </div>
                        <h3 className="font-bold text-black">ข้อมูลผู้ขาย</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                            ชื่อ-นามสกุล <span style={{ color: "#EF4444" }}>*</span>
                          </label>
                          <input
                            ref={nameRef}
                            id="f-name" name="f-name" type="text" required
                            defaultValue={formData.name}
                            onChange={e => { setFormData(d => ({ ...d, name: e.target.value })); if (errors.name) setErrors(er => ({ ...er, name: false })); }}
                            placeholder="ชื่อ-นามสกุล"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                            style={{ border: `1.5px solid ${errors.name ? "#EF4444" : "#E5E7EB"}`, fontFamily: "inherit" }}
                          />
                          {errors.name && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>กรุณากรอกชื่อ-นามสกุล</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                            เบอร์โทรศัพท์ <span style={{ color: "#EF4444" }}>*</span>
                          </label>
                          <input
                            ref={phoneRef}
                            id="f-phone" name="f-phone" type="tel" required
                            defaultValue={formData.phone}
                            onChange={e => { setFormData(d => ({ ...d, phone: e.target.value })); if (errors.phone) setErrors(er => ({ ...er, phone: false })); }}
                            placeholder="กรุณากรอกเบอร์ติดต่อ"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                            style={{ border: `1.5px solid ${errors.phone ? "#EF4444" : "#E5E7EB"}`, fontFamily: "inherit" }}
                          />
                          {errors.phone && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>กรุณากรอกเบอร์โทรศัพท์</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                            อีเมล <span className="font-normal" style={{ color: "#6B7280" }}>(ไม่บังคับ)</span>
                          </label>
                          <input
                            ref={emailRef}
                            id="f-email" name="f-email" type="email"
                            defaultValue={formData.email}
                            onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                            placeholder="email@example.com"
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                            style={{ border: "1.5px solid #E5E7EB", fontFamily: "inherit" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* ช่องทางการขาย */}
                    <div id="section-sell-method" className="bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                          <Truck size={14} style={{ color: "#B8860B" }} />
                        </div>
                        <h3 className="font-bold text-black">ช่องทางการขาย</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {([ { id: "branch", label: "นัดหมายหน้าสาขา", sub: "นำเครื่องมาส่งที่สาขา" }, { id: "rider", label: "รับซื้อถึงที่ (Rider)", sub: "ทีมงานไปรับเครื่องถึงบ้าน" }, { id: "parcel", label: "ส่งเครื่องทางพัสดุ", sub: "จัดส่งเครื่องมาที่บริษัท" } ] as const).map(opt => (
                          <button key={opt.id} type="button" onClick={() => setSellMethod(opt.id)}
                            className="flex items-start gap-3 px-4 py-3.5 rounded-xl border-2 text-left w-full"
                            style={{ borderColor: sellMethod === opt.id ? "#B8860B" : "#E5E7EB", background: sellMethod === opt.id ? "rgba(184,134,11,0.06)" : "#fff", cursor: "pointer" }}>
                            <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ borderColor: sellMethod === opt.id ? "#B8860B" : "#D1D5DB", background: sellMethod === opt.id ? "#B8860B" : "transparent" }}>
                              {sellMethod === opt.id && <Check size={9} color="#fff" strokeWidth={3} />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-black leading-snug flex items-center gap-1.5 flex-wrap">
                                {opt.label}
                                {opt.id === "rider" && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(5,150,105,0.12)", color: "#059669" }}>ฟรี</span>
                                )}
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{opt.sub}</p>
                              {opt.id === "rider" && (
                                <p className="text-xs mt-1 font-medium" style={{ color: "#059669" }}>
                                  🛵 รับถึงที่ฟรี ทั่วกรุงเทพฯ–ปริมณฑล · ไม่มีค่าบริการเข้ารับ
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* นัดหมาย — branch */}
                    {sellMethod === "branch" && (
                      <div id="section-appointment" className="bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                            <Calendar size={14} style={{ color: "#B8860B" }} />
                          </div>
                          <h3 className="font-bold text-black">นัดหมาย</h3>
                        </div>
                        <div ref={appointSectionRef} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                              สาขาที่ต้องการนัดหมาย <span style={{ color: "#EF4444" }}>*</span>
                            </label>
                            <select className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none" style={{ border: "1.5px solid #E5E7EB", fontFamily: "inherit", color: "#111" }}>
                              {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                              วันที่นัดหมาย <span style={{ color: "#EF4444" }}>*</span>
                            </label>
                            <input type="date" value={appointDate}
                              min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()}
                              onChange={e => setAppointDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                              style={{ border: "1.5px solid #E5E7EB", fontFamily: "inherit", color: "#111" }} />
                            <p className="text-[11px] mt-1" style={{ color: "#6B7280" }}>เลือกวันเวลาที่คุณสะดวก · จองล่วงหน้าได้</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                              เวลา <span style={{ color: "#EF4444" }}>*</span>
                            </label>
                            {(() => {
                              const slots = getAvailableTimeSlots(appointDate);
                              return slots.length > 0 ? (
                                <>
                                  <select value={appointTime} onChange={e => setAppointTime(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                                    style={{ border: "1.5px solid #E5E7EB", fontFamily: "inherit", color: "#111" }}>
                                    {slots.map(t => <option key={t} value={t}>{t} น.</option>)}
                                  </select>
                                  {isRolledLateNight && (
                                    <p className="text-xs mt-1.5 flex items-center gap-1 font-medium" style={{ color: "#B8860B" }}>
                                      🌙 ช่วงหลังเที่ยงคืน — นัดจริงคือเช้ามืดวันที่ {new Date(effectiveAppointDate + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long" })}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <p className="text-xs px-3.5 py-2.5 rounded-xl" style={{ border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#EF4444" }}>
                                  วันนี้เต็มแล้ว กรุณาเลือกวันอื่น
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #F3F4F6", background: "#FAFAFA" }}>
                          <div className="w-24 flex-shrink-0 overflow-hidden">
                            <img src="/branch-centralladprao.webp" alt="สาขารังสิต" className="w-full h-full object-cover" style={{ minHeight: 72 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                          <div className="flex-1 p-3 min-w-0">
                            <p className="font-semibold text-sm text-black">สาขารังสิต</p>
                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#6B7280" }}>เดอะแพลนท์ วงแหวน-รังสิต ปทุมธานี</p>
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin size={11} style={{ color: "#B8860B" }} />
                              <a href="https://www.google.com/maps?q=14.0128858,100.7201145" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold" style={{ color: "#B8860B" }}>ดูแผนที่</a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* นัดหมาย — rider */}
                    {sellMethod === "rider" && (
                      <div id="section-appointment" className="bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                            <Calendar size={14} style={{ color: "#B8860B" }} />
                          </div>
                          <h3 className="font-bold text-black">นัดหมายรับถึงที่</h3>
                        </div>
                        {/* จังหวัด — คัดโซน (ปักหมุดแล้วระบบจะปรับให้อัตโนมัติ) */}
                        <div className="mb-4">
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                            จังหวัดของคุณ <span style={{ color: "#EF4444" }}>*</span>
                          </label>
                          <select value={province} onChange={e => { setProvince(e.target.value); if (e.target.value) setErrors(er => ({ ...er, province: false })); }}
                            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                            style={{ border: `1.5px solid ${errors.province ? "#EF4444" : "#E5E7EB"}`, fontFamily: "inherit", color: province ? "#111" : "#9CA3AF" }}>
                            <option value="">-- เลือกจังหวัด --</option>
                            {PROVINCE_GROUPS.map(g => (
                              <optgroup key={g.label} label={g.label}>
                                {g.provinces.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                              </optgroup>
                            ))}
                          </select>
                          {errors.province && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>กรุณาเลือกจังหวัด</p>}
                          {province && zoneInfo.zone === "core" && (
                            <p className="text-xs mt-1.5 font-medium" style={{ color: "#059669" }}>
                              🛵 {zoneInfo.partial ? "บางพื้นที่ในจังหวัดนี้รับถึงที่ฟรี — ทีมงานยืนยันอีกครั้งหลังจอง" : "พื้นที่บริการหลัก — รับถึงที่ฟรี ไม่มีค่าบริการ"}
                            </p>
                          )}
                        </div>
                        {province && zoneInfo.zone === "far" ? (
                          <div className="rounded-xl p-4" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                            <p className="font-semibold text-sm mb-1" style={{ color: "#1D4ED8" }}>📦 พื้นที่นี้แนะนำ &ldquo;ส่งพัสดุ&rdquo;</p>
                            <p className="text-xs leading-relaxed mb-3" style={{ color: "#374151" }}>ยังไม่มีรอบเข้ารับพื้นที่คุณ แต่ขายได้สบายๆ ผ่านการส่งพัสดุ — ราคาล็อกไว้ก่อนส่ง ตรวจแล้วโอนทันที</p>
                            <button type="button" onClick={() => setSellMethod("parcel")}
                              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#1D4ED8", border: "none", cursor: "pointer" }}>
                              เปลี่ยนเป็นส่งพัสดุ →
                            </button>
                          </div>
                        ) : (
                          <>
                            {zoneInfo.zone === "round" && (
                              <div className="rounded-xl p-4 mb-4" style={{ background: "#FFF7ED", border: "1px solid #F59E0B" }}>
                                <p className="font-semibold text-sm mb-1" style={{ color: "#B45309" }}>📅 {province} — เข้ารับเป็นรอบ (ปกติภายใน {ROUND_ETA_LABEL})</p>
                                <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>เลือกวันที่คุณสะดวกด้านล่างได้เลย — แอดมินจะติดต่อกลับเพื่อยืนยันวันเข้ารับ (ปกติภายใน {ROUND_ETA_LABEL}) ราคาที่ประเมินถูกล็อกไว้ให้</p>
                                {zoneInfo.fee > 0 && (
                                  <div className="mt-3 rounded-lg px-3 py-2.5" style={{ background: "#fff", border: "1px dashed #F59E0B" }}>
                                    <p className="text-xs font-bold" style={{ color: "#B45309" }}>ค่าบริการเข้ารับ ฿{zoneInfo.fee.toLocaleString()} · หักจากยอดรับซื้อ</p>
                                    <p className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>ยอดสุทธิโดยประมาณ ฿{(price - zoneInfo.fee).toLocaleString()} (จากยอด ฿{price.toLocaleString()})</p>
                                  </div>
                                )}
                              </div>
                            )}
                        {/* Address */}
                        <div ref={riderSectionRef} className="mb-4">
                          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                            สถานที่รับเครื่อง <span style={{ color: "#EF4444" }}>*</span>
                          </label>
                          <div className="relative">
                            <input
                              ref={riderAddressInputRef}
                              type="text"
                              autoComplete="off"
                              value={riderAddress}
                              onChange={e => { setRiderAddress(e.target.value); if (e.target.value.trim()) setErrors(er => ({ ...er, riderAddress: false })); }}
                              placeholder="พิมพ์ชื่อสถานที่หรือที่อยู่..."
                              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none pr-32"
                              style={{ border: `1.5px solid ${errors.riderAddress ? "#EF4444" : "#E5E7EB"}`, fontFamily: "inherit" }}
                            />
                            <button
                              type="button" onClick={fetchCurrentLocation} disabled={locationLoading}
                              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: "rgba(184,134,11,0.1)", color: "#B8860B", cursor: locationLoading ? "wait" : "pointer", border: "none" }}
                            >
                              <MapPin size={11} />
                              {locationLoading ? "กำลังโหลด..." : "ตำแหน่งปัจจุบัน"}
                            </button>
                          </div>
                          {errors.riderAddress && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>กรุณากรอกสถานที่รับเครื่อง</p>}
                          <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>เจ้าหน้าที่จะโทรยืนยันก่อนเดินทาง</p>
                        </div>
                        {/* Date + Time */}
                        <div ref={appointSectionRef} className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                              วันที่นัดหมาย <span style={{ color: "#EF4444" }}>*</span>
                            </label>
                            <input type="date" value={appointDate}
                              min={(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })()}
                              onChange={e => setAppointDate(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                              style={{ border: "1.5px solid #E5E7EB", fontFamily: "inherit", color: "#111" }} />
                            <p className="text-[11px] mt-1" style={{ color: "#6B7280" }}>เลือกวันเวลาที่คุณสะดวก · จองล่วงหน้าได้</p>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                              เวลา <span style={{ color: "#EF4444" }}>*</span>
                            </label>
                            {(() => {
                              const slots = getAvailableTimeSlots(appointDate);
                              const cap = slotAvail?.capacity ?? Infinity;
                              const blockedWholeDay = slotAvail?.blockedWholeDay ?? false;
                              const isFull = (t: string) => blockedWholeDay || (slotAvail?.blockedTimes.includes(t) ?? false) || (slotAvail?.counts[t] ?? 0) >= cap;
                              const openSlots = slots.filter(t => !isFull(t));
                              if (slots.length === 0)
                                return (
                                  <p className="text-xs px-3.5 py-2.5 rounded-xl" style={{ border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#EF4444" }}>
                                    วันนี้เต็มแล้ว กรุณาเลือกวันอื่น
                                  </p>
                                );
                              if (blockedWholeDay)
                                return (
                                  <p className="text-xs px-3.5 py-2.5 rounded-xl" style={{ border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#EF4444" }}>
                                    วันนี้งดรับถึงที่ กรุณาเลือกวันอื่น
                                  </p>
                                );
                              if (openSlots.length === 0)
                                return (
                                  <p className="text-xs px-3.5 py-2.5 rounded-xl" style={{ border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#EF4444" }}>
                                    คิวรับถึงที่ของวันนี้เต็มทุกช่วงแล้ว กรุณาเลือกวันอื่น
                                  </p>
                                );
                              return (
                                <>
                                  <select value={appointTime} onChange={e => setAppointTime(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                                    style={{ border: "1.5px solid #E5E7EB", fontFamily: "inherit", color: "#111" }}>
                                    {slots.map(t => <option key={t} value={t} disabled={isFull(t)}>{t} น.{isFull(t) ? " (เต็ม)" : ""}</option>)}
                                  </select>
                                  <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>ช่วงที่ขึ้น &ldquo;เต็ม&rdquo; มีคิวรับถึงที่ครบแล้ว เลือกเวลาอื่นได้เลย</p>
                                  {isRolledLateNight && (
                                    <p className="text-xs mt-1.5 flex items-center gap-1 font-medium" style={{ color: "#B8860B" }}>
                                      🌙 ช่วงหลังเที่ยงคืน — นัดจริงคือเช้ามืดวันที่ {new Date(effectiveAppointDate + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long" })}
                                    </p>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ช่องทางการรับเงิน */}
                    <div id="section-payment" className="bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                          <Banknote size={14} style={{ color: "#B8860B" }} />
                        </div>
                        <h3 className="font-bold text-black">ช่องทางการรับเงิน</h3>
                      </div>

                      {/* Method cards — animated */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {([
                          { id: "cash",     label: "เงินสด",       sub: "รับทันทีหลังตรวจสอบ", Icon: Banknote },
                          { id: "transfer", label: "โอนเข้าบัญชี", sub: "โอนเข้าบัญชีทันทีหน้างาน หลังตรวจเครื่อง",  Icon: Building2 },
                        ] as const).map(({ id, label, sub, Icon }) => {
                          const active = payMethod === id;
                          return (
                            <button key={id} type="button" onClick={() => setPayMethod(id)}
                              className="flex flex-col items-start gap-2.5 p-4 rounded-xl w-full text-left"
                              style={{
                                border:     `1.5px solid ${active ? "#B8860B" : "#E5E7EB"}`,
                                background: active ? "rgba(184,134,11,0.06)" : "#FAFAFA",
                                transition: "all 180ms cubic-bezier(0.4,0,0.2,1)",
                                cursor:     "pointer",
                              }}>
                              <div className="flex items-center justify-between w-full">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: active ? "#B8860B" : "#F3F4F6", transition: "background 180ms ease" }}>
                                  <Icon size={15} color={active ? "#fff" : "#6B7280"} />
                                </div>
                                <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                                  style={{ borderColor: active ? "#B8860B" : "#D1D5DB", background: active ? "#B8860B" : "transparent", transition: "all 180ms ease" }}>
                                  {active && <Check size={9} color="#fff" strokeWidth={3} />}
                                </div>
                              </div>
                              <div>
                                <p className="font-semibold text-sm leading-snug" style={{ color: active ? "#1d1d1f" : "#374151" }}>{label}</p>
                                <p className="text-xs mt-0.5 leading-snug" style={{ color: "#6B7280" }}>{sub}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Bank transfer details */}
                      {payMethod === "transfer" && (
                        <div ref={bankSectionRef} className="flex flex-col gap-4">
                          {/* Bank grid */}
                          <div>
                            <p className="text-xs font-semibold mb-2.5" style={{ color: "#374151" }}>
                              เลือกธนาคาร <span style={{ color: "#EF4444" }}>*</span>
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                              {THAI_BANKS.map(bank => {
                                const active = bankName === bank.code;
                                return (
                                  <button key={bank.code} type="button" onClick={() => { setBankName(bank.code); setErrors(er => ({ ...er, bankName: false })); }}
                                    className="flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl"
                                    style={{
                                      border:     `1.5px solid ${active ? "#B8860B" : "#E5E7EB"}`,
                                      background: active ? "rgba(184,134,11,0.06)" : "#FAFAFA",
                                      transition: "all 150ms cubic-bezier(0.4,0,0.2,1)",
                                      cursor:     "pointer",
                                    }}>
                                    <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                                      style={{ background: "#fff", boxShadow: active ? `0 0 0 2px ${bank.color}` : "0 0 0 1px #E5E7EB", transition: "box-shadow 150ms ease" }}>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={bank.logo}
                                        alt={bank.short}
                                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                      />
                                    </div>
                                    <span className="leading-tight text-center" style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? "#B8860B" : "#6B7280" }}>
                                      {bank.short}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {errors.bankName && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>กรุณาเลือกธนาคาร</p>}
                          </div>

                          {/* Account fields */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                                เลขที่บัญชี <span style={{ color: "#EF4444" }}>*</span>
                              </label>
                              <input value={bankAccount} onChange={e => { setBankAccount(e.target.value.replace(/\D/g, "")); if (e.target.value.trim()) setErrors(er => ({ ...er, bankAccount: false })); }}
                                type="text" inputMode="numeric" maxLength={15} placeholder="xxx-x-xxxxx-x"
                                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                                style={{ border: `1.5px solid ${errors.bankAccount ? "#EF4444" : "#E5E7EB"}`, fontFamily: "inherit" }} />
                              {errors.bankAccount && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>กรุณากรอกเลขที่บัญชี</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                                ชื่อบัญชี <span style={{ color: "#EF4444" }}>*</span>
                              </label>
                              <input value={bankAccountName} onChange={e => { setBankAccountName(e.target.value); if (e.target.value.trim()) setErrors(er => ({ ...er, bankAccountName: false })); }}
                                type="text" placeholder="ชื่อ-นามสกุล ตามบัญชีธนาคาร"
                                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white outline-none"
                                style={{ border: `1.5px solid ${errors.bankAccountName ? "#EF4444" : "#E5E7EB"}`, fontFamily: "inherit" }} />
                              {errors.bankAccountName && <p className="text-xs mt-1" style={{ color: "#EF4444" }}>กรุณากรอกชื่อบัญชี</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* หมายเหตุ */}
                    <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                      <h3 className="font-bold text-black mb-1">
                        หมายเหตุเพิ่มเติม{" "}
                        <span className="font-normal text-sm" style={{ color: "#6B7280" }}>(ไม่บังคับ)</span>
                      </h3>
                      <textarea
                        value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                        placeholder="เช่น สะดวกให้ติดต่อกลับเวลาไหน หรืออยู่ตึกไหน"
                        className="w-full px-4 py-3 rounded-xl text-sm bg-white outline-none resize-none mt-3"
                        style={{ border: "1.5px solid #E5E7EB", fontFamily: "inherit" }}
                      />
                    </div>

                    {/* สิ่งที่ต้องเตรียมมาด้วย */}
                    <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                      <h3 className="font-bold text-black mb-3">สิ่งที่ต้องเตรียมมาด้วย</h3>
                      <div className="flex flex-col gap-3">
                        {[
                          { label: "บัตรประชาชน", sub: "ตัวจริงหรือสำเนาก็ได้ — ใช้ทำสัญญาซื้อขาย", required: true },
                          { label: "ออก iCloud / Apple ID ออกก่อน", sub: "ไปที่ การตั้งค่า → กดชื่อ → ออกจากระบบ", required: true },
                          {
                            label: "อุปกรณ์ตามที่แจ้งไว้",
                            sub: picks[7] !== null
                              ? `คุณแจ้งว่า "${ACCESSORY_OPTS[picks[7]]?.label ?? ""}" — นำมาตามที่กรอกไว้`
                              : "นำกล่องและอุปกรณ์ตามที่แจ้งไว้มาด้วย",
                            required: true,
                          },
                        ].map(({ label, sub, required }) => (
                          <div key={label} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: required ? "#B8860B" : "#F3F4F6" }}>
                              <Check size={10} color={required ? "#fff" : "#6B7280"} strokeWidth={3} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-black leading-snug">
                                {label}
                                {required
                                  ? <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(184,134,11,0.1)", color: "#B8860B" }}>จำเป็น</span>
                                  : <span className="ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: "#F3F4F6", color: "#6B7280" }}>แนะนำ</span>
                                }
                              </p>
                              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{sub}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ยอมรับเงื่อนไข */}
                    <div ref={termsSectionRef} className="bg-white rounded-2xl p-5" style={{ border: `1.5px solid ${errors.terms ? "#FCA5A5" : "#E5E7EB"}`, background: errors.terms ? "#FEF2F2" : "#fff" }}>
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <button
                          type="button"
                          onClick={() => { setAcceptTerms(v => !v); setErrors(er => ({ ...er, terms: false })); }}
                          className="flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center"
                          style={{ borderColor: acceptTerms ? "#B8860B" : errors.terms ? "#EF4444" : "#D1D5DB", background: acceptTerms ? "#B8860B" : "#fff", cursor: "pointer" }}
                        >
                          {acceptTerms && <Check size={10} color="#fff" strokeWidth={3} />}
                        </button>
                        <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>
                          ฉันรับทราบและยอมรับ{" "}
                          <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: "#B8860B" }}>
                            เงื่อนไขการรับซื้อ
                          </a>
                          {" "}และ{" "}
                          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: "#B8860B" }}>
                            นโยบายความเป็นส่วนตัว
                          </a>
                          {" "}และยินยอมให้ทีมงานติดต่อกลับเพื่อยืนยันนัดหมาย
                        </p>
                      </label>
                      {errors.terms && <p className="text-xs mt-2 ml-8" style={{ color: "#EF4444" }}>กรุณายอมรับเงื่อนไขก่อนดำเนินการต่อ</p>}
                    </div>

                    {/* social proof — เลขจริง คนเห็นราคา 30 วัน (แสดงเมื่อโหลดเลขได้แล้ว) */}
                    {priceCheckCount != null && priceCheckCount > 100 && (
                      <p className="text-center text-xs font-medium" style={{ color: "#6B7280" }}>
                        ⭐ มีคนเช็คราคากับเราแล้ว <span className="font-bold" style={{ color: "#B8860B" }}>{priceCheckCount.toLocaleString("th-TH")}</span> คน ใน 30 วันที่ผ่านมา
                      </p>
                    )}

                    {/* Desktop action buttons */}
                    <div className="hidden md:flex gap-3">
                      <button
                        type="button"
                        onClick={goBackToWizard}
                        className="flex items-center justify-center gap-1 px-8 py-3 rounded-2xl font-medium text-sm"
                        style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}>
                        <ChevronLeft size={15} /> ย้อนกลับ
                      </button>
                      <button type="submit"
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white"
                        style={{ background: "#1d1d1f", boxShadow: "0 1px 3px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.08)", opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
                        {submitting ? "กำลังส่ง..." : "ยืนยันการขายและนัดหมายรับเครื่อง →"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* ── Support card — mobile only (desktop has it in sidebar) ── */}
                <div className="md:hidden w-full bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
                  {/* Contact buttons side-by-side */}
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <p className="text-xs font-semibold text-black mb-2">ต้องการความช่วยเหลือ?</p>
                    <div className="flex gap-2">
                      <a href="https://line.me/R/ti/p/@khaiphone" target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white"
                        style={{ background: "#06C755" }}>
                        <IconLine className="w-3.5 h-3.5" /> LINE
                      </a>
                      <a href="tel:0955535167"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-black"
                        style={{ border: "1px solid #E5E7EB", background: "#FAFAFA" }}>
                        <Phone size={12} style={{ color: "#6B7280" }} /> 095-553-5167
                      </a>
                    </div>
                  </div>
                </div>

                {/* ─── Location Modal ───────────────────────────────────── */}
                {locationModal && (
                  <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl">
                      <div className="p-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <p className="font-bold text-sm text-black">ยืนยันตำแหน่ง</p>
                        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>ลากหมุดหรือค้นหาเพื่อปรับตำแหน่ง</p>
                      </div>
                      {/* Search input inside modal */}
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <input
                          ref={modalSearchRef}
                          type="text"
                          placeholder="ค้นหาสถานที่..."
                          className="w-full text-sm rounded-xl px-3 py-2.5 outline-none"
                          style={{ border: "1.5px solid #E5E7EB", background: "#F9FAFB", color: "#111", fontFamily: "inherit" }}
                        />
                      </div>
                      <div ref={mapDivRef} className="w-full" style={{ height: 220 }} />
                      <div className="p-4">
                        <p className="text-xs font-semibold mb-1" style={{ color: "#6B7280" }}>ตำแหน่งที่เลือก</p>
                        <p className="text-sm text-black leading-relaxed mb-4">
                          {pinAddress || locationModal.address}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setPinCoords(null); setLocationModal(null); }}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                            style={{ border: "1.5px solid #E5E7EB", color: "#6B7280" }}
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRiderAddress(pinAddress || locationModal.address); setLocationModal(null); }}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                            style={{ background: "#111" }}
                          >
                            ใช้ตำแหน่งนี้
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── Right panel (Desktop only) ──────────────────────── */}
                <div className="hidden md:block flex-shrink-0 sticky self-start flex flex-col gap-4" style={{ width: 320, top: 24 }}>
                  <div className="bg-white rounded-2xl" style={{ border: "1px solid #E5E7EB" }}>

                    {/* Header */}
                    <div className="p-5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <h3 className="font-bold text-black text-base">สรุปข้อมูลการขาย</h3>
                      <p className="text-xs mt-3" style={{ color: "#6B7280" }}>
                        {extraDevices.length > 0 ? `ราคารวม ${extraDevices.length + 1} เครื่อง` : "ราคาประเมินของคุณ"}
                      </p>
                      {pricesLoaded
                        ? <p className="text-3xl font-bold mt-0.5" style={{ color: "#B8860B" }}>฿{(extraDevices.length > 0 ? totalBundlePrice : price).toLocaleString("th-TH")}</p>
                        : <p className="text-base font-medium mt-0.5" style={{ color: "#B8860B" }}>กำลังคำนวณราคา…</p>}
                    </div>

                    {/* Device */}
                    <div className="px-5 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-black">ข้อมูลเครื่อง</span>
                        {sidebarDeviceTab === 0 ? (
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={goBackToWizard} className="text-xs font-semibold" style={{ color: "#B8860B", background: "none", border: "none", padding: 0, cursor: "pointer" }}>แก้ไข</button>
                            <button type="button" onClick={goToWizardStart} className="text-xs font-semibold" style={{ color: "#6B7280", background: "none", border: "none", padding: 0, cursor: "pointer" }}>ประเมินใหม่</button>
                            {extraDevices.length > 0 && (
                              <button type="button" onClick={handleRemoveMain} className="text-xs font-semibold" style={{ color: "#EF4444", background: "none", border: "none", padding: 0, cursor: "pointer" }}>ลบ</button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => {
                              const extraIdx = sidebarDeviceTab - 1;
                              const d = extraDevices[extraIdx];
                              if (!d) return;
                              try {
                                const stored: ExtraDevice[] = JSON.parse(localStorage.getItem(BUNDLE_KEY) ?? "[]");
                                const updated = stored.filter((_, j) => j !== extraIdx);
                                localStorage.setItem(BUNDLE_KEY, JSON.stringify(updated));
                                localStorage.setItem(BUNDLE_RETURN_KEY, window.location.href);
                                localStorage.removeItem(`khaiphone_wizard_${toSlug(d.model)}`);
                              } catch {}
                              window.location.href = `/sell/${toSlug(d.model)}`;
                            }} className="text-xs font-semibold" style={{ color: "#B8860B", background: "none", border: "none", padding: 0, cursor: "pointer" }}>แก้ไข</button>
                            <button type="button" onClick={() => { handleRemoveExtra(sidebarDeviceTab - 1); setSidebarDeviceTab(0); }} className="text-xs font-semibold" style={{ color: "#EF4444", background: "none", border: "none", padding: 0, cursor: "pointer" }}>ลบ</button>
                          </div>
                        )}
                      </div>

                      {/* Tabs — only when extra devices exist */}
                      {extraDevices.length > 0 && (
                        <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: "#F5F5F7" }}>
                          {[product.model, ...extraDevices.map(d => d.model)].map((label, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setSidebarDeviceTab(i)}
                              className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
                              style={{
                                background: sidebarDeviceTab === i ? "#fff" : "transparent",
                                color: sidebarDeviceTab === i ? "#111" : "#6B7280",
                                boxShadow: sidebarDeviceTab === i ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                                border: "none",
                                cursor: "pointer",
                                transition: "all 150ms ease",
                              }}
                            >
                              เครื่อง {i + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Primary device */}
                      {sidebarDeviceTab === 0 ? (
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="relative w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "#F5F5F7" }}>
                              {getProductImage(product.model)
                                ? <Image src={getProductImage(product.model)!} alt={product.model} fill className="object-contain p-1" sizes="48px" />
                                : <IconApple className="w-7 h-7 opacity-20" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-black leading-snug truncate">{product.model}</p>
                              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                                {picks[0] !== null ? storages[picks[0]] : ""}
                                {picks[3] !== null ? ` • ${BODY_OPTS[picks[3]]?.sub ?? ""}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col">
                            {summaryRows.map(({ title, value }) => (
                              <div key={title} className="flex items-center justify-between py-1">
                                <span className="text-xs" style={{ color: "#6B7280" }}>{title}</span>
                                <span className="text-xs font-medium text-black text-right">{value}</span>
                              </div>
                            ))}
                            {extraDevices.length > 0 && pricesLoaded && (
                              <div className="flex items-center justify-between py-1 mt-1" style={{ borderTop: "1px solid #F3F4F6" }}>
                                <span className="text-xs font-semibold" style={{ color: "#6B7280" }}>ราคาประเมิน</span>
                                <span className="text-xs font-bold" style={{ color: "#B8860B" }}>฿{price.toLocaleString("th-TH")}</span>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        /* Extra device tab */
                        (() => {
                          const extraIdx = sidebarDeviceTab - 1;
                          const d = extraDevices[extraIdx];
                          if (!d) return null;
                          const img = getProductImage(d.model);
                          return (
                            <>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="relative w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ background: "#F5F5F7" }}>
                                  {img
                                    ? <Image src={img} alt={d.model} fill className="object-contain p-1" sizes="48px" />
                                    : <IconApple className="w-7 h-7 opacity-20" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-black leading-snug truncate">{d.model}</p>
                                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{d.storage}</p>
                                </div>
                              </div>
                              <div className="flex flex-col">
                                {d.details.map(({ title, value }) => (
                                  <div key={title} className="flex items-center justify-between py-1">
                                    <span className="text-xs" style={{ color: "#6B7280" }}>{title}</span>
                                    <span className="text-xs font-medium text-black text-right">{value}</span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between py-1 mt-1" style={{ borderTop: "1px solid #F3F4F6" }}>
                                  <span className="text-xs font-semibold" style={{ color: "#6B7280" }}>ราคาประเมิน</span>
                                  <span className="text-xs font-bold" style={{ color: "#B8860B" }}>฿{d.estimatedPrice.toLocaleString("th-TH")}</span>
                                </div>
                              </div>
                            </>
                          );
                        })()
                      )}
                    </div>

                    {/* Add more devices — desktop only (mobile has its own button in the card above) */}
                    <div className="px-5 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <a
                        href="/sell"
                        onClick={() => {
                          try { localStorage.setItem(BUNDLE_RETURN_KEY, window.location.href); } catch {}
                        }}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold"
                        style={{ border: "1.5px dashed #D1D5DB", color: "#6B7280", textDecoration: "none" }}
                      >
                        <Plus size={13} /> ประเมินสินค้าเพิ่ม
                      </a>
                    </div>

                    {/* Sell method */}
                    <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-black">ช่องทางการขาย</span>
                        <a href="#section-sell-method" className="text-xs font-semibold" style={{ color: "#B8860B" }}>แก้ไข &gt;</a>
                      </div>
                      <p className="text-xs" style={{ color: "#6B7280" }}>
                        {sellMethod === "branch" ? "นัดหมายหน้าสาขา" : sellMethod === "rider" ? "รับถึง (Rider)" : "ส่งเครื่องทางพัสดุ"}
                      </p>
                    </div>

                    {/* Appointment */}
                    {(sellMethod === "branch" || sellMethod === "rider") && (
                      <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-black">นัดหมาย</span>
                          <a href="#section-appointment" className="text-xs font-semibold" style={{ color: "#B8860B" }}>แก้ไข &gt;</a>
                        </div>
                        <p className="text-xs" style={{ color: "#6B7280" }}>
                          {effectiveAppointDate ? new Date(effectiveAppointDate + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          {" • "}{appointTime} น.{isRolledLateNight ? " (เช้ามืด)" : ""}
                        </p>
                        {sellMethod === "rider"
                          ? <p className="text-xs truncate" style={{ color: "#6B7280" }}>{riderAddress || "ยังไม่ได้ระบุที่อยู่"}</p>
                          : <p className="text-xs" style={{ color: "#6B7280" }}>สาขารังสิต</p>
                        }
                      </div>
                    )}

                    {/* Payment */}
                    <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-black">รับเงิน</span>
                        <a href="#section-payment" className="text-xs font-semibold" style={{ color: "#B8860B" }}>แก้ไข &gt;</a>
                      </div>
                      <p className="text-xs" style={{ color: "#6B7280" }}>{payMethod === "cash" ? "เงินสด" : "โอนเข้าบัญชี"}</p>
                      {payMethod === "transfer" && bankName && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: "#6B7280" }}>
                          {THAI_BANKS.find(b => b.code === bankName)?.short ?? bankName}
                          {bankAccountName ? ` • ${bankAccountName}` : ""}
                        </p>
                      )}
                    </div>

                    {/* Seller */}
                    <div className="px-5 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-black">ผู้ขาย</span>
                        <a href="#section-seller" className="text-xs font-semibold" style={{ color: "#B8860B" }}>แก้ไข &gt;</a>
                      </div>
                      {formData.name && <p className="text-xs" style={{ color: "#6B7280" }}>{formData.name}</p>}
                      {formData.phone && <p className="text-xs" style={{ color: "#6B7280" }}>{formData.phone}</p>}
                      {formData.email && <p className="text-xs" style={{ color: "#6B7280" }}>{formData.email}</p>}
                    </div>

                    {/* Trust badges */}
                    <div className="px-5 py-4 grid grid-cols-2 gap-2" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      {([
                        { Icon: ShieldCheck, label: "ประเมินฟรี ไม่ผูกมัด" },
                        { Icon: Banknote,    label: "รับเงินทันที" },
                        { Icon: Lock,        label: "ข้อมูลปลอดภัย 100%" },
                        { Icon: User,        label: "ทีมงานมืออาชีพ" },
                      ] as const).map(({ Icon, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <Icon size={12} style={{ color: "#B8860B" }} />
                          <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Disclaimer */}
                    <div className="p-5">
                      <div className="flex items-start gap-2 rounded-xl px-3.5 py-3" style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.15)" }}>
                        <ShieldCheck size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
                        <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยันนัดหมาย</p>
                      </div>
                    </div>
                  </div>

                  {/* ── Support / contact card ── */}
                  <div className="mt-4 bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>

                    {/* Timing indicator */}
                    <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: "1px solid #F3F4F6", background: "rgba(184,134,11,0.04)" }}>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.12)" }}>
                        <Clock size={13} style={{ color: "#B8860B" }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-black">ใช้เวลาเฉลี่ย 5 นาที</p>
                        <p className="text-xs" style={{ color: "#6B7280" }}>กรอกข้อมูลเสร็จแล้วรอรับราคา</p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                      <p className="text-xs font-semibold text-black mb-2.5">ต้องการความช่วยเหลือ?</p>
                      <div className="flex flex-col gap-2">
                        <a
                          href="https://line.me/R/ti/p/@khaiphone"
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-white"
                          style={{ background: "#06C755" }}
                        >
                          <IconLine className="w-3.5 h-3.5" />
                          LINE @khaiphone
                        </a>
                        <a
                          href="tel:0999999999"
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-black"
                          style={{ border: "1px solid #E5E7EB", background: "#FAFAFA" }}
                        >
                          <Phone size={13} style={{ color: "#6B7280" }} />
                          โทร 095-553-5167
                        </a>
                      </div>
                    </div>

                    {/* FAQ mini */}
                    <div className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-black mb-2.5">คำถามที่พบบ่อย</p>
                      <div className="flex flex-col gap-2">
                        {[
                          { q: "ราคานี้แม่นยำแค่ไหน?", a: "ประเมินเบื้องต้น ราคาจริงยืนยันหลังตรวจสภาพ" },
                          { q: "ต้องพาเครื่องมาเองไหม?", a: "ไม่จำเป็น — เลือก Rider รับถึงที่หรือส่งพัสดุได้" },
                          { q: "รับเงินช้าไหม?", a: "ตรวจเครื่องเสร็จรับเงินได้เลย ภายใน 30–60 นาที" },
                        ].map(({ q, a }) => (
                          <div key={q} className="rounded-xl p-2.5" style={{ background: "#F9FAFB" }}>
                            <p className="text-xs font-semibold text-black leading-snug">{q}</p>
                            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#6B7280" }}>{a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ── Result phase — dark theme ────────────────────────────── */}
            {isResultPhase && (
              <div className="flex flex-col gap-3">

                {/* Main summary card */}
                <div className="rounded-2xl overflow-hidden bg-white" style={{ border: "1px solid #E5E7EB" }}>

                  {/* Product header */}
                  <div
                    className="flex items-center gap-4 px-5 pt-6 pb-5"
                    style={{ borderBottom: "1px solid #F3F4F6" }}
                  >
                    {(() => {
                      const img = getProductImage(product.model);
                      return img
                        ? <Image src={img} alt={product.model} width={64} height={64} className="object-contain flex-shrink-0" sizes="64px" />
                        : <IconApple className="w-14 h-14 flex-shrink-0 opacity-20" />;
                    })()}
                    <div>
                      <p className="font-bold text-black text-lg leading-snug">{product.model}</p>
                      <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
                        {picks[0] !== null ? storages[picks[0]] : ""}
                        {picks[3] !== null ? ` • ${BODY_OPTS[picks[3]]?.sub ?? ""}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Price block */}
                  <div className="px-5 py-5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>
                      ราคาประเมินของคุณ
                    </p>
                    {pricesLoaded
                      ? <p className="font-black leading-none mb-2" style={{ fontSize: 44, color: "#B8860B" }}>฿{price.toLocaleString("th-TH")}</p>
                      : <p className="font-bold text-xl mb-2" style={{ color: "#B8860B" }}>กำลังคำนวณราคาประเมิน…</p>}
                    <p className="text-sm" style={{ color: "#6B7280" }}>
                      ช่วงราคาที่รับซื้อ{" "}
                      <span style={{ color: "#B8860B" }}>
                        {pricesLoaded ? `${formatPrice(priceMin)} – ${formatPrice(priceMax)}` : "—"}
                      </span>
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>
                      ราคาขึ้นอยู่กับการตรวจสอบสภาพเครื่องจริง
                    </p>
                  </div>

                  {/* Breakdown rows */}
                  {summaryRows.map(({ title, value }) => (
                    <div
                      key={title}
                      className="flex items-center justify-between px-5 py-3.5"
                      style={{ borderBottom: "1px solid #F3F4F6" }}
                    >
                      <span className="text-sm" style={{ color: "#6B7280" }}>{title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-black text-right leading-snug">{value}</span>
                        <ChevronRight size={14} style={{ color: "#D1D5DB" }} />
                      </div>
                    </div>
                  ))}

                  {/* CTAs */}
                  <div className="px-5 py-5 flex flex-col gap-3">
                    <a
                      href="https://line.me/R/ti/p/@khaiphone"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-white text-base"
                      style={{ background: "#B8860B" }}
                    >
                      <IconLine className="w-5 h-5" />
                      ยืนยันและนัดหมายรับเงิน
                    </a>
                    <a
                      href="/"
                      className="flex items-center justify-center w-full py-3.5 rounded-2xl font-semibold text-sm"
                      style={{ border: "1px solid #E5E7EB", color: "#6B7280" }}
                    >
                      บันทึกผลประเมินไว้ก่อน
                    </a>
                  </div>
                </div>

                {/* Seller info recap */}
                {(formData.name || formData.phone) && (
                  <div
                    className="rounded-2xl px-5 py-4 flex items-center gap-3 bg-white"
                    style={{ border: "1px solid #E5E7EB" }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(184,134,11,0.08)" }}
                    >
                      <Lock size={13} style={{ color: "#B8860B" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-black leading-snug">{formData.name}</p>
                      <p className="text-xs leading-snug" style={{ color: "#6B7280" }}>{formData.phone}</p>
                    </div>
                  </div>
                )}

                {/* Bottom note */}
                <p className="text-center text-xs pb-2" style={{ color: "#6B7280" }}>
                  ราคานี้เป็นการประเมินเบื้องต้น ราคาสุดท้ายขึ้นอยู่กับการตรวจสอบเครื่องจริง
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Context Bar — wizard & result phases */}
      {product && !isFormPhase && <BottomContextBar product={product} />}

      {/* Form phase — mobile fixed bottom bar */}
      {product && isFormPhase && (
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white" style={{ borderTop: "1px solid #E5E7EB" }}>
          <div className="flex items-center px-4 gap-3" style={{ height: 64 }}>
            <div className="flex flex-col flex-shrink-0">
              <p className="text-xs leading-tight" style={{ color: "#6B7280" }}>
                {extraDevices.length > 0 ? `รวม ${extraDevices.length + 1} เครื่อง` : "ราคาประเมิน"}
              </p>
              {pricesLoaded
                ? <p className="font-bold text-lg leading-tight" style={{ color: "#B8860B" }}>฿{totalBundlePrice.toLocaleString("th-TH")}</p>
                : <p className="font-medium text-sm mt-0.5" style={{ color: "#B8860B" }}>คำนวณอยู่…</p>}
            </div>
            <button type="submit" form="sell-form"
              disabled={submitting}
              className="flex-1 flex items-center justify-center font-semibold text-white text-sm rounded-2xl"
              style={{ background: "#1d1d1f", height: 44, boxShadow: "0 1px 3px rgba(0,0,0,0.14)", opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "กำลังส่ง..." : "ยืนยันการขายและนัดหมายรับเครื่อง →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellModelPage() {
  return (
    <Suspense fallback={null}>
      <SellModelPageContent />
    </Suspense>
  );
}
