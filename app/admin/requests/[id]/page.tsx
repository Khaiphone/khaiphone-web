"use client";

import { useState, use, useEffect, useRef, forwardRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, Phone, MapPin, Calendar, CreditCard,
  Clock, CheckCircle, Circle, Pencil, Check, X, Copy, ExternalLink,
} from "lucide-react";
import {
  fetchRequest, updateStatus, addNote,
  updateAppointment, updatePayment, updatePrice,
  markContractSigned, savePaymentSlip, updateDeviceColor,
  assignRequest, assignRider, deleteRequest, updateCustomer, updateDevice,
  adminReclaimJob, getDocumentSignedUrl, adminConfirmReturn,
  lookupRequestForMerge, mergeRequests,
} from "@/app/actions/admin-requests";
import { getCustomerHistory, addToBlacklist, removeFromBlacklist, type CustomerHistory } from "@/app/actions/customer-blacklist";
import { fetchAdminUsers, fetchMyRole, fetchMyProfile } from "@/app/actions/admin-users";
import type { AdminUserRow } from "@/app/actions/admin-users";
import { saveInspection, respondToNegotiation, adminApproveInspection, adminRequestInspectionRevision, adminCancelAtInspection } from "@/app/actions/inspection";
import { fetchRiderSuggestionsForRequest } from "@/app/actions/rider-tracking";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compress-image";
import { validateImageFile } from "@/lib/validate-file";
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
  const [phoneCopied, setPhoneCopied] = useState(false);

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

  // Editable: customer
  const [editCustomer, setEditCustomer] = useState(false);
  const [custDraft, setCustDraft] = useState({ name: "", phone: "", email: "" });

  // Editable: device
  const [editDevice, setEditDevice] = useState(false);
  const [devDraft, setDevDraft] = useState({ model: "", storage: "", color: "", condition: "", estimatedPrice: "", conditionDetails: "" });

  // Inspection
  const [inspSaving, setInspSaving] = useState(false);
  const inspectionRef = useRef<HTMLDivElement>(null);
  const prevInspectedAtRef = useRef<string | null>(null);

  // Staff assignment
  const [staffList,    setStaffList]    = useState<AdminUserRow[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignDraft,  setAssignDraft]  = useState<string>(""); // user_id or ""

  // Rider assignment
  const [riderDraft,   setRiderDraft]   = useState<string>(""); // user_id or ""
  const [riderSaving,  setRiderSaving]  = useState(false);
  const [canAssign,    setCanAssign]    = useState(false);

  // Reclaim job
  const [reclaimBusy,        setReclaimBusy]        = useState(false);
  const [showReclaim,        setShowReclaim]        = useState(false);
  const [confirmReturnBusy,  setConfirmReturnBusy]  = useState(false);
  const [reclaimReason,      setReclaimReason]      = useState("");
  const [approvingInspection,setApprovingInspection]= useState(false);
  const [guidanceMin,        setGuidanceMin]        = useState("");
  const [guidanceMax,        setGuidanceMax]        = useState("");
  const [guidanceNote,       setGuidanceNote]       = useState("");
  const [showRevisionInput,  setShowRevisionInput]  = useState(false);
  const [revisionNote,       setRevisionNote]       = useState("");
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [showCancelInput,    setShowCancelInput]    = useState(false);
  const [cancelReason,       setCancelReason]       = useState("");
  const [cancellingJob,      setCancellingJob]      = useState(false);

  // Smart rider suggestions
  type RiderSuggestion = { rider_id: string; name: string; tracking_mode: string; battery_pct: number | null; distanceKm: number; etaMinutes: number; jobs_completed: number };
  const [riderSuggestions, setRiderSuggestions] = useState<RiderSuggestion[]>([]);
  const [suggestLoading,   setSuggestLoading]   = useState(false);
  const [showSuggest,      setShowSuggest]      = useState(false);

  // Contract & slip
  const [slipUploading, setSlipUploading] = useState(false);
  const [linkCopied,    setLinkCopied]    = useState(false);
  const slipFileRef    = useRef<HTMLInputElement>(null);
  const financeRef     = useRef<HTMLDivElement>(null);

  // Auto-scroll to finance section when transfer is pending
  useEffect(() => {
    if (!request) return;
    const needsTransfer =
      (request.status === "contracting" || request.status === "awaiting_transfer") &&
      request.payment.method === "transfer" &&
      !request.payment.slipUrl;
    if (needsTransfer) {
      setTimeout(() => financeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
    }
  }, [request?.id, request?.status]);

  // Copy bank info
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Delete (owner only)
  const [isOwner,       setIsOwner]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  // Customer history & blacklist
  const [customerHistory, setCustomerHistory] = useState<CustomerHistory | null>(null);
  const [showBlacklistForm, setShowBlacklistForm] = useState(false);
  const [blReason, setBlReason] = useState("");
  const [blNotes, setBlNotes] = useState("");
  const [blSaving, setBlSaving] = useState(false);

  // Merge duplicate requests (owner only)
  type MergePreview ={ id: string; orderNumber: string; customerName: string; customerPhone: string; deviceModel: string; status: string; createdAt: string };
  const [showMerge,    setShowMerge]    = useState(false);
  const [mergeInput,   setMergeInput]   = useState("");
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [mergeLooking, setMergeLooking] = useState(false);
  const [mergeBusy,    setMergeBusy]    = useState(false);
  const [mergeError,   setMergeError]   = useState<string | null>(null);

  useEffect(() => {
    fetchRequest(id).then(data => {
      setRequest(data);
      if (data) {
        getCustomerHistory(data.customer.phone).then(setCustomerHistory);
        setEstPrice(String(data.device.estimatedPrice));
        setActualPrice(String(data.device.actualPrice ?? ""));
        setApptDraft({ date: data.appointment.date, time: data.appointment.time, location: data.appointment.location, method: data.appointment.method });
        setPayDraft({ method: data.payment.method, bankName: data.payment.bankName ?? "", accountName: data.payment.accountName ?? "", accountNumber: data.payment.accountNumber ?? "" });
        setCustDraft({ name: data.customer.name, phone: data.customer.phone, email: data.customer.email ?? "" });
        setDevDraft({ model: data.device.model, storage: data.device.storage, color: data.device.color ?? "", condition: data.device.condition, estimatedPrice: String(data.device.estimatedPrice), conditionDetails: (data.device.conditionDetails ?? []).join("\n") });
        setAssignDraft(data.assignedTo ?? "");
        setRiderDraft(data.riderId ?? "");
        // Seed ref so Realtime knows what was already inspected when page loaded
        prevInspectedAtRef.current = (data.inspection as { inspectedAt?: string } | null)?.inspectedAt ?? null;
      }
      setLoading(false);
    });

    // Load staff list for owners and staff with assign_requests permission
    supabase.auth.getUser().then(async ({ data: authData }) => {
      if (!authData.user) return;
      const role = await fetchMyRole(authData.user.id);
      if (role === "owner") {
        setIsOwner(true);
        setCanAssign(true);
        fetchAdminUsers().then(list => setStaffList(list.filter(u => u.active)));
      } else {
        const profile = await fetchMyProfile(authData.user.id);
        const perms = profile?.permissions ?? [];
        if (perms.includes("assign_requests")) {
          setCanAssign(true);
          fetchAdminUsers().then(list => setStaffList(list.filter(u => u.active)));
        }
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
        // Auto-scroll to inspection section when rider submits inspection for the first time
        const newInspectedAt = (data.inspection as { inspectedAt?: string } | null)?.inspectedAt ?? null;
        if (!prevInspectedAtRef.current && newInspectedAt) {
          setTimeout(() => inspectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
        }
        prevInspectedAtRef.current = newInspectedAt;
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

  async function saveCustomer() {
    setSaving("customer");
    setSaveError(null);
    const result = await updateCustomer(id, { name: custDraft.name, phone: custDraft.phone, email: custDraft.email || undefined });
    if (result.success) {
      setRequest(prev => prev ? { ...prev, customer: { ...prev.customer, name: custDraft.name, phone: custDraft.phone, email: custDraft.email } } : prev);
    } else {
      setSaveError("บันทึกข้อมูลลูกค้าไม่สำเร็จ");
    }
    setSaving(null);
    setEditCustomer(false);
  }

  async function saveDevice() {
    setSaving("device");
    setSaveError(null);
    const estNum = Number(devDraft.estimatedPrice) || request!.device.estimatedPrice;
    const newCondDetails = devDraft.conditionDetails.split("\n").map(l => l.trim()).filter(Boolean);
    const result = await updateDevice(id, { model: devDraft.model, storage: devDraft.storage, color: devDraft.color || undefined, condition: devDraft.condition, estimatedPrice: estNum, conditionDetails: newCondDetails });
    if (result.success) {
      setRequest(prev => prev ? { ...prev, device: { ...prev.device, model: devDraft.model, storage: devDraft.storage, color: devDraft.color || undefined, condition: devDraft.condition, estimatedPrice: estNum, conditionDetails: newCondDetails, selections: { ...(prev.device.selections ?? {}), storage: devDraft.storage } } } : prev);
      setEstPrice(String(estNum));
    } else {
      setSaveError("บันทึกข้อมูลเครื่องไม่สำเร็จ");
    }
    setSaving(null);
    setEditDevice(false);
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

  async function handleRiderAssign() {
    setRiderSaving(true);
    const rider = staffList.find(s => s.user_id === riderDraft) ?? riderSuggestions.find(s => s.rider_id === riderDraft);
    const riderName = (rider as { name?: string })?.name ?? null;
    const result = await assignRider(id, riderDraft || null, riderName);
    if (result.success) {
      setRequest(prev => prev ? { ...prev, riderId: riderDraft || null, riderName: riderName } : prev);
      setShowSuggest(false);
    } else {
      setSaveError("มอบหมายไรเดอร์ไม่สำเร็จ");
    }
    setRiderSaving(false);
  }

  async function loadRiderSuggestions() {
    setSuggestLoading(true);
    setShowSuggest(true);
    const res = await fetchRiderSuggestionsForRequest(id);
    setRiderSuggestions(res.riders);
    setSuggestLoading(false);
  }

  async function handleSlipUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw || !request) return;
    const check = validateImageFile(raw);
    if (!check.valid) { setSaveError(check.error); return; }
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

  async function copyText(text: string, field: string) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; el.style.position = "fixed"; el.style.opacity = "0";
      document.body.appendChild(el); el.focus(); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(f => f === field ? null : f), 2000);
  }

  async function openAdminDoc(storagePath: string) {
    // Open window immediately (within click event) to avoid popup blocker
    const win = window.open("", "_blank");
    if (!win) { setSaveError("กรุณาอนุญาต popup จาก browser"); return; }
    win.document.write("<p style='font-family:sans-serif;padding:20px'>กำลังโหลดเอกสาร...</p>");

    const signedUrl = await getDocumentSignedUrl(id, storagePath);
    if (!signedUrl) { win.close(); setSaveError("ไม่มีสิทธิ์เปิดเอกสารนี้"); return; }
    const resp = await fetch(signedUrl);
    const html = await resp.text();
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    win.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  async function copyTrackingLink() {
    if (!request) return;
    const phone = request.customer.phone.replace(/\D/g, "");
    const url = `https://khaiphone.com/request/${request.orderNumber}?phone=${encodeURIComponent(phone)}`;
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
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: "calc(env(safe-area-inset-bottom) + 90px)", overflowX: "hidden" }}>

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
        {isOwner && (
          <>
            <button
              onClick={() => { setShowMerge(true); setMergeInput(""); setMergePreview(null); setMergeError(null); }}
              title="รวมคำขอซ้ำ"
              style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: "4px", display: "flex", touchAction: "manipulation" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/><path d="M16 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="ลบคำขอ"
              style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", padding: "4px", display: "flex", touchAction: "manipulation" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: CARD, borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "320px" }}>
            <p style={{ color: TEXT, fontWeight: 700, fontSize: "16px", margin: "0 0 8px" }}>ลบคำขอนี้?</p>
            <p style={{ color: TEXT2, fontSize: "14px", margin: "0 0 20px" }}>คำขอ {request.orderNumber} จะถูกลบถาวร ไม่สามารถกู้คืนได้</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: "12px", border: `1px solid ${BORDER}`, borderRadius: "10px", background: "none", color: TEXT2, cursor: "pointer", fontFamily: "inherit", fontSize: "15px", fontWeight: 600 }}
              >ยกเลิก</button>
              <button
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  const res = await deleteRequest(id);
                  if (res.success) {
                    router.replace("/admin/requests");
                  } else {
                    setSaveError(res.error ?? "ลบไม่สำเร็จ");
                    setShowDeleteConfirm(false);
                    setDeleting(false);
                  }
                }}
                style={{ flex: 1, padding: "12px", border: "none", borderRadius: "10px", background: "#EF4444", color: "#fff", cursor: deleting ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "15px", fontWeight: 600, opacity: deleting ? 0.7 : 1 }}
              >{deleting ? "กำลังลบ..." : "ลบ"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Merge duplicate modal */}
      {showMerge && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: CARD, borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "360px" }}>
            <p style={{ color: TEXT, fontWeight: 700, fontSize: "16px", margin: "0 0 4px" }}>รวมคำขอซ้ำ</p>
            <p style={{ color: TEXT2, fontSize: "13px", margin: "0 0 16px", lineHeight: 1.5 }}>
              คำขอหลักคือ <strong style={{ color: GOLD }}>{request.orderNumber}</strong> — ระบุเลขคำขอที่ต้องการ<strong>ปิด</strong>
            </p>

            {/* Input row */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={mergeInput}
                onChange={e => { setMergeInput(e.target.value.toUpperCase()); setMergePreview(null); setMergeError(null); }}
                placeholder="KP-XXXXXX"
                style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 14, fontFamily: "monospace", color: TEXT, background: BG, outline: "none", boxSizing: "border-box" }}
              />
              <button
                disabled={mergeLooking || !mergeInput.trim()}
                onClick={async () => {
                  if (mergeInput.trim().toUpperCase() === request.orderNumber.toUpperCase()) {
                    setMergeError("ไม่สามารถรวมคำขอเดียวกันได้"); return;
                  }
                  setMergeLooking(true); setMergeError(null); setMergePreview(null);
                  const res = await lookupRequestForMerge(mergeInput.trim());
                  setMergeLooking(false);
                  if (!res) { setMergeError("ไม่พบคำขอนี้"); return; }
                  setMergePreview(res);
                }}
                style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: GOLD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: (mergeLooking || !mergeInput.trim()) ? 0.5 : 1, whiteSpace: "nowrap" }}
              >{mergeLooking ? "..." : "ค้นหา"}</button>
            </div>

            {mergeError && (
              <p style={{ color: "#DC2626", fontSize: 12, margin: "0 0 12px", background: "#FEF2F2", padding: "7px 10px", borderRadius: 8 }}>{mergeError}</p>
            )}

            {/* Preview */}
            {mergePreview && (
              <div style={{ background: "#FFF8F0", border: "1px solid #FCD34D", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>คำขอที่จะถูกปิด</p>
                <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: TEXT, fontFamily: "monospace" }}>{mergePreview.orderNumber}</p>
                <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT2 }}>{mergePreview.customerName} · {mergePreview.customerPhone}</p>
                <p style={{ margin: "0 0 4px", fontSize: 13, color: TEXT2 }}>{mergePreview.deviceModel}</p>
                <p style={{ margin: 0, fontSize: 11, color: TEXT3 }}>สถานะ: {mergePreview.status} · {new Date(mergePreview.createdAt).toLocaleDateString("th-TH")}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setShowMerge(false); setMergePreview(null); setMergeError(null); }}
                style={{ flex: 1, padding: "12px", border: `1px solid ${BORDER}`, borderRadius: "10px", background: "none", color: TEXT2, cursor: "pointer", fontFamily: "inherit", fontSize: "15px", fontWeight: 600 }}
              >ยกเลิก</button>
              <button
                disabled={mergeBusy || !mergePreview}
                onClick={async () => {
                  if (!mergePreview) return;
                  setMergeBusy(true);
                  const res = await mergeRequests(request.id, mergePreview.id);
                  setMergeBusy(false);
                  if (!res.success) { setMergeError(res.error); return; }
                  setShowMerge(false);
                  setMergePreview(null);
                  // Reload to show updated log
                  const updated = await fetchRequest(id);
                  if (updated) setRequest(updated);
                }}
                style={{ flex: 1, padding: "12px", border: "none", borderRadius: "10px", background: (!mergePreview || mergeBusy) ? "#D1D5DB" : "#1a1a2e", color: (!mergePreview || mergeBusy) ? "#6B7280" : GOLD, cursor: (!mergePreview || mergeBusy) ? "default" : "pointer", fontFamily: "inherit", fontSize: "14px", fontWeight: 700 }}
              >{mergeBusy ? "กำลังรวม..." : "รวมและปิดใบซ้ำ"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Merged banner — locks the request */}
      {request.status === "merged" && (() => {
        const mergedLog = [...request.statusLog].reverse().find(l => l.status === "merged" && l.note?.startsWith("รวมเข้า"));
        const primaryOrderNo = mergedLog?.note?.replace("รวมเข้า ", "") ?? null;
        return (
          <div style={{ background: "#FFF8E1", borderBottom: "2px solid #F59E0B", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/><path d="M16 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#92400E" }}>คำขอนี้ถูกรวมแล้ว — อ่านอย่างเดียว</p>
              {primaryOrderNo && (
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#B45309" }}>
                  รวมเข้า{" "}
                  <button
                    onClick={async () => {
                      const { data } = await (await import("@/lib/supabase")).supabase.from("requests" as never).select("id").ilike("order_number", primaryOrderNo).single() as { data: { id: string } | null };
                      if (data?.id) router.push(`/admin/requests/${data.id}`);
                    }}
                    style={{ background: "none", border: "none", color: GOLD, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: 12, textDecoration: "underline" }}
                  >{primaryOrderNo}</button>
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Customer blacklist / no-show warning */}
      {customerHistory && (customerHistory.blacklist || customerHistory.noShowCount > 0) && (
        <div style={{
          background: customerHistory.blacklist ? "#FFF1F2" : "#FFFBEB",
          borderBottom: `2px solid ${customerHistory.blacklist ? "#FDA4AF" : "#FDE68A"}`,
          padding: "10px 16px",
        }}>
          {customerHistory.blacklist ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🚫</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#9F1239" }}>ลูกค้าอยู่ใน Blacklist</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#BE123C" }}>{customerHistory.blacklist.reason}</p>
                {customerHistory.blacklist.notes && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#9F1239" }}>{customerHistory.blacklist.notes}</p>}
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#BE123C", opacity: 0.7 }}>
                  โดย {customerHistory.blacklist.blacklistedBy} · {new Date(customerHistory.blacklist.blacklistedAt).toLocaleDateString("th-TH")}
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={async () => {
                    if (!customerHistory.blacklist) return;
                    const res = await removeFromBlacklist(customerHistory.blacklist.id);
                    if (res.success) setCustomerHistory(h => h ? { ...h, blacklist: null } : h);
                  }}
                  style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #FDA4AF", background: "transparent", color: "#BE123C", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                >นำออก</button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#92400E", flex: 1 }}>
                เคย no_show {customerHistory.noShowCount} ครั้ง จาก {customerHistory.totalRequests} คำขอ
              </p>
              {isOwner && !showBlacklistForm && (
                <button
                  onClick={() => { setShowBlacklistForm(true); setBlReason(""); setBlNotes(""); }}
                  style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 6, border: "1px solid #FDE68A", background: "transparent", color: "#92400E", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                >+ Blacklist</button>
              )}
            </div>
          )}

          {/* Inline blacklist form */}
          {showBlacklistForm && !customerHistory.blacklist && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#fff", borderRadius: 10, border: "1px solid #FDE68A", display: "flex", flexDirection: "column", gap: 7 }}>
              <input
                value={blReason}
                onChange={e => setBlReason(e.target.value)}
                placeholder="เหตุผล (เช่น นัดแล้วหาย 2 ครั้ง)"
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
              <input
                value={blNotes}
                onChange={e => setBlNotes(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม (ไม่บังคับ)"
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  disabled={blSaving || !blReason.trim()}
                  onClick={async () => {
                    if (!blReason.trim()) return;
                    setBlSaving(true);
                    const res = await addToBlacklist(request.customer.phone, request.customer.name, blReason, blNotes);
                    setBlSaving(false);
                    if (res.success) {
                      setShowBlacklistForm(false);
                      const updated = await getCustomerHistory(request.customer.phone);
                      setCustomerHistory(updated);
                    }
                  }}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: blReason.trim() && !blSaving ? "#9F1239" : "#D1D5DB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: blReason.trim() && !blSaving ? "pointer" : "default", fontFamily: "inherit" }}
                >{blSaving ? "กำลังบันทึก..." : "บันทึก Blacklist"}</button>
                <button
                  onClick={() => setShowBlacklistForm(false)}
                  style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "none", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: TEXT2 }}
                >ยกเลิก</button>
              </div>
            </div>
          )}
        </div>
      )}

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <SectionLabel>ข้อมูลเครื่อง</SectionLabel>
              {!editDevice
                ? <button onClick={() => { setDevDraft({ model: request.device.model, storage: request.device.storage, color: request.device.color ?? "", condition: request.device.condition, estimatedPrice: String(request.device.estimatedPrice), conditionDetails: (request.device.conditionDetails ?? []).join("\n") }); setEditDevice(true); }} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: 0, fontFamily: "inherit", marginTop: "-10px" }}><Pencil size={13} /> แก้ไข</button>
                : <EditBar onSave={saveDevice} onCancel={() => setEditDevice(false)} isSaving={saving === "device"} />
              }
            </div>
            {!editDevice ? (
              <>
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
              </>
            ) : (
              <>
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>รุ่นเครื่อง</label>
                <input value={devDraft.model} onChange={e => setDevDraft(p => ({ ...p, model: e.target.value }))} placeholder="เช่น iPhone 14 Pro Max" style={inputSt} />
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ความจุ</label>
                <input value={devDraft.storage} onChange={e => setDevDraft(p => ({ ...p, storage: e.target.value }))} placeholder="เช่น 256GB" style={inputSt} />
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>สี</label>
                <input value={devDraft.color} onChange={e => setDevDraft(p => ({ ...p, color: e.target.value }))} placeholder="เช่น Black" style={inputSt} />
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>สภาพเครื่อง</label>
                <select value={devDraft.condition} onChange={e => setDevDraft(p => ({ ...p, condition: e.target.value }))} style={{ ...inputSt, appearance: "none", WebkitAppearance: "none" }}>
                  <option value="">— เลือกสภาพ —</option>
                  <option value="สภาพดีมาก">สภาพดีมาก</option>
                  <option value="สภาพดี">สภาพดี</option>
                  <option value="สภาพพอใช้">สภาพพอใช้</option>
                  <option value="สภาพปานกลาง">สภาพปานกลาง</option>
                </select>
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>รายละเอียดสภาพเครื่อง (แต่ละบรรทัด = 1 bullet)</label>
                <textarea
                  value={devDraft.conditionDetails}
                  onChange={e => setDevDraft(p => ({ ...p, conditionDetails: e.target.value }))}
                  rows={6}
                  style={{ ...inputSt, resize: "vertical" as const }}
                />
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ราคาประเมิน (บาท)</label>
                <input type="number" value={devDraft.estimatedPrice} onChange={e => setDevDraft(p => ({ ...p, estimatedPrice: e.target.value }))} style={{ ...inputSt, marginBottom: 0 }} />
              </>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <SectionLabel>ข้อมูลลูกค้า</SectionLabel>
              {!editCustomer
                ? <button onClick={() => { setCustDraft({ name: request.customer.name, phone: request.customer.phone, email: request.customer.email ?? "" }); setEditCustomer(true); }} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", padding: 0, fontFamily: "inherit", marginTop: "-10px" }}><Pencil size={13} /> แก้ไข</button>
                : <EditBar onSave={saveCustomer} onCancel={() => setEditCustomer(false)} isSaving={saving === "customer"} />
              }
            </div>
            {!editCustomer ? (
              <>
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
              </>
            ) : (
              <>
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>ชื่อ-นามสกุล</label>
                <input value={custDraft.name} onChange={e => setCustDraft(p => ({ ...p, name: e.target.value }))} placeholder="ชื่อลูกค้า" style={inputSt} />
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>เบอร์โทร</label>
                <input value={custDraft.phone} onChange={e => setCustDraft(p => ({ ...p, phone: e.target.value }))} placeholder="0XX-XXX-XXXX" style={inputSt} type="tel" />
                <label style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, display: "block", marginBottom: "4px" }}>อีเมล (ไม่บังคับ)</label>
                <input value={custDraft.email} onChange={e => setCustDraft(p => ({ ...p, email: e.target.value }))} placeholder="example@email.com" style={{ ...inputSt, marginBottom: 0 }} type="email" />
              </>
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

        {/* B3. Rider Assignment */}
        {(canAssign || request.riderName) && (
          <Card>
            <div style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <SectionLabel>ไรเดอร์รับงาน</SectionLabel>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {request.riderId && (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                      background: staffList.find(s => s.user_id === request.riderId)?.is_online ? "rgba(48,209,88,0.12)" : "rgba(142,142,147,0.12)",
                      color: staffList.find(s => s.user_id === request.riderId)?.is_online ? "#30D158" : "#8E8E93",
                    }}>
                      {staffList.find(s => s.user_id === request.riderId)?.is_online ? "● Online" : "● Offline"}
                    </span>
                  )}
                  {request.riderId && ["confirmed", "pickup_scheduled", "en_route", "inspecting"].includes(request.status) && (
                    <button
                      onClick={() => setShowReclaim(true)}
                      style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 6, border: "1px solid #dc2626", background: "rgba(220,38,38,0.06)", color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      ดึงงานคืน
                    </button>
                  )}
                </div>
              </div>
              {(request.status === "new" || request.status === "pending") ? (
                <p style={{ margin: 0, fontSize: 13, color: "#F59E0B" }}>
                  ⚠️ ต้องยืนยันนัดหมายก่อนมอบหมายไรเดอร์
                </p>
              ) : canAssign ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Smart suggest toggle */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={loadRiderSuggestions}
                      style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid #1a1a2e`, background: showSuggest ? "#1a1a2e" : "transparent", color: showSuggest ? "#F0C040" : "#1a1a2e", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >
                      {suggestLoading ? "⏳ กำลังโหลด..." : "🗺️ ดูไรเดอร์ออนไลน์"}
                    </button>
                    {showSuggest && (
                      <button onClick={() => setShowSuggest(false)} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>ซ่อน</button>
                    )}
                  </div>

                  {/* Smart suggest list */}
                  {showSuggest && !suggestLoading && (
                    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                      {riderSuggestions.length === 0 ? (
                        <p style={{ margin: 0, padding: "12px 14px", fontSize: 13, color: TEXT2 }}>ไม่มีไรเดอร์ออนไลน์ขณะนี้</p>
                      ) : riderSuggestions.map((r, i) => {
                        const modeLabel: Record<string, string> = { idle: "ว่าง", enroute: "กำลังเดินทาง", on_site: "กับลูกค้า", return: "กลับออฟฟิศ" };
                        const modeColor: Record<string, string> = { idle: "#2563eb", enroute: "#ea580c", on_site: "#16a34a", return: "#7c3aed" };
                        const isSelected = riderDraft === r.rider_id;
                        return (
                          <div key={r.rider_id}
                            onClick={() => setRiderDraft(isSelected ? "" : r.rider_id)}
                            style={{
                              padding: "10px 14px", cursor: "pointer",
                              borderBottom: i < riderSuggestions.length - 1 ? `1px solid ${BORDER}` : "none",
                              background: isSelected ? "rgba(37,99,235,0.06)" : "transparent",
                              borderLeft: isSelected ? "3px solid #2563eb" : "3px solid transparent",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{r.name}</span>
                                <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: `${modeColor[r.tracking_mode] ?? "#2563eb"}18`, color: modeColor[r.tracking_mode] ?? "#2563eb" }}>
                                  {modeLabel[r.tracking_mode] ?? r.tracking_mode}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: 10, fontSize: 11, color: TEXT2 }}>
                                {r.distanceKm > 0 && <span>📏 {r.distanceKm} กม. · ~{r.etaMinutes} นาที</span>}
                                <span>✅ {r.jobs_completed} งาน</span>
                                {r.battery_pct != null && <span style={{ color: r.battery_pct < 20 ? "#dc2626" : TEXT2 }}>🔋 {r.battery_pct}%</span>}
                              </div>
                            </div>
                            {isSelected && <span style={{ color: "#2563eb", fontSize: 16 }}>✓</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Manual select fallback + confirm button */}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      value={riderDraft}
                      onChange={e => setRiderDraft(e.target.value)}
                      style={{ flex: 1, padding: "8px 10px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, background: "#F5F5F7", fontFamily: "inherit", outline: "none" }}
                    >
                      <option value="">— เลือกไรเดอร์ —</option>
                      {staffList.map(s => (
                        <option key={s.user_id} value={s.user_id}>
                          {s.is_online ? "● " : "○ "}{s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleRiderAssign}
                      disabled={riderSaving || !riderDraft || riderDraft === (request.riderId ?? "")}
                      style={{
                        padding: "8px 14px", borderRadius: 10, border: "none",
                        background: "#1a1a2e", color: "#F0C040", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                        opacity: (riderSaving || !riderDraft || riderDraft === (request.riderId ?? "")) ? 0.5 : 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {riderSaving ? "..." : "มอบหมาย"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%",
                    background: staffList.find(s => s.user_id === request.riderId)?.is_online ? "#30D158" : "#8E8E93",
                  }} />
                  <p style={{ color: TEXT2, fontSize: 13, margin: 0 }}>
                    {request.riderName ?? "ยังไม่ได้มอบหมายไรเดอร์"}
                  </p>
                </div>
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

        {/* I. Inspection */}
        {(["confirmed", "pickup_scheduled", "inspecting", "en_route", "price_negotiation", "contracting", "awaiting_transfer", "completed", "rejected"] as RequestStatus[]).includes(request.status) && (
          <Card ref={inspectionRef}>
            <div style={{ padding: "16px" }}>
              <div style={{ marginBottom: 12 }}>
                <SectionLabel>ผลการตรวจสภาพ</SectionLabel>
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

              {request.riderId ? (
                request.inspection?.inspectedAt ? (
                  <div style={{ marginTop: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, padding: "7px 10px", marginBottom: 14 }}>
                      <span style={{ fontSize: 13 }}>📋</span>
                      <p style={{ margin: 0, fontSize: 12, color: "#0369A1", fontWeight: 600 }}>
                        ผลตรวจสภาพจากเจ้าหน้าที่หน้างาน
                        {request.riderName ? ` · ${request.riderName}` : ""}
                        {request.inspection.inspectedAt ? ` · ${fmtDateTime(request.inspection.inspectedAt)} น.` : ""}
                      </p>
                    </div>
                    {(request.inspection.criteria ?? []).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>สภาพที่ตรวจพบ</p>
                        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 28px", background: "#F8F8FA", borderBottom: `1px solid ${BORDER}`, padding: "5px 10px", gap: 4 }}>
                            {["รายการ", "ที่แจ้ง", "จริง", ""].map(h => (
                              <span key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT3 }}>{h}</span>
                            ))}
                          </div>
                          {request.inspection.criteria.map((c, i) => (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 28px", padding: "7px 10px", gap: 4, borderBottom: i < (request.inspection?.criteria.length ?? 0) - 1 ? `1px solid ${BORDER}` : "none", background: c.pass ? "#fff" : "#FFF8F8" }}>
                              <span style={{ fontSize: 11, color: TEXT2, fontWeight: 500 }}>{c.label}</span>
                              <span style={{ fontSize: 11, color: TEXT3 }}>{c.stated}</span>
                              <span style={{ fontSize: 11, color: TEXT, fontWeight: c.pass ? 400 : 600 }}>{c.actual}</span>
                              <span style={{ fontSize: 13, color: c.pass ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{c.pass ? "✓" : "✗"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(request.inspection.imei || request.inspection.serial || request.inspection.batteryHealth || request.inspection.batteryCycles || request.inspection.warrantyExpiry || request.device.color) && (
                      <div style={{ marginBottom: 16, background: "#F8F8FA", borderRadius: 8, padding: "10px 12px" }}>
                        <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>รายละเอียดเครื่อง</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 5, columnGap: 12 }}>
                          {([
                            request.device.color           ? { label: "สี",         value: request.device.color,                                mono: false } : null,
                            request.inspection.imei         ? { label: "IMEI",       value: request.inspection.imei,                             mono: true  } : null,
                            request.inspection.serial       ? { label: "Serial",     value: request.inspection.serial,                           mono: true  } : null,
                            request.inspection.batteryHealth ? { label: "แบตเตอรี่", value: `${request.inspection.batteryHealth}%`,              mono: false } : null,
                            request.inspection.batteryCycles ? { label: "รอบชาร์จ",  value: `${request.inspection.batteryCycles} รอบ`,           mono: false } : null,
                            request.inspection.warrantyExpiry ? { label: "ประกัน",   value: fmtDate(request.inspection.warrantyExpiry),          mono: false } : null,
                          ] as Array<{ label: string; value: string; mono: boolean } | null>).filter(Boolean).map(row => (
                            <div key={row!.label}>
                              <span style={{ fontSize: 10, color: TEXT3, display: "block" }}>{row!.label}</span>
                              <span style={{ fontSize: 12, color: TEXT, fontWeight: 600, fontFamily: row!.mono ? "monospace" : "inherit", letterSpacing: row!.mono ? "0.03em" : undefined }}>{row!.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {((request.inspection as { conditionGrade?: string; conditionLabel?: string }).conditionGrade ||
                      (request.inspection as { conditionGrade?: string; conditionLabel?: string }).conditionLabel) && (() => {
                      const grade = (request.inspection as { conditionGrade?: string }).conditionGrade;
                      const label = (request.inspection as { conditionLabel?: string }).conditionLabel;
                      const gradeColor: Record<string, string> = { A: "#22c55e", "A-": "#84cc16", "B+": "#eab308", B: "#f97316", "B-": "#fb923c", C: "#ef4444" };
                      const color = grade ? (gradeColor[grade] ?? "#888") : "#888";
                      return (
                        <div style={{ marginBottom: 16, borderRadius: 10, border: `1.5px solid ${color}40`, background: `${color}0d`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                          {grade && (
                            <div style={{ minWidth: 44, height: 44, borderRadius: 10, background: `${color}22`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "monospace" }}>{grade}</span>
                            </div>
                          )}
                          <div>
                            <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>ผลการประเมินจากไรเดอร์</p>
                            {label && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</p>}
                          </div>
                        </div>
                      );
                    })()}
                    {request.inspection.sickw_report && (() => {
                      const raw = request.inspection!.sickw_report!;
                      const map: Record<string, string> = {};
                      for (const line of raw.split("\n")) {
                        const idx = line.indexOf(": ");
                        if (idx > 0) map[line.slice(0, idx).trim()] = line.slice(idx + 2).trim();
                      }
                      const icloudLock   = (map["iCloud Lock"]   ?? "").toLowerCase();
                      const icloudStatus = (map["iCloud Status"] ?? "").toLowerCase();
                      const mdm          = (map["MDM Lock"]       ?? "").toLowerCase();
                      const issues: string[] = [];
                      if (icloudLock === "on")                        issues.push("iCloud Lock เปิดอยู่ — เครื่องล็อคกับบัญชี Apple");
                      if (icloudStatus === "on")                      issues.push("ยังไม่ Sign Out iCloud — ต้องปลดก่อนรับซื้อ");
                      if (icloudLock.includes("lost") || icloudStatus.includes("lost")) issues.push("Find My / Lost Mode");
                      if (mdm === "on")                               issues.push("MDM Lock เปิดอยู่ — เครื่องล็อคโดยองค์กร");
                      const passed = issues.length === 0;
                      return (
                        <div style={{ marginBottom: 16 }}>
                          <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>ผลตรวจสอบ Apple</p>
                          <div style={{ borderRadius: 10, border: `1px solid ${passed ? "#86efac" : "#fca5a5"}`, background: passed ? "#F0FDF4" : "#FFF5F5", padding: "10px 12px", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: passed ? 0 : 6 }}>
                              <span style={{ fontSize: 15 }}>{passed ? "✅" : "🚫"}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: passed ? "#166534" : "#991b1b" }}>
                                {passed ? "ผ่านการตรวจสอบ" : `ไม่ผ่าน — ${issues.join(", ")}`}
                              </span>
                            </div>
                            {[
                              ["รุ่น",        map["Device Configuration"] || map["Model Name"]],
                              ["iCloud",      map["iCloud Lock"] ?? map["iCloud Status"]],
                              ["MDM Lock",    map["MDM Lock"]],
                              ["Carrier Lock",map["Unlock Status"] ?? map["Sim-Lock"]],
                              ["ประกัน",      map["Limited Warranty"]],
                              ["หมดประกัน",   map["Coverage End Date"] ?? map["Coverage End"]],
                            ].filter(([, v]) => v).map(([label, value]) => (
                              <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                                <span style={{ color: "#6B7280" }}>{label}</span>
                                <span style={{ fontWeight: 500 }}>{value}</span>
                              </div>
                            ))}
                          </div>
                          <details style={{ fontSize: 12 }}>
                            <summary style={{ cursor: "pointer", color: "#0369A1", userSelect: "none" }}>ดูรายงานเต็ม</summary>
                            <pre style={{ margin: "6px 0 0", padding: "10px 12px", borderRadius: 8, background: "#F8F8FA", fontSize: 11, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{raw}</pre>
                          </details>
                        </div>
                      );
                    })()}
                    {(request.inspection.functionalTests ?? []).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>ทดสอบฟังก์ชัน</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {request.inspection.functionalTests!.map((t, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: t.pass ? "#F0FDF4" : "#FFF5F5", border: `1px solid ${t.pass ? "#86efac" : "#fca5a5"}`, color: t.pass ? "#166534" : "#991b1b" }}>
                              <span style={{ fontSize: 10, lineHeight: 1 }}>{t.pass ? "✓" : "✗"}</span>
                              {t.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>ปัญหาที่พบ</p>
                      {(request.inspection.issues ?? []).length === 0
                        ? <p style={{ margin: 0, fontSize: 12, color: TEXT3 }}>ไม่พบปัญหา</p>
                        : <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {request.inspection.issues.map((iss, i) => (
                              <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "#FFF5F5", border: "1px solid #fca5a5", color: "#991b1b" }}>{iss}</span>
                            ))}
                          </div>
                      }
                    </div>
                    {(request.inspection.photos ?? []).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>รูปภาพจากไรเดอร์ ({request.inspection.photos.length})</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                          {request.inspection.photos.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`รูป ${i + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, display: "block", border: `1px solid ${BORDER}` }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ background: "#F8F8FA", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
                      <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>ราคาที่ไรเดอร์ประเมิน</p>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {request.inspection.actualPrice !== request.inspection.originalPrice ? (
                          <>
                            <span style={{ fontSize: 12, color: TEXT3, textDecoration: "line-through" }}>฿{request.inspection.originalPrice.toLocaleString("th-TH")}</span>
                            <span style={{ fontSize: 11, color: TEXT3 }}>→</span>
                            <span style={{ fontSize: 16, fontWeight: 700, color: request.inspection.actualPrice < request.inspection.originalPrice ? "#991b1b" : "#166534" }}>฿{request.inspection.actualPrice.toLocaleString("th-TH")}</span>
                          </>
                        ) : (
                          <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>฿{request.inspection.actualPrice.toLocaleString("th-TH")}</span>
                        )}
                      </div>
                      {request.inspection.priceReason && (
                        <p style={{ margin: "5px 0 0", fontSize: 12, color: TEXT2, fontStyle: "italic" }}>"{request.inspection.priceReason}"</p>
                      )}
                    </div>
                    {request.status === "inspecting" && (() => {
                      const insp = request.inspection as { adminApprovedAt?: string; adminPriceGuidance?: { priceMin?: number | null; priceMax?: number | null; note?: string | null } };
                      const approved = !!insp.adminApprovedAt;
                      if (approved) {
                        const g = insp.adminPriceGuidance;
                        return (
                          <div style={{ borderRadius: 10, background: "#F0FDF4", border: "1px solid #86efac", padding: "12px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: g ? 10 : 0 }}>
                              <span style={{ fontSize: 15 }}>✅</span>
                              <div>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#166534" }}>อนุมัติผลตรวจแล้ว — ไรเดอร์เสนอราคาได้แล้ว</p>
                              </div>
                            </div>
                            {g && (g.priceMin || g.priceMax || g.note) && (
                              <div style={{ borderTop: "1px solid #86efac", paddingTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                                {(g.priceMin || g.priceMax) && (
                                  <p style={{ margin: 0, fontSize: 12, color: "#166534" }}>
                                    📊 ช่วงราคาที่แนะนำ: <strong>{g.priceMin ? `฿${g.priceMin.toLocaleString("th-TH")}` : "—"} – {g.priceMax ? `฿${g.priceMax.toLocaleString("th-TH")}` : "—"}</strong>
                                  </p>
                                )}
                                {g.note && <p style={{ margin: 0, fontSize: 12, color: "#166534" }}>📝 {g.note}</p>}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div style={{ borderRadius: 10, border: "1.5px solid #FCD34D", background: "#FFFBEB", padding: "14px" }}>
                          <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#92400E" }}>
                            ⏳ รอแอดมินอนุมัติ — ไรเดอร์จะยังเสนอราคาไม่ได้
                          </p>
                          <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.05em" }}>ช่วงราคาที่แนะนำให้ไรเดอร์เสนอ (ไม่บังคับ)</p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "#92400E", marginBottom: 3 }}>ต่ำสุด (฿)</label>
                              <input
                                type="number" placeholder="เช่น 35000" value={guidanceMin}
                                onChange={e => setGuidanceMin(e.target.value)}
                                style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #FCD34D", background: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: 11, color: "#92400E", marginBottom: 3 }}>สูงสุด (฿)</label>
                              <input
                                type="number" placeholder="เช่น 38000" value={guidanceMax}
                                onChange={e => setGuidanceMax(e.target.value)}
                                style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #FCD34D", background: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                              />
                            </div>
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ display: "block", fontSize: 11, color: "#92400E", marginBottom: 3 }}>หมายเหตุถึงไรเดอร์ (ไม่บังคับ)</label>
                            <input
                              placeholder="เช่น แบตต่ำ ควรลดราคา, สภาพดีมาก ต่อราคาได้เต็มที่" value={guidanceNote}
                              onChange={e => setGuidanceNote(e.target.value)}
                              style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "1px solid #FCD34D", background: "#fff", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
                            />
                          </div>
                          <button
                            disabled={approvingInspection}
                            onClick={async () => {
                              setApprovingInspection(true);
                              const res = await adminApproveInspection(id, {
                                priceMin:  guidanceMin  ? parseInt(guidanceMin)  : undefined,
                                priceMax:  guidanceMax  ? parseInt(guidanceMax)  : undefined,
                                note:      guidanceNote || undefined,
                              });
                              setApprovingInspection(false);
                              if (!res.success) alert(res.error ?? "เกิดข้อผิดพลาด");
                            }}
                            style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: approvingInspection ? "#D1D5DB" : "#16a34a", color: "#fff", fontSize: 14, fontWeight: 700, cursor: approvingInspection ? "wait" : "pointer", fontFamily: "inherit" }}
                          >
                            {approvingInspection ? "กำลังอนุมัติ..." : "✓ อนุมัติผลตรวจ — ให้ไรเดอร์เสนอราคาได้"}
                          </button>

                          {/* ขอให้แก้ไขผลตรวจ */}
                          {!showRevisionInput ? (
                            <button onClick={() => { setShowRevisionInput(true); setShowCancelInput(false); }}
                              style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "1.5px solid #F59E0B", background: "transparent", color: "#92400E", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}>
                              ⚠️ ขอให้แก้ไขผลตรวจ
                            </button>
                          ) : (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                              <textarea value={revisionNote} onChange={e => setRevisionNote(e.target.value)}
                                placeholder="ระบุสิ่งที่ต้องแก้ไข เช่น รูปภาพไม่ชัด, Battery Health ไม่ตรง"
                                rows={2} maxLength={300}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #FCD34D", background: "#FFFBEB", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "none", boxSizing: "border-box" }} />
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => setShowRevisionInput(false)}
                                  style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "1px solid #D1D5DB", background: "transparent", color: "#6B7280", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                                  ยกเลิก
                                </button>
                                <button disabled={!revisionNote.trim() || submittingRevision}
                                  onClick={async () => {
                                    setSubmittingRevision(true);
                                    const res = await adminRequestInspectionRevision(id, revisionNote);
                                    setSubmittingRevision(false);
                                    if (!res.success) { alert(res.error ?? "เกิดข้อผิดพลาด"); return; }
                                    setShowRevisionInput(false); setRevisionNote("");
                                  }}
                                  style={{ flex: 2, padding: "8px 0", borderRadius: 7, border: "none", background: submittingRevision || !revisionNote.trim() ? "#D1D5DB" : "#F59E0B", color: "#fff", fontSize: 13, fontWeight: 700, cursor: submittingRevision || !revisionNote.trim() ? "default" : "pointer", fontFamily: "inherit" }}>
                                  {submittingRevision ? "กำลังส่ง..." : "ส่งให้ไรเดอร์แก้ไข"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ยกเลิกงาน */}
                          {!showCancelInput ? (
                            <button onClick={() => { setShowCancelInput(true); setShowRevisionInput(false); }}
                              style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "1.5px solid #EF4444", background: "transparent", color: "#991B1B", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginTop: 6 }}>
                              ✕ ยกเลิกงานนี้
                            </button>
                          ) : (
                            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                              <input value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                                placeholder="ระบุเหตุผล เช่น เครื่องไม่เข้าเงื่อนไข"
                                maxLength={200}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: "1px solid #FCA5A5", background: "#FEF2F2", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => setShowCancelInput(false)}
                                  style={{ flex: 1, padding: "8px 0", borderRadius: 7, border: "1px solid #D1D5DB", background: "transparent", color: "#6B7280", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                                  ยกเลิก
                                </button>
                                <button disabled={!cancelReason.trim() || cancellingJob}
                                  onClick={async () => {
                                    setCancellingJob(true);
                                    const res = await adminCancelAtInspection(id, cancelReason);
                                    setCancellingJob(false);
                                    if (!res.success) { alert(res.error ?? "เกิดข้อผิดพลาด"); return; }
                                    setShowCancelInput(false); setCancelReason("");
                                  }}
                                  style={{ flex: 2, padding: "8px 0", borderRadius: 7, border: "none", background: cancellingJob || !cancelReason.trim() ? "#D1D5DB" : "#EF4444", color: "#fff", fontSize: 13, fontWeight: 700, cursor: cancellingJob || !cancelReason.trim() ? "default" : "pointer", fontFamily: "inherit" }}>
                                  {cancellingJob ? "กำลังยกเลิก..." : "ยืนยันยกเลิกงาน"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "28px 0 16px", color: TEXT3 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: TEXT2 }}>รอไรเดอร์ส่งผลตรวจสภาพ</p>
                    <p style={{ margin: 0, fontSize: 12 }}>ผลจะปรากฏที่นี่เมื่อไรเดอร์บันทึกข้อมูล</p>
                  </div>
                )
              ) : request.inspection?.inspectedAt ? (
                /* Walk-in: inspection saved — show full read-only report */
                <div style={{ marginTop: 4 }}>
                  {/* Source label */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 8, padding: "7px 10px", marginBottom: 14 }}>
                    <span style={{ fontSize: 13 }}>📋</span>
                    <p style={{ margin: 0, fontSize: 12, color: "#0369A1", fontWeight: 600, flex: 1 }}>
                      แอดมินบันทึกโดยตรง · {fmtDateTime(request.inspection.inspectedAt)} น.
                    </p>
                    <button
                      onClick={() => setRequest(prev => prev ? { ...prev, inspection: { ...prev.inspection!, inspectedAt: "" } } : prev)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#0369A1", fontFamily: "inherit", textDecoration: "underline", padding: 0, flexShrink: 0 }}
                    >
                      แก้ไข
                    </button>
                  </div>

                  {/* Criteria */}
                  {(request.inspection.criteria ?? []).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>สภาพที่ตรวจพบ</p>
                      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 28px", background: "#F8F8FA", borderBottom: `1px solid ${BORDER}`, padding: "5px 10px", gap: 4 }}>
                          {["รายการ", "ที่แจ้ง", "จริง", ""].map(h => (
                            <span key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: TEXT3 }}>{h}</span>
                          ))}
                        </div>
                        {request.inspection.criteria.map((c, i) => (
                          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 28px", padding: "7px 10px", gap: 4, borderBottom: i < (request.inspection?.criteria.length ?? 0) - 1 ? `1px solid ${BORDER}` : "none", background: c.pass ? "#fff" : "#FFF8F8" }}>
                            <span style={{ fontSize: 11, color: TEXT2, fontWeight: 500 }}>{c.label}</span>
                            <span style={{ fontSize: 11, color: TEXT3 }}>{c.stated}</span>
                            <span style={{ fontSize: 11, color: TEXT, fontWeight: c.pass ? 400 : 600 }}>{c.actual}</span>
                            <span style={{ fontSize: 13, color: c.pass ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{c.pass ? "✓" : "✗"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Device details */}
                  {(request.inspection.imei || request.inspection.serial || request.inspection.batteryHealth || request.inspection.batteryCycles || request.inspection.warrantyExpiry || request.device.color) && (
                    <div style={{ marginBottom: 16, background: "#F8F8FA", borderRadius: 8, padding: "10px 12px" }}>
                      <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>รายละเอียดเครื่อง</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 5, columnGap: 12 }}>
                        {([
                          request.device.color             ? { label: "สี",         value: request.device.color,                               mono: false } : null,
                          request.inspection.imei          ? { label: "IMEI",       value: request.inspection.imei,                            mono: true  } : null,
                          request.inspection.serial        ? { label: "Serial",     value: request.inspection.serial,                          mono: true  } : null,
                          request.inspection.batteryHealth ? { label: "แบตเตอรี่", value: `${request.inspection.batteryHealth}%`,             mono: false } : null,
                          request.inspection.batteryCycles ? { label: "รอบชาร์จ",  value: `${request.inspection.batteryCycles} รอบ`,          mono: false } : null,
                          request.inspection.warrantyExpiry ? { label: "ประกัน",   value: fmtDate(request.inspection.warrantyExpiry),         mono: false } : null,
                        ] as Array<{ label: string; value: string; mono: boolean } | null>).filter(Boolean).map(row => (
                          <div key={row!.label}>
                            <span style={{ fontSize: 10, color: TEXT3, display: "block" }}>{row!.label}</span>
                            <span style={{ fontSize: 12, color: TEXT, fontWeight: 600, fontFamily: row!.mono ? "monospace" : "inherit", letterSpacing: row!.mono ? "0.03em" : undefined }}>{row!.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grade / condition */}
                  {((request.inspection as { conditionGrade?: string; conditionLabel?: string }).conditionGrade ||
                    (request.inspection as { conditionGrade?: string; conditionLabel?: string }).conditionLabel) && (() => {
                    const grade = (request.inspection as { conditionGrade?: string }).conditionGrade;
                    const label = (request.inspection as { conditionLabel?: string }).conditionLabel;
                    const gradeColor: Record<string, string> = { A: "#22c55e", "A-": "#84cc16", "B+": "#eab308", B: "#f97316", "B-": "#fb923c", C: "#ef4444" };
                    const color = grade ? (gradeColor[grade] ?? "#888") : "#888";
                    return (
                      <div style={{ marginBottom: 16, borderRadius: 10, border: `1.5px solid ${color}40`, background: `${color}0d`, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                        {grade && (
                          <div style={{ minWidth: 44, height: 44, borderRadius: 10, background: `${color}22`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "monospace" }}>{grade}</span>
                          </div>
                        )}
                        <div>
                          <p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>ผลการประเมิน</p>
                          {label && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>{label}</p>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* SICKW */}
                  {request.inspection.sickw_report && (() => {
                    const raw = request.inspection!.sickw_report!;
                    const map: Record<string, string> = {};
                    for (const line of raw.split("\n")) {
                      const idx = line.indexOf(": ");
                      if (idx > 0) map[line.slice(0, idx).trim()] = line.slice(idx + 2).trim();
                    }
                    const icloudLock   = (map["iCloud Lock"]   ?? "").toLowerCase();
                    const icloudStatus = (map["iCloud Status"] ?? "").toLowerCase();
                    const mdm          = (map["MDM Lock"]       ?? "").toLowerCase();
                    const issues: string[] = [];
                    if (icloudLock === "on")                        issues.push("iCloud Lock เปิดอยู่ — เครื่องล็อคกับบัญชี Apple");
                    if (icloudStatus === "on")                      issues.push("ยังไม่ Sign Out iCloud — ต้องปลดก่อนรับซื้อ");
                    if (icloudLock.includes("lost") || icloudStatus.includes("lost")) issues.push("Find My / Lost Mode");
                    if (mdm === "on")                               issues.push("MDM Lock เปิดอยู่ — เครื่องล็อคโดยองค์กร");
                    const passed = issues.length === 0;
                    return (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>ผลตรวจสอบ Apple</p>
                        <div style={{ borderRadius: 10, border: `1px solid ${passed ? "#86efac" : "#fca5a5"}`, background: passed ? "#F0FDF4" : "#FFF5F5", padding: "10px 12px", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: passed ? 0 : 6 }}>
                            <span style={{ fontSize: 15 }}>{passed ? "✅" : "🚫"}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: passed ? "#166534" : "#991b1b" }}>
                              {passed ? "ผ่านการตรวจสอบ" : `ไม่ผ่าน — ${issues.join(", ")}`}
                            </span>
                          </div>
                          {[
                            ["รุ่น",         map["Device Configuration"] || map["Model Name"]],
                            ["iCloud",       map["iCloud Lock"] ?? map["iCloud Status"]],
                            ["MDM Lock",     map["MDM Lock"]],
                            ["Carrier Lock", map["Unlock Status"] ?? map["Sim-Lock"]],
                            ["ประกัน",       map["Limited Warranty"]],
                            ["หมดประกัน",    map["Coverage End Date"] ?? map["Coverage End"]],
                          ].filter(([, v]) => v).map(([label, value]) => (
                            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                              <span style={{ color: "#6B7280" }}>{label}</span>
                              <span style={{ fontWeight: 500 }}>{value}</span>
                            </div>
                          ))}
                        </div>
                        <details style={{ fontSize: 12 }}>
                          <summary style={{ cursor: "pointer", color: "#0369A1", userSelect: "none" }}>ดูรายงานเต็ม</summary>
                          <pre style={{ margin: "6px 0 0", padding: "10px 12px", borderRadius: 8, background: "#F8F8FA", fontSize: 11, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{raw}</pre>
                        </details>
                      </div>
                    );
                  })()}

                  {/* Functional tests */}
                  {(request.inspection.functionalTests ?? []).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>ทดสอบฟังก์ชัน</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {request.inspection.functionalTests!.map((t, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: t.pass ? "#F0FDF4" : "#FFF5F5", border: `1px solid ${t.pass ? "#86efac" : "#fca5a5"}`, color: t.pass ? "#166534" : "#991b1b" }}>
                            <span style={{ fontSize: 10, lineHeight: 1 }}>{t.pass ? "✓" : "✗"}</span>
                            {t.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Accessories */}
                  {((request.inspection as { accessories?: string[] }).accessories ?? []).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>อุปกรณ์ที่ให้มา</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {(request.inspection as { accessories?: string[] }).accessories!.map((a, i) => (
                          <span key={i} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "#F0F9FF", border: "1px solid #BAE6FD", color: "#0369A1" }}>{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Photos */}
                  {(request.inspection.photos ?? []).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ margin: "0 0 7px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>รูปภาพ ({request.inspection.photos.length})</p>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                        {request.inspection.photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`รูป ${i + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 6, display: "block", border: `1px solid ${BORDER}` }} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price */}
                  <div style={{ background: "#F8F8FA", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: TEXT3 }}>ราคารับซื้อ</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {request.inspection.actualPrice !== request.inspection.originalPrice && request.inspection.originalPrice > 0 ? (
                        <>
                          <span style={{ fontSize: 12, color: TEXT3, textDecoration: "line-through" }}>฿{request.inspection.originalPrice.toLocaleString("th-TH")}</span>
                          <span style={{ fontSize: 11, color: TEXT3 }}>→</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>฿{request.inspection.actualPrice.toLocaleString("th-TH")}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>฿{request.inspection.actualPrice.toLocaleString("th-TH")}</span>
                      )}
                    </div>
                    {request.inspection.priceReason && (
                      <p style={{ margin: "5px 0 0", fontSize: 12, color: TEXT2, fontStyle: "italic" }}>"{request.inspection.priceReason}"</p>
                    )}
                  </div>

                  {/* Next step */}
                  {request.status === "contracting" && (
                    <button
                      onClick={() => router.push(`/admin/requests/${id}/contract`)}
                      style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: GOLD, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit" }}
                    >
                      ออกสัญญาซื้อขาย + ใบรับเงิน →
                    </button>
                  )}
                  {request.status === "rejected" && (
                    <div style={{ textAlign: "center", padding: "10px 0", color: TEXT3, fontSize: 13 }}>งานถูกปิด — ปฏิเสธการรับซื้อ</div>
                  )}
                </div>
              ) : request.status === "rejected" ? (
                /* Walk-in: rejected before inspection — don't show form */
                <div style={{ textAlign: "center", padding: "10px 0", color: TEXT3, fontSize: 13 }}>ปิดคำขอแล้ว — ไม่ได้ตรวจสภาพ</div>
              ) : (
                /* Walk-in: no inspection yet — show form */
                <InspectionForm
                  requestId={id}
                  model={request.device.model}
                  selections={request.device.selections ?? {}}
                  estimatedPrice={request.device.estimatedPrice}
                  deviceColor={request.device.color ?? ""}
                  existing={request.inspection}
                  onSave={handleInspectionSave}
                  saving={inspSaving}
                />
              )}
            </div>
          </Card>
        )}

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
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", minWidth: 0 }}>
                  <MapPin size={14} color={GOLD} style={{ marginTop: 2, flexShrink: 0 }} />
                  {request.appointment.method === "rider" ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(request.appointment.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: GOLD, fontSize: "13px", margin: 0, fontWeight: 600, wordBreak: "break-all", minWidth: 0, flex: 1 }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{request.appointment.location} <ExternalLink size={11} style={{ flexShrink: 0 }} /></span>
                    </a>
                  ) : (
                    <p style={{ color: TEXT2, fontSize: "13px", margin: 0, wordBreak: "break-all" }}>{request.appointment.location}</p>
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
                <input value={apptDraft.location} onChange={e => setApptDraft(p => ({ ...p, location: e.target.value }))} placeholder="ระบุสถานที่ หรือวาง Google Maps link" style={{ ...inputSt, marginBottom: "6px" }} />
                {apptDraft.location.includes("maps.app.goo.gl") && (
                  <p style={{ color: "#B45309", fontSize: "12px", margin: "0 0 10px", lineHeight: 1.5 }}>
                    ⚠️ ลิ้งสั้นนี้อ่านพิกัดไม่ได้ — ให้เปิดลิ้งในเบราว์เซอร์แล้วคัดลอก URL จาก address bar มาวางแทน หรือคัดลอกตัวเลขพิกัด เช่น <strong>13.778, 100.492</strong>
                  </p>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button onClick={saveAppt} disabled={saving === "appt"} style={{ flex: 1, background: GOLD, border: "none", borderRadius: "10px", color: "#fff", fontWeight: 700, fontSize: "14px", padding: "12px 0", cursor: "pointer", opacity: saving === "appt" ? 0.6 : 1, fontFamily: "inherit" }}>
                    {saving === "appt" ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                  <button onClick={() => setEditAppt(false)} style={{ flex: 1, background: "none", border: `1px solid ${BORDER}`, borderRadius: "10px", color: TEXT2, fontWeight: 500, fontSize: "14px", padding: "12px 0", cursor: "pointer", fontFamily: "inherit" }}>
                    ยกเลิก
                  </button>
                </div>
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
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <CreditCard size={14} color={GOLD} />
                  <span style={{ color: TEXT, fontSize: "14px", fontWeight: 500 }}>{PAY_LABELS[request.payment.method]}</span>
                </div>
                {request.payment.method === "transfer" && (request.payment.bankName || request.payment.accountName || request.payment.accountNumber) && (() => {
                  const rows: { label: string; value: string; field: string }[] = [
                    ...(request.payment.bankName    ? [{ label: "ธนาคาร",    value: request.payment.bankName,    field: "bank" }] : []),
                    ...(request.payment.accountName ? [{ label: "ชื่อบัญชี", value: request.payment.accountName, field: "accName" }] : []),
                    ...(request.payment.accountNumber ? [{ label: "เลขบัญชี", value: request.payment.accountNumber, field: "accNo" }] : []),
                  ];
                  const allText = [
                    `ธนาคาร: ${request.payment.bankName || "—"}`,
                    `ชื่อบัญชี: ${request.payment.accountName || "—"}`,
                    `เลขบัญชี: ${request.payment.accountNumber || "—"}`,
                    `จำนวนโอน: ฿${(totalActual ?? request.device.estimatedPrice).toLocaleString("th-TH")} บาท`,
                  ].join("\n");
                  return (
                    <div style={{ background: "#F5F5F7", borderRadius: "10px", padding: "10px 12px", marginBottom: "8px" }}>
                      {rows.map(({ label, value, field }) => (
                        <div key={field} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <div>
                            <span style={{ color: TEXT3, fontSize: "11px", display: "block" }}>{label}</span>
                            <span style={{ color: TEXT, fontSize: "13px", fontWeight: field === "accNo" ? 700 : 500, letterSpacing: field === "accNo" ? "0.05em" : undefined, fontFamily: field === "accNo" ? "monospace" : undefined }}>{value}</span>
                          </div>
                          <button
                            onClick={() => copyText(value, field)}
                            style={{ background: "none", border: `1px solid ${copiedField === field ? "#86efac" : BORDER}`, borderRadius: "6px", padding: "3px 8px", cursor: "pointer", fontSize: "11px", fontWeight: 600, color: copiedField === field ? "#16a34a" : TEXT3, fontFamily: "inherit", transition: "all 0.2s", whiteSpace: "nowrap" }}
                          >
                            {copiedField === field ? "✓ คัดลอก" : <><Copy size={11} style={{ display: "inline", marginRight: 3 }} />คัดลอก</>}
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => copyText(allText, "all")}
                        style={{ width: "100%", marginTop: "4px", padding: "7px", borderRadius: "8px", border: "none", background: copiedField === "all" ? "#D1FAE5" : GOLD, color: copiedField === "all" ? "#065F46" : "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}
                      >
                        {copiedField === "all" ? "✓ คัดลอกทั้งหมดแล้ว" : "คัดลอกข้อมูลโอนเงินทั้งหมด"}
                      </button>
                    </div>
                  );
                })()}
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


                {/* J. Contract button — rider job: view only; branch job: generate */}
        {(["contracting", "awaiting_transfer", "completed"] as RequestStatus[]).includes(request.status) && (
          request.riderId ? (
            request.contractUrl ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => openAdminDoc(request.contractUrl!)}
                  style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "13px", color: TEXT, fontSize: 14, fontWeight: 600, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>ดูสัญญาซื้อขาย <ExternalLink size={13} /></span>
                </button>
                {request.receiptUrl && (
                  <button
                    onClick={() => openAdminDoc(request.receiptUrl!)}
                    style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "13px", color: TEXT, fontSize: 14, fontWeight: 600, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit" }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>ดูใบรับเงิน <ExternalLink size={13} /></span>
                  </button>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px", textAlign: "center" }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: TEXT2 }}>รอไรเดอร์ออกเอกสาร</p>
                <p style={{ margin: 0, fontSize: 12, color: TEXT3 }}>สัญญาและใบรับเงินจะปรากฏที่นี่เมื่อไรเดอร์บันทึก</p>
              </div>
            )
          ) : (
            <button
              onClick={() => router.push(`/admin/requests/${id}/contract`)}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", background: GOLD, border: "none", borderRadius: 12, padding: "14px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", marginBottom: 10 }}
            >
              ออกสัญญาซื้อขาย + ใบรับเงิน
            </button>
          )
        )}
        {(["contracting", "awaiting_transfer", "completed"] as RequestStatus[]).includes(request.status) && (
          <Card>
            <div style={{ padding: "16px" }}>
              <SectionLabel>สัญญาและการชำระเงิน</SectionLabel>

              {/* Contract signing */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: 0 }}>สัญญาซื้อขาย</p>
                  {request.payment.contractSignedAt ? (
                    <p style={{ color: "#059669", fontSize: 12, margin: "2px 0 0" }}>
                      ✅ ออกเอกสารแล้ว · {fmtDateTime(request.payment.contractSignedAt)} น.
                    </p>
                  ) : (
                    <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>ยังไม่ได้บันทึก</p>
                  )}
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>

                {/* Finance action banner — shown when transfer is pending slip */}
                {request.status === "awaiting_transfer" &&
                 request.payment.method === "transfer" &&
                 !request.payment.slipUrl && (
                  <div ref={financeRef} style={{ marginBottom: 14 }}>
                    <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#EF4444" }}>รอดำเนินการ</p>
                    <p style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: TEXT }}>
                      โอนเงิน ฿{(request.inspection?.actualPrice ?? request.device.estimatedPrice).toLocaleString("th-TH")} ให้ลูกค้า
                    </p>
                    {(request.payment.bankName || request.payment.accountName || request.payment.accountNumber) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {request.payment.bankName && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: 12, color: TEXT3, minWidth: 72 }}>ธนาคาร</span>
                            <span style={{ fontSize: 12, color: TEXT2, fontWeight: 600 }}>{request.payment.bankName}</span>
                          </div>
                        )}
                        {request.payment.accountName && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: 12, color: TEXT3, minWidth: 72 }}>ชื่อบัญชี</span>
                            <span style={{ fontSize: 12, color: TEXT2, fontWeight: 600 }}>{request.payment.accountName}</span>
                          </div>
                        )}
                        {request.payment.accountNumber && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ fontSize: 12, color: TEXT3, minWidth: 72 }}>เลขที่บัญชี</span>
                            <span style={{ fontSize: 13, color: TEXT, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em" }}>{request.payment.accountNumber}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Slip uploaded confirmation */}
                {request.payment.slipUrl && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 6, padding: "7px 10px", marginBottom: 10 }}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="6.5" fill="#22c55e"/><path d="M3.5 6.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontSize: 12, color: "#15803d", fontWeight: 600 }}>แนบสลิปแล้ว — ไรเดอร์จะเห็นและยืนยันจบงานอัตโนมัติ</span>
                  </div>
                )}

                <p style={{ color: TEXT, fontSize: 13, fontWeight: 600, margin: "0 0 8px" }}>
                  {request.payment.method === "cash" ? "หลักฐานการรับเงินสด" : `สลิปโอนเงิน${request.payment.bankName ? ` · ${request.payment.bankName}` : ""}`}
                </p>

                {request.payment.slipUrl ? (
                  <div>
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
                    style={{
                      display: "block", width: "100%", borderRadius: 10, padding: "14px 0",
                      fontSize: 14, fontWeight: 700, cursor: slipUploading ? "default" : "pointer",
                      fontFamily: "inherit", touchAction: "manipulation", opacity: slipUploading ? 0.7 : 1,
                      background: request.status === "awaiting_transfer" && request.payment.method === "transfer" ? GOLD : BG,
                      color:      request.status === "awaiting_transfer" && request.payment.method === "transfer" ? "#fff" : TEXT2,
                      border: request.status === "awaiting_transfer" && request.payment.method === "transfer" ? "none" : `1px solid ${BORDER}`,
                    }}
                  >
                    {slipUploading ? "กำลังอัพโหลด..." : "แนบสลิปโอนเงิน"}
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

        {/* ── ยืนยันรับเครื่องคืน ── */}
        {request.status === "completed" && !request.returnedToOfficeAt && (
          <Card>
            <div style={{ padding: "16px" }}>
              <SectionLabel>การส่งคืนเครื่อง</SectionLabel>
              {request.returnSubmittedAt ? (
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#D97706", fontWeight: 600 }}>
                  ⏳ ไรเดอร์แจ้งส่งคืนแล้ว — รอ office ยืนยันรับเครื่อง
                </p>
              ) : (
                <p style={{ margin: "0 0 10px", fontSize: 13, color: TEXT3 }}>
                  ยังไม่ได้แจ้งส่งคืน — admin สามารถยืนยันได้โดยตรง
                </p>
              )}
              <button
                disabled={confirmReturnBusy}
                onClick={async () => {
                  setConfirmReturnBusy(true);
                  const res = await adminConfirmReturn(request.id);
                  if (res.success) fetchRequest(id).then(data => { if (data) setRequest(data); });
                  else alert(res.error);
                  setConfirmReturnBusy(false);
                }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 18px", borderRadius: 10, border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.08)", color: "#059669", fontSize: 14, fontWeight: 700, cursor: confirmReturnBusy ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: confirmReturnBusy ? 0.6 : 1 }}
              >
                📦 {confirmReturnBusy ? "กำลังยืนยัน..." : "ยืนยันรับเครื่องคืน"}
              </button>
            </div>
          </Card>
        )}

        {request.returnedToOfficeAt && (
          <Card>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#059669" }}>ส่งคืนเครื่องเรียบร้อยแล้ว</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT3 }}>ยืนยันรับเมื่อ {fmtDateTime(request.returnedToOfficeAt!)} น.</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom Action Bar — hidden for merged/closed requests */}
      {request.status !== "merged" && <div className="left-0 md:left-[220px]" style={{ position: "fixed", bottom: 0, right: 0, background: CARD, borderTop: `1px solid ${BORDER}`, padding: "10px 16px", paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)", zIndex: 20, display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
        <a
          href={tel}
          onClick={e => {
            if (window.innerWidth >= 768) {
              e.preventDefault();
              navigator.clipboard.writeText(request.customer.phone.replace(/-/g, ""));
              setPhoneCopied(true);
              setTimeout(() => setPhoneCopied(false), 2000);
            }
          }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px", padding: "10px 0", background: phoneCopied ? "#E6F4EA" : "#F5F5F7", borderRadius: "12px", color: phoneCopied ? "#1B7F3A" : TEXT2, textDecoration: "none", fontSize: "12px", fontWeight: 600, minHeight: "52px", touchAction: "manipulation", border: `1px solid ${phoneCopied ? "#A8D5B5" : BORDER}`, transition: "all 150ms" }}>
          <Phone size={18} />
          <span>{phoneCopied ? "คัดลอกแล้ว!" : "โทร / คัดลอก"}</span>
        </a>
        <button
          onClick={() => setShowStatus(true)}
          disabled={saving === "status"}
          style={{ background: GOLD, border: "none", borderRadius: "12px", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit", minHeight: "52px", opacity: saving === "status" ? 0.6 : 1 }}
        >
          {saving === "status" ? "กำลังบันทึก..." : "เปลี่ยนสถานะ"}
        </button>
      </div>}

      {showStatus && (
        <StatusBottomSheet currentStatus={request.status} onSave={handleStatusSave} onClose={() => setShowStatus(false)} />
      )}

      {/* Reclaim job confirmation modal */}
      {showReclaim && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px", maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#111" }}>ดึงงานคืนจากไรเดอร์?</p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#555" }}>
              งานจะถูกคืนสู่สถานะ <strong>ยืนยันแล้ว</strong> และไรเดอร์จะได้รับการแจ้งเตือน
            </p>
            <label style={{ display: "block", marginBottom: 6, fontSize: 12, fontWeight: 600, color: "#555" }}>เหตุผล (ไม่บังคับ)</label>
            <input
              value={reclaimReason}
              onChange={e => setReclaimReason(e.target.value)}
              placeholder="เช่น ลูกค้าเลื่อนนัด, ไรเดอร์ไม่รับสาย"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid #ddd", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setShowReclaim(false); setReclaimReason(""); }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #ddd", background: "#f5f5f7", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#333" }}
              >
                ยกเลิก
              </button>
              <button
                disabled={reclaimBusy}
                onClick={async () => {
                  setReclaimBusy(true);
                  const res = await adminReclaimJob(request.id, reclaimReason);
                  setReclaimBusy(false);
                  if (res.success) {
                    setShowReclaim(false);
                    setReclaimReason("");
                  } else {
                    alert(res.error);
                  }
                }}
                style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: "#dc2626", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#fff", opacity: reclaimBusy ? 0.6 : 1 }}
              >
                {reclaimBusy ? "..." : "ดึงงานคืน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
