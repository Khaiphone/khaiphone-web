"use client";

import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { fetchRequestByOrderNumber } from "@/app/actions/admin-requests";
import { customerRespondToNegotiation } from "@/app/actions/inspection";
import type { InspectionData } from "@/lib/types/admin";
import {
  Check, Phone, Calendar, MapPin, Banknote,
  Truck, Package, Store, Clock, Shield, RefreshCw, Loader2, X,
} from "lucide-react";
import Header from "../../components/Header";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtraDevice {
  model: string;
  storage: string;
  estimatedPrice: number;
  details: Array<{ title: string; value: string }>;
}

interface SubmissionData {
  orderNumber: string;
  submittedAt: string;
  model: string;
  storage: string;
  condition: string;
  color?: string;
  conditionDetails?: string[];
  selections: Record<string, string>;
  estimatedPrice: number;
  priceMin: number;
  priceMax: number;
  extraDevices: ExtraDevice[];
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
    slipUrl?: string;
    contractSignedAt?: string;
  };
  contractUrl?: string;
  receiptUrl?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  "คำขอใหม่",
  "รอตรวจสอบ",
  "เจ้าหน้าที่ติดต่อกลับแล้ว",
  "ยืนยันนัดหมาย",
  "ตรวจสอบสภาพเครื่อง",
  "กำลังทำสัญญาซื้อขาย",
  "เสร็จสิ้น",
];

const SELECTION_LABELS: Record<string, string> = {
  storage:     "ความจุ",
  modelType:   "รุ่นเครื่อง",
  warranty:    "ประกัน",
  body:        "ตัวเครื่อง",
  screen:      "หน้าจอ",
  display:     "ภาพหน้าจอ",
  battery:     "แบตเตอรี่",
  accessories: "อุปกรณ์",
  icloud:      "iCloud",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(p: string) {
  return p.replace(/[-\s]/g, "");
}

function formatThaiDate(str: string) {
  const d = new Date(str.includes("T") ? str : str + "T00:00:00");
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

function formatThaiDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }),
    time: d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
  };
}

