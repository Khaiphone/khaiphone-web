"use server";

import { after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { broadcastRequestUpdate } from "@/lib/broadcast";
import { sendPushToOwners, sendPushToUser, sendPushToNewRequestReceivers } from "@/app/actions/push";
import type { AdminRequest, RequestStatus, SellMethod, PayMethod } from "@/lib/types/admin";
import { SLIP_PLACEHOLDER, SLIP_BLOCK } from "@/lib/contract-builder";
import type { Permission } from "@/lib/admin-permissions";
import type { AdminRole } from "@/app/actions/admin-users";
import { createStockItem } from "@/app/actions/stocks";
import type { SourceChannel } from "@/lib/stock/types";

const STATUS_LABEL: Record<string, string> = {
  new:               "คำขอใหม่",
  pending:           "รอดำเนินการ",
  contacted:         "เจ้าหน้าที่ติดต่อกลับแล้ว",
  confirmed:         "ยืนยันนัดหมาย",
  pickup_scheduled:  "ไรเดอร์รับงานแล้ว",
  en_route:          "ไรเดอร์กำลังเดินทาง",
  inspecting:        "กำลังตรวจเครื่อง",
  price_negotiation: "รอยืนยันราคา",
  contracting:       "กำลังทำสัญญา",
  awaiting_transfer: "รอโอนเงิน",
  completed:         "เสร็จสิ้น",
  cancelled:         "ยกเลิก",
  no_show:           "ไม่มาตามนัด",
  rejected:          "ไม่เข้าเงื่อนไข",
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
  const user = await requireAuth();
  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from("admin_users").select("role, permissions").eq("user_id", user.id).single();
  const role = (profile?.role ?? "owner") as AdminRole;
  const perms = (profile?.permissions ?? []) as Permission[];
  const canSeeAll = role !== "staff" || perms.includes("receive_new_requests");

  let query = supabase
    .from("request_activity_logs")
    .select("id, order_number, action, detail, performed_by_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Staff without view-all: only activity for requests assigned to them.
  if (!canSeeAll) {
    const { data: mine } = await supabase
      .from("requests").select("order_number").eq("assigned_to", user.id);
    const orderNumbers = (mine ?? []).map(r => r.order_number).filter(Boolean);
    if (orderNumbers.length === 0) return [];
    query = query.in("order_number", orderNumbers);
  }

  const { data } = await query;
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
      lat:      row.appt_lat      ?? null,
      lng:      row.appt_lng      ?? null,
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
    riderId:            row.rider_id              ?? null,
    riderName:          row.rider_name            ?? null,
    distanceKm:         row.distance_km           ?? null,
    returnSubmittedAt:       row.return_submitted_at        ?? null,
    returnedToOfficeAt:      row.returned_to_office_at      ?? null,
    returnedConfirmedById:   row.returned_confirmed_by_id   ?? null,
    returnedConfirmedByName: row.returned_confirmed_by_name ?? null,
    stockItemId:             row.stock_item_id              ?? null,
  };
}

// ─── Reclaim jobs not accepted within 10 minutes (called lazily on page load) ─
async function reclaimTimedOutJobs(supabase: ReturnType<typeof createServerClient>) {
  const TIMEOUT_MINUTES = 10;
  const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  const { data: timedOut } = await supabase
    .from("requests")
    .select("id, rider_id, status_log")
    .eq("status", "confirmed")
    .not("rider_id", "is", null)
    .lt("assigned_at", cutoff);

  for (const job of timedOut ?? []) {
    const newLog = [
      ...(job.status_log ?? []),
      { status: "confirmed", timestamp: now, note: `ไม่รับงานภายใน ${TIMEOUT_MINUTES} นาที — ระบบดึงงานกลับ` },
    ];
    const { data: updated } = await supabase
      .from("requests")
      .update({ rider_id: null, rider_name: null, assigned_at: null, status_log: newLog, updated_at: now })
      .eq("id", job.id).eq("status", "confirmed").not("rider_id", "is", null)
      .select("id");
    if (updated?.length) {
      await supabase.from("rider_locations")
        .update({ current_job_id: null, updated_at: now })
        .eq("rider_id", job.rider_id).eq("current_job_id", job.id);
      after(() => broadcastRequestUpdate(job.id).catch(console.error));
    }
  }
}

// ─── Fetch all requests (owner) or assigned-only (staff) ─────────────────────
export async function fetchRequests(assignedToUserId?: string): Promise<AdminRequest[]> {
  const user = await requireAuth();
  const supabase = createServerClient();
  after(() => reclaimTimedOutJobs(supabase).catch(console.error));
  // Enforce scoping server-side: staff without "receive_new_requests" are
  // always restricted to their own assigned requests, regardless of the param.
  const { data: profile } = await supabase
    .from("admin_users").select("role, permissions").eq("user_id", user.id).single();
  const role = (profile?.role ?? "owner") as AdminRole;
  const perms = (profile?.permissions ?? []) as Permission[];
  const canSeeAll = role !== "staff" || perms.includes("receive_new_requests");
  let query = supabase.from("requests").select("*")
    .neq("source", "manual")
    .order("created_at", { ascending: false });
  if (!canSeeAll) {
    query = query.eq("assigned_to", user.id);          // forced floor for staff
  } else if (assignedToUserId) {
    query = query.eq("assigned_to", assignedToUserId);  // optional filter for privileged users
  }
  const { data, error } = await query;
  if (error) { console.error("fetchRequests:", error); return []; }
  return (data ?? []).map(mapRow);
}

// ─── Fetch requests scoped to the caller (identity from session, not param) ──
// Owner / staff with "receive_new_requests" → all; other staff → assigned-only.
// Used by the notifications page so each user only sees their own notifications.
export async function fetchMyRequests(): Promise<AdminRequest[]> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { data: profile } = await supabase
    .from("admin_users").select("role, permissions").eq("user_id", user.id).single();
  const role = (profile?.role ?? "owner") as AdminRole;
  const perms = (profile?.permissions ?? []) as Permission[];
  const canSeeAll = role !== "staff" || perms.includes("receive_new_requests");
  let query = supabase.from("requests").select("*")
    .neq("source", "manual")
    .order("created_at", { ascending: false });
  if (!canSeeAll) query = query.eq("assigned_to", user.id);
  const { data, error } = await query;
  if (error) { console.error("fetchMyRequests:", error); return []; }
  return (data ?? []).map(mapRow);
}

