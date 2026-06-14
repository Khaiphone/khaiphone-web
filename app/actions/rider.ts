"use server";

import { after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { thaiDateStr, thaiMonthStr, startOfThaiDay, startOfThaiMonth } from "@/lib/thai-date";
import { sendPushToOwners, sendPushToUser } from "@/app/actions/push";
import { broadcastRequestUpdate } from "@/lib/broadcast";
import type { AdminRequest } from "@/lib/types/admin";

// ─── Auto-create stock entry when a job is completed by rider ────────────────
async function autoCreateStock(requestId: string) {
  const supabase = createServerClient();

  const { data: current } = await supabase
    .from("requests")
    .select("order_number, source, device_model, device_storage, device_color, actual_price, estimated_price, customer_name, customer_phone, inspection")
    .eq("id", requestId)
    .single();

  if (!current) return;

  const { count } = await supabase.from("stocks").select("*", { count: "exact", head: true })
    .eq("request_ref", current.order_number);
  if ((count ?? 0) > 0) return; // already exists

  const insp = current.inspection ?? {};
  const sickwMap: Record<string, string> = {};
  for (const line of (insp.sickw_report ?? "").split("\n")) {
    const idx = line.indexOf(": ");
    if (idx > 0) sickwMap[line.slice(0, idx).trim()] = line.slice(idx + 2).trim();
  }
  const parsedCarrierLock  = sickwMap["Unlock Status"] ?? sickwMap["Sim-Lock"] ?? "";
  const parsedIcloudStatus = [sickwMap["iCloud Lock"], sickwMap["iCloud Status"]].filter(Boolean).join(" / ");
  const year = thaiDateStr().slice(0, 4);
  const { data: lastRow } = await supabase.from("stocks").select("id").like("id", `STK-${year}-%`).order("id", { ascending: false }).limit(1);
  const lastSeq = lastRow?.[0]?.id ? parseInt(lastRow[0].id.split("-")[2], 10) : 0;
  const stockId = `STK-${year}-${String(lastSeq + 1).padStart(5, "0")}`;
  const now = new Date().toISOString();

  const sourceMap: Record<string, string> = {
    website: "เว็บไซต์", line: "LINE OA", facebook: "Facebook",
    phone: "โทรศัพท์", manual: "หน้าร้าน",
  };

  await supabase.from("stocks").insert({
    id: stockId,
    model:          current.device_model   ?? "",
    storage:        current.device_storage ?? "",
    color:          current.device_color   ?? "",
    imei:           insp.imei    ?? "",
    serial:         insp.serial  ?? "",
    grade:          insp.conditionGrade ?? (insp.result === "matched" ? "A" : insp.result === "adjusted" ? "B" : "A"),
    battery_health: insp.batteryHealth ?? 0,
    cycle_count:    insp.batteryCycles ?? 0,
    icloud_status:  parsedIcloudStatus,
    carrier_lock:   parsedCarrierLock,
    accessories:    Array.isArray(insp.accessories) ? insp.accessories.join(", ") : "",
    physical_checks: [
      ...(insp.criteria ?? []).map((c: { label: string; pass: boolean; actual?: string }) => ({ label: c.label, condition: c.pass ? "ปกติ" : (c.actual?.trim() || "มีตำหนิ") })),
      ...(insp.functionalTests ?? []).map((t: { label: string; pass: boolean }) => ({ label: t.label, condition: t.pass ? "ปกติ" : "มีปัญหา" })),
    ],
    cost_price:     current.actual_price ?? current.estimated_price ?? 0,
    shipping_cost:  0, other_cost: 0, selling_price: 0,
    status:         "รอตรวจ",
    source_channel: sourceMap[current.source ?? "website"] ?? "เว็บไซต์",
    request_ref:    current.order_number,
    seller_name:    current.customer_name  ?? "",
    seller_phone:   current.customer_phone ?? "",
    received_at:    now,
    inspector:      "",
    photos:         insp.photos ?? [],
    inspection_snapshot: {
      imei:            insp.imei    ?? null,
      serial:          insp.serial  ?? null,
      model:           current.device_model   ?? null,
      storage:         current.device_storage ?? null,
      color:           current.device_color   ?? null,
      source:          "inspection",
      result:          insp.result          ?? null,
      batteryHealth:   insp.batteryHealth   ?? null,
      batteryCycles:   insp.batteryCycles   ?? null,
      warrantyExpiry:  insp.warrantyExpiry  ?? null,
      criteria:        insp.criteria        ?? [],
      functionalTests: insp.functionalTests ?? [],
      issues:          insp.issues          ?? [],
    },
    notes:      [],
    status_log: [{ status: "รอตรวจ", timestamp: now, note: `สร้างอัตโนมัติจาก ${current.order_number} (ไรเดอร์)`, by: "system" }],
    created_at: now, updated_at: now,
  });
}

// ─── Home page data — pending + active + stats in one round trip ─────────────
export async function fetchRiderHomeData(riderId: string) {
  await requireAuth();
  const supabase = createServerClient();
  const startOfMonth = startOfThaiMonth(thaiMonthStr());

  const IN_PROGRESS = ["pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting", "awaiting_transfer"];

  const [{ data: pendingData }, { data: inProgressData }, { data: statsData }] = await Promise.all([
    supabase.from("requests").select("*").eq("rider_id", riderId)
      .in("status", ["confirmed"]).order("appt_date", { ascending: true }),
    supabase.from("requests").select("*").eq("rider_id", riderId)
      .in("status", IN_PROGRESS).order("appt_date", { ascending: true }),
    supabase.from("requests")
      .select("status, actual_price, estimated_price")
      .eq("rider_id", riderId).gte("created_at", startOfMonth),
  ]);

  // Fetch completed-but-not-returned jobs separately so a column error doesn't wipe the whole list
  const { data: completedPrimary, error: completedErr } = await supabase
    .from("requests").select("*").eq("rider_id", riderId)
    .eq("status", "completed").is("returned_to_office_at", null)
    .order("appt_date", { ascending: true });

  let completedActiveData = completedPrimary;
  if (completedErr) {
    // Column may not exist in DB yet — fall back to jobs completed in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: fallback } = await supabase
      .from("requests").select("*").eq("rider_id", riderId)
      .eq("status", "completed").gte("updated_at", weekAgo)
      .order("updated_at", { ascending: false });
    completedActiveData = fallback;
  }

  const activeData = [...(inProgressData ?? []), ...(completedActiveData ?? [])];

  const completed = (statsData ?? []).filter(j => j.status === "completed");
  return {
    pending:    (pendingData ?? []).map(mapRow),
    active:     (activeData  ?? []).map(mapRow),
    stats: {
      completedJobs: completed.length,
      totalEarnings: completed.reduce((s, j) => s + (j.actual_price ?? j.estimated_price ?? 0), 0),
    },
  };
}

// ─── Fetch pending jobs (assigned by admin, not yet accepted by rider) ────────
export async function fetchPendingRiderJobs(riderId: string): Promise<AdminRequest[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("rider_id", riderId)
    .in("status", ["confirmed"])
    .order("appt_date", { ascending: true });
  return (data ?? []).map(mapRow);
}

// ─── Fetch active jobs (accepted or en_route or further) ─────────────────────
export async function fetchRiderJobs(riderId: string): Promise<AdminRequest[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("rider_id", riderId)
    .or("status.in.(pickup_scheduled,en_route,inspecting,price_negotiation,contracting,awaiting_transfer),and(status.eq.completed,returned_to_office_at.is.null)")
    .order("appt_date", { ascending: true });
  if (error) { console.error("fetchRiderJobs:", error); return []; }
  return (data ?? []).map(mapRow);
}

// ─── Fetch single job ─────────────────────────────────────────────────────────
export async function fetchRiderJob(id: string): Promise<AdminRequest | null> {
  await requireAuth();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("requests").select("*").eq("id", id).single();
  if (error) return null;
  return mapRow(data);
}

// ─── Fetch completed jobs for history/stats ───────────────────────────────────
export async function fetchRiderHistory(riderId: string, months = 3): Promise<AdminRequest[]> {
  await requireAuth();
  const supabase = createServerClient();
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("rider_id", riderId)
    .in("status", ["completed", "cancelled", "no_show", "rejected"])
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

// ─── Reject job before accepting (confirmed → unassigned, status stays confirmed) ─
export async function riderRejectJob(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests")
    .select("status, rider_id, status_log, order_number, device_model")
    .eq("id", id).single();

  if (req?.status !== "confirmed") return { success: false as const, error: "งานนี้ไม่สามารถปฏิเสธได้" };
  if (req?.rider_id !== user.id)   return { success: false as const, error: "ไม่ใช่งานของคุณ" };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "confirmed", timestamp: now, note: "ไรเดอร์ปฏิเสธรับงาน — รอมอบหมายใหม่" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ rider_id: null, rider_name: null, assigned_at: null, status_log: newLog, updated_at: now })
    .eq("id", id).eq("rider_id", user.id);
  if (error) return { success: false as const, error: error.message };

  // Clear current_job_id and increment jobs_declined in shift
  const { data: loc } = await supabase
    .from("rider_locations").select("shift_id, current_job_id").eq("rider_id", user.id).single();
  if (loc?.current_job_id === id) {
    await supabase.from("rider_locations")
      .update({ current_job_id: null, updated_at: now }).eq("rider_id", user.id);
  }
  if (loc?.shift_id) {
    const { data: shift } = await supabase
      .from("rider_shifts").select("jobs_declined").eq("id", loc.shift_id).single();
    if (shift) {
      await supabase.from("rider_shifts")
        .update({ jobs_declined: (shift.jobs_declined ?? 0) + 1 }).eq("id", loc.shift_id);
    }
  }

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ไรเดอร์ปฏิเสธงาน — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · ต้องมอบหมายไรเดอร์ใหม่`,
      url: `/admin/requests/${id}`,
      tag: `rejected-rider-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── Accept job (confirmed → pickup_scheduled) ────────────────────────────────
export async function riderAcceptJob(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status, rider_id, status_log, order_number, device_model").eq("id", id).single();

  if (req?.status !== "confirmed") return { success: false as const, error: "งานนี้ไม่อยู่ในสถานะที่รับได้" };
  if (req?.rider_id !== user.id)   return { success: false as const, error: "งานนี้ไม่ได้ถูกมอบหมายให้คุณ" };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "pickup_scheduled", timestamp: now, note: "ไรเดอร์รับงานแล้ว รอออกเดินทาง" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "pickup_scheduled", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  // Keep rider_locations.current_job_id in sync so the planner map reflects the accepted job
  await supabase.from("rider_locations")
    .update({ current_job_id: id, updated_at: now })
    .eq("rider_id", user.id);

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ไรเดอร์รับงาน — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · รับงานแล้ว รอออกเดินทาง`,
      url: `/admin/requests/${id}`,
      tag: `accept-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── Start job (pickup_scheduled → en_route) ──────────────────────────────────
export async function riderStartJob(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model, rider_id").eq("id", id).single();

  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };

  // Block if rider already has an active job (en_route or further)
  const { data: activeJobs } = await supabase
    .from("requests")
    .select("order_number")
    .eq("rider_id", req?.rider_id ?? user.id)
    .in("status", ["en_route", "inspecting", "price_negotiation", "contracting", "awaiting_transfer"])
    .neq("id", id);

  if (activeJobs && activeJobs.length > 0) {
    return {
      success: false as const,
      error: `ต้องเสร็จงาน ${activeJobs[0].order_number} ก่อนออกเดินทางงานใหม่`,
      blockedBy: activeJobs[0].order_number,
    };
  }

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "en_route", timestamp: now, note: "ไรเดอร์ออกเดินทางแล้ว" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "en_route", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  // Sync tracking_mode so planner sees "กำลังเดินทาง" immediately
  await supabase.from("rider_locations")
    .update({ tracking_mode: "enroute", current_job_id: id, updated_at: now })
    .eq("rider_id", user.id);

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ไรเดอร์ออกเดินทาง — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · กำลังเดินทางไปหาลูกค้า`,
      url: `/admin/requests/${id}`,
      tag: `en-route-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── Arrive at customer (inspecting) ─────────────────────────────────────────
export async function riderArriveJob(id: string, gps?: { lat: number; lng: number } | null) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model, appt_lat, appt_lng, rider_id").eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };
  const now = new Date().toISOString();
  const logEntry: Record<string, unknown> = { status: "inspecting", timestamp: now, note: "ไรเดอร์ถึงที่แล้ว เริ่มตรวจเครื่อง" };
  if (gps) { logEntry.lat = gps.lat; logEntry.lng = gps.lng; }
  const newLog = [...(req?.status_log ?? []), logEntry];
  const { error } = await supabase
    .from("requests").update({ status: "inspecting", status_log: newLog, updated_at: now }).eq("id", id);
  if (error) return { success: false as const, error: error.message };

  // Sync tracking_mode so planner sees "กับลูกค้า" immediately
  await supabase.from("rider_locations")
    .update({ tracking_mode: "on_site", current_job_id: id, updated_at: now })
    .eq("rider_id", user.id);

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ไรเดอร์ถึงที่แล้ว — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · กำลังตรวจเครื่อง`,
      url: `/admin/requests/${id}`,
      tag: `arrive-${id}`,
    }).catch(console.error);
  });
  return { success: true as const };
}

// ─── Auto-save SICKW result immediately after check ──────────────────────────
export async function riderAutoSaveSickw(
  id: string,
  data: { serial?: string; sickw_report: string }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { data: req } = await supabase.from("requests").select("inspection, rider_id").eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false, error: "ไม่ใช่งานของคุณ" };
  const { error } = await supabase
    .from("requests")
    .update({
      inspection: {
        ...(req?.inspection ?? {}),
        ...(data.serial ? { serial: data.serial } : {}),
        sickw_report: data.sickw_report,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  after(() => broadcastRequestUpdate(id));
  return { success: true };
}

// ─── Save inspection data ─────────────────────────────────────────────────────
export async function riderSaveInspection(id: string, inspection: {
  imei?: string;
  serial?: string;
  color?: string;
  batteryHealth?: number;
  batteryCycles?: number;
  warrantyExpiry?: string;
  criteria: Array<{ label: string; stated: string; actual: string; pass: boolean }>;
  functionalTests?: Array<{ label: string; pass: boolean }>;
  photos: string[];
  idCardPhotoUrl?: string;
  deliveryPhotoUrl?: string;
  sickw_report?: string;
  accessories?: string[];
  conditionGrade?: string;
  conditionLabel?: string;
}) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { color, ...inspectionRest } = inspection;

  const { data: req } = await supabase
    .from("requests").select("order_number, device_model, estimated_price, rider_id, inspection").eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };

  const estimatedPrice = req?.estimated_price ?? 0;
  const isRevision = !!(req?.inspection as { revisionNote?: string } | null)?.revisionNote;

  const { error } = await supabase
    .from("requests")
    .update({
      inspection: {
        ...inspectionRest,
        inspectedAt: now,
        arrivedAt: now,
        result: "matched",
        issues: [],
        originalPrice: estimatedPrice,
        actualPrice: estimatedPrice,
        priceReason: "",
        negotiationResponse: null,
        negotiationRespondedAt: null,
        negotiationRespondedBy: null,
      },
      ...(color ? { device_color: color } : {}),
      updated_at: now,
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: isRevision ? "🔄 ผลตรวจแก้ไขแล้ว — รออนุมัติ" : "📋 ผลตรวจสภาพเครื่อง — รออนุมัติ",
      body: `#${req?.order_number ?? "?"} · ${req?.device_model ?? "เครื่อง"} — กดเพื่อตรวจสอบและอนุมัติ`,
      url: `/admin/requests/${id}`,
      tag: isRevision ? `inspection-revised-${id}` : `inspection-${id}`,
    });
  });
  return { success: true as const };
}