function maskAccount(acc: string) {
  return acc.length > 4 ? "•••• " + acc.slice(-4) : acc;
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

// ── Sub-components ────────────────────────────────────────────────────────────

function IconLine({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.629 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

function IconApple({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-103.4C46.5 727.1 0 604.9 0 494.5 0 320.2 105.5 224 209.4 224c65.4 0 120 43.1 161.8 43.1 39.8 0 101.6-46.7 174.2-46.7zm-134.6-114.1c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

interface HeroConfig { badge: string; badgeBg: string; badgeColor: string; badgeBorder: string; title: string; progress: number }
function getHeroConfig(doneUpTo: number): HeroConfig {
  if (doneUpTo >= 6) return { badge: "เสร็จสิ้น",        badgeBg: "rgba(16,185,129,0.15)",  badgeColor: "#10B981", badgeBorder: "rgba(16,185,129,0.3)",  title: "ธุรกรรมสำเร็จเรียบร้อย",          progress: 100 };
  if (doneUpTo === 5) return { badge: "กำลังทำสัญญา",    badgeBg: "rgba(16,185,129,0.15)",  badgeColor: "#10B981", badgeBorder: "rgba(16,185,129,0.3)",  title: "กำลังดำเนินการทำสัญญาซื้อขาย",   progress: 92  };
  if (doneUpTo === 4) return { badge: "รอยืนยันราคา",    badgeBg: "rgba(245,158,11,0.15)",  badgeColor: "#FBBF24", badgeBorder: "rgba(245,158,11,0.3)",  title: "กรุณายืนยันราคาที่เสนอใหม่",       progress: 80  };
  if (doneUpTo === 3) return { badge: "ยืนยันนัดหมาย",   badgeBg: "rgba(139,92,246,0.15)",  badgeColor: "#A78BFA", badgeBorder: "rgba(139,92,246,0.3)",  title: "นัดหมายได้รับการยืนยันแล้ว",       progress: 65  };
  if (doneUpTo === 2) return { badge: "ติดต่อกลับแล้ว",  badgeBg: "rgba(249,115,22,0.15)",  badgeColor: "#FB923C", badgeBorder: "rgba(249,115,22,0.3)",  title: "เจ้าหน้าที่ได้ติดต่อกลับแล้ว",     progress: 50  };
  if (doneUpTo === 1) return { badge: "รอตรวจสอบ",        badgeBg: "rgba(59,130,246,0.15)",  badgeColor: "#60A5FA", badgeBorder: "rgba(59,130,246,0.3)",  title: "ทีมงานกำลังตรวจสอบข้อมูลของคุณ",   progress: 35  };
  return                     { badge: "คำขอใหม่",         badgeBg: "rgba(34,197,94,0.15)",   badgeColor: "#22C55E", badgeBorder: "rgba(34,197,94,0.25)",  title: "คำขอของคุณได้รับการบันทึกแล้ว",    progress: 20  };
}

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

function StatusTimeline({
  submittedAt,
  doneUpTo = 0,
  compact = false,
  stepTimestamps,
  currentStepRef,
}: {
  submittedAt: string;
  doneUpTo?: number;
  compact?: boolean;
  stepTimestamps?: (string | null)[];
  currentStepRef?: React.RefObject<HTMLDivElement | null>;
}) {
  function tsFor(i: number): { date: string; time: string } | null {
    const raw = stepTimestamps?.[i] ?? (i === 0 ? submittedAt : null);
    if (!raw) return null;
    return formatThaiDateTime(raw);
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        {TIMELINE_STEPS.map((label, i) => {
          const done = i <= doneUpTo;
          const current = i === doneUpTo + 1;
          const ts = done ? tsFor(i) : null;
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="rounded-full border-2 flex items-center justify-center"
                  style={{
                    width: 20, height: 20,
                    background: done ? "#B8860B" : "#fff",
                    borderColor: done ? "#B8860B" : current ? "#B8860B" : "#D1D5DB",
                    boxShadow: current ? "0 0 0 3px rgba(184,134,11,0.15)" : "none",
                  }}
                >
                  {done
                    ? <Check size={10} strokeWidth={3} color="#fff" />
                    : <span style={{ fontSize: 9, fontWeight: 700, color: current ? "#B8860B" : "#9CA3AF" }}>{i + 1}</span>}
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className="w-px mt-0.5" style={{ height: 10, background: done ? "#B8860B" : "#E5E7EB" }} />
                )}
              </div>
              <div style={{ paddingTop: 1 }}>
                <p style={{ fontSize: 11, fontWeight: done || current ? 600 : 500, color: done ? "#B8860B" : current ? "#374151" : "#9CA3AF" }}>
                  {label}
                </p>
                {ts && (
                  <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}>
                    {ts.date}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start">
        {TIMELINE_STEPS.map((label, i) => {
          const done = i <= doneUpTo;
          const current = i === doneUpTo + 1;
          const ts = done ? tsFor(i) : null;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <div className="flex-1 h-0.5 mt-4 mx-1" style={{ background: i <= doneUpTo ? "#B8860B" : "#E5E7EB" }} />
              )}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 80 }}>
                <div
                  className="rounded-full border-2 flex items-center justify-center"
                  style={{
                    width: 32, height: 32,
                    background: done ? "#B8860B" : "#fff",
                    borderColor: done || current ? "#B8860B" : "#D1D5DB",
                    boxShadow: current ? "0 0 0 4px rgba(184,134,11,0.18)" : "none",
                    transition: "all 220ms",
                  }}
                >
                  {done
                    ? <Check size={14} strokeWidth={3} color="#fff" />
                    : <span style={{ fontSize: 12, fontWeight: 700, color: current ? "#B8860B" : "#9CA3AF" }}>{i + 1}</span>}
                </div>
                <p className="text-center mt-2 leading-snug" style={{ fontSize: 11, fontWeight: done || current ? 600 : 500, color: done ? "#B8860B" : current ? "#374151" : "#9CA3AF" }}>
                  {label}
                </p>
                {ts && (
                  <p className="text-center mt-1 leading-tight" style={{ fontSize: 10, color: "#9CA3AF" }}>
                    {ts.date}<br />{ts.time} น.
                  </p>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="md:hidden flex flex-col gap-2.5">
        {TIMELINE_STEPS.map((label, i) => {
          const done = i <= doneUpTo;
          const current = i === doneUpTo + 1;
          const ts = done ? tsFor(i) : null;
          return (
            <div key={i} ref={current ? currentStepRef : undefined} className="flex items-start gap-2.5">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="rounded-full border-2 flex items-center justify-center"
                  style={{
                    width: 28, height: 28,
                    background: done ? "#B8860B" : "#fff",
                    borderColor: done || current ? "#B8860B" : "#D1D5DB",
                    boxShadow: current ? "0 0 0 3px rgba(184,134,11,0.18)" : "none",
                  }}
                >
                  {done
                    ? <Check size={12} strokeWidth={3} color="#fff" />
                    : <span style={{ fontSize: 11, fontWeight: 700, color: current ? "#B8860B" : "#9CA3AF" }}>{i + 1}</span>}
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className="w-px mt-1" style={{ height: 16, background: done ? "#B8860B" : "#E5E7EB" }} />
                )}
              </div>
              <div style={{ paddingTop: 4 }}>
                <p className="text-xs font-semibold leading-snug" style={{ color: done ? "#B8860B" : current ? "#374151" : "#9CA3AF" }}>
                  {label}
                </p>
                {ts && (
                  <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                    {ts.date} · {ts.time} น.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ContactCard() {
  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
      <div className="flex items-start gap-3 mb-4">
        <Shield size={16} style={{ color: "#B8860B", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p className="text-sm font-bold text-black">มีคำถามหรือต้องการแก้ไขข้อมูล?</p>
          <p className="text-xs mt-0.5 leading-snug" style={{ color: "#6B7280" }}>
            ทีมงานพร้อมให้บริการทุกวัน 9.00 – 21.00 น.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <a href="https://line.me/R/ti/p/@khaiphone" target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "#06C755" }}>
          <IconLine className="w-4 h-4" />
          ติดต่อผ่าน LINE
        </a>
        <a href="tel:0955535167"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ border: "1px solid #E5E7EB", background: "#fff" }}>
          <Phone size={14} />
          โทรหาเรา 095-553-5167
        </a>
      </div>
    </div>
  );
}

// ── Inner page (uses useSearchParams) ─────────────────────────────────────────

function RequestDetailInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const phoneParam = searchParams.get("phone") ?? "";

  const currentStepRef = useRef<HTMLDivElement | null>(null);
  const prevDoneUpTo   = useRef(-1);

  const [sub, setSub] = useState<SubmissionData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "unauthorized" | "notfound">("loading");
  const [doneUpTo, setDoneUpTo] = useState(0);
  const [customerNotes, setCustomerNotes] = useState<Array<{ text: string; createdAt: string }>>([]);
  const [stepTimestamps, setStepTimestamps] = useState<(string | null)[]>([null, null, null, null, null, null, null]);
  const [requestDbId,   setRequestDbId]   = useState<string | null>(null);
  const [inspection,    setInspection]    = useState<InspectionData | null>(null);
  const [dbStatus,      setDbStatus]      = useState<string>("");
  const [negotiating,   setNegotiating]   = useState<"idle" | "saving" | "error">("idle");

  async function loadFromDb() {
    if (!id || !phoneParam) return false;
    try {
      const dbReq = await fetchRequestByOrderNumber(id, phoneParam);
      if (!dbReq) return false;
      const fromDb: SubmissionData = {
        orderNumber: dbReq.orderNumber,
        submittedAt: dbReq.createdAt,
        model: dbReq.device.model,
        storage: dbReq.device.storage,
        condition: dbReq.device.condition,
        color: dbReq.device.color,
        conditionDetails: dbReq.device.conditionDetails,
        selections: dbReq.device.selections ?? {},
        estimatedPrice: dbReq.device.estimatedPrice,
        priceMin: 0,
        priceMax: 0,
        extraDevices: dbReq.extraDevices ?? [],
        customer: { name: dbReq.customer.name, phone: dbReq.customer.phone, email: dbReq.customer.email },
        appointment: {
          method: dbReq.appointment.method as "branch" | "rider" | "parcel",
          date: dbReq.appointment.date,
          time: dbReq.appointment.time,
          location: dbReq.appointment.location,
        },
        payment: {
          method: dbReq.payment.method as "cash" | "transfer",
          bankName: dbReq.payment.bankName,
          accountName: dbReq.payment.accountName,
          accountNumber: dbReq.payment.accountNumber,
          slipUrl: dbReq.payment.slipUrl,
          contractSignedAt: dbReq.payment.contractSignedAt,
        },
        contractUrl: dbReq.contractUrl,
        receiptUrl:  dbReq.receiptUrl,
      };
      setRequestDbId(dbReq.id);
      setSub(fromDb);
      // สำหรับ cancelled/rejected ใช้ step ล่าสุดก่อนยกเลิกใน timeline (ไม่ใช่ 0)
      const isTerminal = dbReq.status === "cancelled" || dbReq.status === "rejected";
      if (isTerminal) {
        const lastMeaningfulLog = [...dbReq.statusLog]
          .filter(l => l.status !== "cancelled" && l.status !== "rejected")
          .at(-1);
        setDoneUpTo(lastMeaningfulLog ? statusToDoneUpTo(lastMeaningfulLog.status) : 0);
      } else {
        setDoneUpTo(statusToDoneUpTo(dbReq.status));
      }
      setCustomerNotes(dbReq.notes.filter(n => n.showToCustomer).map(n => ({ text: n.text, createdAt: n.createdAt })));
      setInspection(dbReq.inspection ?? null);
      setDbStatus(dbReq.status);
      // ล้าง localStorage เมื่อธุรกรรมเสร็จสิ้น หรือถูกยกเลิก/ไม่เข้าเงื่อนไข ทำให้ "ดูสถานะ" chip หายไป
      if (dbReq.status === "completed" || dbReq.status === "cancelled" || dbReq.status === "rejected") {
        try { localStorage.removeItem("khaiphone_submission"); } catch {}
      }
      const statusToStep: Record<string, number> = { pending: 1, inspecting: 2, confirmed: 3, pickup_scheduled: 3, price_negotiation: 4, contracting: 5, completed: 6 };
      const ts: (string | null)[] = [dbReq.createdAt, null, null, null, null, null, null];
      dbReq.statusLog.forEach(log => {
        const step = statusToStep[log.status];
        if (step !== undefined) ts[step] = log.timestamp;
      });
      // ถ้าตรวจแล้วราคาตรง (ข้าม price_negotiation) ให้ step 4 ใช้ timestamp เดียวกับ contracting
      if (!ts[4] && ts[5]) ts[4] = ts[5];
      setStepTimestamps(ts);
      setState("ok");
      return true;
    } catch { return false; }
  }

  useEffect(() => {
    async function load() {
      const ok = await loadFromDb();
      if (ok) return;

      // fall back to localStorage
      try {
        const raw = localStorage.getItem("khaiphone_submission");
        if (!raw) { setState("notfound"); return; }
        const parsed: SubmissionData = JSON.parse(raw);
        if (parsed.orderNumber !== id) { setState("notfound"); return; }
        if (!phoneParam || normalizePhone(parsed.customer.phone) !== normalizePhone(phoneParam)) {
          setState("unauthorized");
          return;
        }
        if (!parsed.extraDevices) parsed.extraDevices = [];
        setSub(parsed);
        setDoneUpTo(0);
        setState("ok");
      } catch {
        setState("notfound");
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, phoneParam]);

  // Realtime subscription — อัพเดตทันทีเมื่อ admin เปลี่ยนสถานะ
  useEffect(() => {
    if (prevDoneUpTo.current === -1) { prevDoneUpTo.current = doneUpTo; return; }
    if (doneUpTo === prevDoneUpTo.current) return;
    prevDoneUpTo.current = doneUpTo;
    setTimeout(() => {
      currentStepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }, [doneUpTo]);

  useEffect(() => {
    if (state !== "ok" || !sub) return;

    // Broadcast channel (bypasses RLS — triggered by server actions)
    const broadcastCh = supabase
      .channel("request-updates")
      .on("broadcast", { event: "updated" }, (payload) => {
        if (requestDbId && payload.payload?.id !== requestDbId) return;
        loadFromDb();
      })
      .subscribe();

    // postgres_changes fallback (works if RLS allows it)
    const pgCh = supabase
      .channel(`request-pg-${sub.orderNumber}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.new?.order_number !== sub.orderNumber) return;
          loadFromDb();
        },
      )
      .subscribe();

    // Fallback: รีเฟรชเมื่อกลับมาที่แท็บ (กรณี WebSocket หลุด)
    const onVisible = () => { if (document.visibilityState === "visible") loadFromDb(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(broadcastCh);
      supabase.removeChannel(pgCh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, sub?.orderNumber, requestDbId]);

  async function handleCustomerNegotiation(accepted: boolean) {
    if (!sub) return;
    setNegotiating("saving");
    const result = await customerRespondToNegotiation(sub.orderNumber, sub.customer.phone, accepted);
    if (result.success) {
      await loadFromDb();
      setNegotiating("idle");
    } else {
      setNegotiating("error");
    }
  }

  // Redirect after a short delay so user can read the message
  useEffect(() => {
    if (state === "notfound") {
      const t = setTimeout(() => router.replace("/track"), 1200);
      return () => clearTimeout(t);
    }
    if (state === "unauthorized") {
      const t = setTimeout(() => router.replace("/track?error=invalid"), 1200);
      return () => clearTimeout(t);
    }
  }, [state, router]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f9f9f7" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "#B8860B" }} />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────
  if (state === "notfound") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f9f9f7" }}>
        <div className="text-center px-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(156,163,175,0.15)" }}>
            <Shield size={22} style={{ color: "#9CA3AF" }} />
          </div>
          <p className="font-semibold text-black mb-1">ไม่พบข้อมูลคำขอ</p>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>กำลังนำคุณไปหน้าค้นหา...</p>
        </div>
      </div>
    );
  }

  // ── Unauthorized ─────────────────────────────────────────────────────────
  if (state === "unauthorized") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f9f9f7" }}>
        <div className="text-center px-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(239,68,68,0.1)" }}>
            <Shield size={22} style={{ color: "#EF4444" }} />
          </div>
          <p className="font-semibold text-black mb-1">ไม่มีสิทธิ์เข้าถึง</p>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>กำลังนำคุณกลับ...</p>
        </div>
      </div>
    );
  }

  if (!sub) return null;

  // ── Derived values ───────────────────────────────────────────────────────
  const methodLabel =
    sub.appointment.method === "branch" ? "นัดหมายหน้าสาขา"
    : sub.appointment.method === "rider" ? "รับถึงที่บ้าน (Rider)"
    : "ส่งพัสดุมาที่ร้าน";

  const MethodIcon =
    sub.appointment.method === "branch" ? Store
    : sub.appointment.method === "rider" ? Truck
    : Package;

  const priceRangeLabel =
    sub.priceMin && sub.priceMax
      ? `${sub.priceMin.toLocaleString("th-TH")} – ${sub.priceMax.toLocaleString("th-TH")} บาท`
      : "";

  const hero: HeroConfig =
    dbStatus === "cancelled"
      ? { badge: "ยกเลิกการขาย",   badgeBg: "rgba(156,163,175,0.15)", badgeColor: "#9CA3AF", badgeBorder: "rgba(156,163,175,0.3)", title: "คำขอถูกยกเลิกแล้ว",          progress: 0 }
    : dbStatus === "rejected"
      ? { badge: "ไม่เข้าเงื่อนไข", badgeBg: "rgba(239,68,68,0.12)",  badgeColor: "#F87171", badgeBorder: "rgba(239,68,68,0.25)",  title: "ไม่ผ่านเงื่อนไขการรับซื้อ",  progress: 0 }
    : getHeroConfig(doneUpTo);

  const selectionEntries = Object.entries(sub.selections ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => ({ label: SELECTION_LABELS[k] ?? k, value: v }));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white pb-24 md:pb-0">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* ── Left / main ─────────────────────────────────────────── */}
          <div className="w-full md:flex-1 min-w-0 flex flex-col gap-5">

            {/* Hero */}
            <div className="rounded-2xl p-6 md:p-8 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #111 0%, #222 100%)" }}>
              {[
                { right: "8%", top: "12%" }, { right: "20%", top: "30%" }, { right: "6%", bottom: "20%" },
              ].map((pos, i) => (
                <div key={i} className="absolute w-2 h-2 rounded-full pointer-events-none" style={{ ...pos, background: "#B8860B", opacity: 0.25 + i * 0.12 }} />
              ))}

              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-3"
                    style={{ background: hero.badgeBg, color: hero.badgeColor, border: `1px solid ${hero.badgeBorder}` }}>
                    {hero.badge}
                  </span>
                  <h1 className="text-xl md:text-2xl font-bold text-white leading-snug">
                    {hero.title}
                  </h1>
                  <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>#{sub.orderNumber}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {sub.extraDevices?.length > 0 ? `ราคารวม ${sub.extraDevices.length + 1} เครื่อง` : "ราคาประเมิน"}
                  </p>
                  <p className="text-2xl md:text-3xl font-bold" style={{ color: "#F0C040" }}>
                    ฿{(sub.estimatedPrice + (sub.extraDevices ?? []).reduce((s, d) => s + d.estimatedPrice, 0)).toLocaleString("th-TH")}
                  </p>
                  {priceRangeLabel && !sub.extraDevices?.length && (
                    <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{priceRangeLabel}</p>
                  )}
                </div>
              </div>

              {dbStatus !== "cancelled" && dbStatus !== "rejected" && <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>ความคืบหน้า</span>
                  <span className="text-xs font-semibold" style={{ color: "#F0C040" }}>{hero.progress}%</span>
                </div>
                <div className="w-full rounded-full" style={{ height: 6, background: "rgba(255,255,255,0.1)" }}>
                  <div className="rounded-full" style={{ height: 6, width: `${hero.progress}%`, background: "linear-gradient(90deg, #B8860B, #F0C040)", transition: "width 600ms ease" }} />
                </div>
              </div>}
            </div>

            {/* Timeline */}
            <div className="rounded-2xl p-5 md:p-6" style={{ border: "1px solid #E5E7EB" }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-black text-base">สถานะคำขอ</h2>
                <button onClick={() => window.location.reload()}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{ border: "1px solid #E5E7EB", color: "#6B7280", background: "#fff", cursor: "pointer" }}>
                  <RefreshCw size={12} />
                  รีเฟรช
                </button>
              </div>
              <StatusTimeline submittedAt={sub.submittedAt} doneUpTo={doneUpTo} stepTimestamps={stepTimestamps} currentStepRef={currentStepRef} />
            </div>

            {/* Notice: cancelled or rejected */}
            {(dbStatus === "cancelled" || dbStatus === "rejected") && (
              <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#FEE2E2" }}>
                  <X size={16} style={{ color: "#EF4444" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#DC2626" }}>
                    {dbStatus === "cancelled" ? "คำขอนี้ถูกยกเลิกแล้ว" : "อุปกรณ์ไม่ผ่านเงื่อนไขการรับซื้อ"}
                  </p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "#B91C1C" }}>
                    {dbStatus === "cancelled"
                      ? "หากต้องการขายอุปกรณ์ สามารถยื่นคำขอใหม่ได้ที่หน้าประเมินราคา หรือติดต่อทีมงานเพื่อสอบถามเพิ่มเติม"
                      : "อุปกรณ์ไม่ผ่านเกณฑ์การตรวจสอบ หากมีข้อสงสัยกรุณาติดต่อทีมงาน"}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <a href="/sell" className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: "#B8860B" }}>
                      ประเมินราคาใหม่
                    </a>
                    <a href="tel:0955535167" className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA" }}>
                      โทรติดต่อเรา
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Notice: wait for staff call (new / pending) */}
            {doneUpTo <= 1 && dbStatus !== "cancelled" && dbStatus !== "rejected" && (
              <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#DBEAFE" }}>
                  <Phone size={15} style={{ color: "#2563EB" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#1D4ED8" }}>รอรับสายเจ้าหน้าที่</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#3B82F6" }}>
                    ทีมงานจะโทรติดต่อเพื่อยืนยันข้อมูลและนัดหมายภายใน 24 ชั่วโมง กรุณาเปิดรับสายจากเบอร์ที่ไม่รู้จัก
                  </p>
                </div>
              </div>
            )}

            {/* Notice: prepare ID card (confirmed / inspecting) */}
            {doneUpTo >= 2 && doneUpTo < 4 && dbStatus !== "rejected" && dbStatus !== "cancelled" && (
              <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#FEF3C7" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 9h2M16 12h2M16 15h2M7 9h5M7 12h3"/>
                    <circle cx="9" cy="9" r="2"/><path d="M7 15c0-1.1.9-2 2-2s2 .9 2 2"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#92400E" }}>เตรียมบัตรประชาชนหรือสำเนาไว้ด้วย</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#B45309" }}>
                    จำเป็นต้องใช้เพื่อจัดทำสัญญาซื้อขายและออกใบรับเงิน กรุณานำบัตรประชาชนตัวจริงมาด้วยในวันนัดหมาย
                  </p>
                </div>
              </div>
            )}

            {/* Notice: staff arrived (arrivedAt set, but inspection not done yet) */}
            {inspection?.arrivedAt && !inspection.result && (
              <div className="rounded-2xl px-5 py-4 flex items-start gap-3" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#BBF7D0" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#065F46" }}>เจ้าหน้าที่เดินทางมาถึงแล้ว</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#059669" }}>
                    ถึงเมื่อ {formatThaiDateTime(inspection.arrivedAt).time} น. · กำลังดำเนินการตรวจสอบเครื่อง
                  </p>
                </div>
              </div>
            )}

            {/* Staff notes visible to customer */}
            {customerNotes.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #FDE68A" }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #FDE68A", background: "#FFFBEB" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.12)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h2 className="font-bold text-sm" style={{ color: "#92400E" }}>ข้อความจากทีมงาน</h2>
                </div>
                <div className="p-5 flex flex-col gap-3" style={{ background: "#FFFBEB" }}>
                  {customerNotes.map((n, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid #FDE68A" }}>
                      <p className="text-sm leading-relaxed" style={{ color: "#1F2937" }}>{n.text}</p>
                      <p className="text-xs mt-2" style={{ color: "#9CA3AF" }}>
                        {formatThaiDateTime(n.createdAt).date} · {formatThaiDateTime(n.createdAt).time} น.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price negotiation banner */}
            {dbStatus === "price_negotiation" && inspection && !inspection.negotiationResponse && (() => {
              const extraOrigTotal = (inspection.extraInspections ?? []).reduce((s, e) => s + e.originalPrice, 0);
              const extraActualTotal = (inspection.extraInspections ?? []).reduce((s, e) => s + e.actualPrice, 0);
              const totalOrig   = inspection.originalPrice + extraOrigTotal;
              const totalActual = inspection.actualPrice   + extraActualTotal;
              const deviceCount = 1 + (inspection.extraInspections?.length ?? 0);
              return (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #FDE68A", background: "#FFFBEB" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid #FDE68A" }}>
                  <p className="font-bold text-sm mb-0.5" style={{ color: "#92400E" }}>⚠️ เจ้าหน้าที่เสนอราคาใหม่</p>
                  <p className="text-xs" style={{ color: "#78350F" }}>กรุณายืนยันหรือปฏิเสธราคาที่เสนอด้านล่าง</p>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between py-2 mb-1">
                    <span className="text-sm" style={{ color: "#9CA3AF" }}>{deviceCount > 1 ? `ราคาเดิมรวม ${deviceCount} เครื่อง` : "ราคาเดิม"}</span>
                    <span className="text-sm line-through" style={{ color: "#9CA3AF" }}>฿{totalOrig.toLocaleString("th-TH")}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 mb-2" style={{ borderTop: "1px solid #FDE68A" }}>
                    <span className="text-sm font-semibold" style={{ color: "#92400E" }}>{deviceCount > 1 ? `ราคาใหม่รวม ${deviceCount} เครื่อง` : "ราคาใหม่ที่เสนอ"}</span>
                    <span className="text-xl font-bold" style={{ color: "#B8860B" }}>฿{totalActual.toLocaleString("th-TH")}</span>
                  </div>
                  {inspection.priceReason && (
                    <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ color: "#78350F", background: "#FEF3C7" }}>
                      เหตุผล: {inspection.priceReason}
                    </p>
                  )}
                  {negotiating === "error" && (
                    <p className="text-xs mb-3 text-center" style={{ color: "#DC2626" }}>เกิดข้อผิดพลาด กรุณาลองใหม่</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleCustomerNegotiation(false)}
                      disabled={negotiating === "saving"}
                      className="flex-1 rounded-xl py-3 font-semibold text-sm"
                      style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", cursor: "pointer", opacity: negotiating === "saving" ? 0.6 : 1 }}
                    >
                      ปฏิเสธ
                    </button>
                    <button
                      onClick={() => handleCustomerNegotiation(true)}
                      disabled={negotiating === "saving"}
                      className="flex-1 rounded-xl py-3 font-bold text-sm text-white"
                      style={{ background: "#B8860B", border: "none", cursor: "pointer", opacity: negotiating === "saving" ? 0.6 : 1 }}
                    >
                      {negotiating === "saving" ? "กำลังบันทึก..." : "ยืนยันราคาใหม่"}
                    </button>
                  </div>
                </div>
              </div>
              );
            })()}

            {/* Inspection results — only when full inspection saved (result field exists) */}
            {inspection?.result && (dbStatus === "completed" || dbStatus === "contracting" || dbStatus === "price_negotiation" || dbStatus === "confirmed" || dbStatus === "rejected" || dbStatus === "cancelled") && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h2 className="font-bold text-black text-sm">ผลการตรวจสภาพเครื่อง</h2>
                    {inspection.arrivedAt && (
                      <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                        เจ้าหน้าที่ถึง {formatThaiDateTime(inspection.arrivedAt).time} น.
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      background: inspection.result === "matched" ? "#D1FAE5" : inspection.result === "adjusted" ? "#FEF3C7" : "#FEE2E2",
                      color:      inspection.result === "matched" ? "#065F46"  : inspection.result === "adjusted" ? "#92400E"  : "#991B1B",
                    }}>
                    {inspection.result === "matched" ? "✅ ตรงตามที่แจ้ง" : inspection.result === "adjusted" ? "⚠️ ปรับราคา" : "❌ ไม่ผ่าน"}
                  </span>
                </div>

                <div className="p-5">
                  {/* Criteria comparison */}
                  {(inspection.criteria ?? []).length > 0 && (
                    <div className="mb-4">
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
                        <div className="grid grid-cols-3 px-3 py-2" style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                          <span className="text-xs font-semibold" style={{ color: "#6B7280" }}>รายการ</span>
                          <span className="text-xs font-semibold" style={{ color: "#6B7280" }}>ที่แจ้ง</span>
                          <span className="text-xs font-semibold" style={{ color: "#6B7280" }}>ตรวจจริง</span>
                        </div>
                        {(inspection.criteria ?? []).map((c, i) => {
                          const mismatch = !c.pass || c.stated.trim().toLowerCase() !== c.actual.trim().toLowerCase();
                          return (
                            <div key={i} className="grid grid-cols-3 px-3 py-2.5 items-center" style={{ borderBottom: i < (inspection.criteria ?? []).length - 1 ? "1px solid #F3F4F6" : "none", background: mismatch ? "#FFF8F8" : "transparent" }}>
                              <span className="text-xs font-semibold text-black">{c.label}</span>
                              <span className="text-xs" style={{ color: mismatch ? "#9CA3AF" : "#6B7280", textDecoration: mismatch ? "line-through" : "none" }}>{c.stated || "—"}</span>
                              <span className="text-xs font-bold flex items-center gap-1" style={{ color: mismatch ? "#DC2626" : "#059669" }}>
                                {mismatch && <span style={{ fontSize: 10 }}>⚠</span>}
                                {c.actual || "—"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Issues */}
                  {(inspection.issues ?? []).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold mb-2" style={{ color: "#374151" }}>ปัญหาที่พบ</p>
                      <div className="flex flex-col gap-1.5">
                        {inspection.issues.map((issue, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: "#FEF2F2", color: "#991B1B" }}>
                            <span>⚠️</span> {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos */}
                  {(inspection.photos ?? []).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold mb-2" style={{ color: "#374151" }}>รูปภาพหลักฐาน</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(inspection.photos ?? []).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={i} src={url} alt="" className="w-full rounded-lg object-cover" style={{ aspectRatio: "1", border: "1px solid #E5E7EB" }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price summary */}
                  {(() => {
                    const extraOrigTotal   = (inspection.extraInspections ?? []).reduce((s, e) => s + e.originalPrice, 0);
                    const extraActualTotal = (inspection.extraInspections ?? []).reduce((s, e) => s + e.actualPrice,   0);
                    const totalOrig   = inspection.originalPrice + extraOrigTotal;
                    const totalActual = inspection.actualPrice   + extraActualTotal;
                    return (
                    <div className="rounded-xl p-3" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                      {inspection.result !== "matched" && (
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs" style={{ color: "#9CA3AF" }}>ราคาเดิม</span>
                          <span className="text-xs line-through" style={{ color: "#9CA3AF" }}>฿{totalOrig.toLocaleString("th-TH")}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold" style={{ color: "#374151" }}>ราคาที่ตกลง</span>
                        <span className="text-lg font-bold" style={{ color: "#B8860B" }}>฿{totalActual.toLocaleString("th-TH")}</span>
                      </div>
                      {inspection.priceReason && (
                        <p className="text-xs mt-1.5" style={{ color: "#9CA3AF" }}>{inspection.priceReason}</p>
                      )}
                    </div>
                    );
                  })()}

                  {/* Negotiation result */}
                  {inspection.negotiationResponse && (
                    <div className="mt-3 px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{
                        background: inspection.negotiationResponse === "accepted" ? "#D1FAE5" : "#FEE2E2",
                        color:      inspection.negotiationResponse === "accepted" ? "#065F46" : "#991B1B",
                      }}>
                      {inspection.negotiationResponse === "accepted" ? "✅ ยืนยันราคาใหม่แล้ว" : "❌ ปฏิเสธราคา — ธุรกรรมถูกยกเลิก"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Completed: document links — always show when documents are ready */}
            {dbStatus === "completed" && (sub.contractUrl || sub.receiptUrl) && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid rgba(201,168,76,0.4)", background: "linear-gradient(135deg,#1a1a2e 0%,#2a2a4e 100%)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.15)" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#FFD700" }}>เอกสารของคุณพร้อมแล้ว</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>กดเพื่อเปิดหรือบันทึกเอกสาร</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  {sub.contractUrl && (
                    <a
                      href={`/api/contract?order=${encodeURIComponent(sub.orderNumber)}&phone=${encodeURIComponent(phoneParam)}&type=contract`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                        borderRadius: 12, textDecoration: "none",
                        background: "#c9a84c", color: "#1a1a2e",
                      }}
                    >
                      <div style={{ width: 36, height: 36, background: "rgba(26,26,46,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>สัญญาซื้อขาย</p>
                        <p style={{ fontSize: 11, color: "rgba(26,26,46,0.6)", margin: 0, marginTop: 1 }}>กดเพื่อดูหรือพิมพ์</p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, opacity: 0.5, flexShrink: 0 }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  )}
                  {sub.receiptUrl && (
                    <a
                      href={`/api/contract?order=${encodeURIComponent(sub.orderNumber)}&phone=${encodeURIComponent(phoneParam)}&type=receipt`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                        borderRadius: 12, textDecoration: "none",
                        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff",
                      }}
                    >
                      <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.1)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
                          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>ใบสำคัญรับเงิน</p>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0, marginTop: 1 }}>กดเพื่อดูหรือพิมพ์</p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, flexShrink: 0 }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Completed: contract signed date + payment slip */}
            {dbStatus === "completed" && (sub.payment.contractSignedAt || sub.payment.slipUrl) && (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
                <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  </div>
                  <h2 className="font-bold text-black text-sm">สัญญาและการชำระเงิน</h2>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  {sub.payment.contractSignedAt && (
                    <div className="flex items-center gap-3 py-3 px-4 rounded-xl" style={{ background: "#FAFAFA", border: "1px solid #E5E7EB" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#F0F0F0" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-black">เซ็นสัญญาซื้อขายแล้ว</p>
                        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                          {formatThaiDateTime(sub.payment.contractSignedAt).date} · {formatThaiDateTime(sub.payment.contractSignedAt).time} น.
                        </p>
                      </div>
                    </div>
                  )}
                  {sub.payment.slipUrl && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "#374151" }}>
                        {sub.payment.method === "cash" ? "✅ รับเงินสดแล้ว" : "✅ โอนเงินสำเร็จ"}
                        {sub.payment.bankName ? ` · ${sub.payment.bankName}` : ""}
                      </p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sub.payment.slipUrl}
                        alt="สลิปโอนเงิน"
                        className="w-full rounded-xl object-contain"
                        style={{ maxHeight: 400, border: "1px solid #E5E7EB", background: "#fff" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Device card */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" />
                  </svg>
                </div>
                <h2 className="font-bold text-black text-sm">
                  {sub.extraDevices?.length > 0 ? `สินค้าในรายการ (${sub.extraDevices.length + 1} เครื่อง)` : "ข้อมูลเครื่อง"}
                </h2>
              </div>

              <div className="p-5 flex flex-col gap-3">
                {/* Primary device */}
                <div className="rounded-xl overflow-hidden" style={{ border: sub.extraDevices?.length > 0 ? "1.5px solid rgba(184,134,11,0.4)" : "1px solid #E5E7EB" }}>
                  <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: selectionEntries.length > 0 ? "1px solid #F3F4F6" : "none", background: sub.extraDevices?.length > 0 ? "rgba(184,134,11,0.04)" : "#fff" }}>
                    <div className="rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden" style={{ width: 48, height: 48, background: "#F5F5F7" }}>
                      {getProductImage(sub.model)
                        ? <img src={getProductImage(sub.model)!} alt={sub.model} className="w-full h-full object-contain p-1" />
                        : <IconApple style={{ width: 28, height: 28, color: "#ccc" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-black text-sm leading-snug">{sub.model}</p>
                        {sub.extraDevices?.length > 0 && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: "rgba(184,134,11,0.15)", color: "#B8860B" }}>หลัก</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                        {[sub.storage, sub.color, sub.condition].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="font-bold text-sm flex-shrink-0" style={{ color: "#B8860B" }}>฿{sub.estimatedPrice.toLocaleString("th-TH")}</span>
                  </div>
                  {selectionEntries.map(({ label, value }, i) => (
                    <div key={i} className="flex justify-between px-4 py-2 items-center"
                      style={{ borderBottom: i < selectionEntries.length - 1 ? "1px solid #F9FAFB" : "none", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                      <span className="text-xs" style={{ color: "#9CA3AF" }}>{label}</span>
                      <span className="text-xs font-semibold text-black text-right max-w-[60%]">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Extra devices */}
                {(sub.extraDevices ?? []).map((extra, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
                    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: extra.details?.length > 0 ? "1px solid #F3F4F6" : "none" }}>
                      <div>
                        <p className="font-bold text-black text-sm">{extra.model}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{extra.storage}</p>
                      </div>
                      <span className="font-bold text-sm" style={{ color: "#374151" }}>฿{extra.estimatedPrice.toLocaleString("th-TH")}</span>
                    </div>
                    {(extra.details ?? []).map((d, i) => (
                      <div key={i} className="flex justify-between px-4 py-2 items-center"
                        style={{ borderBottom: i < extra.details.length - 1 ? "1px solid #F9FAFB" : "none", background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>{d.title}</span>
                        <span className="text-xs font-semibold text-black text-right">{d.value}</span>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Total row (multi-device) */}
                {sub.extraDevices?.length > 0 ? (
                  <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: "#111" }}>
                    <span className="text-sm font-semibold text-white">ราคารวม {sub.extraDevices.length + 1} เครื่อง</span>
                    <span className="text-lg font-bold" style={{ color: "#F0C040" }}>
                      ฿{(sub.estimatedPrice + sub.extraDevices.reduce((s, d) => s + d.estimatedPrice, 0)).toLocaleString("th-TH")}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: "#FAFAF8", border: "1px solid #E5E7EB" }}>
                      <span className="text-sm" style={{ color: "#6B7280" }}>ราคาประเมิน</span>
                      <span className="text-lg font-bold" style={{ color: "#B8860B" }}>฿{sub.estimatedPrice.toLocaleString("th-TH")}</span>
                    </div>
                    {priceRangeLabel && (
                      <p className="text-xs text-center" style={{ color: "#9CA3AF" }}>ช่วงราคา: {priceRangeLabel}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Appointment card */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                  <Calendar size={16} style={{ color: "#B8860B" }} />
                </div>
                <h2 className="font-bold text-black text-sm">นัดหมาย</h2>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {[
                  { icon: Calendar,   label: "วันที่",   value: formatThaiDate(sub.appointment.date) },
                  { icon: Clock,      label: "เวลา",     value: `${sub.appointment.time} น.` },
                  { icon: MapPin,     label: "สถานที่",  value: sub.appointment.location || "—" },
                  { icon: MethodIcon, label: "ช่องทาง", value: methodLabel },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon size={16} style={{ color: "#B8860B", flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <p className="text-xs" style={{ color: "#9CA3AF" }}>{label}</p>
                      <p className="text-sm font-semibold text-black leading-snug">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment card */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.1)" }}>
                  <Banknote size={16} style={{ color: "#B8860B" }} />
                </div>
                <h2 className="font-bold text-black text-sm">ช่องทางรับเงิน</h2>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(184,134,11,0.08)" }}>
                    <Banknote size={20} style={{ color: "#B8860B" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-black">{sub.payment.method === "cash" ? "เงินสด" : "โอนเข้าบัญชี"}</p>
                    {sub.payment.method === "transfer" && sub.payment.bankName && (
                      <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{sub.payment.bankName}</p>
                    )}
                  </div>
                </div>
                {sub.payment.method === "transfer" && sub.payment.accountName && (
                  <div className="flex items-center justify-between py-2.5 px-4 rounded-xl" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                    <div>
                      <p className="text-xs" style={{ color: "#9CA3AF" }}>ชื่อบัญชี</p>
                      <p className="text-sm font-semibold text-black">{sub.payment.accountName}</p>
                    </div>
                    {sub.payment.accountNumber && (
                      <div className="text-right">
                        <p className="text-xs" style={{ color: "#9CA3AF" }}>เลขบัญชี</p>
                        <p className="text-sm font-bold" style={{ color: "#374151", fontFamily: "monospace" }}>
                          {maskAccount(sub.payment.accountNumber)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contact */}
            <ContactCard />

          </div>

          {/* ── Right panel (Desktop only) ────────────────────────── */}
          <div className="hidden md:flex flex-col gap-4 flex-shrink-0 self-start sticky" style={{ width: 300, top: 24 }}>

            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              {/* Dark header */}
              <div className="px-4 py-4" style={{ background: "linear-gradient(135deg, #111, #222)", borderRadius: "16px 16px 0 0" }}>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-2"
                  style={{ background: hero.badgeBg, color: hero.badgeColor, border: `1px solid ${hero.badgeBorder}` }}>
                  {hero.badge}
                </span>
                <p className="text-white font-bold text-sm leading-snug">#{sub.orderNumber}</p>
                <p className="text-2xl font-bold mt-1" style={{ color: "#F0C040" }}>
                  ฿{(sub.estimatedPrice + (sub.extraDevices ?? []).reduce((s, d) => s + d.estimatedPrice, 0)).toLocaleString("th-TH")}
                </p>
              </div>

              {/* Compact timeline */}
              <div className="px-4 py-4" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <p className="text-xs font-semibold text-black mb-3">สถานะ</p>
                <StatusTimeline submittedAt={sub.submittedAt} doneUpTo={doneUpTo} compact stepTimestamps={stepTimestamps} />
              </div>

              {/* Appointment */}
              <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <p className="text-xs mb-1" style={{ color: "#9CA3AF" }}>วันนัดหมาย</p>
                <div className="flex items-center gap-2">
                  <Calendar size={14} style={{ color: "#B8860B" }} />
                  <p className="text-sm font-semibold text-black">
                    {formatThaiDate(sub.appointment.date)} · {sub.appointment.time} น.
                  </p>
                </div>
              </div>

              {/* Device */}
              <div className="px-4 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
                <p className="text-xs mb-1" style={{ color: "#9CA3AF" }}>เครื่อง</p>
                <p className="text-sm font-semibold text-black">{sub.model}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{sub.storage} · {sub.condition}</p>
              </div>

              {/* Customer */}
              <div className="px-4 py-3.5">
                <p className="text-xs mb-1" style={{ color: "#9CA3AF" }}>ชื่อผู้ขาย</p>
                <p className="text-sm font-semibold text-black">{sub.customer.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{sub.customer.phone}</p>
              </div>
            </div>

            <ContactCard />
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Default export — wrapped with Suspense for useSearchParams ────────────────

export default function RequestDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f9f9f7" }}>
        <Loader2 size={28} className="animate-spin" style={{ color: "#B8860B" }} />
      </div>
    }>
      <RequestDetailInner />
    </Suspense>
  );
}
