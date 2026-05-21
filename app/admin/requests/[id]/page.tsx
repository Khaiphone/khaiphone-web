"use client";

import { useState, use, useEffect, useRef, forwardRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, Phone, MapPin, Calendar, CreditCard,
  Clock, CheckCircle, Circle, Pencil, Check, X, Copy,
} from "lucide-react";
import {
  fetchRequest, updateStatus, addNote,
  updateAppointment, updatePayment, updatePrice,
  markContractSigned, savePaymentSlip, updateDeviceColor,
  assignRequest,
} from "@/app/actions/admin-requests";
import { fetchAdminUsers, fetchMyRole } from "@/app/actions/admin-users";
import type { AdminUserRow } from "@/app/actions/admin-users";
import { saveInspection, recordArrival, respondToNegotiation } from "@/app/actions/inspection";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import InspectionForm from "../../../components/admin/InspectionForm";
import { STATUS_LABELS } from "@/lib/types/admin";
import type { AdminRequest, RequestStatus, SellMethod, PayMethod } from "@/lib/types/admin";
import StatusBadge from "../../../components/admin/StatusBadge";
import StatusBottomSheet from "../../../components/admin/StatusBottomSheet";

const GOLD   = "var(--admin-gold)";
const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";

const SELL_LABELS: Record<SellMethod, string> = {
  branch: "รับที่สาขา", rider: "ไรเดอร์รับถึงบ้าน", parcel: "ส่งพัสดุ",
};
const PAY_LABELS: Record<PayMethod, string> = { cash: "เงินสด", transfer: "โอนเงิน" };

const CONDITION_COLORS: Record<string, string> = {
  "สภาพดีมาก":   "#065F46",
  "สภาพดี":      "#1E40AF",
  "สภาพพอใช้":   "#92400E",
  "สภาพปานกลาง": "#9A3412",
};

function getDeviceImage(model: string): string {
  const m = model.toLowerCase();
  if (m.includes("17 pro max"))  return "/iPhone-17-pro-max.webp";
  if (m.includes("17 pro"))      return "/iPhone-17-pro-max.webp";
  if (m.includes("17 air"))      return "/iPhone-air.webp";
  if (m.includes("17 plus"))     return "/iPhone-air.webp";
  if (m.includes("17e"))         return "/iPhone-17e.webp";
  if (m.includes("17"))          return "/iPhone-17.webp";
  if (m.includes("16 pro max"))  return "/iPhone-16-pro-max.webp";
  if (m.includes("16 pro"))      return "/iPhone-16-pro-max.webp";
  if (m.includes("16 plus"))     return "/iPhone-16.webp";
  if (m.includes("16"))          return "/iPhone-16.webp";
  if (m.includes("15 pro max"))  return "/iPhone-15-pro-max.webp";
  if (m.includes("15 pro"))      return "/iPhone-15-pro-max.webp";
  if (m.includes("15"))          return "/iPhone-15.webp";
  if (m.includes("14 pro max"))  return "/iPhone-14-pro-max.webp";
  if (m.includes("14 pro"))      return "/iPhone-14-pro-max.webp";
  if (m.includes("14"))          return "/iPhone-14.webp";
  if (m.includes("13 pro max"))  return "/iPhone-13-pro-max.webp";
  if (m.includes("13 pro"))      return "/iPhone-13-pro-max.webp";
  if (m.includes("13"))          return "/iPhone-13.webp";
  if (m.includes("12 pro max"))  return "/iPhone-12-pro-max.webp";
  if (m.includes("12"))          return "/iPhone-12.webp";
  if (m.includes("11 pro max"))  return "/iPhone-11-pro-max.webp";
  if (m.includes("11"))          return "/iPhone-11.webp";
  return "/product-iphone.webp";
}

function fmtDate(d: string) {
  return new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const Card = forwardRef<HTMLDivElement, { children: React.ReactNode }>(function Card({ children }, ref) {
  return (
    <div ref={ref} style={{ background: CARD, borderRadius: "16px", border: `1px solid ${BORDER}`, marginBottom: "10px", overflow: "hidden" }}>
      {children}
    </div>
  );
});
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ color: TEXT3, fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>{children}</p>;
}

