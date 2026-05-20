"use server";

import { createServerClient } from "@/lib/supabase-server";
import { broadcastRequestUpdate } from "@/lib/broadcast";
import type { InspectionData, RequestStatus } from "@/lib/types/admin";

// ─── Admin: บันทึกเวลาถึง ─────────────────────────────────────────────────────
export async function recordArrival(id: string) {
  const supabase = createServerClient();
  const arrivedAt = new Date().toISOString();

  const { data: current } = await supabase
    .from("requests")
    .select("inspection")
    .eq("id", id)
    .single();

  const inspection = { ...(current?.inspection ?? {}), arrivedAt };

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

// ─── Admin: ตอบแทนลูกค้า ──────────────────────────────────────────────────────
export async function respondToNegotiation(
  id: string,
  accepted: boolean,
  respondedBy: "customer" | "staff",
) {
  const supabase = createServerClient();

  const { data: current } = await supabase
    .from("requests")
    .select("inspection, status_log")
    .eq("id", id)
    .single();

  if (!current?.inspection) return { success: false as const, error: "ไม่พบข้อมูลการตรวจสภาพ" };

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

  return respondToNegotiation(data.id, accepted, "customer");
}
