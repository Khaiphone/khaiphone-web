"use client";

import { Fragment, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check, Copy, ChevronDown, ChevronUp, Bell, Phone,
  Calendar, MapPin, Banknote, ShieldCheck, Truck, Clock, ExternalLink,
} from "lucide-react";
import Header from "../../components/Header";
import { fetchRequestByOrderNumber } from "@/app/actions/admin-requests";
import { supabase } from "@/lib/supabase";

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconLine({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.629 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function IconApple({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-103.4C46.5 727.1 0 604.9 0 494.5 0 320.2 105.5 224 209.4 224c65.4 0 120 43.1 161.8 43.1 39.8 0 101.6-46.7 174.2-46.7zm-134.6-114.1c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtraDevice {
  model: string;
  storage: string;
  estimatedPrice: number;
  details: Array<{ title: string; value: string }>;
}

export interface SubmissionData {
  orderNumber: string;
  submittedAt: string;
  model: string;
  storage: string;
  condition: string;
  selections: Record<string, string>;
  estimatedPrice: number;
  priceMin: number;
  priceMax: number;
  extraDevices?: ExtraDevice[];
  customer: { name: string; phone: string; email: string };
  appointment: {
    method: "branch" | "rider" | "parcel";
    date: string;
    time: string;
    location: string;
  };
  payment: {
    method: "cash" | "transfer";
    bankCode?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────


function formatThaiDate(str: string) {
  const d = new Date(str.includes("T") ? str : str + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

function formatThaiTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function getProductImage(model: string): string | null {
  if (model.includes("iPhone") && model.includes("Air")) return "/iPhone-air.webp";
  const m = model.match(/iPhone (\d+)/);
  if (!m) return null;
  const gen = parseInt(m[1]);
  if (gen < 11 || gen > 17) return null;
  if (model.includes("Pro")) return `/iPhone-${gen}-pro-max.webp`;
  if (model.endsWith("e")) return `/iPhone-${gen}e.webp`;
  return `/iPhone-${gen}.webp`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusToDoneUpTo(status: string): number {
  switch (status) {
    case "completed":         return 6;
    case "contracting":       return 5;
    case "price_negotiation": return 4;
    case "pickup_scheduled":
    case "confirmed":         return 3;
    case "inspecting":        return 2;
    case "pending":           return 1;
    default:                  return 0;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STEPS = [
  "คำขอใหม่",
  "รอตรวจสอบ",
  "เจ้าหน้าที่ติดต่อกลับแล้ว",
  "ยืนยันนัดหมาย",
  "ตรวจสอบสภาพเครื่อง",
  "กำลังทำสัญญาซื้อขาย",
  "เสร็จสิ้น",
];

const TRUST_ITEMS = [
  { label: "ประเมินราคาฟรี",  sub: "ไม่มีค่าใช้จ่าย" },
  { label: "รับซื้อให้ราคาสูง", sub: "มั่นใจได้ ราคาดี" },
  { label: "ปลอดภัย 100%",   sub: "ข้อมูลถูกปิด" },
  { label: "จ่ายเงินทันที",   sub: "รับเงินใน 1 วัน" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

function SellSuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubmissionData | null>(null);
  const [doneUpTo, setDoneUpTo] = useState(0);
  const [verifyFailed, setVerifyFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);

  function toggleCard(id: string) {
    setOpenCard(prev => prev === id ? null : id);
  }

  const loadFromDb = useCallback(async (orderNumber: string, phone: string) => {
    const req = await fetchRequestByOrderNumber(orderNumber, phone);
    if (!req) return req;
    setDoneUpTo(statusToDoneUpTo(req.status));
    setData(prev => prev ? {
      ...prev,
      estimatedPrice: req.device.actualPrice ?? req.device.estimatedPrice,
      appointment: {
        method:   req.appointment.method,
        date:     req.appointment.date,
        time:     req.appointment.time,
        location: req.appointment.location,
      },
      payment: {
        ...prev.payment,
        method:        req.payment.method,
        bankName:      req.payment.bankName,
        accountName:   req.payment.accountName,
        accountNumber: req.payment.accountNumber,
      },
    } : prev);
    return req;
  }, []);

  useEffect(() => {
    async function init() {
      const orderParam = searchParams.get("order");
      const phoneParam = searchParams.get("phone");

      // Primary: localStorage
      try {
        const raw = localStorage.getItem("khaiphone_submission");
        if (raw) {
          const parsed = JSON.parse(raw) as SubmissionData;
          setData(parsed);
          // Fire Google Ads conversion exactly once per order number
          if (parsed.orderNumber && !localStorage.getItem(`khaiphone_conv_${parsed.orderNumber}`)) {
            localStorage.setItem(`khaiphone_conv_${parsed.orderNumber}`, "1");
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: "conversion_form_submit" });
          }
          const phone = parsed.customer?.phone ?? "";
          if (parsed.orderNumber && phone) loadFromDb(parsed.orderNumber, phone);
          return;
        }
      } catch {}

      // Fallback: URL params → load from DB with retry (handles race condition after insert)
      if (orderParam && phoneParam) {
        // Stub data from URL so the page renders immediately without redirecting
        setData(prev => prev ?? {
          orderNumber:    orderParam,
          submittedAt:    new Date().toISOString(),
          model:          "",
          storage:        "",
          condition:      "",
          selections:     {},
          estimatedPrice: 0,
          priceMin:       0,
          priceMax:       0,
          customer:       { name: "", phone: phoneParam, email: "" },
          appointment:    { method: "branch", date: "", time: "", location: "" },
          payment:        { method: "cash" },
        });

        // Retry up to 4 times with backoff (500ms, 1s, 2s, 3s) in case DB replication lag
        const delays = [500, 1000, 2000, 3000];
        for (const delay of delays) {
          await new Promise(r => setTimeout(r, delay));
          const req = await loadFromDb(orderParam, phoneParam);
          if (req) {
            setData({
              orderNumber:    req.orderNumber,
              submittedAt:    req.createdAt,
              model:          req.device.model,
              storage:        req.device.storage,
              condition:      req.device.condition ?? "",
              selections:     req.device.selections ?? {},
              estimatedPrice: req.device.actualPrice ?? req.device.estimatedPrice,
              priceMin:       req.device.estimatedPrice,
              priceMax:       req.device.estimatedPrice,
              customer:       { name: req.customer.name, phone: req.customer.phone, email: req.customer.email ?? "" },
              appointment:    { method: req.appointment.method as SubmissionData["appointment"]["method"], date: req.appointment.date, time: req.appointment.time, location: req.appointment.location },
              payment:        { method: req.payment.method as SubmissionData["payment"]["method"], bankName: req.payment.bankName, accountName: req.payment.accountName, accountNumber: req.payment.accountNumber },
            });
            return;
          }
        }
        // All retries exhausted — order may not have saved, show warning
        setVerifyFailed(true);
        return;
      }

      // No order param at all → redirect
      router.replace("/sell");
    }
    init();
  }, [router, loadFromDb, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription
  useEffect(() => {
    if (!data?.orderNumber || !data?.customer?.phone) return;
    const { orderNumber, customer: { phone } } = data;

    const channel = supabase
      .channel(`success-${orderNumber}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests", filter: `order_number=eq.${orderNumber}` },
        () => { loadFromDb(orderNumber, phone); },
      )
      .subscribe();

    const onVisible = () => { if (document.visibilityState === "visible") loadFromDb(orderNumber, phone); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [data?.orderNumber, data?.customer?.phone, loadFromDb]); // eslint-disable-line react-hooks/exhaustive-deps

  function fallbackCopy(text: string) {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.appendChild(el);
    el.focus();
    el.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(el);
  }

  function copyOrderId() {
    if (!data) return;
    const text = data.orderNumber;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function goToTrack() {
    if (!data) return;
    const phone = data.customer.phone.replace(/[-\s]/g, "");
    router.push(`/request/${data.orderNumber}?phone=${encodeURIComponent(phone)}`);
  }

  const sellMethodLabel =
    data?.appointment?.method === "branch" ? "นัดหมายหน้าสาขา"
    : data?.appointment?.method === "rider" ? "รับถึง (Rider)"
    : "ส่งเครื่องทางพัสดุ";

  const locationLabel = data?.appointment?.location ?? "—";

  // ── Shared sub-components ─────────────────────────────────────────────────

  function ContactBanner({ compact = false }: { compact?: boolean }) {
    if (compact) {
      return (
        <div className="px-4 py-3" style={{ background: "rgba(250,250,248,0.9)", borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-start gap-2">
            <Bell size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
            <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
              หากต้องการแก้ไขข้อมูลเพิ่มเติม กรุณาติดต่อทีมงาน
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl p-5" style={{ background: "#FAFAF8", border: "1px solid #E5E7EB" }}>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Bell size={18} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
            <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
              หากต้องการแก้ไขข้อมูลเพิ่มเติม หรือมีคำถามใดๆ กรุณาติดต่อทีมงานผ่านช่องทางด้านล่าง เราพร้อมให้บริการคุณ
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto flex-shrink-0">
            <a href="https://line.me/R/ti/p/@khaiphone" target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "#06C755" }}>
              <IconLine className="w-4 h-4" />
              ติดต่อผ่าน LINE
            </a>
            <a href="tel:0955535167"
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
              style={{ border: "1px solid #E5E7EB", background: "#fff" }}>
              <Phone size={15} />
              โทรหาเรา 095-553-5167
            </a>
          </div>
        </div>
      </div>
    );
  }

  function StatusVertical({ size = "md" }: { size?: "sm" | "md" }) {
    const circleSize = size === "sm" ? 20 : 28;
    const iconSize   = size === "sm" ? 9 : 12;
    const fontSize   = size === "sm" ? 9 : 12;
    const lineH      = size === "sm" ? 12 : 16;
    return (
      <div className="flex flex-col gap-2.5">
        {STATUS_STEPS.map((step, i) => {
          const isDone    = i <= doneUpTo;
          const isCurrent = i === doneUpTo;
          return (
            <div key={i} className="flex items-start gap-2.5">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="rounded-full border-2 flex items-center justify-center"
                  style={{ width: circleSize, height: circleSize, background: isDone ? "#B8860B" : "#fff", borderColor: isDone ? "#B8860B" : "#D1D5DB" }}>
                  {isDone
                    ? <Check size={iconSize} strokeWidth={3} color="#fff" />
                    : <span style={{ fontSize, fontWeight: 700, color: "#6B7280" }}>{i + 1}</span>}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className="w-px mt-1" style={{ height: lineH, background: isDone ? "#B8860B" : "#E5E7EB" }} />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold leading-snug" style={{ color: isDone ? "#B8860B" : "#374151" }}>{step}</p>
                {i === 0 && data && (
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                    {formatThaiDate(data.submittedAt)} {formatThaiTime(data.submittedAt)} น.
                  </p>
                )}
                {isCurrent && i > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: "#B8860B" }}>● กำลังดำเนินการ</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <Header />

      {verifyFailed && (
        <div className="w-full px-4 py-3" style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm font-medium flex-1" style={{ color: "#991B1B" }}>
              ไม่สามารถยืนยันคำขอได้ในขณะนี้ — อาจเกิดจากระบบขัดข้องชั่วคราว กรุณาติดต่อทีมงานเพื่อตรวจสอบ
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <a href="https://line.me/R/ti/p/@khaiphone" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: "#06C755" }}>
                <IconLine className="w-3.5 h-3.5" /> LINE
              </a>
              <a href="tel:0955535167"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold"
                style={{ border: "1px solid #FECACA", background: "#fff", color: "#991B1B" }}>
                โทร 095-553-5167
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* ── Left column ───────────────────────────────────────────── */}
          <div className="w-full md:flex-1 min-w-0 flex flex-col gap-5">

            {/* Success hero */}
            <div className="text-center py-8 relative overflow-hidden">
              {/* Decorative dots */}
              {[
                { left: "10%", top: "18%" }, { left: "24%", top: "10%" },
                { left: "75%", top: "14%" }, { right: "10%", top: "20%" },
                { left: "8%",  top: "72%" }, { right: "8%",  top: "68%" },
              ].map((pos, i) => (
                <div key={i} className="absolute w-2 h-2 rounded-full pointer-events-none"
                  style={{ ...pos, background: "#B8860B", opacity: 0.18 + (i % 3) * 0.08 }} />
              ))}
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#22C55E" }}>
                <Check size={30} color="#fff" strokeWidth={3} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-black mb-3">ส่งคำขอสำเร็จแล้ว</h1>
              <p className="text-sm md:text-base leading-relaxed max-w-sm mx-auto" style={{ color: "#6B7280" }}>
                ทีมงานได้รับข้อมูลการประเมินของคุณแล้ว<br className="hidden md:block" />
                และจะติดต่อกลับภายใน 15–30 นาที
              </p>
            </div>

            {/* Track status CTA */}
            <div className="rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" style={{ background: "rgba(184,134,11,0.06)", border: "1.5px solid rgba(184,134,11,0.2)" }}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <ExternalLink size={18} style={{ color: "#B8860B", flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="text-sm font-bold text-black">ติดตามสถานะคำขอ</p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: "#6B7280" }}>
                    บันทึกลิงก์นี้ไว้เพื่อติดตามสถานะ ไม่ต้องล็อกอิน
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={goToTrack}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0 w-full sm:w-auto"
                style={{ background: "#B8860B", border: "none", cursor: "pointer" }}
              >
                <ExternalLink size={14} />
                ดูสถานะคำขอ
              </button>
            </div>

            {/* 2 info cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Order ID — with copy button on mobile */}
              <div className="rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 9h8M8 12h5M8 15h4"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#6B7280" }}>หมายเลขคำขอ</span>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-black leading-snug" style={{ wordBreak: "break-all" }}>
                    #{data?.orderNumber ?? "KH-2026-XXXXX"}
                  </p>
                  <button type="button" onClick={copyOrderId}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium self-start"
                    style={{ background: copied ? "rgba(34,197,94,0.1)" : "#F3F4F6", color: copied ? "#16A34A" : "#6B7280", border: "none", cursor: "pointer" }}>
                    <Copy size={11} />{copied ? "คัดลอกแล้ว" : "คัดลอก"}
                  </button>
                </div>
                <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>บันทึกไว้ใช้ในการติดตามสถานะ</p>
              </div>

              {/* Price */}
              <div className="rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                    <Banknote size={15} style={{ color: "#B8860B" }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
                    {(data?.extraDevices?.length ?? 0) > 0 ? `ราคารวม ${(data?.extraDevices?.length ?? 0) + 1} เครื่อง` : "ราคาประเมินเบื้องต้น"}
                  </span>
                </div>
                <p className="text-lg md:text-xl font-bold leading-snug" style={{ color: "#B8860B" }}>
                  ฿{((data?.estimatedPrice ?? 0) + (data?.extraDevices ?? []).reduce((s, d) => s + d.estimatedPrice, 0)).toLocaleString("th-TH")}
                </p>
                <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>ราคานี้อาจเปลี่ยนแปลงได้หลังตรวจสอบเครื่อง</p>
              </div>
            </div>

            {/* Seller info card */}
            <div className="rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                  <ShieldCheck size={14} style={{ color: "#B8860B" }} />
                </div>
                <span className="text-sm font-bold text-black">ข้อมูลผู้ขาย</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                <div className="flex-1">
                  <p className="text-xs mb-0.5" style={{ color: "#6B7280" }}>ชื่อ-นามสกุล</p>
                  <p className="text-sm font-semibold text-black">{data?.customer?.name ?? "—"}</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs mb-0.5" style={{ color: "#6B7280" }}>เบอร์โทรศัพท์</p>
                  <p className="text-sm font-semibold text-black">{data?.customer?.phone ?? "—"}</p>
                </div>
                {data?.customer?.email && (
                  <div className="flex-1">
                    <p className="text-xs mb-0.5" style={{ color: "#6B7280" }}>อีเมล</p>
                    <p className="text-sm font-semibold text-black">{data.customer.email}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status timeline */}
            <div className="rounded-2xl p-5 md:p-6" style={{ border: "1px solid #E5E7EB" }}>
              <h2 className="font-bold text-black text-base mb-5">สถานะคำขอ</h2>

              {/* Desktop: horizontal */}
              <div className="hidden md:flex items-start">
                {STATUS_STEPS.map((step, i) => {
                  const isDone    = i <= doneUpTo;
                  const isCurrent = i === doneUpTo;
                  return (
                    <Fragment key={i}>
                      {i > 0 && (
                        <div className="flex-1 h-0.5 mt-4 mx-1" style={{ background: i <= doneUpTo ? "#B8860B" : "#E5E7EB" }} />
                      )}
                      <div className="flex flex-col items-center flex-shrink-0" style={{ width: 72 }}>
                        <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                          style={{ background: isDone ? "#B8860B" : "#fff", borderColor: isDone ? "#B8860B" : "#D1D5DB" }}>
                          {isDone
                            ? <Check size={14} strokeWidth={3} color="#fff" />
                            : <span style={{ fontSize: 12, fontWeight: 700, color: "#6B7280" }}>{i + 1}</span>}
                        </div>
                        <p className="text-center mt-2 leading-snug" style={{ fontSize: 11, color: isDone ? "#B8860B" : "#6B7280", fontWeight: isDone ? 700 : 500 }}>
                          {step}
                        </p>
                        {i === 0 && data && (
                          <p className="text-center leading-tight mt-1" style={{ fontSize: 10, color: "#6B7280" }}>
                            {formatThaiDate(data.submittedAt)}<br />{formatThaiTime(data.submittedAt)} น.
                          </p>
                        )}
                        {isCurrent && i > 0 && (
                          <p className="text-center leading-tight mt-1" style={{ fontSize: 10, color: "#B8860B" }}>กำลังดำเนินการ</p>
                        )}
                      </div>
                    </Fragment>
                  );
                })}
              </div>

              {/* Mobile: vertical */}
              <div className="md:hidden">
                <StatusVertical size="md" />
              </div>
            </div>

            {/* 3 summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Device */}
              <div className="rounded-2xl p-4 flex flex-col" style={{ border: "1px solid #E5E7EB" }}>
                <p className="text-xs font-semibold text-black mb-3">
                  {(data?.extraDevices?.length ?? 0) > 0 ? `สินค้าในรายการ (${(data?.extraDevices?.length ?? 0) + 1} เครื่อง)` : "ข้อมูลเครื่อง"}
                </p>
                {/* Primary device */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "#F5F5F7" }}>
                    {data?.model && getProductImage(data.model)
                      ? <img src={getProductImage(data.model)!} alt={data.model} className="w-full h-full object-contain p-1" />
                      : <IconApple className="w-7 h-7" style={{ color: "#ccc" }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-black leading-snug">{data?.model ?? "—"}</p>
                      {(data?.extraDevices?.length ?? 0) > 0 && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(184,134,11,0.15)", color: "#B8860B" }}>หลัก</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                      {[data?.storage, data?.condition].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: "#B8860B" }}>฿{(data?.estimatedPrice ?? 0).toLocaleString("th-TH")}</span>
                </div>
                {/* Extra devices */}
                {(data?.extraDevices ?? []).map((d, i) => (
                  <div key={i} className="flex items-center gap-3 mb-2 pl-1 py-2 rounded-lg" style={{ borderTop: "1px solid #F3F4F6" }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-black">{d.model}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{d.storage}</p>
                    </div>
                    <span className="text-sm font-bold flex-shrink-0" style={{ color: "#374151" }}>฿{d.estimatedPrice.toLocaleString("th-TH")}</span>
                  </div>
                ))}
                {/* Total row */}
                {(data?.extraDevices?.length ?? 0) > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg mt-1" style={{ background: "#111" }}>
                    <span className="text-xs font-semibold text-white">รวม {(data?.extraDevices?.length ?? 0) + 1} เครื่อง</span>
                    <span className="text-sm font-bold" style={{ color: "#F0C040" }}>
                      ฿{((data?.estimatedPrice ?? 0) + (data?.extraDevices ?? []).reduce((s, d) => s + d.estimatedPrice, 0)).toLocaleString("th-TH")}
                    </span>
                  </div>
                )}
                {openCard === "device" && data?.selections && (
                  <div className="mt-3 flex flex-col gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid #F3F4F6", background: "#FAFAF8" }}>
                    {Object.entries(data.selections).filter(([, v]) => v).map(([k, v], i, arr) => {
                      const labels: Record<string, string> = { storage: "ความจุ", modelType: "รุ่นเครื่อง", warranty: "ประกัน", body: "ตัวเครื่อง", screen: "หน้าจอ", display: "ภาพหน้าจอ", battery: "แบตเตอรี่", accessories: "อุปกรณ์", icloud: "iCloud" };
                      return (
                        <div key={k} className="flex justify-between px-3 py-2" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                          <span className="text-xs" style={{ color: "#6B7280" }}>{labels[k] ?? k}</span>
                          <span className="text-xs font-semibold text-black text-right max-w-[58%] leading-snug">{v}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <button type="button" onClick={() => toggleCard("device")}
                  className="mt-4 w-full py-2 rounded-xl text-xs font-semibold text-black flex items-center justify-center gap-1.5"
                  style={{ border: "1px solid #E5E7EB", cursor: "pointer", background: "#fff" }}>
                  {openCard === "device" ? <><ChevronUp size={13} />ซ่อนรายละเอียด</> : <><ChevronDown size={13} />ดูรายละเอียด</>}
                </button>
              </div>

              {/* Appointment */}
              <div className="rounded-2xl p-4 flex flex-col" style={{ border: "1px solid #E5E7EB" }}>
                <p className="text-xs font-semibold text-black mb-3">ข้อมูลนัดหมาย</p>
                <div className="flex flex-col gap-2 flex-1">
                  {data?.appointment?.date && (
                    <div className="flex items-start gap-2">
                      <Calendar size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
                      <span className="text-xs" style={{ color: "#374151" }}>{formatThaiDate(data.appointment.date)}</span>
                    </div>
                  )}
                  {data?.appointment?.time && (
                    <div className="flex items-start gap-2">
                      <Clock size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
                      <span className="text-xs" style={{ color: "#374151" }}>{data.appointment.time} น.</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
                    <span className="text-xs leading-snug" style={{ color: "#374151" }}>{locationLabel}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Truck size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#B8860B" }} />
                    <span className="text-xs" style={{ color: "#374151" }}>{sellMethodLabel}</span>
                  </div>
                </div>
                {openCard === "appt" && (
                  <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid #F3F4F6", background: "#FAFAF8" }}>
                    {[
                      { label: "วันที่", value: data?.appointment?.date ? formatThaiDate(data.appointment.date) : "—" },
                      { label: "เวลา", value: data?.appointment?.time ? `${data.appointment.time} น.` : "—" },
                      { label: "ช่องทาง", value: sellMethodLabel },
                      { label: "สถานที่/ที่อยู่", value: locationLabel },
                    ].map(({ label, value }, i, arr) => (
                      <div key={label} className="flex justify-between px-3 py-2" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                        <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
                        <span className="text-xs font-semibold text-black text-right max-w-[60%] leading-snug">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => toggleCard("appt")}
                  className="mt-4 w-full py-2 rounded-xl text-xs font-semibold text-black flex items-center justify-center gap-1.5"
                  style={{ border: "1px solid #E5E7EB", cursor: "pointer", background: "#fff" }}>
                  {openCard === "appt" ? <><ChevronUp size={13} />ซ่อนรายละเอียด</> : <><ChevronDown size={13} />ดูรายละเอียด</>}
                </button>
              </div>

              {/* Payment */}
              <div className="rounded-2xl p-4 flex flex-col" style={{ border: "1px solid #E5E7EB" }}>
                <p className="text-xs font-semibold text-black mb-3">ช่องทางรับเงิน</p>
                <div className="flex flex-col gap-2 flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(184,134,11,0.1)" }}>
                    <Banknote size={18} style={{ color: "#B8860B" }} />
                  </div>
                  <p className="text-sm font-bold text-black">{data?.payment?.method === "cash" ? "เงินสด" : "โอนเข้าบัญชี"}</p>
                  {data?.payment?.method === "transfer" && data.payment.bankName && (
                    <p className="text-xs" style={{ color: "#6B7280" }}>{data.payment.bankName}</p>
                  )}
                  {data?.payment?.method === "transfer" && data.payment.accountName && (
                    <p className="text-xs font-semibold text-black">{data.payment.accountName}</p>
                  )}
                </div>
                {openCard === "payment" && (
                  <div className="mt-3 rounded-xl overflow-hidden" style={{ border: "1px solid #F3F4F6", background: "#FAFAF8" }}>
                    {[
                      { label: "ประเภท", value: data?.payment?.method === "cash" ? "เงินสด" : "โอนเข้าบัญชี" },
                      ...(data?.payment?.method === "transfer" ? [
                        { label: "ธนาคาร", value: data.payment.bankName ?? "—" },
                        { label: "ชื่อบัญชี", value: data.payment.accountName ?? "—" },
                        { label: "เลขบัญชี", value: data.payment.accountNumber ? `•••• ${data.payment.accountNumber.slice(-4)}` : "—" },
                      ] : []),
                    ].map(({ label, value }, i, arr) => (
                      <div key={label} className="flex justify-between px-3 py-2" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                        <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
                        <span className="text-xs font-semibold text-black text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => toggleCard("payment")}
                  className="mt-4 w-full py-2 rounded-xl text-xs font-semibold text-black flex items-center justify-center gap-1.5"
                  style={{ border: "1px solid #E5E7EB", cursor: "pointer", background: "#fff" }}>
                  {openCard === "payment" ? <><ChevronUp size={13} />ซ่อนรายละเอียด</> : <><ChevronDown size={13} />ดูรายละเอียด</>}
                </button>
              </div>
            </div>

            {/* Contact banner */}
            <ContactBanner />

          </div>

          {/* ── Right panel (Desktop only) ────────────────────────────── */}
          <div className="hidden md:flex flex-col gap-0 flex-shrink-0 self-start sticky" style={{ width: 300, top: 24 }}>
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>

              {/* Order number + copy */}
              <div className="px-4 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <p className="text-xs mb-1" style={{ color: "#6B7280" }}>หมายเลขคำขอ</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-bold text-black leading-snug">#{data?.orderNumber ?? "KH-2026-XXXXX"}</p>
                  <button type="button" onClick={copyOrderId}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0"
                    style={{ background: copied ? "rgba(34,197,94,0.1)" : "#F3F4F6", color: copied ? "#16A34A" : "#6B7280", border: "none", cursor: "pointer" }}>
                    <Copy size={11} />{copied ? "คัดลอกแล้ว" : "คัดลอก"}
                  </button>
                </div>
              </div>

              {/* Price */}
              <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <p className="text-xs mb-0.5" style={{ color: "#6B7280" }}>
                  {(data?.extraDevices?.length ?? 0) > 0 ? `ราคารวม ${(data?.extraDevices?.length ?? 0) + 1} เครื่อง` : "ราคาประเมินเบื้องต้น"}
                </p>
                <p className="text-2xl font-bold" style={{ color: "#B8860B" }}>
                  ฿{((data?.estimatedPrice ?? 0) + (data?.extraDevices ?? []).reduce((s, d) => s + d.estimatedPrice, 0)).toLocaleString("th-TH")}
                </p>
              </div>

              {/* Status vertical (compact) */}
              <div className="px-4 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <p className="text-xs font-semibold text-black mb-3">สถานะคำขอ</p>
                <StatusVertical size="sm" />
              </div>

              {/* Accordions */}
              {([
                { id: "device",  label: "ข้อมูลเครื่อง" },
                { id: "appt",    label: "ข้อมูลนัดหมาย" },
                { id: "payment", label: "ช่องทางรับเงิน" },
              ] as const).map(({ id, label }) => (
                <div key={id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <button type="button"
                    onClick={() => setOpenAccordion(prev => prev === id ? null : id)}
                    className="flex items-center justify-between w-full px-4 py-3.5 text-left"
                    style={{ cursor: "pointer", background: "transparent", border: "none" }}>
                    <span className="text-xs font-semibold text-black">{label}</span>
                    {openAccordion === id
                      ? <ChevronUp size={14} style={{ color: "#6B7280" }} />
                      : <ChevronDown size={14} style={{ color: "#6B7280" }} />}
                  </button>
                  {openAccordion === id && (
                    <div className="px-4 pb-4 flex flex-col gap-0">
                      {id === "device" && (
                        <>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-9 h-9 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: "#F5F5F7" }}>
                              {data?.model && getProductImage(data.model)
                                ? <img src={getProductImage(data.model)!} alt={data.model} className="w-full h-full object-contain p-0.5" />
                                : <IconApple className="w-6 h-6" style={{ color: "#ccc" }} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-black truncate">{data?.model ?? "—"}</p>
                              <p className="text-xs" style={{ color: "#6B7280" }}>
                                {[data?.storage, data?.condition].filter(Boolean).join(" • ")}
                              </p>
                            </div>
                          </div>
                          {data?.selections && Object.entries(data.selections).filter(([, v]) => v).map(([k, v], i, arr) => {
                            const labels: Record<string, string> = { storage: "ความจุ", modelType: "รุ่น", warranty: "ประกัน", body: "ตัวเครื่อง", screen: "หน้าจอ", display: "ภาพหน้าจอ", battery: "แบตเตอรี่", accessories: "อุปกรณ์", icloud: "iCloud" };
                            return (
                              <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                                <span className="text-xs" style={{ color: "#6B7280" }}>{labels[k] ?? k}</span>
                                <span className="text-xs font-medium text-black text-right max-w-[58%] leading-snug">{v}</span>
                              </div>
                            );
                          })}
                        </>
                      )}
                      {id === "appt" && (
                        <div className="flex flex-col gap-0">
                          {[
                            { label: "วันที่", value: data?.appointment?.date ? formatThaiDate(data.appointment.date) : "—" },
                            { label: "เวลา", value: data?.appointment?.time ? `${data.appointment.time} น.` : "—" },
                            { label: "ช่องทาง", value: sellMethodLabel },
                            { label: "สถานที่", value: locationLabel },
                          ].map(({ label, value }, i, arr) => (
                            <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                              <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
                              <span className="text-xs font-medium text-black text-right max-w-[58%] leading-snug">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {id === "payment" && (
                        <div className="flex flex-col gap-0">
                          {[
                            { label: "ประเภท", value: data?.payment?.method === "cash" ? "เงินสด" : "โอนเข้าบัญชี" },
                            ...(data?.payment?.method === "transfer" ? [
                              { label: "ธนาคาร", value: data.payment.bankName ?? "—" },
                              { label: "ชื่อบัญชี", value: data.payment.accountName ?? "—" },
                              { label: "เลขบัญชี", value: data.payment.accountNumber ? `•••• ${data.payment.accountNumber.slice(-4)}` : "—" },
                            ] : []),
                          ].map(({ label, value }, i, arr) => (
                            <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F9FAFB" : "none" }}>
                              <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
                              <span className="text-xs font-medium text-black text-right">{value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Contact mini */}
              <ContactBanner compact />

              {/* CTA buttons */}
              <div className="p-4 flex flex-col gap-2.5">
                <a href="https://line.me/R/ti/p/@khaiphone" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#06C755" }}>
                  <IconLine className="w-4 h-4" />
                  ติดต่อผ่าน LINE
                </a>
                <a href="tel:0955535167"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-black"
                  style={{ border: "1px solid #E5E7EB" }}>
                  <Phone size={14} />
                  โทรหาเรา 095-553-5167
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Dark footer */}
      <footer className="mt-12" style={{ background: "#111" }}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            {TRUST_ITEMS.map(({ label, sub }, i) => (
              <div key={label} className="flex items-center gap-3">
                <span className="flex-shrink-0 opacity-60" style={{ color: "#fff" }}>
                  {i === 0 && <ShieldCheck size={20} />}
                  {i === 1 && <Banknote size={20} />}
                  {i === 2 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  )}
                  {i === 3 && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                    </svg>
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-2.5">
              <img src="/logo-icon.webp" alt="ขายไอโฟน.com" className="h-8 w-auto" />
              <div>
                <p className="text-sm font-bold text-white">ขายไอโฟน.com</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>© 2025 ขายไอโฟน.com</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {["เกี่ยวกับเรา", "นโยบายความเป็นส่วนตัว", "เงื่อนไขการให้บริการ"].map(link => (
                <a key={link} href="#" className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{link}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function SellSuccessPage() {
  return (
    <Suspense>
      <SellSuccessInner />
    </Suspense>
  );
}
