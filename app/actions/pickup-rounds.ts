"use server";

import { after } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import { broadcastRequestUpdate } from "@/lib/broadcast";

// คำขอโซน "เข้ารับเป็นรอบ" ที่ยังรอจัดรอบ = สถานะช่วงต้น
const PENDING = ["new", "pending", "contacted"];

export interface RoundRequest {
  id: string;
  orderNumber: string;
  name: string;
  phone: string;
  model: string;
  storage: string;
  price: number;
  province: string;
  zone: string;
  serviceFee: number;
  apptDate: string;
  lat: number | null;
  lng: number | null;
  status: string;
}

interface Row {
  id: string; order_number: string | null; customer_name: string | null; customer_phone: string | null;
  device_model: string | null; device_storage: string | null; estimated_price: number | null;
  appt_province: string | null; pickup_zone: string | null; service_fee: number | null;
  appt_date: string | null; appt_lat: number | null; appt_lng: number | null; status: string | null;
}

function mapRound(r: Row): RoundRequest {
  return {
    id: r.id,
    orderNumber: r.order_number ?? "",
    name: r.customer_name ?? "",
    phone: r.customer_phone ?? "",
    model: r.device_model ?? "",
    storage: r.device_storage ?? "",
    price: r.estimated_price ?? 0,
    province: r.appt_province ?? "",
    zone: r.pickup_zone ?? "",
    serviceFee: r.service_fee ?? 0,
    apptDate: r.appt_date ?? "",
    lat: r.appt_lat,
    lng: r.appt_lng,
    status: r.status ?? "",
  };
}

const ROUND_SELECT =
  "id, order_number, customer_name, customer_phone, device_model, device_storage, estimated_price, " +
  "appt_province, pickup_zone, service_fee, appt_date, appt_lat, appt_lng, status";

/** คำขอโซนรอบที่รอจัดรอบ + จำนวนคำขอค้างต่อโซน */
export async function fetchPickupRounds(): Promise<{
  rounds: RoundRequest[];
  counts: { core: number; round: number; far: number };
}> {
  await requireAuth();
  const supabase = createServerClient();

  const roundsQ = supabase
    .from("requests")
    .select(ROUND_SELECT)
    .eq("pickup_zone", "round")
    .in("status", PENDING)
    .order("created_at", { ascending: true });

  const countZone = (z: string) =>
    supabase.from("requests").select("id", { count: "exact", head: true }).eq("pickup_zone", z).in("status", PENDING);

  const [roundsRes, coreRes, roundCntRes, farRes] = await Promise.all([
    roundsQ, countZone("core"), countZone("round"), countZone("far"),
  ]);

  return {
    rounds: (roundsRes.data as Row[] | null ?? []).map(mapRound),
    counts: {
      core: coreRes.count ?? 0,
      round: roundCntRes.count ?? 0,
      far: farRes.count ?? 0,
    },
  };
}

/** จำนวนคำขอโซนรอบที่รอจัดรอบ (สำหรับ badge บนแท็บ) */
export async function fetchRoundPendingCount(): Promise<number> {
  await requireAuth();
  const supabase = createServerClient();
  const { count } = await supabase
    .from("requests").select("id", { count: "exact", head: true })
    .eq("pickup_zone", "round").in("status", PENDING);
  return count ?? 0;
}

/** จัดรอบ: กำหนดวันเข้ารับให้หลายคำขอพร้อมกัน แล้วเลื่อนสถานะเป็น confirmed */
export async function assignPickupRound(ids: string[], date: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();
  if (!ids.length) return { success: false, error: "ยังไม่ได้เลือกคำขอ" };
  if (!date) return { success: false, error: "กรุณาเลือกวันรอบ" };
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: rows } = await supabase.from("requests").select("id, status_log").in("id", ids);
  const byId = new Map((rows ?? []).map(r => [r.id, r]));

  const results = await Promise.all(ids.map(async id => {
    const prev = byId.get(id);
    const log = [
      ...((prev?.status_log as Array<Record<string, unknown>>) ?? []),
      { status: "confirmed", timestamp: now, note: `จัดรอบเข้าพื้นที่ — วันที่ ${date}`, by: user.email ?? "แอดมิน" },
    ];
    const { error } = await supabase.from("requests")
      .update({ appt_date: date, status: "confirmed", status_log: log, updated_at: now })
      .eq("id", id);
    return !error;
  }));

  after(() => Promise.all(ids.map(id => broadcastRequestUpdate(id))).catch(() => {}));
  const ok = results.filter(Boolean).length;
  if (ok === 0) return { success: false, error: "อัปเดตไม่สำเร็จ" };
  return { success: true };
}

/** แก้โซน/จังหวัด/ค่าบริการของคำขอ (ใช้ตอนจัดการเคสหมุดไม่ตรง) */
export async function updatePickupZone(
  id: string,
  patch: { province: string; zone: string; serviceFee: number },
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { data: prev } = await supabase.from("requests").select("status_log").eq("id", id).single();
  const log = [
    ...((prev?.status_log as Array<Record<string, unknown>>) ?? []),
    { status: "zone_updated", timestamp: now, note: `ปรับโซนเป็น ${patch.province} (${patch.zone}) · ค่าบริการ ฿${patch.serviceFee}`, by: user.email ?? "แอดมิน" },
  ];
  const { error } = await supabase.from("requests")
    .update({ appt_province: patch.province, pickup_zone: patch.zone, service_fee: patch.serviceFee || null, status_log: log, updated_at: now })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  after(() => broadcastRequestUpdate(id));
  return { success: true };
}
