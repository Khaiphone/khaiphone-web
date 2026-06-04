"use server";

import { after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { broadcastRequestUpdate } from "@/lib/broadcast";
import { sendPushToOwners, sendPushToUser } from "@/app/actions/push";
import type { AdminRequest, RequestStatus, SellMethod, PayMethod } from "@/lib/types/admin";
import { SLIP_PLACEHOLDER, SLIP_BLOCK } from "@/lib/contract-builder";
import type { Permission } from "@/lib/admin-permissions";
import type { AdminRole } from "@/app/actions/admin-users";

const STATUS_LABEL: Record<string, string> = {
  new:       "คำขอใหม่",
  pending:   "รอดำเนินการ",
  contacted: "ติดต่อแล้ว",
  confirmed: "ยืนยันนัดหมาย",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  no_show:   "ไม่มาตามนัด",
};

// ─── Activity log helper ──────────────────────────────────────────────────────
async function logActivity(opts: {
  requestId?: string;
  orderNumber?: string;
  action: string;
  detail?: string;
  userId: string;
}) {
  try {
    const supabase = createServerClient();
    const { data: profile } = await supabase
      .from("admin_users")
      .select("name")
      .eq("user_id", opts.userId)
      .single();
    await supabase.from("request_activity_logs").insert({
      request_id:        opts.requestId ?? null,
      order_number:      opts.orderNumber ?? null,
      action:            opts.action,
      detail:            opts.detail ?? null,
      performed_by_name: profile?.name ?? "แอดมิน",
    });
  } catch { /* log failure must not block main operation */ }
}

// ─── Fetch recent activity (dashboard) ───────────────────────────────────────
export async function fetchRecentActivity(limit = 20) {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("request_activity_logs")
    .select("id, order_number, action, detail, performed_by_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ─── Map DB row → AdminRequest ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AdminRequest {
  return {
    id:          row.id,
    orderNumber: row.order_number,
    status:      row.status as RequestStatus,
    createdAt:   row.created_at,
    customer: {
      name:    row.customer_name,
      phone:   row.customer_phone,
      email:   row.customer_email ?? "",
      lineId:  row.customer_line_id ?? undefined,
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
      method:   (row.appt_method  ?? "branch") as SellMethod,
    },
    payment: {
      method:           (row.payment_method ?? "cash") as PayMethod,
      bankName:         row.payment_bank            ?? undefined,
      accountName:      row.payment_account_name    ?? undefined,
      accountNumber:    row.payment_account_number  ?? undefined,
      slipUrl:          row.payment_slip_url         ?? undefined,
      contractSignedAt: row.contract_signed_at       ?? undefined,
    },
    customerNotes: row.customer_notes ?? undefined,
    extraDevices:  row.extra_devices  ?? [],
    notes:         row.notes          ?? [],
    statusLog:     row.status_log     ?? [],
    inspection:  row.inspection  ?? undefined,
    source:         row.source           ?? "website",
    contractUrl:    row.contract_url     ?? undefined,
    receiptUrl:     row.receipt_url      ?? undefined,
    assignedTo:     row.assigned_to      ?? null,
    assignedToName: row.assigned_to_name ?? null,
    riderId:        row.rider_id         ?? null,
    riderName:      row.rider_name       ?? null,
    distanceKm:     row.distance_km      ?? null,
  };
}

// ─── Fetch all requests (owner) or assigned-only (staff) ─────────────────────
export async function fetchRequests(assignedToUserId?: string): Promise<AdminRequest[]> {
  await requireAuth();
  const supabase = createServerClient();
  let query = supabase.from("requests").select("*")
    .neq("source", "manual")
    .order("created_at", { ascending: false });
  if (assignedToUserId) query = query.eq("assigned_to", assignedToUserId);
  const { data, error } = await query;
  if (error) { console.error("fetchRequests:", error); return []; }
  return (data ?? []).map(mapRow);
}

// ─── Fetch everything the dashboard needs in one server-side call ─────────────
export async function fetchDashboardData(userId: string): Promise<{
  role: AdminRole;
  permissions: Permission[];
  requests: AdminRequest[];
  staffUserId: string | undefined;
}> {
  await requireAuth();
  const supabase = createServerClient();

  const [profileRes, reqRes] = await Promise.all([
    supabase.from("admin_users").select("role, permissions").eq("user_id", userId).single(),
    supabase.from("requests").select("*").neq("source", "manual").order("created_at", { ascending: false }),
  ]);

  const role = (profileRes.data?.role ?? "owner") as AdminRole;
  const permissions = (profileRes.data?.permissions ?? []) as Permission[];
  const isStaff = role === "staff";
  const canSeeAll = !isStaff || permissions.includes("receive_new_requests");
  const all = (reqRes.data ?? []).map(mapRow);
  const requests = canSeeAll ? all : all.filter(r => r.assignedTo === userId);

  return { role, permissions, requests, staffUserId: isStaff ? userId : undefined };
}

// ─── Create request (admin-initiated, e.g. from LINE/phone inquiry) ──────────
export async function createRequest(data: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerLineId?: string;
  deviceModel: string;
  deviceStorage: string;
  deviceColor?: string;
  deviceCondition: string;
  deviceConditionDetails?: string[];
  deviceSelections?: Record<string, string>;
  estimatedPrice: number;
  priceRange?: string;
  apptDate: string;
  apptTime: string;
  apptLocation: string;
  apptMethod: SellMethod;
  paymentMethod: PayMethod;
  paymentBank?: string;
  paymentAccountName?: string;
  paymentAccountNumber?: string;
  source: "line" | "phone" | "facebook";
  notes?: string;
}): Promise<{ success: true; orderNumber: string; id: string } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const orderNumber = `KP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const status: RequestStatus = data.apptDate ? "confirmed" : "new";

  const statusLog = [{ status, timestamp: now, note: `สร้างโดยแอดมิน (${data.source === "line" ? "LINE" : data.source === "phone" ? "โทรศัพท์" : "Facebook"})` }];
  const notes = data.notes
    ? [{ text: data.notes, createdAt: now, author: "admin", showToCustomer: false }]
    : [];

  const { data: row, error } = await supabase.from("requests").insert({
    order_number:     orderNumber,
    status,
    source:           data.source,
    customer_name:    data.customerName,
    customer_phone:   data.customerPhone,
    customer_email:   data.customerEmail || "",
    customer_line_id: data.customerLineId || null,
    device_model:     data.deviceModel,
    device_storage:   data.deviceStorage,
    device_color:     data.deviceColor || null,
    device_condition: data.deviceCondition,
    estimated_price:  data.estimatedPrice,
    price_range:      data.priceRange ?? "",
    device_condition_details: data.deviceConditionDetails ?? [],
    device_selections: data.deviceSelections ?? {},
    appt_date:        data.apptDate,
    appt_time:        data.apptTime,
    appt_location:    data.apptLocation,
    appt_method:      data.apptMethod,
    payment_method:         data.paymentMethod,
    payment_bank:           data.paymentBank           || null,
    payment_account_name:   data.paymentAccountName    || null,
    payment_account_number: data.paymentAccountNumber  || null,
    notes,
    status_log:       statusLog,
    created_at:       now,
    updated_at:       now,
  }).select("id").single();

  if (error) return { success: false, error: error.message };
  const user = await requireAuth().catch(() => null);
  if (user) await logActivity({ requestId: row.id, orderNumber, action: "สร้างคำขอ", detail: `${data.deviceModel} · ${data.customerName}`, userId: user.id });
  return { success: true, orderNumber, id: row.id };
}

// ─── Assign request to staff ──────────────────────────────────────────────────
export async function assignRequest(id: string, userId: string | null, name: string | null) {
  const caller = await requireAuth();
  const supabase = createServerClient();
  const { data: callerProfile } = await supabase
    .from("admin_users")
    .select("role, permissions")
    .eq("user_id", caller.id)
    .single();
  const callerRole = callerProfile?.role as AdminRole | undefined;
  const callerPerms = (callerProfile?.permissions ?? []) as Permission[];
  if (callerRole === "staff" && !callerPerms.includes("assign_requests")) {
    return { success: false as const, error: "ไม่มีสิทธิ์มอบหมายงาน" };
  }
  const { error } = await supabase
    .from("requests")
    .update({ assigned_to: userId, assigned_to_name: name, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  // Notify the assigned staff member
  if (userId) {
    const { data: req } = await supabase
      .from("requests")
      .select("order_number, device_model")
      .eq("id", id)
      .single();
    after(() => sendPushToUser(userId, {
      title: "มีงานมอบหมายใหม่",
      body:  `${req?.order_number ?? ""} · ${req?.device_model ?? ""}`,
      url:   `/admin/requests/${id}`,
      tag:   `assign-${id}`,
    }).catch(console.error));
  }

  return { success: true as const };
}

const STORE_ADDRESS = "เดอะแพลนท์ วงแหวน-รังสิต อำเภอธัญบุรี ปทุมธานี 12110";

async function fetchDistanceKm(destination: string): Promise<number | null> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key || !destination) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(STORE_ADDRESS)}&destinations=${encodeURIComponent(destination)}&key=${key}&mode=driving&language=th`;
    const res  = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const el   = data?.rows?.[0]?.elements?.[0];
    if (el?.status === "OK" && el?.distance?.value) {
      return Math.round(el.distance.value / 100) / 10; // meters → km (1 decimal)
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Assign rider to request ──────────────────────────────────────────────────
export async function assignRider(id: string, riderId: string | null, riderName: string | null) {
  const caller = await requireAuth();
  const supabase = createServerClient();
  const { data: callerProfile } = await supabase
    .from("admin_users")
    .select("role, permissions")
    .eq("user_id", caller.id)
    .single();
  const callerRole = callerProfile?.role as AdminRole | undefined;
  const callerPerms = (callerProfile?.permissions ?? []) as Permission[];
  if (callerRole === "staff" && !callerPerms.includes("assign_requests")) {
    return { success: false as const, error: "ไม่มีสิทธิ์มอบหมายงาน" };
  }

  // Fetch address for distance calculation
  const { data: req } = await supabase
    .from("requests")
    .select("order_number, device_model, appt_location, status")
    .eq("id", id)
    .single();

  if (riderId && (req?.status === "new" || req?.status === "pending")) {
    return { success: false as const, error: "ต้องยืนยันนัดหมายก่อนมอบหมายไรเดอร์" };
  }

  // Calculate distance from store → customer address
  const distanceKm = riderId ? await fetchDistanceKm(req?.appt_location ?? "") : null;

  const updatePayload: Record<string, unknown> = {
    rider_id: riderId, rider_name: riderName, updated_at: new Date().toISOString(),
  };
  if (distanceKm !== null) updatePayload.distance_km = distanceKm;

  const { error } = await supabase.from("requests").update(updatePayload).eq("id", id);
  if (error) return { success: false as const, error: error.message };

  after(() => broadcastRequestUpdate(id));

  if (riderId) {
    const distText = distanceKm ? ` · ${distanceKm} กม.` : "";
    after(() => sendPushToUser(riderId, {
      title: "งานใหม่มาแล้ว!",
      body:  `${req?.order_number ?? ""} · ${req?.device_model ?? ""}${distText}`,
      url:   `/rider`,
      tag:   `rider-assign-${id}`,
    }).catch(console.error));
  }

  return { success: true as const, distanceKm };
}

// ─── Fetch single request ─────────────────────────────────────────────────────
export async function fetchRequest(id: string): Promise<AdminRequest | null> {
  await requireAuth();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("fetchRequest:", error); return null; }
  return mapRow(data);
}

// ─── Fetch request by order number (for customer tracking page) ───────────────
export async function fetchRequestByOrderNumber(
  orderNumber: string,
  phone: string,
): Promise<AdminRequest | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .ilike("order_number", orderNumber)   // case-insensitive match
    .single();
  if (error || !data) return null;
  const dbPhone = (data.customer_phone ?? "").replace(/\D/g, "");
  const inputPhone = phone.replace(/\D/g, "");
  if (dbPhone !== inputPhone) return null;
  return mapRow(data);
}