// ─── Confirm price matches ────────────────────────────────────────────────────
export async function riderConfirmPrice(id: string, actualPrice: number) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("inspection, status_log, rider_id").eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };

  const updatedInspection = {
    ...(req?.inspection ?? {}),
    result: "matched",
    actualPrice,
    originalPrice: actualPrice,
  };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "contracting", timestamp: now, note: "ราคาตรงกัน ไรเดอร์ยืนยัน" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "contracting", status_log: newLog, actual_price: actualPrice, inspection: updatedInspection, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: "ราคาตรงกัน — กำลังทำสัญญา",
      body: `งาน ${id.slice(0, 8)}... · ฿${actualPrice.toLocaleString("th-TH")}`,
      url: `/admin/requests/${id}`,
      tag: `contracting-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── Adjust price (price_negotiation) ────────────────────────────────────────
export async function riderAdjustPrice(id: string, newPrice: number, reason: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests")
    .select("inspection, status_log, order_number, device_model, estimated_price, rider_id")
    .eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };

  const updatedInspection = {
    ...(req?.inspection ?? {}),
    result: "adjusted",
    actualPrice: newPrice,
    originalPrice: req?.estimated_price ?? 0,
    priceReason: reason,
    negotiationResponse: null,
    negotiationRespondedAt: null,
    negotiationRespondedBy: null,
  };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "price_negotiation", timestamp: now, note: `เสนอราคาใหม่ ฿${newPrice.toLocaleString("th-TH")} — ${reason}` },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "price_negotiation", status_log: newLog, actual_price: newPrice, inspection: updatedInspection, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ปรับราคา — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · เสนอ ฿${newPrice.toLocaleString("th-TH")} (${reason})`,
      url: `/admin/requests/${id}`,
      tag: `price-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── Customer accepted adjusted price ─────────────────────────────────────────
export async function riderCustomerAccepted(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("inspection, status_log, status, order_number, device_model, rider_id").eq("id", id).single();

  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };
  if (req?.status !== "price_negotiation") return { success: false as const, error: "สถานะไม่ถูกต้อง — อาจมีคนยืนยันไปแล้ว" };

  const updatedInspection = {
    ...(req?.inspection ?? {}),
    negotiationResponse: "accepted",
    negotiationRespondedAt: now,
    negotiationRespondedBy: "rider",
  };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "contracting", timestamp: now, note: "ลูกค้ายอมรับราคาใหม่" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "contracting", status_log: newLog, inspection: updatedInspection, updated_at: now })
    .eq("id", id).eq("status", "price_negotiation");
  if (error) return { success: false as const, error: error.message };
  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ลูกค้ายอมรับราคา — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · กำลังทำสัญญา`,
      url: `/admin/requests/${id}`,
      tag: `accepted-${id}`,
    }).catch(console.error);
  });
  return { success: true as const };
}

