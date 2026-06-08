import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { broadcastRequestUpdate } from "@/lib/broadcast";
import { sendPushToOwners } from "@/app/actions/push";

const DAYS_UNTIL_NOSHOW = 2;

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

  // appt_date is stored as "YYYY-MM-DD" — cutoff = today minus 2 days in Bangkok time
  const bangkokNow = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const cutoffDate = new Date(bangkokNow);
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_UNTIL_NOSHOW);
  const cutoff = cutoffDate.toISOString().slice(0, 10); // "YYYY-MM-DD"

  const { data: stale } = await supabase
    .from("requests")
    .select("id, order_number, device_model, customer_name, appt_date, status_log")
    .in("status", ["confirmed", "pickup_scheduled"])
    .lt("appt_date", cutoff);

  if (!stale?.length) {
    return NextResponse.json({ closed: 0 });
  }

  const now = new Date().toISOString();
  let closed = 0;

  for (const req of stale) {
    const newLog = [
      ...(req.status_log ?? []),
      {
        status: "no_show",
        timestamp: now,
        note: `ปิดอัตโนมัติ — นัดหมายวันที่ ${req.appt_date} ผ่านมา ${DAYS_UNTIL_NOSHOW} วันแล้วไม่มีการดำเนินการ`,
      },
    ];

    const { data: updated } = await supabase
      .from("requests")
      .update({ status: "no_show", status_log: newLog, updated_at: now })
      .eq("id", req.id)
      .in("status", ["confirmed", "pickup_scheduled"])
      .select("id");

    if (updated?.length) {
      closed++;
      await broadcastRequestUpdate(req.id).catch(console.error);
    }
  }

  if (closed > 0) {
    await sendPushToOwners({
      title: `ระบบปิด ${closed} คำขอ — ลูกค้าไม่อยู่`,
      body: `นัดหมายที่ผ่านมา ${DAYS_UNTIL_NOSHOW} วันแล้วไม่มีการดำเนินการ`,
      url: "/admin/requests",
      tag: "auto-noshow",
    }).catch(console.error);
  }

  console.log(`[cron/appointment-noshow] closed ${closed}/${stale.length} requests`);
  return NextResponse.json({ closed, total: stale.length });
}