// ─── Check if order exists (no phone check) — for better UX on track page ─────
export async function checkOrderExists(orderNumber: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("requests")
    .select("id")
    .ilike("order_number", orderNumber)
    .single();
  return !!data;
}

// ─── Update status ────────────────────────────────────────────────────────────
export async function updateStatus(
  id: string,
  status: RequestStatus,
  note: string,
) {
  const user = await requireAuth();
  console.log("[updateStatus] id:", id, "→", status);
  const supabase = createServerClient();

  // Get current status_log + request data (needed for auto-stock on completion)
  const { data: current } = await supabase
    .from("requests")
    .select("status_log, order_number, source, device_model, device_storage, device_color, actual_price, estimated_price, customer_name, customer_phone, inspection, assigned_to")
    .eq("id", id)
    .single();

  const newLog = [
    ...(current?.status_log ?? []),
    { status, timestamp: new Date().toISOString(), note: note || status },
  ];

  const { data: updated, error } = await supabase
    .from("requests")
    .update({ status, status_log: newLog, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("updateStatus error:", error);
    return { success: false, error: error.message };
  }
  if (!updated || updated.length === 0) {
    console.error("updateStatus: 0 rows updated, id =", id);
    return { success: false, error: `ไม่พบคำขอ id=${id} ในฐานข้อมูล` };
  }

  await logActivity({ requestId: id, orderNumber: current?.order_number, action: "เปลี่ยนสถานะ", detail: status, userId: user.id });

  // Auto-create stocks entry when request is completed
  if (status === "completed" && current) {
    const { count } = await supabase.from("stocks").select("*", { count: "exact", head: true })
      .eq("request_ref", current.order_number);
    if ((count ?? 0) === 0) {
      const sourceMap: Record<string, string> = {
        website: "เว็บไซต์", line: "LINE OA", facebook: "Facebook",
        phone: "โทรศัพท์", manual: "หน้าร้าน",
      };
      const year = new Date().getFullYear();
      const { count: totalCount } = await supabase.from("stocks").select("*", { count: "exact", head: true });
      const stockId = `STK-${year}-${String((totalCount ?? 0) + 1).padStart(5, "0")}`;
      const now = new Date().toISOString();
      const insp = current.inspection ?? {};
      const snapshot = {
        imei:           insp.imei    ?? null,
        serial:         insp.serial  ?? null,
        model:          current.device_model   ?? null,
        storage:        current.device_storage ?? null,
        color:          current.device_color   ?? null,
        source:         "inspection",
        result:          insp.result          ?? null,
        batteryHealth:   insp.batteryHealth   ?? null,
        batteryCycles:   insp.batteryCycles   ?? null,
        warrantyExpiry:  insp.warrantyExpiry  ?? null,
        criteria:        insp.criteria        ?? [],
        functionalTests: insp.functionalTests ?? [],
        issues:          insp.issues          ?? [],
      };
      await supabase.from("stocks").insert({
        id: stockId,
        model:          current.device_model ?? "",
        storage:        current.device_storage ?? "",
        color:          current.device_color ?? "",
        imei:           insp.imei   ?? "",
        serial:         insp.serial ?? "",
        grade:          insp.result === "matched" ? "A" : insp.result === "adjusted" ? "B" : "A",
        battery_health: insp.batteryHealth ?? 0,
        cycle_count:    insp.batteryCycles ?? 0,
        icloud_status:  "", carrier_lock:  "", accessories:  "",
        physical_checks: [
          ...(insp.criteria ?? []).map((c: { label: string; pass: boolean; actual?: string }) => ({ label: c.label, condition: c.pass ? "ปกติ" : (c.actual?.trim() || "มีตำหนิ") })),
          ...(insp.functionalTests ?? []).map((t: { label: string; pass: boolean }) => ({ label: t.label, condition: t.pass ? "ปกติ" : "มีปัญหา" })),
        ],
        cost_price:     current.actual_price ?? current.estimated_price ?? 0,
        shipping_cost:  0,  other_cost:    0,  selling_price: 0,
        status:         "รอตรวจ",
        source_channel: sourceMap[current.source ?? "website"] ?? "เว็บไซต์",
        request_ref:    current.order_number,
        seller_name:    current.customer_name ?? "",
        seller_phone:   current.customer_phone ?? "",
        received_at:    now,
        inspector:      "",
        photos:         insp.photos ?? [],
        inspection_snapshot: snapshot,
        notes:          [], status_log: [{ status: "รอตรวจ", timestamp: now, note: `สร้างอัตโนมัติจาก ${current.order_number}`, by: "system" }],
        created_at:     now, updated_at: now,
      });
    }
  }

  broadcastRequestUpdate(id);

  // Push notification: owners always get notified, assigned staff also gets notified
  after(async () => {
    const pushPayload = {
      title: `สถานะเปลี่ยน → ${STATUS_LABEL[status] ?? status}`,
      body:  `${current?.order_number ?? ""} · ${current?.device_model ?? ""}`,
      url:   `/admin/requests/${id}`,
      tag:   `status-${id}`,
    };
    await sendPushToOwners(pushPayload).catch(console.error);
    if (current?.assigned_to && current.assigned_to !== user.id) {
      await sendPushToUser(current.assigned_to, pushPayload).catch(console.error);
    }
  });

  return { success: true, statusLog: newLog };
}

// ─── Add note ─────────────────────────────────────────────────────────────────
export async function addNote(
  id: string,
  text: string,
  showToCustomer: boolean,
) {
  await requireAuth();
  const supabase = createServerClient();

  const { data: current } = await supabase
    .from("requests")
    .select("notes")
    .eq("id", id)
    .single();

  const newNote = {
    text,
    createdAt: new Date().toISOString(),
    author: "admin",
    showToCustomer,
  };
  const newNotes = [...(current?.notes ?? []), newNote];

  const { data: updated, error } = await supabase
    .from("requests")
    .update({ notes: newNotes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");

  if (error) { console.error("addNote error:", error); return { success: false, error: error.message }; }
  if (!updated || updated.length === 0) return { success: false, error: "ไม่พบคำขอในฐานข้อมูล" };
  return { success: true, notes: newNotes };
}

// ─── Update appointment ───────────────────────────────────────────────────────
export async function updateAppointment(
  id: string,
  appt: { date: string; time: string; location: string; method: string },
) {
  await requireAuth();
  const supabase = createServerClient();
  const { data: updated, error } = await supabase
    .from("requests")
    .update({
      appt_date:     appt.date,
      appt_time:     appt.time,
      appt_location: appt.location,
      appt_method:   appt.method,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) { console.error("updateAppointment error:", error); return { success: false, error: error.message }; }
  if (!updated || updated.length === 0) return { success: false, error: "ไม่พบคำขอในฐานข้อมูล" };
  return { success: true };
}

// ─── Update payment ───────────────────────────────────────────────────────────
export async function updatePayment(
  id: string,
  pay: { method: string; bankName?: string; accountName?: string; accountNumber?: string },
) {
  await requireAuth();
  const supabase = createServerClient();
  const { data: updated, error } = await supabase
    .from("requests")
    .update({
      payment_method:         pay.method,
      payment_bank:           pay.bankName      || null,
      payment_account_name:   pay.accountName   || null,
      payment_account_number: pay.accountNumber || null,
      updated_at:             new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) { console.error("updatePayment error:", error); return { success: false, error: error.message }; }
  if (!updated || updated.length === 0) return { success: false, error: "ไม่พบคำขอในฐานข้อมูล" };
  return { success: true };
}

// ─── Mark contract signed ─────────────────────────────────────────────────────
export async function markContractSigned(id: string) {
  await requireAuth();
  const supabase = createServerClient();
  const signedAt = new Date().toISOString();
  const { error } = await supabase
    .from("requests")
    .update({ contract_signed_at: signedAt, updated_at: signedAt })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  after(() => broadcastRequestUpdate(id));
  return { success: true as const, signedAt };
}

// ─── Save payment slip URL ────────────────────────────────────────────────────
export async function savePaymentSlip(id: string, slipUrl: string) {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("requests")
    .update({ payment_slip_url: slipUrl, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  after(() => broadcastRequestUpdate(id));
  return { success: true as const };
}

// ─── Update price ─────────────────────────────────────────────────────────────
export async function updatePrice(
  id: string,
  estimatedPrice: number,
  actualPrice?: number,
) {
  await requireAuth();
  const supabase = createServerClient();
  const { data: updated, error } = await supabase
    .from("requests")
    .update({
      estimated_price: estimatedPrice,
      actual_price:    actualPrice ?? null,
      updated_at:      new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) { console.error("updatePrice error:", error); return { success: false, error: error.message }; }
  if (!updated || updated.length === 0) return { success: false, error: "ไม่พบคำขอในฐานข้อมูล" };
  return { success: true };
}

// ─── Update customer info ─────────────────────────────────────────────────────
export async function updateCustomer(id: string, data: { name: string; phone: string; email?: string }) {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({
      customer_name:  data.name.trim(),
      customer_phone: data.phone.trim(),
      customer_email: data.email?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── Update device info ───────────────────────────────────────────────────────
export async function updateDevice(id: string, data: { model: string; storage: string; color?: string; condition: string; estimatedPrice?: number }) {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({
      device_model:     data.model.trim(),
      device_storage:   data.storage.trim(),
      device_color:     data.color?.trim() || null,
      device_condition: data.condition.trim(),
      ...(data.estimatedPrice !== undefined ? { estimated_price: data.estimatedPrice } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── Update device color ──────────────────────────────────────────────────────
export async function updateDeviceColor(id: string, color: string) {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({ device_color: color.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── Delete request (owner only) ─────────────────────────────────────────────
export async function deleteRequest(id: string) {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "owner") return { success: false as const, error: "ไม่มีสิทธิ์ลบคำขอ" };
  const { data: req } = await supabase.from("requests").select("order_number, device_model, customer_name").eq("id", id).single();
  const { error } = await supabase.from("requests").delete().eq("id", id);
  if (error) return { success: false as const, error: error.message };
  await logActivity({ orderNumber: req?.order_number, action: "ลบคำขอ", detail: `${req?.device_model ?? ""} · ${req?.customer_name ?? ""}`, userId: user.id });
  return { success: true as const };
}

// ─── Signed URL for contract documents (PDPA: access-controlled, 60s expiry) ─
export async function getDocumentSignedUrl(requestId: string, storagePath: string): Promise<string | null> {
  const user = await requireAuth();
  const supabase = createServerClient();

  // Verify caller has access to this request
  const { data: req } = await supabase
    .from("requests")
    .select("assigned_to, rider_id")
    .eq("id", requestId)
    .single();
  if (!req) return null;

  const { data: profile } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  const isOwner       = profile?.role === "owner";
  const isAssignee    = req.assigned_to === user.id;
  const isRider       = req.rider_id   === user.id;
  if (!isOwner && !isAssignee && !isRider) return null;

  const { data, error } = await supabase.storage
    .from("inspection-photos")
    .createSignedUrl(storagePath, 60);
  if (error) { console.error("getDocumentSignedUrl:", error); return null; }
  return data.signedUrl;
}

// ─── Patch receipt HTML with slip image (server-side) ────────────────────────
export async function patchReceiptWithSlip(requestId: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();

  const { data: req } = await supabase
    .from("requests")
    .select("receipt_url, payment_slip_url")
    .eq("id", requestId)
    .single();

  if (!req?.receipt_url)      return { success: false, error: "ไม่พบ receipt URL" };
  if (!req?.payment_slip_url) return { success: false, error: "ไม่พบสลิป" };

  // Download receipt HTML
  const { data: receiptData, error: dlErr } = await supabase.storage
    .from("inspection-photos")
    .download(req.receipt_url);
  if (dlErr || !receiptData) return { success: false, error: "ดาวน์โหลด receipt ไม่สำเร็จ" };

  let receiptHtml = await receiptData.text();
  if (!receiptHtml.includes(SLIP_PLACEHOLDER)) return { success: true }; // already patched

  // Download slip image and convert to data URL
  const slipResp = await fetch(req.payment_slip_url);
  if (!slipResp.ok) return { success: false, error: "ดาวน์โหลดสลิปไม่สำเร็จ" };
  const slipBuffer = await slipResp.arrayBuffer();
  const slipBase64 = Buffer.from(slipBuffer).toString("base64");
  const contentType = slipResp.headers.get("content-type") ?? "image/jpeg";
  const slipDataUrl = `data:${contentType};base64,${slipBase64}`;

  receiptHtml = receiptHtml.replace(SLIP_PLACEHOLDER, SLIP_BLOCK(slipDataUrl));

  const { error: upErr } = await supabase.storage
    .from("inspection-photos")
    .upload(req.receipt_url, new Blob([receiptHtml], { type: "text/html;charset=utf-8" }), {
      upsert: true, contentType: "text/html",
    });
  if (upErr) return { success: false, error: upErr.message };

  return { success: true };
}

// ─── Upload contract HTML files (service role to bypass RLS) ─────────────────
export async function uploadContractFiles(
  jobId: string,
  docNo: string,
  contractHtml: string,
  receiptHtml: string,
) {
  await requireAuth();
  const supabase = createServerClient();
  const cPath = `contracts/${jobId}/${docNo}-contract.html`;
  const rPath = `contracts/${jobId}/${docNo}-receipt.html`;
  const enc = new TextEncoder();
  const [cu, ru] = await Promise.all([
    supabase.storage.from("inspection-photos").upload(cPath, enc.encode(contractHtml), { upsert: true, contentType: "text/html;charset=utf-8" }),
    supabase.storage.from("inspection-photos").upload(rPath, enc.encode(receiptHtml), { upsert: true, contentType: "text/html;charset=utf-8" }),
  ]);
  if (cu.error) { console.error("uploadContractFiles contract error:", cu.error); return { success: false as const, error: cu.error.message }; }
  if (ru.error) { console.error("uploadContractFiles receipt error:", ru.error); return { success: false as const, error: ru.error.message }; }
  return { success: true as const, contractPath: cu.data.path, receiptPath: ru.data.path };
}

// ─── Save contract + receipt URLs ────────────────────────────────────────────
export async function saveContractUrls(
  id: string,
  contractUrl: string,
  receiptUrl: string,
) {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({ contract_url: contractUrl, receipt_url: receiptUrl, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) { console.error("saveContractUrls error:", error); return { success: false as const, error: error.message }; }
  after(() => broadcastRequestUpdate(id));
  return { success: true as const };
}