// ─── Customer rejected adjusted price ────────────────────────────────────────
export async function riderCustomerRejected(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("inspection, status_log, status, order_number, device_model, rider_id").eq("id", id).single();

  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };
  if (req?.status !== "price_negotiation") return { success: false as const, error: "สถานะไม่ถูกต้อง — อาจมีคนยืนยันไปแล้ว" };

  const updatedInspection = {
    ...(req?.inspection ?? {}),
    negotiationResponse: "rejected",
    negotiationRespondedAt: now,
    negotiationRespondedBy: "rider",
  };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "cancelled", timestamp: now, note: "ลูกค้าไม่ยอมรับราคา" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "cancelled", status_log: newLog, inspection: updatedInspection, updated_at: now })
    .eq("id", id).eq("status", "price_negotiation");
  if (error) return { success: false as const, error: error.message };

  await finishJobCleanup(supabase, user.id, now, false);

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ลูกค้าปฏิเสธราคา — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · งานถูกยกเลิก`,
      url: `/admin/requests/${id}`,
      tag: `rejected-${id}`,
    }).catch(console.error);
  });
  return { success: true as const };
}

// ─── Clean up rider_locations after a job ends ───────────────────────────────
async function finishJobCleanup(
  supabase: ReturnType<typeof createServerClient>,
  riderId: string,
  now: string,
  countAsCompleted: boolean,
) {
  const { data: loc } = await supabase
    .from("rider_locations")
    .select("shift_id")
    .eq("rider_id", riderId)
    .single();

  await supabase
    .from("rider_locations")
    .update({ current_job_id: null, tracking_mode: "idle", updated_at: now })
    .eq("rider_id", riderId);

  if (loc?.shift_id) {
    const { data: shift } = await supabase
      .from("rider_shifts")
      .select("jobs_completed, jobs_attempted")
      .eq("id", loc.shift_id)
      .single();
    if (shift) {
      await supabase
        .from("rider_shifts")
        .update({
          jobs_attempted: (shift.jobs_attempted ?? 0) + 1,
          ...(countAsCompleted ? { jobs_completed: (shift.jobs_completed ?? 0) + 1 } : {}),
        })
        .eq("id", loc.shift_id);
    }
  }
}

// ─── Complete job with cash payment ──────────────────────────────────────────
export async function riderCompleteCash(id: string, cashPhotoUrl: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model, actual_price, rider_id").eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "completed", timestamp: now, note: "จ่ายเงินสดแล้ว ไรเดอร์ยืนยัน" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "completed", status_log: newLog, payment_slip_url: cashPhotoUrl, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  await finishJobCleanup(supabase, user.id, now, true);

  after(async () => {
    await broadcastRequestUpdate(id);
    await autoCreateStock(id);
    await sendPushToOwners({
      title: `งานเสร็จสิ้น — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · ฿${(req?.actual_price ?? 0).toLocaleString("th-TH")} (เงินสด)`,
      url: `/admin/requests/${id}`,
      tag: `completed-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── Request finance transfer ─────────────────────────────────────────────────