// ─── Fetch rider-relevant jobs for a given date (default: today) ─────────────
export async function fetchRiderJobs(date?: string, dateRange?: { from: string; to: string }): Promise<AdminRequest[]> {
  await requireAuth();
  const supabase = createServerClient();

  const IN_PROGRESS = ["pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting", "awaiting_transfer"];

  let query = supabase.from("requests").select("*").not("status", "in", '("new","pending","contacted")');

  if (dateRange) {
    // Monthly mode: all jobs with appt_date in range, plus any still in-progress
    query = query.or(`and(appt_date.gte.${dateRange.from},appt_date.lte.${dateRange.to}),status.in.(${IN_PROGRESS.join(",")})`);
  } else {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    query = query.or(`appt_date.eq.${targetDate},status.in.(${IN_PROGRESS.join(",")})`);
  }

  const { data } = await query.order("appt_date", { ascending: false }).order("appt_time", { ascending: false, nullsFirst: true });
  return (data ?? []).map(mapRow);
}

// ─── Fetch everything the dashboard needs in one server-side call ─────────────
export async function fetchDashboardData(_userId?: string): Promise<{
  role: AdminRole;
  permissions: Permission[];
  requests: AdminRequest[];
  staffUserId: string | undefined;
}> {
  // Identity comes from the session, never the client argument — otherwise a
  // staff member could pass an owner's userId to unlock all requests.
  const user = await requireAuth();
  const userId = user.id;
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
  apptLat?: number;
  apptLng?: number;
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
    ...(await (async () => {
      if (data.apptLat != null && data.apptLng != null) {
        return { appt_location: data.apptLocation, appt_lat: data.apptLat, appt_lng: data.apptLng };
      }
      const geo = await geocodeLocation(data.apptLocation ?? "");
      return {
        appt_location: geo?.resolvedAddress ?? data.apptLocation,
        ...(geo ? { appt_lat: geo.lat, appt_lng: geo.lng } : {}),
      };
    })()),
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

  const sourceLabel = data.source === "line" ? "LINE" : data.source === "phone" ? "โทรศัพท์" : "Facebook";
  after(() => sendPushToNewRequestReceivers({
    title: `คำขอใหม่ (${sourceLabel}) — ${data.deviceModel} ${data.deviceStorage}`,
    body:  `${data.customerName} · ฿${data.estimatedPrice.toLocaleString("th-TH")}`,
    url:   `/admin/requests/${row.id}`,
    tag:   "new-request",
  }).catch(e => console.error("push error:", e)));

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

function extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  // /@lat,lng,zoom  (most common in google.com/maps URLs)
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  // ?q=lat,lng or &q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  // ll=lat,lng
  const llMatch = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
  return null;
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number; resolvedAddress?: string } | null> {
  const trimmed = location.trim();
  if (!trimmed) return null;

  const key = process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // Plain coordinate pair: "13.778680, 100.492925" or "13.778680,100.492925"
  const coordPair = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (coordPair) {
    const coords = { lat: parseFloat(coordPair[1]), lng: parseFloat(coordPair[2]) };
    if (key) {
      try {
        const rUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${key}&language=th&region=th`;
        const rRes = await fetch(rUrl, { cache: "no-store" });
        const rData = await rRes.json();
        const addr = rData?.results?.[0]?.formatted_address as string | undefined;
        if (addr) return { ...coords, resolvedAddress: addr };
      } catch { /* ignore */ }
    }
    return coords;
  }

  // If it looks like a URL — extract coords, then reverse geocode for a readable address
  if (trimmed.startsWith("http")) {
    let coords = extractCoordsFromMapsUrl(trimmed);
    if (!coords) {
      // Shortened link (maps.app.goo.gl, goo.gl/maps) — follow redirect then parse
      try {
        const res = await fetch(trimmed, {
          cache: "no-store",
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
        });
        coords = extractCoordsFromMapsUrl(res.url);

        // Fallback: scan first 12 KB of HTML for embedded coordinates
        if (!coords && res.body) {
          const reader = res.body.getReader();
          let body = "";
          try {
            while (body.length < 12000) {
              const { done, value } = await reader.read();
              if (done) break;
              body += new TextDecoder().decode(value);
            }
          } finally { reader.cancel().catch(() => {}); }
          const m = body.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)/)
                 ?? body.match(/"lat":(-?\d+\.\d+),"lng":(-?\d+\.\d+)/);
          if (m) coords = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
        }
      } catch { /* ignore */ }
    }
    if (!coords) return null;

    // Reverse geocode to get a human-readable address for display
    if (key) {
      try {
        const rUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${key}&language=th&region=th`;
        const rRes = await fetch(rUrl, { cache: "no-store" });
        const rData = await rRes.json();
        const addr = rData?.results?.[0]?.formatted_address as string | undefined;
        if (addr) return { ...coords, resolvedAddress: addr };
      } catch { /* ignore */ }
    }
    return coords;
  }

  // Plain text / Plus Code / place name — use Geocoding API
  if (!key) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(trimmed)}&key=${key}&language=th&region=th`;
    const res  = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    const loc  = data?.results?.[0]?.geometry?.location;
    if (loc?.lat && loc?.lng) return { lat: loc.lat, lng: loc.lng };
  } catch { /* ignore */ }
  return null;
}

async function fetchDistanceKm(destination: string): Promise<number | null> {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
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
// ─── Admin confirms receipt of device returned by rider ───────────────────────
const SOURCE_CHANNEL_MAP: Record<string, SourceChannel> = {
  website:  "เว็บไซต์",
  line:     "LINE OA",
  facebook: "Facebook",
  phone:    "โทรศัพท์",
};

export async function adminConfirmReturn(id: string) {
  const caller = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const [{ data: req }, { data: profile }] = await Promise.all([
    supabase.from("requests").select("*").eq("id", id).single(),
    supabase.from("admin_users").select("name").eq("user_id", caller.id).single(),
  ]);

  if (req?.returned_to_office_at) return { success: false as const, error: "ยืนยันรับเครื่องไปแล้ว" };

  const confirmedByName = profile?.name ?? caller.email ?? caller.id;
  const inspection = req.inspection ?? {};

  // Derive grade from inspection result
  const gradeMap: Record<string, "A" | "A-" | "B+" | "B" | "B-" | "C"> = {
    matched:  "A",
    adjusted: "B+",
    rejected: "B-",
  };
  const grade = gradeMap[inspection.result as string] ?? "B+";

  // Update request with return confirmation
  const { error } = await supabase
    .from("requests")
    .update({
      returned_to_office_at:      now,
      returned_confirmed_by_id:   caller.id,
      returned_confirmed_by_name: confirmedByName,
      updated_at:                 now,
    })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  // If stock already exists (created by updateStatus "completed"), patch the fields
  // that adminConfirmReturn knows better: inspector name and inspection color.
  // Keep everything else (inspection_snapshot, icloud_status, physical_checks) from the
  // updateStatus entry which is more complete.
  const { data: existingStock } = await supabase
    .from("stocks")
    .select("id")
    .eq("request_ref", req.order_number)
    .maybeSingle();
  if (existingStock) {
    const patch: Record<string, unknown> = { inspector: confirmedByName, updated_at: now };
    const inspectionColor = inspection.color ?? null;
    if (inspectionColor) patch.color = inspectionColor;
    await supabase.from("stocks").update(patch).eq("id", existingStock.id);
    await supabase.from("requests")
      .update({ stock_item_id: existingStock.id, updated_at: now })
      .eq("id", id);
    after(() => broadcastRequestUpdate(id).catch(console.error));
    return { success: true as const, stockItemId: existingStock.id };
  }

  // Auto-create stock item from request data
  const stockResult = await createStockItem({
    id:            "",                                              // generated inside createStockItem
    model:         req.device_model,
    storage:       req.device_storage ?? "",
    color:         inspection.color ?? req.device_color ?? "",
    imei:          inspection.imei  ?? "",
    serial:        inspection.serial ?? "",
    grade,
    batteryHealth: inspection.battery_health   ?? inspection.batteryHealth   ?? 0,
    cycleCount:    inspection.battery_cycles   ?? inspection.batteryCycles   ?? 0,
    icloudStatus:  "",
    carrierLock:   "",
    accessories:   (inspection.accessories as string[] | undefined)?.join(", ") ?? "",
    physicalChecks: [],
    costPrice:     req.actual_price ?? req.estimated_price ?? 0,
    shippingCost:  0,
    otherCost:     0,
    sellingPrice:  0,
    status:        "รอตรวจ",
    sourceChannel: SOURCE_CHANNEL_MAP[req.source as string] ?? "เว็บไซต์",
    requestRef:    req.order_number,
    sellerName:    req.customer_name,
    sellerPhone:   req.customer_phone,
    receivedAt:    now,
    inspector:     confirmedByName,
    photos:        (inspection.photos as string[] | undefined) ?? [],
    inspectionSnapshot: {
      imei:           inspection.imei          ?? null,
      serial:         inspection.serial         ?? null,
      model:          req.device_model,
      storage:        req.device_storage        ?? null,
      color:          inspection.color          ?? req.device_color ?? null,
      source:         "rider-inspection",
      result:         inspection.result,
      batteryHealth:  inspection.battery_health ?? inspection.batteryHealth  ?? undefined,
      batteryCycles:  inspection.battery_cycles ?? inspection.batteryCycles  ?? undefined,
      warrantyExpiry: inspection.warranty_expiry ?? inspection.warrantyExpiry ?? null,
      criteria:       inspection.criteria        ?? [],
      functionalTests: inspection.functional_tests ?? inspection.functionalTests ?? [],
      issues:         inspection.issues          ?? [],
    },
    soldAt: undefined, soldPrice: undefined, buyerName: undefined,
    buyerPhone: undefined, soldBy: undefined, saleType: undefined,
    partnerName: undefined, deliveryChannel: undefined, deliveryStatus: undefined,
    trackingNumber: undefined, deliveryAddress: undefined,
  });

  // Save stock_item_id back to request for bidirectional link
  if (stockResult.success) {
    await supabase.from("requests")
      .update({ stock_item_id: stockResult.id, updated_at: now })
      .eq("id", id);
  }

  after(() => broadcastRequestUpdate(id).catch(console.error));
  return { success: true as const, stockItemId: stockResult.success ? stockResult.id : null };
}

export async function adminReclaimJob(id: string, reason?: string) {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: req } = await supabase
    .from("requests")
    .select("status, rider_id, order_number, device_model, status_log")
    .eq("id", id).single();

  const RECLAIMABLE: string[] = ["confirmed", "pickup_scheduled", "en_route", "inspecting"];
  if (!RECLAIMABLE.includes(req?.status ?? ""))
    return { success: false as const, error: "ไม่สามารถดึงงานคืนในสถานะนี้ได้" };

  const prevRiderId = req?.rider_id as string | null;
  const note = reason?.trim() ? `Admin ดึงงานคืน — ${reason.trim()}` : "Admin ดึงงานคืน";
  const newLog = [...(req?.status_log ?? []), { status: "confirmed", timestamp: now, note }];

  const { error } = await supabase.from("requests")
    .update({ rider_id: null, rider_name: null, assigned_at: null, status: "confirmed", status_log: newLog, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };

  if (prevRiderId) {
    await supabase.from("rider_locations")
      .update({ current_job_id: null, tracking_mode: "idle", updated_at: now })
      .eq("rider_id", prevRiderId);
  }

  after(async () => {
    await broadcastRequestUpdate(id).catch(console.error);
    if (prevRiderId) {
      await sendPushToUser(prevRiderId, {
        title: "งานถูกดึงคืน",
        body: `${req?.device_model ?? ""} · ${req?.order_number ?? ""} — Admin นำงานกลับ`,
        url: "/rider",
        tag: `reclaimed-${id}`,
      }).catch(console.error);
    }
  });

  return { success: true as const };
}

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

  // Fetch address, current rider, and status for this request
  const { data: req } = await supabase
    .from("requests")
    .select("order_number, device_model, appt_location, status, rider_id, rider_name")
    .eq("id", id)
    .single();

  if (riderId && (req?.status === "new" || req?.status === "pending")) {
    return { success: false as const, error: "ต้องยืนยันนัดหมายก่อนมอบหมายไรเดอร์" };
  }

  // Calculate distance from store → customer address
  const distanceKm = riderId ? await fetchDistanceKm(req?.appt_location ?? "") : null;

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    rider_id: riderId, rider_name: riderName, updated_at: now,
    assigned_at: riderId ? now : null,
  };
  if (distanceKm !== null) updatePayload.distance_km = distanceKm;

  const { error } = await supabase.from("requests").update(updatePayload).eq("id", id);
  if (error) return { success: false as const, error: error.message };

  // Sync rider_locations.current_job_id so the map shows correct status
  const prevRiderId   = req?.rider_id   as string | null;
  const prevRiderName = req?.rider_name as string | null;
  const isReassign    = !!prevRiderId && prevRiderId !== riderId;

  if (prevRiderId && prevRiderId !== riderId) {
    await supabase.from("rider_locations")
      .update({ current_job_id: null, updated_at: now })
      .eq("rider_id", prevRiderId);
  }
  if (riderId) {
    await supabase.from("rider_locations")
      .update({ current_job_id: id, updated_at: now })
      .eq("rider_id", riderId);
  }

  // Activity log
  logActivity({
    userId: caller.id,
    requestId: id,
    orderNumber: req?.order_number,
    action: isReassign ? "rider_reassigned" : "rider_assigned",
    detail: isReassign
      ? `เปลี่ยนจาก ${prevRiderName ?? "ไรเดอร์"} → ${riderName ?? "ไม่ระบุ"}`
      : `มอบหมายให้ ${riderName ?? "ไม่ระบุ"}`,
  });

  after(() => broadcastRequestUpdate(id));

  // Notify old rider their job was taken
  if (isReassign && prevRiderId) {
    after(() => sendPushToUser(prevRiderId, {
      title: "งานถูกยกเลิก",
      body:  `${req?.order_number ?? ""} · ${req?.device_model ?? ""} ถูกมอบหมายให้ไรเดอร์คนอื่นแล้ว`,
      url:   `/rider`,
      tag:   `rider-unassign-${id}`,
    }).catch(console.error));
  }

  if (riderId) {
    const distText = distanceKm ? ` · ${distanceKm} กม.` : "";
    // Notify the assigned rider
    after(() => sendPushToUser(riderId, {
      title: "งานใหม่มาแล้ว!",
      body:  `${req?.order_number ?? ""} · ${req?.device_model ?? ""}${distText}`,
      url:   `/rider`,
      tag:   `rider-assign-${id}`,
    }).catch(console.error));
    // Notify owners that a rider was assigned
    after(() => sendPushToOwners({
      title: `มอบหมายไรเดอร์แล้ว — ${req?.order_number ?? ""}`,
      body:  `${riderName} รับงาน ${req?.device_model ?? ""}${distText}`,
      url:   `/admin/requests/${id}`,
      tag:   `rider-assign-admin-${id}`,
    }).catch(console.error));
  }

  return { success: true as const, distanceKm };
}

const RIDER_CAPACITY = 2; // must match the constant in the planner page

// ─── Auto-assign all unassigned confirmed jobs to idle riders ─────────────────
export async function autoAssignJobs(): Promise<{ assigned: number; skipped: number }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: jobs } = await supabase
    .from("requests")
    .select("id, order_number, device_model, appt_date, appt_time, appt_lat, appt_lng")
    .eq("status", "confirmed")
    .is("rider_id", null)
    .not("appt_date", "is", null)
    .order("appt_date", { ascending: true })
    .order("appt_time", { ascending: true });

  if (!jobs || jobs.length === 0) return { assigned: 0, skipped: 0 };

  const { data: locs } = await supabase
    .from("rider_locations")
    .select("rider_id, lat, lng, shift_id")
    .eq("is_online", true)
    .eq("tracking_mode", "idle");

  if (!locs || locs.length === 0) return { assigned: 0, skipped: jobs.length };

  const riderIds = locs.map(l => l.rider_id);
  const shiftIds = locs.map(l => l.shift_id).filter(Boolean) as string[];

  // Fetch active job counts per rider to enforce capacity
  const { data: activeJobRows } = await supabase
    .from("requests")
    .select("rider_id")
    .in("rider_id", riderIds)
    .in("status", ["confirmed", "pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting", "awaiting_transfer"]);

  const activeCountMap: Record<string, number> = {};
  for (const row of activeJobRows ?? []) {
    if (row.rider_id) activeCountMap[row.rider_id] = (activeCountMap[row.rider_id] ?? 0) + 1;
  }

  const [{ data: users }, { data: shifts }] = await Promise.all([
    supabase.from("admin_users").select("user_id, name").in("user_id", riderIds),
    shiftIds.length > 0
      ? supabase.from("rider_shifts").select("id, jobs_completed, jobs_attempted").in("id", shiftIds)
      : Promise.resolve({ data: [] }),
  ]);

  const { haversineKm } = await import("@/lib/geo-utils");

  let assigned = 0, skipped = 0;
  const pendingCountMap = { ...activeCountMap }; // tracks in-session additions

  for (const job of jobs) {
    // Only riders under capacity (in-session count tracks jobs just assigned this run)
    const available = locs.filter(r => (pendingCountMap[r.rider_id] ?? 0) < RIDER_CAPACITY);
    if (!available.length) { skipped++; continue; }

    // Score: distance × (1 + jobs_today × 0.2) — lower is better (balances workload)
    const best = available
      .map(r => {
        const distKm = job.appt_lat && job.appt_lng
          ? haversineKm(r.lat, r.lng, job.appt_lat, job.appt_lng) : 999;
        const jobsToday = shifts?.find(s => s.id === r.shift_id)?.jobs_completed ?? 0;
        return { ...r, score: distKm * (1 + jobsToday * 0.2) };
      })
      .sort((a, b) => a.score - b.score)[0];

    const riderName = users?.find(u => u.user_id === best.rider_id)?.name ?? "ไรเดอร์";

    // Atomic update — WHERE rider_id IS NULL prevents race conditions
    const { data: updated } = await supabase
      .from("requests")
      .update({ rider_id: best.rider_id, rider_name: riderName, assigned_at: now, updated_at: now })
      .eq("id", job.id)
      .is("rider_id", null)
      .select("id");

    if (updated?.length) {
      pendingCountMap[best.rider_id] = (pendingCountMap[best.rider_id] ?? 0) + 1;
      await supabase.from("rider_locations")
        .update({ current_job_id: job.id, updated_at: now })
        .eq("rider_id", best.rider_id);
      after(() => sendPushToUser(best.rider_id, {
        title: "งานใหม่มาแล้ว! (Auto Assign)",
        body: `${job.order_number} · ${job.device_model ?? ""}`,
        url: `/rider`,
        tag: `rider-assign-${job.id}`,
      }).catch(console.error));
      assigned++;
    } else {
      skipped++;
    }
  }

  return { assigned, skipped };
}

// ─── Fetch single request ─────────────────────────────────────────────────────
export async function fetchRequest(id: string): Promise<AdminRequest | null> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.from("requests").select("*").eq("id", id).single(),
    supabase.from("admin_users").select("role, permissions").eq("user_id", user.id).single(),
  ]);
  if (error) { console.error("fetchRequest:", error); return null; }
  // Access control: staff without "receive_new_requests" may only open requests
  // assigned to them — same gate the dashboard/list use to scope visibility.
  const role = (profile?.role ?? "owner") as AdminRole;
  const perms = (profile?.permissions ?? []) as Permission[];
  const canSeeAll = role !== "staff" || perms.includes("receive_new_requests");
  if (!canSeeAll && data.assigned_to !== user.id) return null;
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
    .select("status_log, order_number, source, device_model, device_storage, device_color, actual_price, estimated_price, customer_name, customer_phone, inspection, assigned_to, rider_id")
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

  // Clear rider's current_job_id when job is completed via contract flow
  if (status === "completed" && current?.rider_id) {
    await supabase.from("rider_locations")
      .update({ current_job_id: null, tracking_mode: "idle", updated_at: new Date().toISOString() })
      .eq("rider_id", current.rider_id)
      .eq("current_job_id", id);
  }

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
      const { data: lastRow } = await supabase.from("stocks").select("id").like("id", `STK-${year}-%`).order("id", { ascending: false }).limit(1);
      const lastSeq = lastRow?.[0]?.id ? parseInt(lastRow[0].id.split("-")[2], 10) : 0;
      const stockId = `STK-${year}-${String(lastSeq + 1).padStart(5, "0")}`;
      const now = new Date().toISOString();
      const insp = current.inspection ?? {};
      const sickwMap: Record<string, string> = {};
      for (const line of (insp.sickw_report ?? "").split("\n")) {
        const idx = line.indexOf(": ");
        if (idx > 0) sickwMap[line.slice(0, idx).trim()] = line.slice(idx + 2).trim();
      }
      const parsedCarrierLock  = sickwMap["Unlock Status"] ?? sickwMap["Sim-Lock"] ?? "";
      const parsedIcloudStatus = [sickwMap["iCloud Lock"], sickwMap["iCloud Status"]].filter(Boolean).join(" / ");
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
        conditionGrade:  insp.conditionGrade  ?? null,
        conditionLabel:  insp.conditionLabel  ?? null,
        sickw_report:    insp.sickw_report    ?? null,
        accessories:     insp.accessories     ?? [],
      };
      await supabase.from("stocks").insert({
        id: stockId,
        model:          current.device_model ?? "",
        storage:        current.device_storage ?? "",
        color:          current.device_color ?? "",
        imei:           insp.imei   ?? "",
        serial:         insp.serial ?? "",
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

// ─── Backfill missing appt_lat/appt_lng for active requests ──────────────────
export async function backfillRequestCoords(): Promise<{ total: number; updated: number }> {
  await requireAuth();
  const supabase = createServerClient();

  const { data: rows } = await supabase
    .from("requests")
    .select("id, appt_location")
    .not("appt_location", "is", null)
    .neq("appt_location", "")
    .is("appt_lat", null)
    .in("status", ["new", "pending", "confirmed"]);

  if (!rows || rows.length === 0) return { total: 0, updated: 0 };

  const total = rows.length;
  console.log(`[backfill] Found ${total} request(s) missing coords`);
  let updated = 0;
  for (const row of rows) {
    const geo = await geocodeLocation(row.appt_location as string);
    if (!geo) {
      console.warn(`[backfill] geocoding failed for id=${row.id} location="${row.appt_location}"`);
      continue;
    }
    const { error } = await supabase
      .from("requests")
      .update({
        appt_lat:      geo.lat,
        appt_lng:      geo.lng,
        ...(geo.resolvedAddress ? { appt_location: geo.resolvedAddress } : {}),
        updated_at:    new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) {
      console.error(`[backfill] DB update failed id=${row.id}:`, error.message);
    } else {
      console.log(`[backfill] Updated id=${row.id} → lat=${geo.lat} lng=${geo.lng}`);
      updated++;
    }
    await new Promise(r => setTimeout(r, 150));
  }
  console.log(`[backfill] Done — updated ${updated}/${total}`);
  return { total, updated };
}

// ─── Update appointment ───────────────────────────────────────────────────────
export async function updateAppointment(
  id: string,
  appt: { date: string; time: string; location: string; method: string },
) {
  await requireAuth();
  const supabase = createServerClient();

  const { data: prev } = await supabase
    .from("requests")
    .select("order_number, customer_name, device_model, appt_date, appt_time")
    .eq("id", id)
    .single();

  const geo = await geocodeLocation(appt.location);
  const { data: updated, error } = await supabase
    .from("requests")
    .update({
      appt_date:     appt.date,
      appt_time:     appt.time,
      appt_location: geo?.resolvedAddress ?? appt.location,
      appt_method:   appt.method,
      updated_at:    new Date().toISOString(),
      ...(geo ? { appt_lat: geo.lat, appt_lng: geo.lng } : {}),
    })
    .eq("id", id)
    .select("id");
  if (error) { console.error("updateAppointment error:", error); return { success: false, error: error.message }; }
  if (!updated || updated.length === 0) return { success: false, error: "ไม่พบคำขอในฐานข้อมูล" };

  if (prev && (prev.appt_date !== appt.date || prev.appt_time !== appt.time)) {
    const oldSlot = `${prev.appt_date || "?"} ${prev.appt_time || "?"}`;
    const newSlot = `${appt.date} ${appt.time}`;
    after(() => sendPushToNewRequestReceivers({
      title: `เลื่อนนัดหมาย — ${prev.order_number}`,
      body:  `${prev.customer_name} · ${prev.device_model}\n${oldSlot} → ${newSlot}`,
      url:   `/admin/requests/${id}`,
      tag:   "appt-updated",
    }).catch(console.error));
  }
  after(() => broadcastRequestUpdate(id));
  return { success: true };
}

// ─── Update payment ───────────────────────────────────────────────────────────
export async function updatePayment(
  id: string,
  pay: { method: string; bankName?: string; accountName?: string; accountNumber?: string },
) {
  await requireAuth();
  const supabase = createServerClient();

  const { data: prev } = await supabase
    .from("requests")
    .select("order_number, customer_name, device_model, payment_method")
    .eq("id", id)
    .single();

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

  if (prev && prev.payment_method !== pay.method) {
    const methodLabel: Record<string, string> = { cash: "เงินสด", transfer: "โอนเงิน", promptpay: "พร้อมเพย์" };
    after(() => sendPushToNewRequestReceivers({
      title: `แก้ไขช่องทางรับเงิน — ${prev.order_number}`,
      body:  `${prev.customer_name} · ${prev.device_model}\n${methodLabel[prev.payment_method] ?? prev.payment_method} → ${methodLabel[pay.method] ?? pay.method}`,
      url:   `/admin/requests/${id}`,
      tag:   "payment-updated",
    }).catch(console.error));
  }
  after(() => broadcastRequestUpdate(id));
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

  const { data: prev } = await supabase
    .from("requests")
    .select("order_number, customer_name, device_model, estimated_price")
    .eq("id", id)
    .single();

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

  if (prev && prev.estimated_price !== estimatedPrice) {
    const fmt = (n: number) => `฿${n.toLocaleString("th-TH")}`;
    after(() => sendPushToNewRequestReceivers({
      title: `แก้ไขราคา — ${prev.order_number}`,
      body:  `${prev.customer_name} · ${prev.device_model}\n${fmt(prev.estimated_price)} → ${fmt(estimatedPrice)}`,
      url:   `/admin/requests/${id}`,
      tag:   "price-updated",
    }).catch(console.error));
  }
  after(() => broadcastRequestUpdate(id));
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
export async function updateDevice(id: string, data: { model: string; storage: string; color?: string; condition: string; estimatedPrice?: number; conditionDetails?: string[] }) {
  await requireAuth();
  const supabase = createServerClient();

  // Also sync device_selections.storage so customer-facing page reflects the change
  const { data: current } = await supabase.from("requests").select("device_selections").eq("id", id).single();
  const updatedSelections = { ...(current?.device_selections ?? {}), storage: data.storage.trim() };

  const { error } = await supabase
    .from("requests")
    .update({
      device_model:              data.model.trim(),
      device_storage:            data.storage.trim(),
      device_color:              data.color?.trim() || null,
      device_condition:          data.condition.trim(),
      device_selections:         updatedSelections,
      ...(data.conditionDetails !== undefined ? { device_condition_details: data.conditionDetails } : {}),
      ...(data.estimatedPrice   !== undefined ? { estimated_price: data.estimatedPrice } : {}),
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

// ─── Look up a request by order number for merge preview (admin only) ─────────
export async function lookupRequestForMerge(orderNumber: string): Promise<{
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deviceModel: string;
  status: string;
  createdAt: string;
} | null> {
  await requireAuth();
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("requests")
    .select("id, order_number, customer_name, customer_phone, device_model, status, created_at")
    .ilike("order_number", orderNumber.trim())
    .single();
  if (error || !data) return null;
  return {
    id:            data.id,
    orderNumber:   data.order_number,
    customerName:  data.customer_name,
    customerPhone: data.customer_phone,
    deviceModel:   data.device_model,
    status:        data.status,
    createdAt:     data.created_at,
  };
}

// ─── Merge duplicate request into primary ─────────────────────────────────────
export async function mergeRequests(
  primaryId: string,
  duplicateId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const [{ data: primary }, { data: duplicate }] = await Promise.all([
    supabase.from("requests").select("id, order_number, status_log, status").eq("id", primaryId).single(),
    supabase.from("requests").select("id, order_number, status_log, status").eq("id", duplicateId).single(),
  ]);

  if (!primary) return { success: false, error: "ไม่พบคำขอหลัก" };
  if (!duplicate) return { success: false, error: "ไม่พบคำขอที่ต้องการรวม" };
  if (primary.id === duplicate.id) return { success: false, error: "ไม่สามารถรวมคำขอเดียวกันได้" };
  if (["completed", "merged"].includes(duplicate.status)) {
    return { success: false, error: `คำขอ ${duplicate.order_number} มีสถานะ "${duplicate.status}" แล้ว` };
  }

  const dupNewLog = [
    ...(duplicate.status_log ?? []),
    { status: "merged", timestamp: now, note: `รวมเข้า ${primary.order_number}` },
  ];
  const primaryNewLog = [
    ...(primary.status_log ?? []),
    { status: primary.status, timestamp: now, note: `รวมจาก ${duplicate.order_number}` },
  ];

  const [dupRes, primaryRes] = await Promise.all([
    supabase.from("requests").update({ status: "merged", status_log: dupNewLog, updated_at: now }).eq("id", duplicateId),
    supabase.from("requests").update({ status_log: primaryNewLog, updated_at: now }).eq("id", primaryId),
  ]);

  if (dupRes.error) return { success: false, error: dupRes.error.message };
  if (primaryRes.error) return { success: false, error: primaryRes.error.message };

  await Promise.all([
    logActivity({ requestId: primaryId, orderNumber: primary.order_number, action: "รวมคำขอ", detail: `รวมจาก ${duplicate.order_number}`, userId: user.id }),
    logActivity({ requestId: duplicateId, orderNumber: duplicate.order_number, action: "รวมคำขอ", detail: `รวมเข้า ${primary.order_number}`, userId: user.id }),
  ]);

  after(() => { broadcastRequestUpdate(primaryId); broadcastRequestUpdate(duplicateId); });
  return { success: true };
}
