"use server";

import { after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { sendPushToOwners, sendPushToUser } from "@/app/actions/push";
import type { AdminRequest } from "@/lib/types/admin";

// ─── Fetch pending jobs (assigned by admin, awaiting rider acceptance) ────────
export async function fetchPendingRiderJobs(riderId: string): Promise<AdminRequest[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("*")
    .eq("rider_id", riderId)
    .in("status", ["confirmed", "pickup_scheduled"])
    .order("appt_date", { ascending: true });
  return (data ?? []).map(mapRow);
}

// ─── Fetch active jobs (rider already en_route or further) ───────────────────
export async function fetchRiderJobs(riderId: string): Promise<AdminRequest[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("rider_id", riderId)
    .in("status", ["en_route", "inspecting", "price_negotiation", "contracting"])
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

// ─── Accept job (confirmed → en_route) ───────────────────────────────────────
export async function riderAcceptJob(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model").eq("id", id).single();

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "en_route", timestamp: now, note: "ไรเดอร์รับงานและออกเดินทางแล้ว" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "en_route", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  after(() => sendPushToOwners({
    title: `ไรเดอร์รับงาน — ${req?.order_number ?? ""}`,
    body: `${req?.device_model ?? ""} · กำลังเดินทางไปหาลูกค้า`,
    url: `/admin/requests/${id}`,
    tag: `en-route-${id}`,
  }).catch(console.error));

  return { success: true as const };
}

// ─── Start job (en_route) ─────────────────────────────────────────────────────
export async function riderStartJob(id: string) {
  const user = await requireAuth();
  return updateRiderStatus(id, "en_route", "ไรเดอร์ออกเดินทางแล้ว", user.id);
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
  after(() => sendPushToOwners({
    title: `ไรเดอร์ถึงที่แล้ว — ${req?.order_number ?? ""}`,
    body: `${req?.device_model ?? ""} · กำลังตรวจเครื่อง`,
    url: `/admin/requests/${id}`,
    tag: `arrive-${id}`,
  }).catch(console.error));
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

  after(() => sendPushToOwners({
    title: "ราคาตรงกัน — กำลังทำสัญญา",
    body: `งาน ${id.slice(0, 8)}... · ฿${actualPrice.toLocaleString("th-TH")}`,
    url: `/admin/requests/${id}`,
    tag: `contracting-${id}`,
  }).catch(console.error));

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

  after(() => sendPushToOwners({
    title: `ปรับราคา — ${req?.order_number ?? ""}`,
    body: `${req?.device_model ?? ""} · เสนอ ฿${newPrice.toLocaleString("th-TH")} (${reason})`,
    url: `/admin/requests/${id}`,
    tag: `price-${id}`,
  }).catch(console.error));

  return { success: true as const };
}

// ─── Customer accepted adjusted price ─────────────────────────────────────────
export async function riderCustomerAccepted(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("inspection, status_log, order_number, device_model").eq("id", id).single();

  const updatedInspection = {
    ...(req?.inspection ?? {}),
    negotiationResponse: "accepted",
    negotiationRespondedAt: now,
    negotiationRespondedBy: "staff",
  };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "contracting", timestamp: now, note: "ลูกค้ายอมรับราคาใหม่" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "contracting", status_log: newLog, inspection: updatedInspection, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  after(() => sendPushToOwners({
    title: `ลูกค้ายอมรับราคา — ${req?.order_number ?? ""}`,
    body: `${req?.device_model ?? ""} · กำลังทำสัญญา`,
    url: `/admin/requests/${id}`,
    tag: `accepted-${id}`,
  }).catch(console.error));
  return { success: true as const };
}

// ─── Customer rejected adjusted price ────────────────────────────────────────
export async function riderCustomerRejected(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("inspection, status_log, order_number, device_model").eq("id", id).single();

  const updatedInspection = {
    ...(req?.inspection ?? {}),
    negotiationResponse: "rejected",
    negotiationRespondedAt: now,
    negotiationRespondedBy: "staff",
  };

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "cancelled", timestamp: now, note: "ลูกค้าไม่ยอมรับราคา" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "cancelled", status_log: newLog, inspection: updatedInspection, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  after(() => sendPushToOwners({
    title: `ลูกค้าปฏิเสธราคา — ${req?.order_number ?? ""}`,
    body: `${req?.device_model ?? ""} · งานถูกยกเลิก`,
    url: `/admin/requests/${id}`,
    tag: `rejected-${id}`,
  }).catch(console.error));
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

  after(() => sendPushToOwners({
    title: `งานเสร็จสิ้น — ${req?.order_number ?? ""}`,
    body: `${req?.device_model ?? ""} · ฿${(req?.actual_price ?? 0).toLocaleString("th-TH")} (เงินสด)`,
    url: `/admin/requests/${id}`,
    tag: `completed-${id}`,
  }).catch(console.error));

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
  const newLog = [...(current?.status_log ?? []), { status: "contracting", timestamp: now, note }];
  await supabase.from("requests").update({ status_log: newLog, updated_at: now }).eq("id", id);

  after(async () => {
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
export async function riderCompleteTransfer(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests").select("status_log, order_number, device_model, actual_price").eq("id", id).single();

  const newLog = [
    ...(req?.status_log ?? []),
    { status: "completed", timestamp: now, note: "Finance โอนเงินแล้ว ไรเดอร์ยืนยัน" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "completed", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  after(() => sendPushToOwners({
    title: `งานเสร็จสิ้น — ${req?.order_number ?? ""}`,
    body: `${req?.device_model ?? ""} · ฿${(req?.actual_price ?? 0).toLocaleString("th-TH")} (โอนเงิน)`,
    url: `/admin/requests/${id}`,
    tag: `completed-${id}`,
  }).catch(console.error));

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
    { status: "cancelled", timestamp: now, note: "ลูกค้าไม่อยู่ / ไม่รับสาย" },
  ];

  const { error } = await supabase
    .from("requests")
    .update({ status: "cancelled", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  after(() => sendPushToOwners({
    title: `ลูกค้าไม่อยู่ — ${req?.order_number ?? ""}`,
    body: `${req?.device_model ?? ""} · ไรเดอร์ถึงที่แล้วแต่ไม่พบลูกค้า`,
    url: `/admin/requests/${id}`,
    tag: `noshow-${id}`,
  }).catch(console.error));

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

  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await supabase
    .from("requests")
    .select("status, actual_price, estimated_price, created_at, device_model, device_storage, order_number")
    .eq("rider_id", riderId)
    .eq("status", "completed")
    .gte("created_at", monthStart)
    .order("created_at", { ascending: false });

  const jobs = data ?? [];

  const sum = (list: typeof jobs) =>
    list.reduce((s, j) => s + ((j.actual_price ?? j.estimated_price) || 0), 0);

  const todayJobs   = jobs.filter(j => j.created_at >= today);
  const weekJobs    = jobs.filter(j => j.created_at >= weekStart.toISOString());

  return {
    today:  { count: todayJobs.length,  total: sum(todayJobs)  },
    week:   { count: weekJobs.length,   total: sum(weekJobs)   },
    month:  { count: jobs.length,       total: sum(jobs)       },
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
      method:        row.payment_method        ?? "cash",
      bankName:      row.payment_bank          ?? undefined,
      accountName:   row.payment_account_name  ?? undefined,
      accountNumber: row.payment_account_number ?? undefined,
      slipUrl:       row.payment_slip_url      ?? undefined,
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
