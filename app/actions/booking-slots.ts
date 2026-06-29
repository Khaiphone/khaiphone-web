"use server";

import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";

const ALLDAY = "__ALLDAY__"; // sentinel เก็บใน block_time เมื่อปิดทั้งวัน

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

// อ่านการปิดช่วงเวลาของวันหนึ่ง — { wholeDay, times[] }
async function readBlocks(
  supabase: ReturnType<typeof createServerClient>,
  date: string
): Promise<{ wholeDay: boolean; times: string[] }> {
  const { data } = await supabase.from("blocked_slots").select("block_time").eq("block_date", date);
  let wholeDay = false;
  const times: string[] = [];
  for (const r of (data ?? []) as { block_time: string | null }[]) {
    if (r.block_time == null || r.block_time === ALLDAY) wholeDay = true;
    else times.push(r.block_time);
  }
  return { wholeDay, times };
}

// public — ใช้ในหน้าจองของลูกค้า: เพดานคิว + จำนวนที่จองแล้ว + ช่วงที่ถูกปิด (เฉพาะ rider)
export async function fetchRiderSlotAvailability(
  date: string
): Promise<{ capacity: number; counts: Record<string, number>; blockedTimes: string[]; blockedWholeDay: boolean }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { capacity: DEFAULT_CAPACITY, counts: {}, blockedTimes: [], blockedWholeDay: false };
  const supabase = createServerClient();
  const [capacity, rowsRes, blocks] = await Promise.all([
    readCapacity(supabase),
    supabase
      .from("requests")
      .select("appt_time")
      .eq("appt_date", date)
      .eq("appt_method", "rider")
      .not("status", "in", NOT_COUNTED),
    readBlocks(supabase, date),
  ]);
  const counts: Record<string, number> = {};
  for (const r of (rowsRes.data ?? []) as { appt_time: string | null }[]) {
    const t = r.appt_time;
    if (t) counts[t] = (counts[t] ?? 0) + 1;
  }
  return { capacity, counts, blockedTimes: blocks.times, blockedWholeDay: blocks.wholeDay };
}

// server-side enforcement — กันแซงคิว/ยิงตรง: เช็กก่อน insert จริง (รวมการปิด manual)
export async function isRiderSlotFull(
  date: string,
  time: string
): Promise<{ full: boolean; capacity: number; count: number; blocked: boolean }> {
  const supabase = createServerClient();
  const [capacity, { count }, blocks] = await Promise.all([
    readCapacity(supabase),
    supabase
      .from("requests")
      .select("*", { count: "exact", head: true })
      .eq("appt_date", date)
      .eq("appt_time", time)
      .eq("appt_method", "rider")
      .not("status", "in", NOT_COUNTED),
    readBlocks(supabase, date),
  ]);
  const c = count ?? 0;
  const blocked = blocks.wholeDay || blocks.times.includes(time);
  return { full: blocked || c >= capacity, capacity, count: c, blocked };
}

// ── จัดการการปิดช่วงเวลา (admin) ──────────────────────────────────────────────
export async function fetchDayBlocks(date: string): Promise<{ wholeDay: boolean; times: string[] }> {
  await requireAuth();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { wholeDay: false, times: [] };
  const supabase = createServerClient();
  return readBlocks(supabase, date);
}

// time = null → ทั้งวัน · blocked = true เพื่อปิด, false เพื่อเปิดคืน
export async function setSlotBlock(
  date: string,
  time: string | null,
  blocked: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: "วันที่ไม่ถูกต้อง" };
  const supabase = createServerClient();
  const key = time ?? ALLDAY;
  if (blocked) {
    const { error } = await supabase.from("blocked_slots").upsert(
      { block_date: date, block_time: key },
      { onConflict: "block_date,block_time" }
    );
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("blocked_slots").delete().eq("block_date", date).eq("block_time", key);
    if (error) return { success: false, error: error.message };
  }
  return { success: true };
}
