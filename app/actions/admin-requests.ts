"use server";

import { createServerClient } from "@/lib/supabase-server";
import { broadcastRequestUpdate } from "@/lib/broadcast";
import type { AdminRequest, RequestStatus, SellMethod, PayMethod } from "@/lib/types/admin";
import type { Permission } from "@/lib/admin-permissions";
import type { AdminRole } from "@/app/actions/admin-users";

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
  };
}

// ─── Fetch all requests (owner) or assigned-only (staff) ─────────────────────
export async function fetchRequests(assignedToUserId?: string): Promise<AdminRequest[]> {
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
export async function fetchDashboardData(): Promise<{
  userId: string;
  role: AdminRole;
  permissions: Permission[];
  requests: AdminRequest[];
  staffUserId: string | undefined;
} | null> {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, reqRes] = await Promise.all([
    supabase.from("admin_users").select("role, permissions").eq("user_id", user.id).single(),
    supabase.from("requests").select("*").neq("source", "manual").order("created_at", { ascending: false }),
  ]);

  const role = (profileRes.data?.role ?? "owner") as AdminRole;
  const permissions = (profileRes.data?.permissions ?? []) as Permission[];
  const isStaff = role === "staff";
  const all = (reqRes.data ?? []).map(mapRow);
  const requests = isStaff ? all.filter(r => r.assignedTo === user.id) : all;

  return { userId: user.id, role, permissions, requests, staffUserId: isStaff ? user.id : undefined };
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
  return { success: true, orderNumber, id: row.id };
}

// ─── Assign request to staff ──────────────────────────────────────────────────
export async function assignRequest(id: string, userId: string | null, name: string | null) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({ assigned_to: userId, assigned_to_name: name, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── Fetch single request ─────────────────────────────────────────────────────
export async function fetchRequest(id: string): Promise<AdminRequest | null> {
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
  console.log("[updateStatus] id:", id, "→", status);
  const supabase = createServerClient();

  // Get current status_log + request data (needed for auto-stock on completion)
  const { data: current } = await supabase
    .from("requests")
    .select("status_log, order_number, source, device_model, device_storage, device_color, actual_price, estimated_price, customer_name, customer_phone, inspection")
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
        imei:    insp.imei    ?? null,
        serial:  insp.serial  ?? null,
        model:   current.device_model   ?? null,
        storage: current.device_storage ?? null,
        color:   current.device_color   ?? null,
        source:  "inspection",
      };
      await supabase.from("stocks").insert({
        id: stockId,
        model:          current.device_model ?? "",
        storage:        current.device_storage ?? "",
        color:          current.device_color ?? "",
        imei:           insp.imei   ?? "",
        serial:         insp.serial ?? "",
        grade:          "A",
        battery_health: 0,  cycle_count:   0,
        icloud_status:  "", carrier_lock:  "", accessories:  "",
        physical_checks: [],
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
  return { success: true, statusLog: newLog };
}

// ─── Add note ─────────────────────────────────────────────────────────────────
export async function addNote(
  id: string,
  text: string,
  showToCustomer: boolean,
) {
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
  const supabase = createServerClient();
  const signedAt = new Date().toISOString();
  const { error } = await supabase
    .from("requests")
    .update({ contract_signed_at: signedAt, updated_at: signedAt })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, signedAt };
}

// ─── Save payment slip URL ────────────────────────────────────────────────────
export async function savePaymentSlip(id: string, slipUrl: string) {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("requests")
    .update({ payment_slip_url: slipUrl, updated_at: now })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── Update price ─────────────────────────────────────────────────────────────
export async function updatePrice(
  id: string,
  estimatedPrice: number,
  actualPrice?: number,
) {
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

// ─── Update device color ──────────────────────────────────────────────────────
export async function updateDeviceColor(id: string, color: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({ device_color: color.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

// ─── Save contract + receipt URLs ────────────────────────────────────────────
export async function saveContractUrls(
  id: string,
  contractUrl: string,
  receiptUrl: string,
) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("requests")
    .update({ contract_url: contractUrl, receipt_url: receiptUrl, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) { console.error("saveContractUrls error:", error); return { success: false as const, error: error.message }; }
  return { success: true as const };
}