export async function riderRequestTransfer(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests")
    .select("order_number, device_model, actual_price, customer_name, payment_account_number, payment_account_name, payment_bank, assigned_to, rider_id")
    .eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };

  // Find finance team members to notify
  const { data: financeUsers } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("active", true)
    .or('role.eq.owner,permissions.cs.{"view_finance"}');

  const note = `รอ Finance โอนเงิน ฿${(req?.actual_price ?? 0).toLocaleString("th-TH")} ให้ลูกค้า`;
  const { data: current } = await supabase.from("requests").select("status_log").eq("id", id).single();
  const newLog = [...(current?.status_log ?? []), { status: "awaiting_transfer", timestamp: now, note }];
  await supabase.from("requests").update({ status: "awaiting_transfer", status_log: newLog, updated_at: now }).eq("id", id);

  after(async () => {
    await broadcastRequestUpdate(id);
    const pushPayload = {
      title: `โอนเงินให้ลูกค้า — ${req?.order_number ?? ""}`,
      body: `${req?.customer_name ?? ""} · ฿${(req?.actual_price ?? 0).toLocaleString("th-TH")} · ${req?.payment_bank ?? ""} ${req?.payment_account_number ?? ""}`,
      url: `/admin/requests/${id}`,
      tag: `transfer-${id}`,
    };
    for (const u of (financeUsers ?? [])) {
      await sendPushToUser(u.user_id, pushPayload).catch(console.error);
    }
    await sendPushToOwners(pushPayload).catch(console.error);
  });

  return { success: true as const };
}

