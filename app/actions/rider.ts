"use server";

import { after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
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
  const year = new Date().getFullYear();
  const { count: totalCount } = await supabase.from("stocks").select("*", { count: "exact", head: true });
  const stockId = `STK-${year}-${String((totalCount ?? 0) + 1).padStart(5, "0")}`;
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
    grade:          insp.result === "matched" ? "A" : insp.result === "adjusted" ? "B" : "A",
    battery_health: insp.batteryHealth ?? 0,
    cycle_count:    insp.batteryCycles ?? 0,
    icloud_status:  "", carrier_lock: "", accessories: "",
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
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [{ data: pendingData }, { data: activeData }, { data: statsData }] = await Promise.all([
    supabase.from("requests").select("*").eq("rider_id", riderId)
      .in("status", ["confirmed"]).order("appt_date", { ascending: true }),
    supabase.from("requests").select("*").eq("rider_id", riderId)
      .in("status", ["pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting"])
      .order("appt_date", { ascending: true }),
    supabase.from("requests")
      .select("status, actual_price, estimated_price")
      .eq("rider_id", riderId).gte("created_at", startOfMonth),
  ]);

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
    .in("status", ["pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting"])
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
    .in("status", ["completed", "cancelled", "rejected"])
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  return (data ?? []).map(mapRow);
}

// ─── Accept job (confirmed → pickup_scheduled) ────────────────────────────────
export async function riderAcceptJob(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model").eq("id", id).single();

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "pickup_scheduled", timestamp: now, note: "ไรเดอร์รับงานแล้ว รอออกเดินทาง" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "pickup_scheduled", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

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

  // Block if rider already has an active job (en_route or further)
  const { data: activeJobs } = await supabase
    .from("requests")
    .select("order_number")
    .eq("rider_id", req?.rider_id ?? user.id)
    .in("status", ["en_route", "inspecting", "price_negotiation", "contracting"])
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
export async function riderArriveJob(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model").eq("id", id).single();
  const now = new Date().toISOString();
  const newLog = [...(req?.status_log ?? []), { status: "inspecting", timestamp: now, note: "ไรเดอร์ถึงที่แล้ว เริ่มตรวจเครื่อง" }];
  const { error } = await supabase
    .from("requests").update({ status: "inspecting", status_log: newLog, updated_at: now }).eq("id", id);
  if (error) return { success: false as const, error: error.message };
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

// ─── Save inspection data ─────────────────────────────────────────────────────
export async function riderSaveInspection(id: string, inspection: {
  imei?: string;
  serial?: string;
  batteryHealth?: number;
  batteryCycles?: number;
  warrantyExpiry?: string;
  criteria: Array<{ label: string; stated: string; actual: string; pass: boolean }>;
  functionalTests?: Array<{ label: string; pass: boolean }>;
  photos: string[];
  idCardPhotoUrl?: string;
  deliveryPhotoUrl?: string;
}) {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("requests")
    .update({
      inspection: {
        ...inspection,
        inspectedAt: now,
        arrivedAt: now,
        result: "matched",
        issues: [],
        originalPrice: 0,
        actualPrice: 0,
        priceReason: "",
        negotiationResponse: null,
        negotiationRespondedAt: null,
        negotiationRespondedBy: null,
      },
      updated_at: now,
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  after(() => broadcastRequestUpdate(id));
  return { success: true as const };
}

// ─── Confirm price matches ────────────────────────────────────────────────────
export async function riderConfirmPrice(id: string, actualPrice: number) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("inspection, status_log").eq("id", id).single();

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
    .select("inspection, status_log, order_number, device_model, estimated_price")
    .eq("id", id).single();

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
    .from("requests").select("inspection, status_log, status, order_number, device_model").eq("id", id).single();

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
    .from("requests").select("inspection, status_log, status, order_number, device_model").eq("id", id).single();

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

// ─── Complete job with cash payment ──────────────────────────────────────────
export async function riderCompleteCash(id: string, cashPhotoUrl: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model, actual_price").eq("id", id).single();

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "completed", timestamp: now, note: "จ่ายเงินสดแล้ว ไรเดอร์ยืนยัน" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "completed", status_log: newLog, payment_slip_url: cashPhotoUrl, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

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
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests")
    .select("order_number, device_model, actual_price, customer_name, payment_account_number, payment_account_name, payment_bank, assigned_to")
    .eq("id", id).single();

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
    .from("requests").select("status_log, order_number, device_model, actual_price").eq("id", id).single();

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
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model").eq("id", id).single();

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "no_show", timestamp: now, note: "ลูกค้าไม่อยู่ / ไม่รับสาย" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "no_show", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

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

  const RELEVANT = new Set(["pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting", "completed", "cancelled"]);
  const LABELS: Record<string, string> = {
    pickup_scheduled:  "รับงานแล้ว",
    en_route:          "ออกเดินทางแล้ว",
    inspecting:        "เริ่มตรวจเครื่อง",
    price_negotiation: "รอลูกค้ายืนยันราคา",
    contracting:       "กำลังทำสัญญา",
    completed:         "งานเสร็จสิ้น",
    cancelled:         "งานถูกยกเลิก",
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
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await supabase
    .from("requests")
    .select("status, actual_price, estimated_price, appt_date")
    .eq("rider_id", riderId)
    .gte("created_at", startOfMonth);

  const jobs = data ?? [];
  const completed = jobs.filter(j => j.status === "completed");
  const cancelled = jobs.filter(j => j.status === "cancelled");

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

  const now        = new Date();
  const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart  = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

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
  const weekDone  = completed.filter(j => j.created_at >= weekStart.toISOString());

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
    assignedTo:    row.assigned_to    ?? null,
    assignedToName: row.assigned_to_name ?? null,
    riderId:       row.rider_id       ?? null,
    distanceKm:    row.distance_km    ?? null,
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
