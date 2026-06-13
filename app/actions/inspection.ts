"use server";

import { after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { broadcastRequestUpdate } from "@/lib/broadcast";
import { sendPushToUser } from "@/app/actions/push";
import type { InspectionData, RequestStatus } from "@/lib/types/admin";

// ─── Admin: บันทึกเวลาถึง ─────────────────────────────────────────────────────
export async function recordArrival(id: string, arrivedPhotoUrl?: string) {
  await requireAuth();
  const supabase = createServerClient();
  const arrivedAt = new Date().toISOString();

  const { data: current } = await supabase
    .from("requests")
    .select("inspection")
    .eq("id", id)
    .single();

  const inspection: Record<string, unknown> = {
    ...(current?.inspection ?? {}),
    arrivedAt,
    ...(arrivedPhotoUrl ? { arrivedPhotoUrl } : {}),
  };

  const { error } = await supabase
    .from("requests")
    .update({ inspection, updated_at: arrivedAt })
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  broadcastRequestUpdate(id);
  return { success: true as const, arrivedAt };
}

// ─── Admin: บันทึกผลการตรวจสภาพ ──────────────────────────────────────────────
export async function saveInspection(
  id: string,
  data: InspectionData,
  newStatus: "contracting" | "price_negotiation" | "rejected",
  deviceColor?: string,
) {
  await requireAuth();
  const supabase = createServerClient();

  const { data: current } = await supabase
    .from("requests")
    .select("status_log")
    .eq("id", id)
    .single();

  const noteMap = {
    contracting:        "ตรวจสภาพเสร็จสิ้น ราคาตรงตามที่แจ้ง — กำลังทำสัญญา",
    price_negotiation:  `เสนอราคาใหม่ ฿${data.actualPrice.toLocaleString("th-TH")}${data.priceReason ? ` — ${data.priceReason}` : ""}`,
    rejected:           "ปฏิเสธคำขอ",
  };

  const newLog = [
    ...(current?.status_log ?? []),
    { status: newStatus, timestamp: new Date().toISOString(), note: noteMap[newStatus] },
  ];

  const { data: updated, error } = await supabase
    .from("requests")
    .update({
      inspection:   data,
      status:       newStatus,
      status_log:   newLog,
      actual_price: data.actualPrice || null,
      ...(deviceColor !== undefined ? { device_color: deviceColor || null } : {}),
      updated_at:   new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");

  if (error) return { success: false as const, error: error.message };
  if (!updated || updated.length === 0) return { success: false as const, error: "ไม่พบคำขอในฐานข้อมูล" };
  broadcastRequestUpdate(id);
  return { success: true as const, statusLog: newLog };
}

// ─── Admin: บันทึกรูปภาพหลักฐาน ──────────────────────────────────────────────
export async function saveInspectionPhotos(id: string, photos: string[]) {
  await requireAuth();
  const supabase = createServerClient();

  const { data: current } = await supabase
    .from("requests")
    .select("inspection")
    .eq("id", id)
    .single();

  const inspection = { ...(current?.inspection ?? {}), photos };

  const { error } = await supabase
    .from("requests")
    .update({ inspection, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  broadcastRequestUpdate(id);
  return { success: true as const };
}

// ─── Internal: shared logic for negotiation response ─────────────────────────
async function _respondToNegotiation(
  id: string,
  accepted: boolean,
  respondedBy: "customer" | "staff",
) {
  const supabase = createServerClient();

  const { data: current } = await supabase
    .from("requests")
    .select("inspection, status_log, status")
    .eq("id", id)
    .single();

  if (!current?.inspection) return { success: false as const, error: "ไม่พบข้อมูลการตรวจสภาพ" };
  if (current.status !== "price_negotiation") return { success: false as const, error: "สถานะไม่ถูกต้อง — อาจมีคนยืนยันไปแล้ว" };

  const newStatus: RequestStatus = accepted ? "contracting" : "cancelled";
  const note = accepted
    ? `ยืนยันราคาใหม่ ฿${current.inspection.actualPrice?.toLocaleString("th-TH")} — กำลังทำสัญญาซื้อขาย (โดย${respondedBy === "staff" ? "เจ้าหน้าที่" : "ลูกค้า"})`
    : `ปฏิเสธราคาใหม่ (โดย${respondedBy === "staff" ? "เจ้าหน้าที่" : "ลูกค้า"})`;

  const updatedInspection: InspectionData = {
    ...current.inspection,
    negotiationResponse:   accepted ? "accepted" : "rejected",
    negotiationRespondedAt: new Date().toISOString(),
    negotiationRespondedBy: respondedBy,
  };

  const newLog = [
    ...(current.status_log ?? []),
    { status: newStatus, timestamp: new Date().toISOString(), note },
  ];

  const { data: updated, error } = await supabase
    .from("requests")
    .update({
      inspection: updatedInspection,
      status:     newStatus,
      status_log: newLog,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");

  if (error) return { success: false as const, error: error.message };
  if (!updated || updated.length === 0) return { success: false as const, error: "ไม่พบคำขอในฐานข้อมูล" };
  broadcastRequestUpdate(id);
  return { success: true as const, statusLog: newLog, newStatus };
}

// ─── Admin: exported wrapper with auth ───────────────────────────────────────
export async function respondToNegotiation(
  id: string,
  accepted: boolean,
  respondedBy: "customer" | "staff",
) {
  await requireAuth();
  return _respondToNegotiation(id, accepted, respondedBy);
}

// ─── Admin: อนุมัติผลตรวจ → ไรเดอร์ถึงเสนอราคาได้ ─────────────────────────────
export async function adminApproveInspection(
  id: string,
  guidance?: { priceMin?: number; priceMax?: number; note?: string },
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();

  const { data: req } = await supabase
    .from("requests")
    .select("inspection, status")
    .eq("id", id)
    .single();

  if (!req || req.status !== "inspecting") return { success: false, error: "ไม่อยู่ในสถานะตรวจสภาพ" };
  if (!(req.inspection as { inspectedAt?: string } | null)?.inspectedAt) return { success: false, error: "ยังไม่มีผลตรวจจากไรเดอร์" };

  const adminPriceGuidance = (guidance?.priceMin || guidance?.priceMax || guidance?.note)
    ? { priceMin: guidance.priceMin ?? null, priceMax: guidance.priceMax ?? null, note: guidance.note?.trim() || null }
    : null;

  const { error } = await supabase
    .from("requests")
    .update({
      inspection: {
        ...(req.inspection as object),
        adminApprovedAt: new Date().toISOString(),
        ...(adminPriceGuidance ? { adminPriceGuidance } : {}),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };
  broadcastRequestUpdate(id);
  return { success: true };
}

// ─── Admin: ขอให้ไรเดอร์แก้ไขผลตรวจ ─────────────────────────────────────────
export async function adminRequestInspectionRevision(
  id: string,
  note: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();

  const { data: req } = await supabase
    .from("requests")
    .select("inspection, status, rider_id, order_number, device_model")
    .eq("id", id).single();

  if (!req || req.status !== "inspecting") return { success: false, error: "ไม่อยู่ในสถานะตรวจสภาพ" };
  if (!(req.inspection as { inspectedAt?: string } | null)?.inspectedAt) return { success: false, error: "ยังไม่มีผลตรวจจากไรเดอร์" };

  const { error } = await supabase
    .from("requests")
    .update({
      inspection: {
        ...(req.inspection as object),
        revisionNote: note.trim(),
        revisionRequestedAt: new Date().toISOString(),
        adminApprovedAt: null,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  after(async () => {
    await broadcastRequestUpdate(id);
    if (req.rider_id) {
      await sendPushToUser(req.rider_id as string, {
        title: "⚠️ ขอให้แก้ไขผลตรวจ",
        body: `${req.device_model ?? ""} · ${note.trim().slice(0, 100)}`,
        url: `/rider/job/${id}`,
        tag: `revision-${id}`,
      }).catch(console.error);
    }
  });

  return { success: true };
}

// ─── Admin: ยกเลิกงานหลังตรวจสภาพ ────────────────────────────────────────────
export async function adminCancelAtInspection(
  id: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests")
    .select("status, rider_id, order_number, device_model, status_log")
    .eq("id", id).single();

  if (!req || req.status !== "inspecting") return { success: false, error: "ไม่อยู่ในสถานะตรวจสภาพ" };

  const safeReason = reason.trim() || "Admin ยกเลิก";
  const newLog = [
    ...(req.status_log ?? []),
    { status: "cancelled", timestamp: now, note: `Admin ยกเลิกหลังตรวจ: ${safeReason}` },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "cancelled", status_log: newLog, updated_at: now })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  if (req.rider_id) {
    await supabase.from("rider_locations")
      .update({ current_job_id: null, tracking_mode: "idle", updated_at: now })
      .eq("rider_id", req.rider_id);
  }

  after(async () => {
    await broadcastRequestUpdate(id);
    if (req.rider_id) {
      await sendPushToUser(req.rider_id as string, {
        title: "งานถูกยกเลิก",
        body: `${req.device_model ?? ""} · ${safeReason}`,
        url: "/rider",
        tag: `cancelled-${id}`,
      }).catch(console.error);
    }
  });

  return { success: true };
}

// ─── Public: ลูกค้ายืนยัน/ปฏิเสธราคา (verify phone) ─────────────────────────
export async function customerRespondToNegotiation(
  orderNumber: string,
  phone: string,
  accepted: boolean,
) {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("requests")
    .select("id, customer_phone, status")
    .eq("order_number", orderNumber)
    .single();

  if (!data) return { success: false as const, error: "ไม่พบคำขอ" };

  const dbPhone = (data.customer_phone ?? "").replace(/[-\s]/g, "");
  const inputPhone = phone.replace(/[-\s]/g, "");
  if (dbPhone !== inputPhone) return { success: false as const, error: "เบอร์โทรไม่ตรง" };
  if (data.status !== "price_negotiation") return { success: false as const, error: "ไม่อยู่ในสถานะรอยืนยัน" };

  return _respondToNegotiation(data.id, accepted, "customer");
}
