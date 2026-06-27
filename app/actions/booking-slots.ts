"use server";

import { createServerClient } from "@/lib/supabase-server";

// สถานะที่ "ไม่นับ" เป็นคิว (ยกเลิก/ปฏิเสธ/ไม่มา ฯลฯ) — คืนช่องให้ว่าง
const NOT_COUNTED = '("cancelled","rejected","no_show","out_of_area","unreachable","merged")';
const DEFAULT_CAPACITY = 3;

async function readCapacity(supabase: ReturnType<typeof createServerClient>): Promise<number> {
  const { data } = await supabase
    .from("rider_system_settings")
    .select("value")
    .eq("key", "rider_slot_capacity")
    .maybeSingle();
  const v = data?.value ? parseInt(data.value, 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_CAPACITY;
}

// public — ใช้ในหน้าจองของลูกค้า: คืนเพดานคิว + จำนวนที่จองแล้วของแต่ละช่วงเวลา (เฉพาะ rider)
export async function fetchRiderSlotAvailability(
  date: string
): Promise<{ capacity: number; counts: Record<string, number> }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { capacity: DEFAULT_CAPACITY, counts: {} };
  const supabase = createServerClient();
  const [capacity, rowsRes] = await Promise.all([
    readCapacity(supabase),
    supabase
      .from("requests")
      .select("appt_time")
      .eq("appt_date", date)
      .eq("appt_method", "rider")
      .not("status", "in", NOT_COUNTED),
  ]);
  const counts: Record<string, number> = {};
  for (const r of (rowsRes.data ?? []) as { appt_time: string | null }[]) {
    const t = r.appt_time;
    if (t) counts[t] = (counts[t] ?? 0) + 1;
  }
  return { capacity, counts };
}

// server-side enforcement — กันแซงคิว/ยิงตรง: เช็กก่อน insert จริง
export async function isRiderSlotFull(
  date: string,
  time: string
): Promise<{ full: boolean; capacity: number; count: number }> {
  const supabase = createServerClient();
  const [capacity, { count }] = await Promise.all([
    readCapacity(supabase),
    supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("appt_date", date)
      .eq("appt_time", time)
      .eq("appt_method", "rider")
      .not("status", "in", NOT_COUNTED),
  ]);
  const c = count ?? 0;
  return { full: c >= capacity, capacity, count: c };
}