// ─── Complete job after transfer confirmed ────────────────────────────────────
export async function riderCompleteTransfer(id: string, slipUrl?: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model, actual_price, rider_id").eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "completed", timestamp: now, note: "Finance โอนเงินแล้ว ไรเดอร์ยืนยัน" },
  ];

  const updatePayload: Record<string, unknown> = { status: "completed", status_log: newLog, updated_at: now };
  if (slipUrl) updatePayload.payment_slip_url = slipUrl;

  const { error } = await supabase
    .from("requests")
    .update(updatePayload)
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  await finishJobCleanup(supabase, user.id, now, true);

  after(async () => {
    await broadcastRequestUpdate(id);
    await autoCreateStock(id);
    await sendPushToOwners({
      title: `งานเสร็จสิ้น — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · ฿${(req?.actual_price ?? 0).toLocaleString("th-TH")} (โอนเงิน)`,
      url: `/admin/requests/${id}`,
      tag: `completed-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── No-show ──────────────────────────────────────────────────────────────────
export async function riderNoShow(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model, rider_id").eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "no_show", timestamp: now, note: "ลูกค้าไม่อยู่ / ไม่รับสาย" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "no_show", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  await finishJobCleanup(supabase, user.id, now, false);

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ลูกค้าไม่อยู่ — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · ไรเดอร์ถึงที่แล้วแต่ไม่พบลูกค้า`,
      url: `/admin/requests/${id}`,
      tag: `noshow-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

export async function riderCancelAtInspection(id: string, reason: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model, rider_id, status").eq("id", id).single();
  if (req?.rider_id !== user.id) return { success: false as const, error: "ไม่ใช่งานของคุณ" };
  if (req?.status !== "inspecting") return { success: false as const, error: "ไม่อยู่ในสถานะที่ยกเลิกได้" };

  const safeReason = reason.trim().slice(0, 200) || "ไม่ระบุเหตุผล";
  const newLog = [
    ...(req.status_log ?? []),
    { status: "cancelled", timestamp: now, note: `ยกเลิกระหว่างตรวจเครื่อง: ${safeReason}` },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "cancelled", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  await finishJobCleanup(supabase, user.id, now, false);

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ยกเลิกระหว่างตรวจ — ${req.order_number ?? ""}`,
      body:  `${req.device_model ?? ""} · ${safeReason}`,
      url:   `/admin/requests/${id}`,
      tag:   `cancel-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── Rider requests help from owner ──────────────────────────────────────────
export async function riderRequestHelp(id: string, message: string) {
  const user = await requireAuth();
  const supabase = createServerClient();

  const { data: req } = await supabase
    .from("requests")
    .select("order_number, device_model")
    .eq("id", id).single();

  const { data: profile } = await supabase
    .from("admin_users").select("name").eq("user_id", user.id).single();

  const riderName = profile?.name ?? "ไรเดอร์";

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `🆘 ขอความช่วยเหลือ — ${req?.order_number ?? ""}`,
      body: `${riderName}: ${message}`,
      url: `/admin/requests/${id}`,
      tag: `help-${id}-${Date.now()}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── Online / Offline status ─────────────────────────────────────────────────
export async function setRiderOnlineStatus(isOnline: boolean) {
  const user = await requireAuth();
  const supabase = createServerClient();
  await supabase
    .from("admin_users")
    .update({ is_online: isOnline, last_seen_at: new Date().toISOString() })
    .eq("user_id", user.id);
  return { success: true as const };
}

export async function fetchRiderOnlineStatus(userId: string): Promise<boolean> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("admin_users")
    .select("is_online")
    .eq("user_id", userId)
    .single();
  return data?.is_online ?? false;
}

// ─── Recent notifications for rider bell ─────────────────────────────────────
export async function fetchRiderNotifications(riderId: string) {
  await requireAuth();
  const supabase = createServerClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // last 7 days

  const { data } = await supabase
    .from("requests")
    .select("id, order_number, device_model, status_log")
    .eq("rider_id", riderId)
    .gte("updated_at", since);

  const RELEVANT = new Set(["pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting", "awaiting_transfer", "completed", "cancelled", "no_show"]);
  const LABELS: Record<string, string> = {
    pickup_scheduled:  "รับงานแล้ว",
    en_route:          "ออกเดินทางแล้ว",
    inspecting:        "เริ่มตรวจเครื่อง",
    price_negotiation: "รอลูกค้ายืนยันราคา",
    contracting:       "กำลังทำสัญญา",
    awaiting_transfer: "รอ Finance โอน",
    completed:         "งานเสร็จสิ้น",
    cancelled:         "งานถูกยกเลิก",
    no_show:           "ลูกค้าไม่อยู่",
  };

  type Notif = { id: string; orderId: string; requestId: string; title: string; body: string; timestamp: string };
  const notifs: Notif[] = [];

  for (const req of data ?? []) {
    const logs: { status: string; timestamp: string; note?: string }[] = req.status_log ?? [];
    for (const log of logs) {
      if (!RELEVANT.has(log.status)) continue;
      if (log.timestamp < since) continue;
      notifs.push({
        id:        `${req.id}-${log.timestamp}`,
        requestId: req.id,
        orderId:   req.order_number,
        title:     LABELS[log.status] ?? log.status,
        body:      `${req.order_number} · ${req.device_model}`,
        timestamp: log.timestamp,
      });
    }
  }

  return notifs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 30);
}

// ─── Monthly stats ────────────────────────────────────────────────────────────
export async function fetchRiderStats(riderId: string) {
  await requireAuth();
  const supabase = createServerClient();
  const startOfMonth = startOfThaiMonth(thaiMonthStr());

  const { data } = await supabase
    .from("requests")
    .select("status, actual_price, estimated_price, appt_date")
    .eq("rider_id", riderId)
    .gte("created_at", startOfMonth);

  const jobs = data ?? [];
  const completed = jobs.filter(j => j.status === "completed");
  const cancelled = jobs.filter(j => ["cancelled", "no_show", "rejected"].includes(j.status));

  return {
    totalJobs:     jobs.length,
    completedJobs: completed.length,
    cancelledJobs: cancelled.length,
    totalEarnings: completed.reduce((s, j) => s + (j.actual_price ?? j.estimated_price ?? 0), 0),
  };
}

// ─── Earnings breakdown (today / week / month) ────────────────────────────────
export async function fetchRiderEarnings(riderId: string) {
  await requireAuth();
  const supabase = createServerClient();

  const todayStr   = thaiDateStr();
  const today      = startOfThaiDay(todayStr);
  const monthStart = startOfThaiMonth(thaiMonthStr());
  // Day-of-week in Bangkok: use noon Bangkok time (= 5am UTC) so getUTCDay() returns Bangkok day
  const bkkNoon    = new Date(`${todayStr}T12:00:00+07:00`);
  const dow        = bkkNoon.getUTCDay();
  const weekStart  = startOfThaiDay(thaiDateStr(new Date(bkkNoon.getTime() - dow * 86_400_000)));

  const { data } = await supabase
    .from("requests")
    .select("status, actual_price, estimated_price, created_at, device_model, device_storage, order_number, status_log")
    .eq("rider_id", riderId)
    .in("status", ["completed", "cancelled", "no_show", "rejected"])
    .gte("created_at", monthStart)
    .order("created_at", { ascending: false });

  const jobs      = data ?? [];
  const completed = jobs.filter(j => j.status === "completed");
  const todayDone = completed.filter(j => j.created_at >= today);
  const weekDone  = completed.filter(j => j.created_at >= weekStart);

  const totalValue = completed.reduce((s, j) => s + ((j.actual_price ?? j.estimated_price) || 0), 0);

  const successRate = jobs.length > 0 ? Math.round((completed.length / jobs.length) * 100) : null;

  // Average duration: en_route → completed from status_log
  const durations: number[] = [];
  for (const job of completed) {
    const log = (job.status_log ?? []) as Array<{ status: string; timestamp: string }>;
    const start = log.find(l => l.status === "en_route")?.timestamp;
    const end   = [...log].reverse().find(l => l.status === "completed")?.timestamp;
    if (start && end) {
      const mins = (new Date(end).getTime() - new Date(start).getTime()) / 60_000;
      if (mins > 0 && mins < 600) durations.push(mins);
    }
  }
  const avgDurationMin = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  return {
    completed: { today: todayDone.length, week: weekDone.length, month: completed.length },
    totalValue,
    successRate,
    avgDurationMin,
    recent: jobs.slice(0, 20),
  };
}

// ─── Map DB row → AdminRequest ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any) {
  return {
    id:          row.id,
    orderNumber: row.order_number,
    status:      row.status,
    createdAt:   row.created_at,
    customer: {
      name:    row.customer_name,
      phone:   row.customer_phone,
      email:   row.customer_email ?? "",
      address: row.customer_address ?? undefined,
    },
    device: {
      model:            row.device_model,
      storage:          row.device_storage ?? "",
      color:            row.device_color   ?? undefined,
      condition:        row.device_condition ?? "",
      conditionDetails: row.device_condition_details ?? [],
      selections:       row.device_selections ?? {},
      estimatedPrice:   row.estimated_price  ?? 0,
      actualPrice:      row.actual_price     ?? undefined,
      priceRange:       row.price_range      ?? "",
    },
    appointment: {
      date:     row.appt_date     ?? "",
      time:     row.appt_time     ?? "",
      location: row.appt_location ?? "",
      method:   row.appt_method   ?? "rider",
    },
    payment: {
      method:           row.payment_method         ?? "cash",
      bankName:         row.payment_bank            ?? undefined,
      accountName:      row.payment_account_name   ?? undefined,
      accountNumber:    row.payment_account_number ?? undefined,
      slipUrl:          row.payment_slip_url        ?? undefined,
      contractSignedAt: row.contract_signed_at      ?? undefined,
    },
    customerNotes: row.customer_notes ?? undefined,
    extraDevices:  row.extra_devices  ?? [],
    notes:         row.notes          ?? [],
    statusLog:     row.status_log     ?? [],
    inspection:    row.inspection     ?? undefined,
    source:        row.source         ?? "website",
    assignedTo:         row.assigned_to         ?? null,
    assignedToName:     row.assigned_to_name    ?? null,
    riderId:            row.rider_id             ?? null,
    distanceKm:         row.distance_km          ?? null,
    returnSubmittedAt:  row.return_submitted_at  ?? null,
    returnedToOfficeAt: row.returned_to_office_at ?? null,
  };
}

// ─── Update status helper (internal) ─────────────────────────────────────────
async function updateRiderStatus(id: string, status: string, note: string, userId: string) {
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log").eq("id", id).single();

  const newLog = [...(req?.status_log ?? []), { status, timestamp: now, note }];
  const { error } = await supabase
    .from("requests")
    .update({ status, status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── Rider submits device return to office ────────────────────────────────────
export async function riderSubmitReturn(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests")
    .select("status, order_number, device_model, return_submitted_at")
    .eq("id", id).single();

  if (!["completed", "awaiting_transfer"].includes(req?.status ?? "")) return { success: false as const, error: "งานยังไม่เสร็จสิ้น" };
  if (req?.return_submitted_at)    return { success: false as const, error: "แจ้งส่งคืนไปแล้ว รอ admin ยืนยัน" };

  const { error } = await supabase
    .from("requests")
    .update({ return_submitted_at: now, updated_at: now })
    .eq("id", id).eq("rider_id", user.id);
  if (error) return { success: false as const, error: error.message };

  after(async () => {
    await broadcastRequestUpdate(id);
    await sendPushToOwners({
      title: `ไรเดอร์แจ้งส่งคืนเครื่อง — ${req?.order_number ?? ""}`,
      body: `${req?.device_model ?? ""} · รอยืนยันรับเครื่องที่ออฟฟิศ`,
      url: `/admin/requests/${id}`,
      tag: `return-${id}`,
    }).catch(console.error);
  });

  return { success: true as const };
}

// ─── Chain to next job (ไปงานถัดไปโดยไม่กลับออฟฟิศ) ─────────────────────────
export async function riderChainToNext(jobId: string): Promise<{ nextJobId: string | null }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: job } = await supabase
    .from("requests")
    .select("status_log")
    .eq("id", jobId)
    .single();

  if (job) {
    const newLog = [...((job.status_log as unknown[]) ?? []), { status: "direct_chain", timestamp: now }];
    await supabase.from("requests").update({ status_log: newLog, updated_at: now }).eq("id", jobId);
  }

  const { data: next } = await supabase
    .from("requests")
    .select("id")
    .eq("rider_id", user.id)
    .in("status", ["pickup_scheduled", "confirmed"])
    .neq("id", jobId)
    .order("appt_date", { ascending: true })
    .order("appt_time", { ascending: true })
    .limit(1);

  return { nextJobId: next?.[0]?.id ?? null };
}