const inputSt: React.CSSProperties = {
  width: "100%", background: "#F5F5F7", border: `1px solid ${BORDER}`,
  borderRadius: "10px", padding: "9px 12px", color: TEXT,
  fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box",
  outline: "none", marginBottom: "8px",
};

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const router  = useRouter();

  const [request,    setRequest]    = useState<AdminRequest | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [noteText,   setNoteText]   = useState("");
  const [showToCustomer, setShowToCustomer] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [saving,     setSaving]     = useState<string | null>(null);
  const [saveError,  setSaveError]  = useState<string | null>(null);

  // Editable: price
  const [editPrice,   setEditPrice]   = useState(false);
  const [estPrice,    setEstPrice]    = useState("");
  const [actualPrice, setActualPrice] = useState("");

  // Editable: appointment
  const [editAppt,  setEditAppt]  = useState(false);
  const [apptDraft, setApptDraft] = useState({ date: "", time: "", location: "", method: "branch" as SellMethod });

  // Editable: payment
  const [editPay,  setEditPay]  = useState(false);
  const [payDraft, setPayDraft] = useState({ method: "cash" as PayMethod, bankName: "", accountName: "", accountNumber: "" });

  // Inspection
  const [inspSaving, setInspSaving] = useState(false);
  const [showColorError, setShowColorError] = useState(false);
  const [currentColorDraft, setCurrentColorDraft] = useState("");
  const inspectionRef = useRef<HTMLDivElement>(null);

  // Assignment
  const [staffList,    setStaffList]    = useState<AdminUserRow[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignDraft,  setAssignDraft]  = useState<string>(""); // user_id or ""

  // Contract & slip
  const [slipUploading, setSlipUploading] = useState(false);
  const [linkCopied,    setLinkCopied]    = useState(false);
  const slipFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRequest(id).then(data => {
      setRequest(data);
      if (data) {
        setEstPrice(String(data.device.estimatedPrice));
        setActualPrice(String(data.device.actualPrice ?? ""));
        setApptDraft({ date: data.appointment.date, time: data.appointment.time, location: data.appointment.location, method: data.appointment.method });
        setPayDraft({ method: data.payment.method, bankName: data.payment.bankName ?? "", accountName: data.payment.accountName ?? "", accountNumber: data.payment.accountNumber ?? "" });
        setAssignDraft(data.assignedTo ?? "");
      }
      setLoading(false);
    });

    // Load staff list for owners only (for assignment dropdown)
    supabase.auth.getUser().then(async ({ data: authData }) => {
      if (!authData.user) return;
      const role = await fetchMyRole(authData.user.id);
      if (role === "owner") {
        fetchAdminUsers().then(list => setStaffList(list.filter(u => u.active)));
      }
    });
  }, [id]);

  // Realtime — อัปเดตเมื่อลูกค้าหรือระบบเปลี่ยนสถานะ
  useEffect(() => {
    if (!id) return;

    function reload() {
      fetchRequest(id).then(data => {
        if (!data) return;
        setRequest(data);
        setEstPrice(String(data.device.estimatedPrice));
        setActualPrice(String(data.device.actualPrice ?? ""));
      });
    }

    // Broadcast channel (bypasses RLS — triggered by server actions)
    const broadcastCh = supabase
      .channel("request-updates")
      .on("broadcast", { event: "updated" }, (payload) => {
        if (payload.payload?.id !== id) return;
        reload();
      })
      .subscribe();

    // postgres_changes fallback (works if RLS allows it)
    const pgCh = supabase
      .channel(`admin-request-pg-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "requests" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.new?.id !== id) return;
          reload();
        },
      )
      .subscribe();

    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(broadcastCh);
      supabase.removeChannel(pgCh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id]);

  async function handleStatusSave(status: RequestStatus, note: string) {
    if (!request) return;
    setSaving("status");
    setSaveError(null);
    const result = await updateStatus(id, status, note);
    if (result.success) {
      setRequest(prev => prev ? { ...prev, status, statusLog: (result as { success: true; statusLog: typeof prev.statusLog }).statusLog } : prev);
    } else {
      setSaveError("บันทึกสถานะไม่สำเร็จ: " + (result as { success: false; error: string }).error);
    }
    setSaving(null);
    setShowStatus(false);
  }

  async function handleAddNote() {
    if (!request || !noteText.trim()) return;
    setSaving("note");
    setSaveError(null);
    const result = await addNote(id, noteText.trim(), showToCustomer);
    if (result.success) {
      setRequest(prev => prev ? { ...prev, notes: (result as { success: true; notes: typeof prev.notes }).notes } : prev);
      setNoteText("");
      setShowToCustomer(false);
    } else {
      setSaveError("บันทึกหมายเหตุไม่สำเร็จ");
    }
    setSaving(null);
  }

  async function savePrice() {
    setSaving("price");
    setSaveError(null);
    const est  = Number(estPrice) || request!.device.estimatedPrice;
    const act  = actualPrice ? Number(actualPrice) : undefined;
    const result = await updatePrice(id, est, act);
    if (result.success) {
      setRequest(prev => prev ? { ...prev, device: { ...prev.device, estimatedPrice: est, actualPrice: act } } : prev);
    } else {
      setSaveError("บันทึกราคาไม่สำเร็จ");
    }
    setSaving(null);
    setEditPrice(false);
  }

  async function saveAppt() {
    setSaving("appt");
    setSaveError(null);
    const result = await updateAppointment(id, apptDraft);
    if (result.success) {
      setRequest(prev => prev ? { ...prev, appointment: { ...apptDraft } } : prev);
    } else {
      setSaveError("บันทึกนัดหมายไม่สำเร็จ");
    }
    setSaving(null);
    setEditAppt(false);
  }

  async function savePay() {
    setSaving("pay");
    setSaveError(null);
    const result = await updatePayment(id, payDraft);
    if (result.success) {
      setRequest(prev => prev ? { ...prev, payment: { method: payDraft.method, bankName: payDraft.bankName || undefined, accountName: payDraft.accountName || undefined, accountNumber: payDraft.accountNumber || undefined } } : prev);
    } else {
      setSaveError("บันทึกช่องทางรับเงินไม่สำเร็จ");
    }
    setSaving(null);
    setEditPay(false);
  }

  async function handleArrival() {
    if (!request) return;
    setSaving("arrival");
    setSaveError(null);
    const result = await recordArrival(id);
    if (result.success) {
      setRequest(prev => prev ? {
        ...prev,
        inspection: { ...(prev.inspection ?? { inspectedAt: "", result: "matched", criteria: [], issues: [], photos: [], originalPrice: 0, actualPrice: 0, priceReason: "", negotiationResponse: null, negotiationRespondedAt: null, negotiationRespondedBy: null }), arrivedAt: result.arrivedAt },
      } : prev);
    } else {
      setSaveError("บันทึกเวลาถึงไม่สำเร็จ");
    }
    setSaving(null);
  }

  async function handleInspectionSave(data: import("@/lib/types/admin").InspectionData, newStatus: "contracting" | "price_negotiation" | "rejected", deviceColor: string) {
    setInspSaving(true);
    setSaveError(null);
    const result = await saveInspection(id, data, newStatus, deviceColor || undefined);
    if (result.success) {
      setRequest(prev => prev ? {
        ...prev,
        status: newStatus,
        inspection: data,
        statusLog: result.statusLog,
        device: { ...prev.device, color: deviceColor || prev.device.color },
      } : prev);
    } else {
      setSaveError("บันทึกผลตรวจไม่สำเร็จ: " + result.error);
    }
    setInspSaving(false);
  }

  async function handleNegotiationResponse(accepted: boolean) {
    if (!request) return;
    setSaving("negotiation");
    setSaveError(null);
    const result = await respondToNegotiation(id, accepted, "staff");
    if (result.success) {
      setRequest(prev => prev ? {
        ...prev,
        status: result.newStatus!,
        statusLog: result.statusLog,
        inspection: prev.inspection ? {
          ...prev.inspection,
          negotiationResponse:    accepted ? "accepted" : "rejected",
          negotiationRespondedAt: new Date().toISOString(),
          negotiationRespondedBy: "staff",
        } : prev.inspection,
      } : prev);
    } else {
      setSaveError("บันทึกไม่สำเร็จ: " + result.error);
    }
    setSaving(null);
  }

  async function handleContractSign() {
    if (!request) return;
    setSaving("contract");
    const result = await markContractSigned(id);
    if (result.success) {
      setRequest(prev => prev ? { ...prev, payment: { ...prev.payment, contractSignedAt: result.signedAt } } : prev);
    } else {
      setSaveError("บันทึกสัญญาไม่สำเร็จ");
    }
    setSaving(null);
  }

  async function handleAssign() {
    setAssignSaving(true);
    const staff = staffList.find(s => s.user_id === assignDraft);
    const result = await assignRequest(id, assignDraft || null, staff?.name ?? null);
    if (result.success) {
      setRequest(prev => prev ? { ...prev, assignedTo: assignDraft || null, assignedToName: staff?.name ?? null } : prev);
    } else {
      setSaveError("บันทึก assignment ไม่สำเร็จ");
    }
    setAssignSaving(false);
  }

  async function handleSlipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw || !request) return;
    setSlipUploading(true);
    const file = await compressImage(raw);
    const path = `slips/${id}/${Date.now()}-${file.name.replace(/\s/g, "_")}`;
    const { data, error } = await supabase.storage.from("inspection-photos").upload(path, file, { upsert: true });
    if (error) { setSaveError("อัพโหลดสลิปไม่สำเร็จ: " + error.message); setSlipUploading(false); return; }
    const { data: pub } = supabase.storage.from("inspection-photos").getPublicUrl(data.path);
    const result = await savePaymentSlip(id, pub.publicUrl);
    if (result.success) {
      setRequest(prev => prev ? { ...prev, payment: { ...prev.payment, slipUrl: pub.publicUrl } } : prev);
    } else {
      setSaveError("บันทึก URL สลิปไม่สำเร็จ");
    }
    setSlipUploading(false);
    if (slipFileRef.current) slipFileRef.current.value = "";
  }

  function EditBar({ onSave, onCancel, isSaving }: { onSave: () => void; onCancel: () => void; isSaving: boolean }) {
    return (
      <div style={{ display: "flex", gap: "8px", marginTop: "-10px" }}>
        <button onClick={onSave} disabled={isSaving} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", display: "flex", padding: 0, opacity: isSaving ? 0.5 : 1 }}><Check size={18} /></button>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: TEXT3, cursor: "pointer", display: "flex", padding: 0 }}><X size={18} /></button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: TEXT2 }}>กำลังโหลด...</p>
    </div>;
  }

  if (!request) {
    return <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: TEXT2 }}>ไม่พบคำขอ</p>
    </div>;
  }

  const tel       = `tel:${request.customer.phone.replace(/-/g, "")}`;
  const deviceImg = getDeviceImage(request.device.model);
  const condColor = CONDITION_COLORS[request.device.condition] ?? TEXT2;

  const hasExtras     = (request.extraDevices ?? []).length > 0;
  const extraEstTotal = (request.extraDevices ?? []).reduce((s, d) => s + d.estimatedPrice, 0);
  const bundleEst     = request.device.estimatedPrice + extraEstTotal;
  const extraActTotal = (request.inspection?.extraInspections ?? []).reduce((s, e) => s + e.actualPrice, 0);
  const inspActual    = request.inspection?.actualPrice;
  const totalActual   = inspActual !== undefined ? inspActual + extraActTotal : request.device.actualPrice;

  async function copyTrackingLink() {
    if (!request) return;
    const phone = request.customer.phone.replace(/\D/g, "");
    const url = `${window.location.origin}/request/${request.orderNumber}?phone=${encodeURIComponent(phone)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)" }}>

      {/* Sticky Header */}
      <div style={{ position: "sticky", top: 0, background: CARD, zIndex: 10, padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: "10px" }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: "4px", display: "flex", touchAction: "manipulation" }}>
          <ArrowLeft size={22} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: GOLD, fontSize: "14px", fontWeight: 700, margin: 0 }}>{request.orderNumber}</p>
          <p style={{ color: TEXT3, fontSize: "11px", margin: 0 }}>{fmtDateTime(request.createdAt)} น.</p>
        </div>
        <button
          onClick={copyTrackingLink}
          title="คัดลอกลิงก์ติดตามให้ลูกค้า"
          style={{ display: "flex", alignItems: "center", gap: 5, background: linkCopied ? "#D1FAE5" : CARD, border: `1px solid ${linkCopied ? "#6EE7B7" : BORDER}`, borderRadius: "10px", padding: "7px 10px", cursor: "pointer", color: linkCopied ? "#059669" : TEXT2, fontSize: "12px", fontWeight: 600, fontFamily: "inherit", touchAction: "manipulation", transition: "all 0.2s", whiteSpace: "nowrap" }}
        >
          {linkCopied ? <><Check size={13} /> คัดลอกแล้ว</> : <><Copy size={13} /> ส่งลูกค้า</>}
        </button>
        <StatusBadge status={request.status} size="sm" />
      </div>

      {saveError && (
        <div style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ color: "#DC2626", fontSize: "13px", fontWeight: 500, margin: 0 }}>{saveError}</p>
          <button onClick={() => setSaveError(null)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", padding: 0, display: "flex" }}><X size={16} /></button>
        </div>
      )}

      <div style={{ padding: "14px 16px 0" }}>

        {/* A. Device */}
        <Card>
          <div style={{ padding: "20px 20px 16px" }}>
            <SectionLabel>ข้อมูลเครื่อง</SectionLabel>
            <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
              <div style={{ width: 80, height: 80, borderRadius: "14px", background: "#F0F0F3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                <Image src={deviceImg} alt={request.device.model} width={72} height={72} style={{ objectFit: "contain" }} unoptimized />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: TEXT, fontWeight: 700, fontSize: "16px", margin: "0 0 4px", lineHeight: 1.3 }}>{request.device.model}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                  {request.device.storage && <span style={{ background: "#F0F0F3", color: TEXT2, fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px" }}>{request.device.storage}</span>}
                  {request.device.color   && <span style={{ background: "#F0F0F3", color: TEXT2, fontSize: "12px", fontWeight: 500, padding: "2px 8px", borderRadius: "6px" }}>{request.device.color}</span>}
                </div>
                {request.device.condition && (
                  <span style={{ fontSize: "12px", fontWeight: 600, color: condColor, background: `${condColor}18`, padding: "2px 8px", borderRadius: "6px" }}>
                    {request.device.condition}
                  </span>
                )}
              </div>
            </div>
            {request.device.conditionDetails && request.device.conditionDetails.length > 0 && (
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${BORDER}` }}>
                <SectionLabel>รายละเอียดสภาพเครื่อง</SectionLabel>
                {request.device.conditionDetails.map((d, i) => (
                  <p key={i} style={{ color: TEXT2, fontSize: "13px", margin: "0 0 4px" }}>• {d}</p>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* A2. Bundle devices */}
        {(request.extraDevices ?? []).length > 0 && (
          <Card>
            <div style={{ padding: "16px" }}>
              <SectionLabel>สินค้าในรายการ ({(request.extraDevices ?? []).length + 1} เครื่อง)</SectionLabel>

              {/* Primary device chip */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, background: "rgba(184,134,11,0.08)", border: "1px solid rgba(184,134,11,0.2)", marginBottom: 8 }}>
                <div>
                  <p style={{ color: TEXT, fontWeight: 700, fontSize: 13, margin: 0 }}>{request.device.model} <span style={{ fontSize: 11, fontWeight: 500, color: GOLD, background: "rgba(184,134,11,0.12)", padding: "1px 6px", borderRadius: 6 }}>หลัก</span></p>
                  <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>{request.device.storage}</p>
                </div>
                <p style={{ color: GOLD, fontWeight: 700, fontSize: 14, margin: 0, fontVariantNumeric: "tabular-nums" }}>฿{request.device.estimatedPrice.toLocaleString("th-TH")}</p>
              </div>

              {/* Extra devices */}
              {(request.extraDevices ?? []).map((d, i) => (
                <div key={i} style={{ borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden", marginBottom: i < (request.extraDevices ?? []).length - 1 ? 8 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "#F9FAFB" }}>
                    <div>
                      <p style={{ color: TEXT, fontWeight: 700, fontSize: 13, margin: 0 }}>{d.model}</p>
                      <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>{d.storage || "—"}</p>
                    </div>
                    <p style={{ color: TEXT2, fontWeight: 700, fontSize: 14, margin: 0, fontVariantNumeric: "tabular-nums" }}>฿{d.estimatedPrice.toLocaleString("th-TH")}</p>
                  </div>
                  {(d.details ?? []).length > 0 && (
                    <div style={{ padding: "6px 10px 8px", borderTop: `1px solid ${BORDER}` }}>
                      {(d.details ?? []).map(({ title, value }) => (
                        <div key={title} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid #F9FAFB` }}>
                          <span style={{ color: TEXT3, fontSize: 12 }}>{title}</span>
                          <span style={{ color: TEXT, fontSize: 12, fontWeight: 500, textAlign: "right" }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                <span style={{ color: TEXT2, fontSize: 13, fontWeight: 600 }}>รวมทั้งหมด</span>
                <span style={{ color: GOLD, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  ฿{(request.device.estimatedPrice + (request.extraDevices ?? []).reduce((s, d) => s + d.estimatedPrice, 0)).toLocaleString("th-TH")}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* A3. Customer notes (from sell form) */}
        {request.customerNotes && (
          <Card>
            <div style={{ padding: "14px 16px" }}>
              <SectionLabel>หมายเหตุจากลูกค้า</SectionLabel>
              <p style={{ color: TEXT, fontSize: 13, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{request.customerNotes}</p>
            </div>
          </Card>
        )}

        {/* B. Customer */}
        <Card>
          <div style={{ padding: "16px" }}>
            <SectionLabel>ข้อมูลลูกค้า</SectionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: GOLD, fontWeight: 700, fontSize: "18px" }}>{request.customer.name.slice(0, 1)}</span>
              </div>
              <div>
                <p style={{ color: TEXT, fontWeight: 700, fontSize: "16px", margin: 0 }}>{request.customer.name}</p>
                <p style={{ color: TEXT2, fontSize: "13px", margin: "2px 0 0" }}>{request.customer.phone}</p>
              </div>
            </div>
            {request.customer.email && (
              <p style={{ color: TEXT2, fontSize: "13px", margin: "4px 0 0", paddingTop: "10px", borderTop: `1px solid ${BORDER}` }}>{request.customer.email}</p>
            )}
          </div>
        </Card>

        {/* B2. Assignment (owner: edit; staff: read-only) */}
        {(staffList.length > 0 || request.assignedToName) && (
          <Card>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <SectionLabel>มอบหมายให้</SectionLabel>
              </div>
              {staffList.length > 0 ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    value={assignDraft}
                    onChange={e => setAssignDraft(e.target.value)}
                    style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: "#F5F5F7", fontFamily: "inherit", outline: "none" }}
                  >
                    <option value="">— ยังไม่ได้มอบหมาย —</option>
                    {staffList.map(s => (
                      <option key={s.user_id} value={s.user_id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={assignSaving || assignDraft === (request.assignedTo ?? "")}
                    style={{
                      padding: "8px 14px", borderRadius: 10, border: "none",
                      background: GOLD, color: "#fff", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      opacity: (assignSaving || assignDraft === (request.assignedTo ?? "")) ? 0.5 : 1,
                    }}
                  >
                    {assignSaving ? "..." : "บันทึก"}
                  </button>
                </div>
              ) : (
                <p style={{ color: TEXT2, fontSize: 13, margin: 0 }}>
                  {request.assignedToName ?? "ยังไม่ได้มอบหมาย"}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* C. Price */}
        <Card>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <SectionLabel>ราคา</SectionLabel>
              {!editPrice
                ? <button onClick={() => setEditPrice(true)} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: 0, fontFamily: "inherit", marginTop: "-10px" }}><Pencil size={13} /> แก้ไข</button>
                : <EditBar onSave={savePrice} onCancel={() => setEditPrice(false)} isSaving={saving === "price"} />
              }
            </div>
            {!editPrice ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ color: TEXT2, fontSize: "13px" }}>{hasExtras ? `ราคาประเมินรวม ${(request.extraDevices ?? []).length + 1} เครื่อง` : "ราคาประเมิน"}</span>
                  <span style={{ color: GOLD, fontSize: "24px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>฿{bundleEst.toLocaleString("th-TH")}</span>
                </div>
                {!hasExtras && <p style={{ color: TEXT3, fontSize: "12px", margin: "0 0 8px" }}>{request.device.priceRange}</p>}
                {hasExtras && (
                  <p style={{ color: TEXT3, fontSize: "12px", margin: "0 0 8px" }}>
                    {request.device.model} ฿{request.device.estimatedPrice.toLocaleString("th-TH")} + {(request.extraDevices ?? []).map(d => `${d.model} ฿${d.estimatedPrice.toLocaleString("th-TH")}`).join(" + ")}
                  </p>
                )}
                {totalActual !== undefined && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: `1px solid ${BORDER}` }}>
                    <span style={{ color: TEXT2, fontSize: "13px" }}>{hasExtras ? "ราคาที่รับจริงรวม" : "ราคาที่รับจริง"}</span>
                    <span style={{ color: "#065F46", fontSize: "22px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>฿{totalActual.toLocaleString("th-TH")}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ราคาประเมิน (บาท)</label>
                <input type="number" value={estPrice} onChange={e => setEstPrice(e.target.value)} style={inputSt} />
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ราคาที่รับจริง (บาท)</label>
                <input type="number" value={actualPrice} onChange={e => setActualPrice(e.target.value)} placeholder="กรอกราคาที่รับจริง" style={{ ...inputSt, marginBottom: 0 }} />
              </>
            )}
          </div>
        </Card>

        {/* D. Appointment */}
        <Card>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <SectionLabel>นัดหมาย</SectionLabel>
              {!editAppt
                ? <button onClick={() => setEditAppt(true)} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: 0, fontFamily: "inherit", marginTop: "-10px" }}><Pencil size={13} /> แก้ไข</button>
                : <EditBar onSave={saveAppt} onCancel={() => setEditAppt(false)} isSaving={saving === "appt"} />
              }
            </div>
            {!editAppt ? (
              <>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "10px" }}>
                  <Calendar size={14} color={GOLD} style={{ marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <p style={{ color: TEXT, fontSize: "14px", fontWeight: 500, margin: 0 }}>
                      {fmtDate(request.appointment.date)} เวลา {request.appointment.time} น.
                    </p>
                    <p style={{ color: TEXT2, fontSize: "12px", margin: "3px 0 0" }}>{SELL_LABELS[request.appointment.method]}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <MapPin size={14} color={GOLD} style={{ flexShrink: 0 }} />
                  {request.appointment.method === "rider" ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.appointment.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: GOLD, fontSize: "13px", margin: 0, fontWeight: 600 }}
                    >
                      {request.appointment.location} ↗
                    </a>
                  ) : (
                    <p style={{ color: TEXT2, fontSize: "13px", margin: 0 }}>{request.appointment.location}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>วันที่</label>
                <input type="date" value={apptDraft.date} onChange={e => setApptDraft(p => ({ ...p, date: e.target.value }))} style={inputSt} />
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>เวลา</label>
                <input type="time" value={apptDraft.time} onChange={e => setApptDraft(p => ({ ...p, time: e.target.value }))} style={inputSt} />
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ช่องทาง</label>
                <select value={apptDraft.method} onChange={e => setApptDraft(p => ({ ...p, method: e.target.value as SellMethod }))} style={{ ...inputSt, appearance: "none", WebkitAppearance: "none" }}>
                  <option value="branch">รับที่สาขา</option>
                  <option value="rider">ไรเดอร์รับถึงบ้าน</option>
                  <option value="parcel">ส่งพัสดุ</option>
                </select>
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>สถานที่</label>
                <input value={apptDraft.location} onChange={e => setApptDraft(p => ({ ...p, location: e.target.value }))} placeholder="ระบุสถานที่" style={{ ...inputSt, marginBottom: 0 }} />
              </>
            )}
          </div>
        </Card>

        {/* E. Payment */}
        <Card>
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <SectionLabel>ช่องทางรับเงิน</SectionLabel>
              {!editPay
                ? <button onClick={() => setEditPay(true)} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: 0, fontFamily: "inherit", marginTop: "-10px" }}><Pencil size={13} /> แก้ไข</button>
                : <EditBar onSave={savePay} onCancel={() => setEditPay(false)} isSaving={saving === "pay"} />
              }
            </div>
            {!editPay ? (
              <>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                  <CreditCard size={14} color={GOLD} />
                  <span style={{ color: TEXT, fontSize: "14px", fontWeight: 500 }}>{PAY_LABELS[request.payment.method]}</span>
                  {request.payment.bankName && <span style={{ color: TEXT2, fontSize: "13px" }}>· {request.payment.bankName}</span>}
                </div>
                {request.payment.accountName   && <p style={{ color: TEXT2, fontSize: "13px", margin: "0 0 2px" }}>{request.payment.accountName}</p>}
                {request.payment.accountNumber && <p style={{ color: TEXT3, fontSize: "13px", fontWeight: 600, margin: 0, letterSpacing: "0.03em" }}>{request.payment.accountNumber}</p>}
              </>
            ) : (
              <>
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ช่องทาง</label>
                <select value={payDraft.method} onChange={e => setPayDraft(p => ({ ...p, method: e.target.value as PayMethod }))} style={{ ...inputSt, appearance: "none", WebkitAppearance: "none" }}>
                  <option value="cash">เงินสด</option>
                  <option value="transfer">โอนเงิน</option>
                </select>
                {payDraft.method === "transfer" && (
                  <>
                    <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ธนาคาร</label>
                    <input value={payDraft.bankName} onChange={e => setPayDraft(p => ({ ...p, bankName: e.target.value }))} placeholder="เช่น กสิกรไทย" style={inputSt} />
                    <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ชื่อบัญชี</label>
                    <input value={payDraft.accountName} onChange={e => setPayDraft(p => ({ ...p, accountName: e.target.value }))} placeholder="ชื่อเจ้าของบัญชี" style={inputSt} />
                    <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>เลขบัญชี</label>
                    <input value={payDraft.accountNumber} onChange={e => setPayDraft(p => ({ ...p, accountNumber: e.target.value }))} placeholder="xxx-x-xxxxx-x" style={{ ...inputSt, marginBottom: 0 }} />
                  </>
                )}
              </>
            )}
          </div>
        </Card>

        {/* F. Notes */}
        <Card>
          <div style={{ padding: "16px" }}>
            <SectionLabel>{`หมายเหตุ (${request.notes.length})`}</SectionLabel>
            {request.notes.length === 0
              ? <p style={{ color: TEXT3, fontSize: "13px", margin: 0 }}>ยังไม่มีหมายเหตุ</p>
              : request.notes.map((n, i) => (
                <div key={i} style={{ marginBottom: i < request.notes.length - 1 ? "12px" : 0, paddingBottom: i < request.notes.length - 1 ? "12px" : 0, borderBottom: i < request.notes.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <p style={{ color: TEXT, fontSize: "14px", margin: "0 0 4px", lineHeight: 1.5 }}>{n.text}</p>
                  <p style={{ color: TEXT3, fontSize: "11px", margin: 0 }}>{fmtDateTime(n.createdAt)}{n.showToCustomer ? " · แสดงลูกค้า" : ""}</p>
                </div>
              ))
            }
          </div>
        </Card>

        {/* G. Add Note */}
        <Card>
          <div style={{ padding: "16px" }}>
            <SectionLabel>เพิ่มหมายเหตุ</SectionLabel>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="ระบุหมายเหตุ..."
              maxLength={500}
              rows={3}
              style={{ width: "100%", background: "#F5F5F7", border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "10px 12px", color: TEXT, fontSize: "14px", resize: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "10px", outline: "none" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: TEXT2 }}>
                <input type="checkbox" checked={showToCustomer} onChange={e => setShowToCustomer(e.target.checked)} style={{ accentColor: GOLD }} />
                แสดงให้ลูกค้าเห็น
              </label>
              <span style={{ fontSize: "11px", color: TEXT3 }}>{noteText.length}/500</span>
            </div>
            <button
              onClick={handleAddNote}
              disabled={!noteText.trim() || saving === "note"}
              style={{ width: "100%", borderRadius: "12px", padding: "12px", background: noteText.trim() ? GOLD : "#EEEEEE", border: "none", color: noteText.trim() ? "#fff" : TEXT3, fontSize: "15px", fontWeight: 700, cursor: noteText.trim() ? "pointer" : "default", touchAction: "manipulation", fontFamily: "inherit", opacity: saving === "note" ? 0.6 : 1 }}
            >
              {saving === "note" ? "กำลังบันทึก..." : "บันทึกหมายเหตุ"}
            </button>
          </div>
        </Card>

        {/* I. Inspection */}
        {(["confirmed", "pickup_scheduled", "price_negotiation", "contracting", "rejected"] as RequestStatus[]).includes(request.status) && (
          <Card ref={inspectionRef}>
            <div style={{ padding: "16px" }}>
              {/* Header row with arrival button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <SectionLabel>ผลการตรวจสภาพ</SectionLabel>
                {!request.inspection?.arrivedAt ? (
                  <button
                    onClick={handleArrival}
                    disabled={saving === "arrival"}
                    style={{ background: "#FEF3C7", border: "1px solid rgba(184,134,11,0.3)", borderRadius: 8, padding: "4px 10px", color: GOLD, fontSize: 12, fontWeight: 600, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", marginTop: -10, opacity: saving === "arrival" ? 0.6 : 1 }}
                  >
                    📍 บันทึกเวลาถึง
                  </button>
                ) : (
                  <span style={{ color: TEXT3, fontSize: 11, marginTop: -10 }}>
                    ถึง {fmtDateTime(request.inspection.arrivedAt)} น.
                  </span>
                )}
              </div>

              {/* Negotiation response panel */}
              {request.status === "price_negotiation" && !request.inspection?.negotiationResponse && (
                <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                  <p style={{ color: "#92400E", fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>
                    ⏳ รอลูกค้ายืนยัน — ราคาใหม่รวม ฿{((request.inspection?.actualPrice ?? 0) + (request.inspection?.extraInspections ?? []).reduce((s, e) => s + e.actualPrice, 0)).toLocaleString("th-TH")}
                  </p>
                  {request.inspection?.priceReason && (
                    <p style={{ color: "#92400E", fontSize: 12, margin: "0 0 10px" }}>{request.inspection.priceReason}</p>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleNegotiationResponse(true)}
                      disabled={saving === "negotiation"}
                      style={{ flex: 1, background: "#065F46", border: "none", borderRadius: 10, padding: "10px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", opacity: saving === "negotiation" ? 0.6 : 1 }}
                    >
                      ✅ ยืนยันแทนลูกค้า
                    </button>
                    <button
                      onClick={() => handleNegotiationResponse(false)}
                      disabled={saving === "negotiation"}
                      style={{ flex: 1, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", opacity: saving === "negotiation" ? 0.6 : 1 }}
                    >
                      ❌ ลูกค้าปฏิเสธ
                    </button>
                  </div>
                </div>
              )}

              {request.inspection?.negotiationResponse && (
                <div style={{ background: request.inspection.negotiationResponse === "accepted" ? "#D1FAE5" : "#FEE2E2", border: `1px solid ${request.inspection.negotiationResponse === "accepted" ? "#6EE7B7" : "#FECACA"}`, borderRadius: 12, padding: "10px 14px", marginBottom: 16 }}>
                  <p style={{ color: request.inspection.negotiationResponse === "accepted" ? "#065F46" : "#991B1B", fontSize: 13, fontWeight: 600, margin: 0 }}>
                    {request.inspection.negotiationResponse === "accepted" ? "✅ ยืนยันราคาใหม่แล้ว" : "❌ ปฏิเสธราคาใหม่"}
                    {" "}(โดย{request.inspection.negotiationRespondedBy === "staff" ? "เจ้าหน้าที่" : "ลูกค้า"})
                  </p>
                </div>
              )}

              <InspectionForm
                requestId={id}
                model={request.device.model}
                selections={request.device.selections ?? {}}
                estimatedPrice={request.device.estimatedPrice}
                deviceColor={request.device.color ?? ""}
                existing={request.inspection}
                extraDevices={request.extraDevices}
                onSave={handleInspectionSave}
                saving={inspSaving}
                showColorError={showColorError}
                onColorErrorCleared={() => setShowColorError(false)}
                onColorChange={c => { setCurrentColorDraft(c); if (c) setShowColorError(false); }}
                requireCustomerConfirm={request.source !== "website"}
              />
            </div>
          </Card>
        )}

        {/* J. Contract & Payment Slip (shown when contracting or completed) */}
        {(["contracting", "completed"] as RequestStatus[]).includes(request.status) && (
          <button
            onClick={async () => {
              const effectiveColor = request.device.color || currentColorDraft;
              if (!effectiveColor) {
                setShowColorError(true);
                inspectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
              }
              if (!request.device.color && currentColorDraft) {
                await updateDeviceColor(id, currentColorDraft);
                setRequest(prev => prev ? { ...prev, device: { ...prev.device, color: currentColorDraft } } : prev);
              }
              router.push(`/admin/requests/${id}/contract`);
            }}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#1a1a2e", border: "none", borderRadius: 12, padding: "14px", color: "#F0C040", fontSize: 15, fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", marginBottom: 10 }}
          >
            📄 ออกสัญญาซื้อขาย + ใบรับเงิน
          </button>
        )}
        {(["contracting", "completed"] as RequestStatus[]).includes(request.status) && (
          <Card>
            <div style={{ padding: "16px" }}>
              <SectionLabel>สัญญาและการชำระเงิน</SectionLabel>

              {/* Contract signing */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: 0 }}>สัญญาซื้อขาย</p>
                  {request.payment.contractSignedAt ? (
                    <p style={{ color: "#059669", fontSize: 12, margin: "2px 0 0" }}>
                      ✅ เซ็นแล้ว · {fmtDateTime(request.payment.contractSignedAt)} น.
                    </p>
                  ) : (
                    <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>ยังไม่ได้บันทึก</p>
                  )}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "0 0 8px" }}>
                  สลิปโอนเงิน {request.payment.method === "cash" ? "(เงินสด)" : `(${request.payment.bankName ?? "โอนเงิน"})`}
                </p>

                {request.payment.slipUrl ? (
                  <div style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={request.payment.slipUrl} alt="slip" style={{ width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 10, border: `1px solid ${BORDER}`, background: "#F5F5F7" }} />
                    <button
                      onClick={() => slipFileRef.current?.click()}
                      style={{ marginTop: 8, display: "block", width: "100%", background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 0", color: TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation" }}
                    >
                      เปลี่ยนสลิป
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => slipFileRef.current?.click()}
                    disabled={slipUploading}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: "#F5F5F7", border: `1px dashed ${BORDER}`, borderRadius: 10, padding: "16px 0", color: TEXT2, fontSize: 13, cursor: "pointer", fontFamily: "inherit", touchAction: "manipulation", opacity: slipUploading ? 0.6 : 1 }}
                  >
                    {slipUploading ? "กำลังอัพโหลด..." : "📎 อัพโหลดสลิป"}
                  </button>
                )}
                <input ref={slipFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSlipUpload} />
              </div>
            </div>
          </Card>
        )}

        {/* H. Status Timeline */}
        <Card>
          <div style={{ padding: "16px" }}>
            <SectionLabel>ประวัติสถานะ</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[...request.statusLog].reverse().map((log, i) => (
                <div key={i} style={{ display: "flex", gap: "10px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {i === 0 ? <CheckCircle size={16} color={GOLD} /> : <Circle size={16} color="#D1D1D6" />}
                    {i < request.statusLog.length - 1 && <div style={{ width: 1, flex: 1, background: "#EEEEEE", margin: "5px 0" }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: "2px" }}>
                    <p style={{ color: i === 0 ? TEXT : TEXT2, fontSize: "14px", fontWeight: i === 0 ? 600 : 400, margin: 0 }}>
                      {STATUS_LABELS[log.status as RequestStatus] ?? log.status}
                    </p>
                    {log.note && <p style={{ color: TEXT3, fontSize: "12px", margin: "2px 0 0" }}>{log.note}</p>}
                    <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "3px" }}>
                      <Clock size={10} color={TEXT3} />
                      <span style={{ color: TEXT3, fontSize: "11px" }}>{fmtDateTime(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom Action Bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: CARD, borderTop: `1px solid ${BORDER}`, padding: "10px 16px", paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)", zIndex: 20, display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
        <a href={tel} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", padding: "10px 0", background: "#F5F5F7", borderRadius: "12px", color: TEXT2, textDecoration: "none", fontSize: "12px", fontWeight: 600, minHeight: "52px", touchAction: "manipulation", border: `1px solid ${BORDER}` }}>
          <Phone size={18} />
          <span>โทร</span>
        </a>
        <button
          onClick={() => setShowStatus(true)}
          disabled={saving === "status"}
          style={{ background: GOLD, border: "none", borderRadius: "12px", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", minHeight: "52px", opacity: saving === "status" ? 0.6 : 1 }}
        >
          {saving === "status" ? "กำลังบันทึก..." : "เปลี่ยนสถานะ"}
        </button>
      </div>

      {showStatus && (
        <StatusBottomSheet currentStatus={request.status} onSave={handleStatusSave} onClose={() => setShowStatus(false)} />
      )}
    </div>
  );
}
