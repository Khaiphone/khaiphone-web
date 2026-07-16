import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ปิดกะค้างอัตโนมัติ (รันทุกวัน 21:00 UTC = ตี 4 ไทย) — ไรเดอร์ลืมกดปิดกะ/แอพถูก kill
// เวลาปิด = heartbeat ล่าสุดของกะนั้น (ไม่ใช่เวลา cron — ชั่วโมงงานจะได้ไม่บวม)

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = adminClient();
  const now = new Date().toISOString();

  const { data: staleShifts } = await supabase
    .from("rider_shifts")
    .select("id, rider_id, clocked_in_at")
    .is("clocked_out_at", null);

  let closed = 0;
  for (const shift of staleShifts ?? []) {
    // heartbeat ล่าสุดของกะนี้ = ping ล่าสุดใน rider_location_history ช่วงกะ
    const { data: lastPing } = await supabase
      .from("rider_location_history")
      .select("recorded_at")
      .eq("rider_id", shift.rider_id)
      .gte("recorded_at", shift.clocked_in_at)
      .order("recorded_at", { ascending: false })
      .limit(1);

    const clockedOutAt = lastPing?.[0]?.recorded_at ?? shift.clocked_in_at;

    await supabase
      .from("rider_shifts")
      .update({ clocked_out_at: clockedOutAt, ended_reason: "auto_expired" })
      .eq("id", shift.id);

    // เคลียร์สถานะออนไลน์
    await supabase
      .from("rider_locations")
      .update({ is_online: false, tracking_mode: "idle", current_job_id: null, updated_at: now })
      .eq("rider_id", shift.rider_id);
    await supabase
      .from("admin_users")
      .update({ is_online: false, last_seen_at: now })
      .eq("user_id", shift.rider_id);

    closed++;
  }

  return NextResponse.json({ ok: true, closed });
}
